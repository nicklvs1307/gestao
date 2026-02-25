const axios = require('axios');
const prisma = require('../lib/prisma');

class SaiposService {
  /**
   * Retorna a URL base conforme o ambiente (Produção ou Homologação)
   */
  getBaseUrl(env) {
    return env === 'production' 
      ? 'https://order-api.saipos.com' 
      : 'https://homolog-order-api.saipos.com';
  }

  /**
   * Obtém ou renova o token de acesso da Saipos
   * Endpoint: POST /auth
   */
  async getAccessToken(restaurantId, settings) {
    if (settings.saiposToken && settings.saiposTokenExpiresAt > new Date()) {
      return settings.saiposToken;
    }

    try {
      console.log(`[SAIPOS] Solicitando novo token para restaurante ${restaurantId}...`);
      const baseUrl = this.getBaseUrl(settings.saiposEnv);
      
      const response = await axios.post(`${baseUrl}/auth`, {
        idPartner: settings.saiposPartnerId,
        secret: settings.saiposSecret
      });

      const { token } = response.data;
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas de cache

      await prisma.integrationSettings.update({
        where: { restaurantId },
        data: {
          saiposToken: token,
          saiposTokenExpiresAt: expiresAt
        }
      });

      return token;
    } catch (error) {
      console.error(`[SAIPOS] Erro na autenticação (Restaurante ${restaurantId}):`, error.response?.data || error.message);
      throw new Error('Falha na autenticação com a Saipos. Verifique idPartner e Secret.');
    }
  }

