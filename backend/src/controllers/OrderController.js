const OrderService = require('../services/OrderService');

class OrderController {
  constructor() {
    this._extractIdsFromItem = this._extractIdsFromItem.bind(this);
    this.createDeliveryOrder = this.createDeliveryOrder.bind(this);
    this.addItemsToOrder = this.addItemsToOrder.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
    this.transferTable = this.transferTable.bind(this);
    this.transferItems = this.transferItems.bind(this);
    this.removeItem = this.removeItem.bind(this);
    this.updateDeliveryType = this.updateDeliveryType.bind(this);
    this.getDriverSettlement = this.getDriverSettlement.bind(this);
    this.payDriverSettlement = this.payDriverSettlement.bind(this);
    this.getKdsItems = this.getKdsItems.bind(this);
    this.finishKdsItem = this.finishKdsItem.bind(this);
    this.markAsPrinted = this.markAsPrinted.bind(this);
    this.updatePaymentMethod = this.updatePaymentMethod.bind(this);
  }

  async updatePaymentMethod(req, res) {
    const { orderId } = req.params;
    const { newMethod } = req.body;
    const restaurantId = req.restaurantId;

    try {
        const result = await OrderService.updatePaymentMethod(orderId, newMethod, restaurantId);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Erro ao atualizar forma de pagamento.' });
    }
  }

  async markAsPrinted(req, res) {
    const { orderId } = req.params;
    try {
        await OrderService.markAsPrinted(orderId);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao marcar como impresso.' });
    }
  }

  /**
   * Helper para extrair IDs dos JSONs legados enviados pelo frontend
   * (Mantido aqui pois é específico de parsing da requisição HTTP)
   */
  _extractIdsFromItem(item) {
    let sizeId = item.sizeId || null;
    let addonsIds = item.addonsIds || [];
    let flavorIds = item.flavorIds || [];

    if (!sizeId && item.sizeJson) {
      try {
        const sizeObj = typeof item.sizeJson === 'string' ? JSON.parse(item.sizeJson) : item.sizeJson;
        sizeId = sizeObj?.id || null;
      } catch (e) {}
    }

    if (addonsIds.length === 0 && item.addonsJson) {
      try {
        const addonsArr = typeof item.addonsJson === 'string' ? JSON.parse(item.addonsJson) : item.addonsJson;
        if (Array.isArray(addonsArr)) {
          addonsArr.forEach(a => {
            const qty = a.quantity || 1;
            for (let i = 0; i < qty; i++) {
              if (a.id) addonsIds.push(a.id);
            }
          });
        }
      } catch (e) {}
    }

    if (flavorIds.length === 0 && item.flavorsJson) {
      try {
        const flavorsArr = typeof item.flavorsJson === 'string' ? JSON.parse(item.flavorsJson) : item.flavorsJson;
        if (Array.isArray(flavorsArr)) {
          flavorIds = flavorsArr.map(f => f.id).filter(id => id);
        }
      } catch (e) {}
    }

    return { sizeId, addonsIds, flavorIds };
  }

  // POST /api/delivery/restaurants/:restaurantId/delivery-orders
  async createDeliveryOrder(req, res) {
    const restaurantId = req.params.restaurantId || req.restaurantId || req.user?.restaurantId;
    const { items, deliveryInfo, orderType, tableNumber, userId, customerName } = req.body;
    const paymentMethod = req.body.paymentMethod || deliveryInfo?.paymentMethod;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Carrinho vazio.' });
    }

