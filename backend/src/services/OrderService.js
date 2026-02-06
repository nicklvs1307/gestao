const prisma = require('../lib/prisma');
const SaiposService = require('./SaiposService');

class OrderService {
  
  /**
   * Calcula o preço total de um item (produto base + tamanho + adicionais + sabores)
   * Valida a existência e disponibilidade dos itens.
   */
  async calculateItemPrice(productId, quantity, sizeId, addonsIds = [], flavorIds = []) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { sizes: true, addonGroups: { include: { addons: true } } }
    });

    if (!product) throw new Error(`Produto não encontrado: ${productId}`);
    if (!product.isAvailable) throw new Error(`Produto indisponível: ${product.name}`);

    let unitPrice = product.price;
    let sizeName = null;
    let sizeObj = null;

    // 1. Verificar Tamanho (se aplicável)
    if (sizeId) {
      const size = product.sizes.find(s => s.id === sizeId);
      if (!size) throw new Error(`Tamanho inválido para o produto ${product.name}`);
      unitPrice = size.price; // Preço base do tamanho
      sizeName = size.name;
      sizeObj = { id: size.id, name: size.name, price: size.price, saiposIntegrationCode: size.saiposIntegrationCode };
    }

    // 2. Lógica de Pizza (Multi-sabores)
    const flavorsObjects = [];
    
    // Se houver flavorIds, vamos processar independente de ter pizzaConfig ou não (Flexibilidade)
    if (flavorIds && flavorIds.length > 0) {
      const flavors = await prisma.product.findMany({
        where: { id: { in: flavorIds } },
        include: { sizes: true }
      });

      if (flavors.length > 0) {
          const config = product.pizzaConfig || {}; // Fallback para config vazia
          const priceRule = config.priceRule || 'higher'; 

          const flavorPrices = flavors.map(f => {
            if (sizeName) {
               const s = f.sizes.find(sz => sz.name === sizeName);
               return s ? s.price : f.price;
            }
            return f.price;
          });

          // Só aplica regra de preço se houver pizzaConfig VÁLIDA. Se não tiver, mantém o preço do produto pai.
          if (product.pizzaConfig) {
              let calculatedPrice = 0;
              if (priceRule === 'higher') {
                calculatedPrice = Math.max(...flavorPrices);
              } else if (priceRule === 'average') {
                calculatedPrice = flavorPrices.reduce((a, b) => a + b, 0) / flavorPrices.length;
              }

              if (calculatedPrice > 0) {
                  unitPrice = calculatedPrice;
              }
          }
          
          flavors.forEach(f => {
              flavorsObjects.push({ 
                id: f.id, 
                name: f.name, 
                price: sizeName ? (f.sizes.find(sz => sz.name === sizeName)?.price || f.price) : f.price 
              });
          });
      }
    }

    // 3. Verificar Adicionais
    let addonsTotal = 0;
    const addonsObjects = [];
    
    if (addonsIds && addonsIds.length > 0) {
        const allProductAddons = product.addonGroups.flatMap(g => g.addons);
        
        // Contabiliza quantidades se houver IDs repetidos
        const counts = {};
        addonsIds.forEach(id => {
          counts[id] = (counts[id] || 0) + 1;
        });

        for (const [addonId, qty] of Object.entries(counts)) {
            const addon = allProductAddons.find(a => a.id === addonId);
            if (!addon) throw new Error(`Adicional inválido (ID: ${addonId}) para o produto ${product.name}`);
            
            addonsTotal += (addon.price * qty);
            addonsObjects.push({ 
                id: addon.id, 
                name: addon.name, 
                price: addon.price, 
                quantity: qty,
                saiposIntegrationCode: addon.saiposIntegrationCode 
            });
        }
    }

    const finalUnitPrice = unitPrice + addonsTotal;
    const totalItemPrice = finalUnitPrice * quantity;

    return {
      product,
      unitPrice: finalUnitPrice, 
      basePrice: unitPrice,      
      totalPrice: totalItemPrice,
      sizeObj,
      addonsObjects,
      flavorsObjects
    };
  }

  /**
   * Cria um pedido completo (usado para Delivery e PDV)
   */
  async createOrder({ restaurantId, items, orderType, deliveryInfo, tableNumber, paymentMethod, userId, customerName }) {
    let orderTotal = 0;
    const processedItems = [];

    for (const item of items) {
      const calculation = await this.calculateItemPrice(
        item.productId, 
        item.quantity, 
        item.sizeId, 
        item.addonsIds,
        item.flavorIds
      );

      orderTotal += calculation.totalPrice;

      processedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        priceAtTime: calculation.unitPrice,
        sizeJson: calculation.sizeObj ? JSON.stringify(calculation.sizeObj) : null,
        addonsJson: calculation.addonsObjects.length ? JSON.stringify(calculation.addonsObjects) : null,
        flavorsJson: calculation.flavorsObjects.length ? JSON.stringify(calculation.flavorsObjects) : null,
        observations: item.observations || ''
      });
    }

    const restaurant = await prisma.restaurant.findFirst({
        where: {
            OR: [
                { id: restaurantId },
                { slug: restaurantId }
            ]
        },
        include: { settings: true }
    });

    if (!restaurant) throw new Error(`Restaurante não encontrado: ${restaurantId}`);
    
    const realRestaurantId = restaurant.id;
    const isAutoAccept = restaurant.settings?.autoAcceptOrders || false;

    const initialStatus = isAutoAccept ? 'PREPARING' : 'PENDING';

    // 1. TENTAR ENCONTRAR COMANDA EXISTENTE PARA EVITAR DUPLICIDADE
    // Se for TABLE e tiver tableNumber, procuramos se já existe um pedido aberto
    // Se customerName for fornecido, buscamos por ele. Se não, buscamos o "Geral" (null)
    if (orderType === 'TABLE' && tableNumber) {
        const existingOrder = await prisma.order.findFirst({
            where: {
                restaurantId: realRestaurantId,
                tableNumber: parseInt(tableNumber),
                customerName: customerName || null,
                status: { notIn: ['COMPLETED', 'CANCELED'] }
            }
        });

        if (existingOrder) {
            // Se achou, apenas ADICIONA os itens a esse pedido existente
            return await this.addItemsToOrder(existingOrder.id, items, userId);
        }
    }

    const orderData = {
      restaurantId: realRestaurantId,
      total: orderTotal,
      orderType: orderType || 'TABLE',
      status: initialStatus,
      userId: userId || null, 
      customerName: customerName || null,
      items: {
        create: processedItems
      }
    };

    if (tableNumber) {
        orderData.tableNumber = parseInt(tableNumber);
    }

    const newOrder = await prisma.$transaction(async (tx) => {
        // 1. Gerar Número Sequencial Diário (dailyOrderNumber)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const lastOrder = await tx.order.findFirst({
            where: {
                restaurantId: realRestaurantId,
                createdAt: { gte: today }
            },
            orderBy: { dailyOrderNumber: 'desc' },
            select: { dailyOrderNumber: true }
        });

        const nextNumber = (lastOrder?.dailyOrderNumber || 0) + 1;
        orderData.dailyOrderNumber = nextNumber;

        const createdOrder = await tx.order.create({ data: orderData });

        if (orderType === 'TABLE' && tableNumber) {
            await tx.table.updateMany({
                where: { number: tableNumber, restaurantId: realRestaurantId },
                data: { status: 'occupied' }
            });
        }

        if (orderType === 'DELIVERY' && deliveryInfo) {
             // ... Lógica de Delivery Mantida ...
             const isDelivery = deliveryInfo.deliveryType === 'delivery';
            
             let fullAddress = 'Retirada no Balcão';
             if (isDelivery && deliveryInfo.street) {
                 fullAddress = `${deliveryInfo.street}${deliveryInfo.number ? ', ' + deliveryInfo.number : ''}${deliveryInfo.neighborhood ? ' - ' + deliveryInfo.neighborhood : ''}`;
             }
 
             const cleanPhone = deliveryInfo.phone.replace(/\D/g, '');
 
             const customer = await tx.customer.upsert({
                 where: {
                     phone_restaurantId: {
                         phone: cleanPhone,
                         restaurantId: realRestaurantId
                     }
                 },
                 update: {
                     name: deliveryInfo.name,
                     address: fullAddress,
                     zipCode: deliveryInfo.cep || null,
                     street: deliveryInfo.street || null,
                     number: deliveryInfo.number || null,
                     neighborhood: deliveryInfo.neighborhood || null,
                     city: deliveryInfo.city || null,
                     state: deliveryInfo.state || null,
                     complement: deliveryInfo.complement || null,
                     reference: deliveryInfo.reference || null
                 },
                 create: {
                     name: deliveryInfo.name,
                     phone: cleanPhone,
                     address: fullAddress,
                     zipCode: deliveryInfo.cep || null,
                     street: deliveryInfo.street || null,
                     number: deliveryInfo.number || null,
                     neighborhood: deliveryInfo.neighborhood || null,
                     city: deliveryInfo.city || null,
                     state: deliveryInfo.state || null,
                     complement: deliveryInfo.complement || null,
                     reference: deliveryInfo.reference || null,
                     restaurantId: realRestaurantId
                 }
             });

 
             await tx.deliveryOrder.create({
                 data: {
                     orderId: createdOrder.id,
                     customerId: customer.id,
                     name: deliveryInfo.name,
                     phone: deliveryInfo.phone,
                     address: fullAddress,
                     deliveryType: deliveryInfo.deliveryType,
                     paymentMethod: deliveryInfo.paymentMethod || paymentMethod,
                     changeFor: deliveryInfo.changeFor ? parseFloat(deliveryInfo.changeFor) : null,
                     deliveryFee: isDelivery ? (deliveryInfo.deliveryFee || 0) : 0,
                     status: isAutoAccept ? 'CONFIRMED' : 'PENDING'
                 }
             });
        }

        if (paymentMethod) {
            await tx.payment.create({
                data: {
                    orderId: createdOrder.id,
                    amount: orderTotal + (deliveryInfo?.deliveryFee || 0),
                    method: paymentMethod
                }
            });
        }

        return createdOrder;
    });

    // Sincronização com Saipos (Assíncrona para não travar a resposta)
    SaiposService.sendOrderToSaipos(newOrder.id).catch(err => console.error('Erro Saipos:', err));

    return prisma.order.findUnique({
        where: { id: newOrder.id },
        include: { 
            items: { include: { product: { include: { categories: true } } } }, 
            deliveryOrder: true, 
            payments: true,
            user: { select: { name: true } }
        }
    });
  }

  /**
   * Adiciona itens a um pedido existente (Fluxo de Mesa)
   */
  async addItemsToOrder(orderId, items, userId = null) {
    let additionalTotal = 0;
    const processedItems = [];

    // Buscar o pedido original para saber o restaurantId e o tipo
    const originalOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { restaurant: { include: { settings: true } } }
    });

    if (!originalOrder) throw new Error("Pedido não encontrado.");
    
    const isAutoAccept = originalOrder.restaurant.settings?.autoAcceptOrders || false;

    for (const item of items) {
       const calculation = await this.calculateItemPrice(
        item.productId, 
        item.quantity, 
        item.sizeId, 
        item.addonsIds,
        item.flavorIds
      );
      
      additionalTotal += calculation.totalPrice;

      processedItems.push({
        orderId: orderId,
        productId: item.productId,
        quantity: item.quantity,
        priceAtTime: calculation.unitPrice,
        sizeJson: item.sizeJson || (calculation.sizeObj ? JSON.stringify(calculation.sizeObj) : null),
        addonsJson: item.addonsJson || (calculation.addonsObjects.length ? JSON.stringify(calculation.addonsObjects) : null),
        flavorsJson: item.flavorsJson || (calculation.flavorsObjects.length ? JSON.stringify(calculation.flavorsObjects) : null),
        observations: item.observations || ''
      });
    }

    const result = await prisma.$transaction(async (tx) => {
        await tx.orderItem.createMany({ data: processedItems });

        const newTotal = originalOrder.total + additionalTotal;

        const newStatus = isAutoAccept ? 'PREPARING' : 'PENDING';

        return await tx.order.update({
            where: { id: orderId },
            data: { 
                total: newTotal, 
                status: originalOrder.status === 'COMPLETED' ? 'COMPLETED' : newStatus,
                userId: userId // Atualiza o atendente/garçom
            },
            include: { 
                items: { include: { product: { include: { categories: true } } } },
                deliveryOrder: true,
                payments: true,
                user: { select: { name: true } }
            }
        });
    });

    // Sincronização com Saipos ao adicionar itens
    SaiposService.sendOrderToSaipos(orderId).catch(err => console.error('Erro Saipos (AddItems):', err));

    return result;
  }

  /**
   * Transfere uma mesa inteira para outra (Troca de Mesa)
   * Segurança: Usa UPDATE para não duplicar.
   */
  async transferTable(currentTableNumber, targetTableNumber, restaurantId) {
    // 1. Buscar o pedido da mesa atual
    const currentOrder = await prisma.order.findFirst({
        where: {
            restaurantId,
            tableNumber: parseInt(currentTableNumber),
            status: { notIn: ['COMPLETED', 'CANCELED'] }
        }
    });

    if (!currentOrder) throw new Error("Não há pedido aberto na mesa de origem.");

    // 2. Verificar se a mesa de destino está ocupada
    const targetOrder = await prisma.order.findFirst({
        where: {
            restaurantId,
            tableNumber: parseInt(targetTableNumber),
            status: { notIn: ['COMPLETED', 'CANCELED'] }
        }
    });

    return await prisma.$transaction(async (tx) => {
        // Se já existe pedido na mesa de destino, fazemos o MERGE (fundir pedidos)
        if (targetOrder) {
            // MOVER (UPDATE) os itens do pedido antigo para o novo.
            // Isso garante que não haja duplicidade de IDs nem novos disparos de impressão "CREATE".
            await tx.orderItem.updateMany({
                where: { orderId: currentOrder.id },
                data: { orderId: targetOrder.id }
            });

            // Recalcula o total do pedido de destino
            const newTotal = targetOrder.total + currentOrder.total;
            
            await tx.order.update({
                where: { id: targetOrder.id },
                data: { total: newTotal }
            });

            // Cancela/Fecha o pedido antigo (pois ele foi esvaziado)
            await tx.order.update({
                where: { id: currentOrder.id },
                data: { status: 'CANCELED', total: 0 } 
            });

            // Libera a mesa antiga
            await tx.table.updateMany({
                where: { number: parseInt(currentTableNumber), restaurantId },
                data: { status: 'free' }
            });

            return targetOrder; // Retorna o pedido consolidado
        } else {
            // Se a mesa de destino está vazia, apenas ALTERA O NÚMERO DA MESA no pedido existente.
            // Zero risco de duplicidade.
            const updatedOrder = await tx.order.update({
                where: { id: currentOrder.id },
                data: { tableNumber: parseInt(targetTableNumber) }
            });

            // Atualiza status das mesas
            await tx.table.updateMany({
                where: { number: parseInt(currentTableNumber), restaurantId },
                data: { status: 'free' }
            });

            await tx.table.updateMany({
                where: { number: parseInt(targetTableNumber), restaurantId },
                data: { status: 'occupied' }
            });

            return updatedOrder;
        }
    });
  }

  /**
   * Transfere itens específicos de uma mesa para outra.
   * Segurança: Usa UPDATE (Move o item) e não INSERT (Copia).
   */
  async transferItems(sourceOrderId, targetTableNumber, itemIds, restaurantId, userId) {
    const sourceOrder = await prisma.order.findUnique({
        where: { id: sourceOrderId },
        include: { items: true }
    });

    if (!sourceOrder) throw new Error("Pedido de origem não encontrado.");

    // Filtra os itens que serão movidos
    const itemsToTransfer = sourceOrder.items.filter(item => itemIds.includes(item.id));
    if (itemsToTransfer.length === 0) throw new Error("Nenhum item válido selecionado para transferência.");

    const transferTotal = itemsToTransfer.reduce((acc, item) => {
        // Soma o total (Preço no momento do pedido * Quantidade)
        return acc + (item.priceAtTime * item.quantity);
    }, 0);

    return await prisma.$transaction(async (tx) => {
        // 1. Verifica/Cria pedido na mesa de destino (Container necessário)
        let targetOrder = await tx.order.findFirst({
            where: {
                restaurantId,
                tableNumber: parseInt(targetTableNumber),
                status: { notIn: ['COMPLETED', 'CANCELED'] }
            }
        });

        if (!targetOrder) {
             // Se não existe pedido na mesa de destino, precisamos criar um "container" para receber os itens.
             // Isso NÃO gera duplicidade de item, apenas cria a comanda para onde eles vão.
             
             // Gerar número diário sequencial
             const today = new Date();
             today.setHours(0, 0, 0, 0);
             const lastOrder = await tx.order.findFirst({
                 where: { restaurantId, createdAt: { gte: today } },
                 orderBy: { dailyOrderNumber: 'desc' }
             });
             const nextNumber = (lastOrder?.dailyOrderNumber || 0) + 1;

            targetOrder = await tx.order.create({
                data: {
                    restaurantId,
                    tableNumber: parseInt(targetTableNumber),
                    status: 'PENDING', // Status inicial seguro
                    total: 0,
                    orderType: 'TABLE',
                    dailyOrderNumber: nextNumber,
                    userId: userId
                }
            });

            // Ocupa a mesa nova
            await tx.table.updateMany({
                where: { number: parseInt(targetTableNumber), restaurantId },
                data: { status: 'occupied' }
            });
        }

        // 2. MOVER OS ITENS (A mágica da segurança)
        // Alteramos apenas o `orderId` dos itens existentes. 
        // Eles mantêm seu ID original (`id`), o que previne re-impressões duplicadas se o sistema de impressão usar o ID do item para controle.
        await tx.orderItem.updateMany({
            where: { id: { in: itemIds } },
            data: { orderId: targetOrder.id }
        });

        // 3. Atualiza totais monetários das duas comandas
        
        // Subtrai da origem
        await tx.order.update({
            where: { id: sourceOrderId },
            data: { total: { decrement: transferTotal } }
        });

        // Adiciona no destino
        await tx.order.update({
            where: { id: targetOrder.id },
            data: { total: { increment: transferTotal } }
        });
        
        // Opcional: Se a origem ficou com total < 0 (erro de float), zera.
        // Se a origem ficou sem itens, deveríamos fechá-la?
        // Por enquanto, mantemos aberta mas zerada, ou o garçom fecha manualmente. 
        // É mais seguro manter aberta para evitar fechar mesa com cliente ainda lá.

        return targetOrder;
    });
  }

  /**
   * Remove um item do pedido (Cancelamento de Item)
   */
  async removeItemFromOrder(orderId, itemId) {
    const item = await prisma.orderItem.findUnique({
        where: { id: itemId }
    });

    if (!item) throw new Error("Item não encontrado.");
    if (item.orderId !== orderId) throw new Error("Item não pertence a este pedido.");

    const itemTotal = item.priceAtTime * item.quantity;

    return await prisma.$transaction(async (tx) => {
        // Remove o item do banco de dados
        await tx.orderItem.delete({
            where: { id: itemId }
        });

        // Atualiza o total do pedido
        const updatedOrder = await tx.order.update({
            where: { id: orderId },
            data: { total: { decrement: itemTotal } },
            include: { items: true }
        });
        
        if (updatedOrder.total < 0) {
             await tx.order.update({ where: { id: orderId }, data: { total: 0 } });
        }

        return updatedOrder;
    });
  }

  /**
   * Atualiza o status do pedido e executa efeitos colaterais (Estoque, Financeiro, Fiscal)
   */
  async updateOrderStatus(orderId, status) {
    const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status },
        include: { deliveryOrder: true, payments: true }
    });

    // 1. Sincronizar com o status de Delivery se necessário
    if (updatedOrder.orderType === 'DELIVERY' && updatedOrder.deliveryOrder) {
        let deliveryStatus = 'PENDING';
        if (status === 'PREPARING') deliveryStatus = 'CONFIRMED';
        if (status === 'READY') deliveryStatus = 'CONFIRMED';
        if (status === 'COMPLETED') deliveryStatus = 'DELIVERED';
        if (status === 'CANCELED') deliveryStatus = 'CANCELED';

        await prisma.deliveryOrder.update({
            where: { orderId: orderId },
            data: { status: deliveryStatus }
        });
    }

    // 2. Ações ao FINALIZAR (COMPLETED)
    if (status === 'COMPLETED') {
        // A. CONTABILIZAÇÃO NO CAIXA (Com Reconciliação de Cartões)
        const openSession = await prisma.cashierSession.findFirst({
            where: {
                restaurantId: updatedOrder.restaurantId,
                status: 'OPEN'
            }
        });

        // --- INÍCIO LÓGICA DE FIDELIDADE ---
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: updatedOrder.restaurantId },
            include: { settings: true }
        });

        if (restaurant?.settings?.loyaltyEnabled) {
            // Busca o cliente do pedido
            let customerId = updatedOrder.deliveryOrder?.customerId;
            
            // Se for mesa e tiver telefone (comanda), tenta achar ou criar cliente
            if (!customerId && updatedOrder.deliveryOrder?.phone) {
                 const cleanPhone = updatedOrder.deliveryOrder.phone.replace(/\D/g, '');
                 const customer = await prisma.customer.findFirst({
                     where: { phone: cleanPhone, restaurantId: updatedOrder.restaurantId }
                 });
                 customerId = customer?.id;
            }

            if (customerId) {
                const pointsToCredit = Math.floor(updatedOrder.total * (restaurant.settings.pointsPerReal || 0));
                const cashbackToCredit = updatedOrder.total * ((restaurant.settings.cashbackPercentage || 0) / 100);

                await prisma.customer.update({
                    where: { id: customerId },
                    data: {
                        loyaltyPoints: { increment: pointsToCredit },
                        cashbackBalance: { increment: cashbackToCredit }
                    }
                });
                console.log(`[LOYALTY] Creditado ${pointsToCredit} pontos e R$ ${cashbackToCredit.toFixed(2)} cashback para Cliente ID: ${customerId}`);
            }
        }
        // --- FIM LÓGICA DE FIDELIDADE ---

        if (openSession) {
            // Determina o método de pagamento principal
            const paymentMethodKey = updatedOrder.payments?.[0]?.method || updatedOrder.deliveryOrder?.paymentMethod || 'other';
            const totalAmount = updatedOrder.total + (updatedOrder.deliveryOrder?.deliveryFee || 0);

            // Busca configurações do método de pagamento (Taxas e Prazos)
            // Tenta encontrar pelo 'type' (ex: credit_card) ou pelo 'name'
            const paymentConfig = await prisma.paymentMethod.findFirst({
                where: {
                    restaurantId: updatedOrder.restaurantId,
                    OR: [
                        { type: paymentMethodKey },
                        { name: paymentMethodKey } // Fallback caso o front mande o nome
                    ]
                }
            });

            // Lógica de Reconciliação
            let finalAmount = totalAmount;
            let dueDate = new Date();
            let transactionStatus = 'PAID';
            let description = `Venda Pedido #${updatedOrder.dailyOrderNumber || updatedOrder.id.slice(-4)}`;

            if (paymentConfig) {
                // Aplica a taxa (MDR)
                if (paymentConfig.feePercentage > 0) {
                    const fee = totalAmount * (paymentConfig.feePercentage / 100);
                    finalAmount = totalAmount - fee;
                }

                // Aplica o prazo de recebimento (D+X)
                if (paymentConfig.daysToReceive > 0) {
                    dueDate.setDate(dueDate.getDate() + paymentConfig.daysToReceive);
                    transactionStatus = 'PENDING'; // Fica pendente até a data do repasse
                    description += ` (Prev. ${new Date(dueDate).toLocaleDateString()})`;
                }
            }

            await prisma.financialTransaction.create({
                data: {
                    description: description,
                    amount: parseFloat(finalAmount.toFixed(2)),
                    type: 'INCOME',
                    status: transactionStatus,
                    dueDate: dueDate,
                    paymentDate: transactionStatus === 'PAID' ? new Date() : null,
                    paymentMethod: paymentMethodKey,
                    restaurantId: updatedOrder.restaurantId,
                    orderId: updatedOrder.id,
                    cashierId: openSession.id
                }
            });
        }

        // B. BAIXA DE ESTOQUE (Com suporte a Ficha Técnica)
        const orderWithItems = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: { include: { ingredients: true, categories: true } } } } }
        });

        for (const item of orderWithItems.items) {
            if (item.product.ingredients && item.product.ingredients.length > 0) {
                // Baixa ingredientes (Ficha Técnica)
                for (const recipeItem of item.product.ingredients) {
                    await prisma.ingredient.update({
                        where: { id: recipeItem.ingredientId },
                        data: {
                            stock: {
                                decrement: recipeItem.quantity * item.quantity
                            }
                        }
                    });
                }
            } else {
                // Baixa produto final
                await prisma.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            decrement: item.quantity
                        }
                    }
                });
            }
        }

        // C. EMISSÃO AUTOMÁTICA DE NFC-e
        this._triggerAutomaticInvoice(updatedOrder).catch(err => console.error('[FISCAL BACKGROUND]', err));
    }

    return updatedOrder;
  }

  /**
   * Helper privado para emissão fiscal
   */
  async _triggerAutomaticInvoice(order) {
    try {
        const fiscalConfig = await prisma.restaurantFiscalConfig.findUnique({
            where: { restaurantId: order.restaurantId }
        });

        if (fiscalConfig && fiscalConfig.emissionMode === 'AUTOMATIC') {
            const FiscalService = require('./FiscalService'); // Lazy import
            console.log(`[FISCAL] Iniciando emissão automática para Pedido #${order.id}`);
            
            const fullOrder = await prisma.order.findUnique({
                where: { id: order.id },
                include: { items: { include: { product: true } } }
            });

            const result = await FiscalService.autorizarNfce(fullOrder, fiscalConfig, fullOrder.items);
            
            if (result.success) {
                await prisma.invoice.create({
                    data: {
                        restaurantId: order.restaurantId,
                        orderId: order.id,
                        type: 'NFCe',
                        status: 'AUTHORIZED',
                        issuedAt: new Date()
                    }
                });
                console.log(`[FISCAL] NFC-e autorizada para Pedido #${order.id}`);
            } else {
                console.error(`[FISCAL] Falha: ${result.error}`);
            }
        }
    } catch (error) {
        console.error('[FISCAL] Erro crítico:', error.message);
    }
  }

  async updateDeliveryType(orderId, deliveryType) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { deliveryOrder: true, restaurant: { include: { settings: true } } }
    });

    if (!order || !order.deliveryOrder) throw new Error('Pedido de delivery não encontrado.');

    const deliveryFee = deliveryType === 'delivery' ? (order.restaurant.settings?.deliveryFee || 0) : 0;
    
    const updateData = { deliveryType, deliveryFee };
    if (deliveryType === 'pickup') updateData.driverId = null;

    return await prisma.deliveryOrder.update({
        where: { id: order.deliveryOrder.id },
        data: updateData
    });
  }

  async getDriverSettlement(restaurantId, date) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0,0,0,0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    const orders = await prisma.order.findMany({
        where: {
            restaurantId: restaurantId,
            orderType: 'DELIVERY',
            status: 'COMPLETED',
            createdAt: { gte: targetDate, lt: nextDay },
            deliveryOrder: { driverId: { not: null } }
        },
        include: {
            deliveryOrder: { include: { driver: true } },
            payments: true
        }
    });

    const settlement = {};

    orders.forEach(order => {
        const driverId = order.deliveryOrder.driverId;
        const driver = order.deliveryOrder.driver;

        if (!settlement[driverId]) {
            settlement[driverId] = {
                driverName: driver.name,
                totalOrders: 0,
                cash: 0,
                card: 0,
                pix: 0,
                other: 0,
                deliveryFees: 0, // Taxas que o cliente pagou
                totalToPay: 0,   // O que o motoboy vai receber (Base + Bônus)
                storeNet: 0      // O que sobra pra loja
            };
            
            // Adiciona o valor base (Diária ou Turno) apenas uma vez no início
            if (driver.paymentType === 'DAILY' || driver.paymentType === 'SHIFT') {
                settlement[driverId].totalToPay += (driver.baseRate || 0);
            }
        }

        const s = settlement[driverId];
        s.totalOrders++;
        
        // Bônus por cada entrega realizada
        s.totalToPay += (driver.bonusPerDelivery || 0);
        
        // Se o tipo for apenas 'DELIVERY' (por entrega), o baseRate funciona como valor por entrega
        if (driver.paymentType === 'DELIVERY') {
            s.totalToPay += (driver.baseRate || 0);
        }

        s.deliveryFees += (order.deliveryOrder.deliveryFee || 0);

        const method = order.deliveryOrder.paymentMethod || 'cash';
        const amount = order.total + (order.deliveryOrder.deliveryFee || 0);
        
        if (method === 'cash') s.cash += amount;
        else if (method.includes('card')) s.card += amount;
        else if (method === 'pix') s.pix += amount;
        else s.other += amount;
    });

    // Calcula o saldo final
    Object.values(settlement).forEach(s => {
        // A loja recebe tudo que foi pago em métodos digitais, mas o motoboy pode estar com o dinheiro (cash)
        // StoreNet = (Vendas Totais) - (O que deve pagar ao motoboy)
        const totalSales = s.cash + s.card + s.pix + s.other;
        s.storeNet = totalSales - s.totalToPay;
    });

    return Object.values(settlement);
  }

  async payDriverSettlement(restaurantId, driverName, amount, date, driverId = null) {
     return await prisma.financialTransaction.create({
        data: {
            description: `ACERTO MOTOBOY: ${driverName} (Ref: ${date})`,
            amount: parseFloat(amount),
            type: 'EXPENSE', 
            status: 'PAID',
            dueDate: new Date(),
            paymentDate: new Date(),
            paymentMethod: 'cash',
            restaurantId: restaurantId,
            ...(driverId && { recipientUser: { connect: { id: driverId } } })
        }
    });
  }

    async getKdsItems(restaurantId, area) {
      const items = await prisma.orderItem.findMany({
          where: {
              order: {
                  restaurantId,
                  status: { in: ['PENDING', 'PREPARING'] }
              },
              product: {
                  productionArea: area || undefined
              },
              isReady: false
          },
          include: {
              product: { include: { categories: true } },
              order: {
                  select: {
                      id: true,
                      dailyOrderNumber: true,
                      tableNumber: true,
                      orderType: true,
                      createdAt: true,
                      customerName: true
                  }
              }
          },
          orderBy: { order: { createdAt: 'asc' } }
      });
  
      // Agrupamento por Pedido (Comanda)
      const groupedOrders = items.reduce((acc, item) => {
          const orderId = item.orderId;
          if (!acc[orderId]) {
              acc[orderId] = {
                  ...item.order,
                  items: []
              };
          }
          
          // Remove o objeto order de dentro do item para evitar redundância
          const { order, ...itemData } = item;
          acc[orderId].items.push(itemData);
          
          return acc;
      }, {});
  
      // Retorna como array ordenado pela data de criação do pedido
      return Object.values(groupedOrders).sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }
    async finishKdsItem(itemId) {

      // 1. Marca o item como pronto

      const updatedItem = await prisma.orderItem.update({

          where: { id: itemId },

          data: { isReady: true }, // Flag de "Pronto na Cozinha"

          include: { order: true }

      });

  

      const orderId = updatedItem.orderId;

  

      // 2. Verifica se TODOS os itens do pedido estão prontos

      const orderItems = await prisma.orderItem.findMany({

          where: { orderId: orderId }

      });

  

      const allItemsReady = orderItems.every(item => item.isReady);

  

      // 3. Se tudo estiver pronto, move o status do pedido para READY (Aguardando Entrega)

      if (allItemsReady) {

          console.log(`[KDS] Todos os itens do Pedido #${updatedItem.order.dailyOrderNumber} prontos. Atualizando status para READY.`);

          await this.updateOrderStatus(orderId, 'READY');

      }

  

      return updatedItem;

    }

    async markAsPrinted(orderId) {
        return await prisma.order.update({
            where: { id: orderId },
            data: { isPrinted: true }
        });
    }

    async updatePaymentMethod(orderId, newMethod, restaurantId) {
        return await prisma.$transaction(async (tx) => {
            // 1. Atualiza o pagamento principal do pedido
            await tx.payment.updateMany({
                where: { orderId },
                data: { method: newMethod }
            });

            // 2. Se for delivery, atualiza o campo de pagamento lá também
            await tx.deliveryOrder.updateMany({
                where: { orderId },
                data: { paymentMethod: newMethod }
            });

            // 3. Atualiza a transação financeira vinculada para o resumo do caixa bater
            await tx.financialTransaction.updateMany({
                where: { orderId, restaurantId },
                data: { paymentMethod: newMethod }
            });

            return { success: true };
        });
    }

  }

  

  module.exports = new OrderService();

  