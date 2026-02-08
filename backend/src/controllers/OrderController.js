const OrderService = require('../services/OrderService');
const asyncHandler = require('../middlewares/asyncHandler');
const { CreateDeliveryOrderSchema, AddItemsSchema, UpdateStatusSchema } = require('../schemas/orderSchema');

class OrderController {
  // POST /api/delivery/restaurants/:restaurantId/delivery-orders
  createDeliveryOrder = asyncHandler(async (req, res) => {
    const restaurantId = req.params.restaurantId || req.restaurantId || req.user?.restaurantId;
    
    // Validação e Transformação com Zod
    const validatedData = CreateDeliveryOrderSchema.parse(req.body);
    
    // Sobrescreve paymentMethod se vier no corpo principal
    const paymentMethod = validatedData.paymentMethod || validatedData.deliveryInfo?.paymentMethod;

    const order = await OrderService.createOrder({
      restaurantId,
      items: validatedData.items, 
      orderType: ['DELIVERY', 'PICKUP'].includes(validatedData.orderType) ? 'DELIVERY' : 'TABLE',
      deliveryInfo: validatedData.deliveryInfo,
      paymentMethod,
      tableNumber: validatedData.tableNumber,
      customerName: validatedData.deliveryInfo.name,
      userId: validatedData.userId || req.user?.id
    });

    res.status(201).json(order);
  });

  // POST /api/client/orders/:orderId/batch-add-items
  addItemsToOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    
    // Validação e Transformação
    const validatedData = AddItemsSchema.parse(req.body);

    const updatedOrder = await OrderService.addItemsToOrder(
      orderId, 
      validatedData.items, 
      validatedData.userId || req.user?.id
    );
    
    res.status(201).json(updatedOrder);
  });

  // PUT /api/admin/orders/:orderId/status
  updateStatus = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    
    const validatedData = UpdateStatusSchema.parse(req.body);

    const updatedOrder = await OrderService.updateOrderStatus(orderId, validatedData.status);
    res.json(updatedOrder);
  });

  // POST /api/admin/orders/transfer-table
  transferTable = asyncHandler(async (req, res) => {
      const { currentTableNumber, targetTableNumber, restaurantId } = req.body;
      
      if (!currentTableNumber || !targetTableNumber || !restaurantId) {
          res.status(400);
          throw new Error("Dados incompletos para transferência.");
      }

      const result = await OrderService.transferTable(currentTableNumber, targetTableNumber, restaurantId);
      res.json(result);
  });

  // POST /api/admin/orders/transfer-items
  transferItems = asyncHandler(async (req, res) => {
      const { sourceOrderId, targetTableNumber, itemIds, restaurantId, userId } = req.body;

      if (!sourceOrderId || !targetTableNumber || !itemIds || !itemIds.length) {
          res.status(400);
          throw new Error("Dados incompletos para transferência de itens.");
      }

      const result = await OrderService.transferItems(sourceOrderId, targetTableNumber, itemIds, restaurantId, userId);
      res.json(result);
  });

  // DELETE /api/admin/orders/:orderId/items/:itemId
  removeItem = asyncHandler(async (req, res) => {
      const { orderId, itemId } = req.params;
      const result = await OrderService.removeItemFromOrder(orderId, itemId);
      res.json(result);
  });

  // PATCH /api/admin/orders/:orderId/delivery-type
  updateDeliveryType = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { deliveryType } = req.body;

    const result = await OrderService.updateDeliveryType(orderId, deliveryType);
    res.json(result);
  });

  // GET /api/admin/orders/drivers/settlement
  getDriverSettlement = asyncHandler(async (req, res) => {
    const { date } = req.query;
    const restaurantId = req.restaurantId || req.user?.restaurantId; 
    
    if (!restaurantId) {
        res.status(403);
        throw new Error('Restaurante não identificado.');
    }

    const settlement = await OrderService.getDriverSettlement(restaurantId, date);
    res.json(settlement);
  });

  // POST /api/admin/orders/drivers/settlement/pay
  payDriverSettlement = asyncHandler(async (req, res) => {
    const { driverName, amount, date, driverId } = req.body;
    const restaurantId = req.restaurantId || req.user?.restaurantId;

    if (!restaurantId) {
        res.status(403);
        throw new Error('Restaurante não identificado.');
    }
    
    await OrderService.payDriverSettlement(restaurantId, driverName, amount, date, driverId);
    res.json({ success: true });
  });

  // GET /api/kds/items
  getKdsItems = asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId || req.user?.restaurantId;
    const { area } = req.query;

    if (!restaurantId) {
        res.status(403);
        throw new Error('Acesso negado.');
    }

    const items = await OrderService.getKdsItems(restaurantId, area);
    res.json(items);
  });

  // PUT /api/admin/orders/kds/items/:itemId/finish
  finishKdsItem = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    await OrderService.finishKdsItem(itemId);
    res.json({ success: true });
  });

  // PUT /api/admin/orders/:orderId/payment-method
  updatePaymentMethod = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { newMethod } = req.body;
    const restaurantId = req.restaurantId;

    const result = await OrderService.updatePaymentMethod(orderId, newMethod, restaurantId);
    res.json(result);
  });

  // PUT /api/admin/orders/:orderId/printed
  markAsPrinted = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    await OrderService.markAsPrinted(orderId);
    res.json({ success: true });
  });
}

module.exports = new OrderController();