    try {
      // Normalização dos itens
      const formattedItems = items.map(item => {
        const { sizeId, addonsIds, flavorIds } = this._extractIdsFromItem(item);
        return {
          productId: item.productId,
          quantity: item.quantity,
          observations: item.observations || item.observation,
          sizeId,
          addonsIds,
          flavorIds,
          sizeJson: item.sizeJson,
          addonsJson: item.addonsJson,
          flavorsJson: item.flavorsJson
        };
      });

      const order = await OrderService.createOrder({
        restaurantId,
        items: formattedItems,
        orderType: orderType || 'DELIVERY',
        deliveryInfo,
        paymentMethod,
        tableNumber,
        customerName,
        userId: userId || req.user?.id
      });

      res.status(201).json(order);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      res.status(400).json({ error: error.message || 'Erro ao processar pedido.' });
    }
  }

  // POST /api/client/orders/:orderId/batch-add-items
  async addItemsToOrder(req, res) {
    const { orderId } = req.params;
    const { items, userId } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Nenhum item para adicionar.' });
    }

    try {
      const formattedItems = items.map(item => {
        const { sizeId, addonsIds, flavorIds } = this._extractIdsFromItem(item);
        return {
          productId: item.productId,
          quantity: item.quantity,
          observations: item.observations || item.observation,
          sizeId,
          addonsIds,
          flavorIds,
          sizeJson: item.sizeJson,
          addonsJson: item.addonsJson,
          flavorsJson: item.flavorsJson
        };
      });

      const updatedOrder = await OrderService.addItemsToOrder(orderId, formattedItems, userId || req.user?.id);
      res.status(201).json(updatedOrder);
    } catch (error) {
      console.error('Erro ao adicionar itens:', error);
      res.status(400).json({ error: error.message || 'Erro ao processar itens.' });
    }
  }

  // PUT /api/admin/orders/:orderId/status
  async updateStatus(req, res) {
    const { orderId } = req.params;
    const { status } = req.body;

    try {
        // Delega TODA a lógica de efeitos colaterais (estoque, financeiro, fiscal) para o Service
        const updatedOrder = await OrderService.updateOrderStatus(orderId, status);
        res.json(updatedOrder);
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ error: error.message || 'Erro ao atualizar status.' });
    }
  }

  // POST /api/admin/orders/transfer-table
  async transferTable(req, res) {
      const { currentTableNumber, targetTableNumber, restaurantId } = req.body;
      
      if (!currentTableNumber || !targetTableNumber || !restaurantId) {
          return res.status(400).json({ error: "Dados incompletos para transferência." });
      }

      try {
          const result = await OrderService.transferTable(currentTableNumber, targetTableNumber, restaurantId);
          res.json(result);
      } catch (error) {
          console.error('Erro ao transferir mesa:', error);
          res.status(400).json({ error: error.message });
      }
  }

  // POST /api/admin/orders/transfer-items
  async transferItems(req, res) {
      const { sourceOrderId, targetTableNumber, itemIds, restaurantId, userId } = req.body;

      if (!sourceOrderId || !targetTableNumber || !itemIds || !itemIds.length) {
          return res.status(400).json({ error: "Dados incompletos para transferência de itens." });
      }

      try {
          const result = await OrderService.transferItems(sourceOrderId, targetTableNumber, itemIds, restaurantId, userId);
          res.json(result);
      } catch (error) {
          console.error('Erro ao transferir itens:', error);
          res.status(400).json({ error: error.message });
      }
  }

  // DELETE /api/admin/orders/:orderId/items/:itemId
  async removeItem(req, res) {
      const { orderId, itemId } = req.params;

      try {
          const result = await OrderService.removeItemFromOrder(orderId, itemId);
          res.json(result);
      } catch (error) {
          console.error('Erro ao remover item:', error);
          res.status(400).json({ error: error.message });
      }
  }

  // PATCH /api/admin/orders/:orderId/delivery-type
  async updateDeliveryType(req, res) {
    const { orderId } = req.params;
    const { deliveryType } = req.body;

    try {
        const result = await OrderService.updateDeliveryType(orderId, deliveryType);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao alterar tipo de entrega.' });
    }
  }

  // GET /api/admin/orders/drivers/settlement
  async getDriverSettlement(req, res) {
    try {
        const { date } = req.query;
        // Assume req.restaurantId vindo do middleware de auth
        const restaurantId = req.restaurantId || req.user?.restaurantId; 
        
        if (!restaurantId) return res.status(403).json({ error: 'Restaurante não identificado.' });

        const settlement = await OrderService.getDriverSettlement(restaurantId, date);
        res.json(settlement);
    } catch (error) {
        console.error("Erro no acerto:", error);
        res.status(500).json({ error: 'Erro ao gerar acerto.' });
    }
  }

  // POST /api/admin/orders/drivers/settlement/pay
  async payDriverSettlement(req, res) {
    try {
        const { driverName, amount, date, driverId } = req.body;
        const restaurantId = req.restaurantId || req.user?.restaurantId;

        if (!restaurantId) return res.status(403).json({ error: 'Restaurante não identificado.' });
        
        await OrderService.payDriverSettlement(restaurantId, driverName, amount, date, driverId);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar acerto.' });
    }
  }

  // GET /api/kds/items
  async getKdsItems(req, res) {
    const restaurantId = req.restaurantId || req.user?.restaurantId;
    const { area } = req.query;

    if (!restaurantId) return res.status(403).json({ error: 'Acesso negado.' });

    try {
        const items = await OrderService.getKdsItems(restaurantId, area);
        res.json(items);
    } catch (error) {
        console.error('Erro ao buscar itens KDS:', error);
        res.status(500).json({ error: 'Erro ao buscar itens KDS.' });
    }
  }

  // PUT /api/admin/orders/kds/items/:itemId/finish
  async finishKdsItem(req, res) {
    const { itemId } = req.params;
    try {
        await OrderService.finishKdsItem(itemId);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao finalizar item no KDS.' });
    }
  }
}

module.exports = new OrderController();