  /**
   * Envia um pedido para a Saipos
   * Endpoint: POST /order
   */
  async sendOrderToSaipos(orderId) {
    // Função para remover acentos e normalizar texto (disponível para todo o método)
    const normalize = (str) => {
        if (!str) return '';
        return str.toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove acentos
            .trim();
    };

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: { product: true }
          },
          deliveryOrder: {
            include: { customer: true }
          },
          restaurant: {
            include: {
              integrationSettings: true,
              fiscalConfig: true
            }
          },
          payments: true
        }
      });

      if (!order || !order.restaurant.integrationSettings?.saiposIntegrationActive) {
        return;
      }

      const settings = order.restaurant.integrationSettings;
      const fiscalConfig = order.restaurant.fiscalConfig;
      const baseUrl = this.getBaseUrl(settings.saiposEnv);

      if (!settings.saiposCodStore) {
        console.error('[SAIPOS] Erro: Código da Loja (cod_store) não configurado.');
        return;
      }
      
      let token = null;
      try {
        token = await this.getAccessToken(order.restaurantId, settings);
      } catch (e) {
        console.error(`[SAIPOS] Abortando envio por erro de token.`);
        return;
      }

      // 1. Mapeamento de Itens (choice_items)
      const items = order.items.map(item => {
        const addons = item.addonsJson ? JSON.parse(item.addonsJson) : [];
        const size = item.sizeJson ? JSON.parse(item.sizeJson) : null;
        const flavors = item.flavorsJson ? JSON.parse(item.flavorsJson) : [];
        
        const choiceItems = [];
        
        // Calcula o total apenas dos adicionais para subtrair do unitPrice (pois o sistema salva o total no unitPrice)
        const addonsTotalPrice = addons.reduce((sum, a) => sum + (parseFloat(a.price || 0) * (a.quantity || 1)), 0);
        
        // O unitPrice na Saipos deve ser o preço base (com tamanho/promoção) sem os adicionais
        const baseUnitPrice = Math.max(0, parseFloat(item.priceAtTime) - addonsTotalPrice);

        // Adiciona Tamanho (Geralmente no sistema o tamanho já define o preço base, 
        // então enviamos o código de integração do tamanho mas com preço 0)
        if (size) {
          choiceItems.push({
            integration_code: size.saiposIntegrationCode || 'SIZE_DEFAULT',
            desc_item_choice: size.name,
            aditional_price: 0,
            quantity: 1,
            notes: ''
          });
        }

        // Adiciona Sabores (Pizzas)
        flavors.forEach(f => {
          choiceItems.push({
            integration_code: f.saiposIntegrationCode || 'FLAVOR_DEFAULT',
            desc_item_choice: `Sabor: ${f.name}`,
            aditional_price: 0, // O preço da pizza já está no unit_price (regra de maior valor/média aplicada no backend)
            quantity: 1,
            notes: ''
          });
        });

        // Adiciona Complementos / Adicionais (Combos)
        addons.forEach(a => {
          const qty = a.quantity || 1;
          choiceItems.push({
            integration_code: a.saiposIntegrationCode || 'ADDON_DEFAULT',
            desc_item_choice: qty > 1 ? `${qty}x ${a.name}` : a.name,
            aditional_price: parseFloat(a.price || 0),
            quantity: qty,
            notes: ''
          });
        });

        return {
          integration_code: item.product.saiposIntegrationCode || item.product.id,
          desc_item: item.product.name,
          quantity: item.quantity,
          unit_price: baseUnitPrice,
          notes: item.observations || '',
          choice_items: choiceItems
        };
      });

      // 2. Definição do Método e Endereço
      const isDeliveryOrder = order.orderType === 'DELIVERY' || order.deliveryOrder !== null;
      const isPickup = order.deliveryOrder?.deliveryType === 'pickup';
      
      let mode = 'TAKEOUT';
      if (order.tableNumber) {
          mode = 'TABLE';
      } else if (isDeliveryOrder && !isPickup) {
          mode = 'DELIVERY';
      }
      
      let orderMethod = {
          mode: mode,
          scheduled: false,
          delivery_date_time: new Date().toISOString()
      };

      // Sempre envia delivery_by e delivery_fee se for DELIVERY (Exigência Saipos erro 902)
      if (orderMethod.mode === 'DELIVERY') {
          orderMethod.delivery_by = 'RESTAURANT';
          orderMethod.delivery_fee = parseFloat(order.deliveryOrder?.deliveryFee || 0);
      }

      let deliveryAddress = null;
      if (orderMethod.mode === 'DELIVERY') {
        const c = order.deliveryOrder?.customer;
        
        // Identifica a origem dos dados para o log
        const citySource = c?.city ? 'Cliente' : (order.restaurant?.city ? 'Restaurante' : 'Padrão');
        const stateSource = c?.state ? 'Cliente' : (order.restaurant?.state ? 'Restaurante' : 'Padrão');

        let state = normalize(c?.state || order.restaurant?.state || fiscalConfig?.state || 'SP').toUpperCase().slice(0, 2);
        let city = normalize(c?.city || order.restaurant?.city || fiscalConfig?.city || 'Sao Paulo');

        // Proteção extra para Andradas (MG) caso o estado venha errado
        if (city.toLowerCase().includes('andradas') && state === 'SP') {
            state = 'MG';
            console.log(`[SAIPOS] Correção Automática: Cidade Andradas detectada, forçando UF para MG.`);
        }

        deliveryAddress = {
          country: 'BR',
          state: state,
          city: city,
          district: normalize(c?.neighborhood || 'Bairro'),
          street_name: normalize(c?.street || order.deliveryOrder?.address || 'Rua nao informada'),
          street_number: normalize(c?.number || 'S/N'),
          postal_code: (c?.zipCode || '00000000').replace(/\D/g, ''),
          reference: normalize(c?.reference || ''),
          complement: normalize(c?.complement || ''),
          coordinates: { latitude: 0, longitude: 0 }
        };

        console.log(`[SAIPOS] Endereço montado - Cidade: ${deliveryAddress.city} (via ${citySource}), UF: ${deliveryAddress.state} (via ${stateSource})`);
      }

      if (orderMethod.mode === 'TABLE') {
          orderMethod.table_reference = order.tableNumber?.toString() || '';
      }

      // 3. Mapeamento de Pagamento
      let paymentTypes = [];
      if (orderMethod.mode !== 'TABLE') {
          const methodName = order.deliveryOrder?.paymentMethod || order.payments?.[0]?.method || 'cash';
          
          // Busca a configuração da forma de pagamento no banco para pegar o código Saipos
          const dbPaymentMethod = await prisma.paymentMethod.findFirst({
              where: {
                  restaurantId: order.restaurantId,
                  name: { equals: methodName, mode: 'insensitive' }
              }
          });

          // Se tiver um código configurado, usa ele. Senão tenta mapear pelo nome/tipo.
          const methodToMap = dbPaymentMethod?.saiposIntegrationCode || dbPaymentMethod?.type || methodName;
          
          // Fix: order.total already includes deliveryFee in this system. Force 2 decimal places.
          const finalAmount = Math.round(order.total * 100) / 100;
          const paymentData = this.mapPaymentMethod(methodToMap, finalAmount, order.deliveryOrder?.changeFor || 0);
          paymentTypes.push(paymentData);
      }

      // 4. Montagem do Payload Final
      const rawPayload = {
        order_id: order.id,
        display_id: order.dailyOrderNumber ? order.dailyOrderNumber.toString() : order.id.slice(-4),
        cod_store: settings.saiposCodStore,
        created_at: order.createdAt.toISOString(),
        notes: order.deliveryOrder?.notes || '',
        total_increase: 0,
        total_discount: 0,
        total_amount: Math.round(order.total * 100) / 100,
        customer: {
          id: order.deliveryOrder?.customer?.id || 'GUEST',
          name: normalize(order.deliveryOrder?.name || order.customerName || (order.tableNumber ? `Mesa ${order.tableNumber}` : 'Cliente Balcao')),
          phone: order.deliveryOrder?.phone?.replace(/\D/g, '') || ''
        },
        order_method: orderMethod,
        items: items,
        payment_types: paymentTypes.length > 0 ? paymentTypes : undefined
      };

      if (deliveryAddress) rawPayload.delivery_address = deliveryAddress;
      if (orderMethod.mode === 'TABLE' && order.tableNumber) {
          rawPayload.table = { desc_table: order.tableNumber.toString() };
      }

      // Limpeza de campos null/undefined
      const payload = JSON.parse(JSON.stringify(rawPayload, (key, value) => {
          return value === null || value === undefined ? '' : value;
      }));

      console.log(`[SAIPOS] Enviando Pedido #${order.dailyOrderNumber} (Modo: ${orderMethod.mode}) para Loja ${settings.saiposCodStore}...`);
      
      const response = await axios.post(`${baseUrl}/order`, payload, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        await prisma.order.update({
          where: { id: orderId },
          data: { saiposOrderId: 'SYNCED_V3' }
        });
        console.log(`[SAIPOS] Sucesso! Pedido integrado.`);
      }

    } catch (error) {
      console.error(`[SAIPOS] Erro no envio (Pedido ${orderId}):`, error.response?.data || error.message);
      // Se houver erro, logamos o payload para você conferir os dados enviados
      if (error.response?.data) {
          console.log(`[SAIPOS] Payload que falhou:`, JSON.stringify(error.config?.data ? JSON.parse(error.config.data) : 'N/A', null, 2));
      }
    }
  }

  /**
   * Mapeamento de pagamentos para os códigos da Saipos
   */
  mapPaymentMethod(method, amount, change_for = 0) {
    method = (method || 'DIN').toUpperCase();
    
    // Se o método já for um código Saipos válido (Ex: DIN, CRE, DEB, PIX)
    const validSaiposCodes = ['DIN', 'CRE', 'DEB', 'PIX', 'VALE', 'CARD', 'OUTRO'];
    
    // Mapeamento de tipos do banco para códigos Saipos
    const typeToCode = {
      'CASH': 'DIN',
      'CREDIT_CARD': 'CRE',
      'DEBIT_CARD': 'DEB',
      'PIX': 'PIX',
      'PIX_ONLINE': 'PIX',
      'VOUCHER': 'VALE',
      'MEAL_VOUCHER': 'VALE',
      'DINHEIRO': 'DIN',
      'CARTÃO': 'CARD',
      'CARTAO': 'CARD'
    };

    const code = validSaiposCodes.includes(method) ? method : (typeToCode[method] || 'DIN');
    
    // Determinar se é ONLINE ou OFFLINE baseado no código
    // Geralmente PIX do sistema é ONLINE, o restante é OFFLINE para a Saipos
    const type = (code === 'PIX' || method.includes('ONLINE')) ? 'ONLINE' : 'OFFLINE';
    
    const result = { code, type, amount };
    
    if (code === 'PIX') {
        result.complement = 'pix';
    }

    return { ...result, amount, change_for: parseFloat(change_for || 0) };
  }
}

module.exports = new SaiposService();