const axios = require('axios');
const prisma = require('../lib/prisma');

// URL base da API de Pedidos (Ajustar para produção se necessário: https://order-api.saipos.com)
const SAIPOS_API_URL = 'https://homolog-order-api.saipos.com'; 

class SaiposService {
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
      
      const response = await axios.post(`${SAIPOS_API_URL}/auth`, {
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
        
        // Adiciona Tamanho
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
            aditional_price: 0,
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
          unit_price: parseFloat(item.priceAtTime),
          notes: item.observations || '',
          choice_items: choiceItems
        };
      });

      // 2. Definição do Método e Endereço
      let orderMethod = {
          mode: order.orderType === 'DELIVERY' ? 'DELIVERY' : (order.tableNumber ? 'TABLE' : 'TAKEOUT'),
          scheduled: false,
          delivery_date_time: new Date().toISOString()
      };

      let deliveryAddress = null;
      if (orderMethod.mode === 'DELIVERY' && order.deliveryOrder) {
        const c = order.deliveryOrder.customer;
        
        orderMethod.delivery_by = 'RESTAURANT';
        orderMethod.delivery_fee = parseFloat(order.deliveryOrder.deliveryFee || 0);

        deliveryAddress = {
          country: 'BR',
          state: c?.state || fiscalConfig?.state || 'SP',
          city: c?.city || fiscalConfig?.city || 'São Paulo',
          district: c?.neighborhood || 'Bairro',
          street_name: c?.street || order.deliveryOrder.address || '',
          street_number: c?.number || 'S/N',
          postal_code: c?.zipCode?.replace(/\D/g, '') || '00000000',
          reference: c?.reference || '',
          complement: c?.complement || '',
          coordinates: { latitude: 0, longitude: 0 }
        };
      }

      if (orderMethod.mode === 'TABLE') {
          orderMethod.table_reference = order.tableNumber?.toString() || '';
      }

      // 3. Mapeamento de Pagamento
      let paymentTypes = [];
      if (orderMethod.mode !== 'TABLE') {
          const method = order.deliveryOrder?.paymentMethod || order.payments?.[0]?.method || 'cash';
          const paymentData = this.mapPaymentMethod(method, order.total + (order.deliveryOrder?.deliveryFee || 0), order.deliveryOrder?.changeFor || 0);
          paymentTypes.push(paymentData);
      }

      // 4. Montagem do Payload Final
      const rawPayload = {
        order_id: order.id,
        display_id: order.dailyOrderNumber.toString(),
        cod_store: settings.saiposCodStore,
        created_at: order.createdAt.toISOString(),
        notes: order.deliveryOrder?.notes || '',
        total_increase: 0,
        total_discount: 0,
        total_amount: parseFloat(order.total) + parseFloat(order.deliveryOrder?.deliveryFee || 0),
        customer: {
          id: order.deliveryOrder?.customer?.id || 'GUEST',
          name: order.deliveryOrder?.name || order.customerName || `Mesa ${order.tableNumber}`,
          phone: order.deliveryOrder?.phone?.replace(/\D/g, '') || ''
        },
        order_method: orderMethod,
        items: items,
        payment_types: paymentTypes.length > 0 ? paymentTypes : undefined
      };

      if (deliveryAddress) rawPayload.delivery_address = deliveryAddress;
      if (orderMethod.mode === 'TABLE') rawPayload.table = { desc_table: order.tableNumber.toString() };

      // Limpeza de campos null/undefined (conforme automação funcional)
      const payload = JSON.parse(JSON.stringify(rawPayload, (key, value) => {
          return value === null || value === undefined ? '' : value;
      }));

      console.log(`[SAIPOS] Enviando Pedido #${order.dailyOrderNumber} para Loja ${settings.saiposCodStore}...`);
      console.log('[SAIPOS DEBUG] PAYLOAD COMPLETO:', JSON.stringify(payload, null, 2));
      
      const response = await axios.post(`${SAIPOS_API_URL}/order`, payload, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        await prisma.order.update({
          where: { id: orderId },
          data: { saiposOrderId: 'SYNCED_V2' }
        });
        console.log(`[SAIPOS] Sucesso! Pedido #${order.dailyOrderNumber} integrado.`);
      }

    } catch (error) {
      console.error(`[SAIPOS] Erro no envio (Pedido ${orderId}):`, error.response?.data || error.message);
    }
  }

  /**
   * Mapeamento de pagamentos similar à automação funcional
   */
  mapPaymentMethod(method, amount, change_for = 0) {
    method = method.toLowerCase();
    
    // Pagamentos Online
    if (method === 'pix_online') {
        return { code: "PARTNER_PAYMENT", type: "ONLINE", amount, complement: "pix", change_for: 0 };
    }

    const map = {
      'cash': { code: 'DIN', type: 'OFFLINE' },
      'pix': { code: 'PARTNER_PAYMENT', type: 'ONLINE', complement: 'pix' },
      'pix_on_delivery': { code: 'PARTNER_PAYMENT', type: 'ONLINE', complement: 'pix' },
      'credit_card': { code: 'CRE', type: 'OFFLINE' },
      'debit_card': { code: 'DEB', type: 'OFFLINE' },
      'card': { code: 'CARD', type: 'OFFLINE' },
      'meal_voucher': { code: 'VALE', type: 'OFFLINE' }
    };

    const result = map[method] || { code: 'DIN', type: 'OFFLINE' };
    return { ...result, amount, change_for: parseFloat(change_for || 0) };
  }
}

module.exports = new SaiposService();