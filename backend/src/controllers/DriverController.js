const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const OrderService = require('../services/OrderService');
const GeocodingService = require('../services/GeocodingService');
const axios = require('axios');

class DriverController {
  constructor() {
    this.getAvailableOrders = this.getAvailableOrders.bind(this);
    this.updateOrderStatus = this.updateOrderStatus.bind(this);
    this.getHistory = this.getHistory.bind(this);
    this.updatePaymentMethod = this.updatePaymentMethod.bind(this);
    this.geocode = this.geocode.bind(this);
    this.getRoute = this.getRoute.bind(this);
    this.updateOnlineStatus = this.updateOnlineStatus.bind(this);
  }

  // PATCH /driver/status - Atualiza status online/offline do entregador
  async updateOnlineStatus(req, res) {
    const { restaurantId } = req;
    const driverId = req.user.id;
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ error: 'Campo isOnline deve ser booleano.' });
    }

    try {
      await prisma.user.update({
        where: { id: driverId },
        data: { isOnline },
      });
      res.json({ success: true, isOnline });
    } catch (error) {
      logger.error('Erro ao atualizar status do entregador:', error);
      res.status(500).json({ error: 'Erro ao atualizar status.' });
    }
  }

  // POST /driver/geocode
  async geocode(req, res) {
    const { address } = req.body;
    const { restaurantId } = req;

    if (!address || typeof address !== 'string' || address.trim().length < 5) {
      return res.status(400).json({ error: 'Endereço é obrigatório e deve ter pelo menos 5 caracteres.' });
    }

    try {
      const coords = await GeocodingService.getCoordinates(address.trim(), restaurantId);
      if (!coords) {
        return res.status(404).json({ error: 'Endereço não localizado.' });
      }
      res.json(coords);
    } catch (error) {
      logger.error('Erro ao geocodificar endereço:', error);
      res.status(500).json({ error: 'Erro ao geocodificar endereço.' });
    }
  }

  // POST /driver/route
  async getRoute(req, res) {
    const { start, end } = req.body;

    // Validação de entrada
    if (!start || !end || !Array.isArray(start) || !Array.isArray(end) ||
        start.length !== 2 || end.length !== 2 ||
        typeof start[0] !== 'number' || typeof start[1] !== 'number' ||
        typeof end[0] !== 'number' || typeof end[1] !== 'number') {
      return res.status(400).json({ error: 'Coordenadas start e end devem ser arrays [lat, lng].' });
    }

    const apiKey = process.env.OPENROUTE_KEY;

    try {
      // Tentar ORS primeiro
      if (apiKey) {
        try {
          const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;
          const response = await axios.get(url, { timeout: 10000 });
          if (response.data.features?.length > 0) {
            const coords = response.data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
            return res.json({ route: coords });
          }
        } catch (orsError) {
          logger.warn('ORS falhou, tentando OSRM:', orsError.message);
        }
      }

      // Fallback OSRM
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      const response = await axios.get(osrmUrl, { timeout: 10000 });
      if (response.data.routes?.length > 0) {
        const coords = response.data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        return res.json({ route: coords });
      }

      res.status(404).json({ error: 'Rota não encontrada.' });
    } catch (e) {
      logger.error('Erro ao calcular rota:', e);
      res.status(500).json({ error: 'Erro ao calcular rota.' });
    }
  }

  // GET /driver/history - Histórico de entregas do motoboy
  async getHistory(req, res) {
    const { restaurantId } = req;
    const driverId = req.user.id;
    const { days = 7 } = req.query; // Default: últimos 7 dias
    const limit = Math.min(parseInt(req.query.limit) || 50, 200); // Max 200

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    since.setHours(0, 0, 0, 0);

    try {
      const orders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: 'COMPLETED',
          deliveryOrder: { driverId },
          updatedAt: { gte: since }
        },
        include: {
          deliveryOrder: true,
          payments: true
        },
        orderBy: { updatedAt: 'desc' },
        take: limit
      });
      res.json(orders);
    } catch (e) {
      logger.error('Erro ao buscar histórico:', e);
      res.status(500).json({ error: 'Erro ao buscar histórico.' });
    }
  }

  // PATCH /driver/orders/:orderId/payment-method
  async updatePaymentMethod(req, res) {
    const { orderId } = req.params;
    const { method } = req.body;
    const { restaurantId } = req;

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ error: 'ID do pedido é obrigatório.' });
    }

    if (!method || typeof method !== 'string') {
      return res.status(400).json({ error: 'Método de pagamento é obrigatório.' });
    }

    try {
      await OrderService.updatePaymentMethod(orderId, method, restaurantId);
      res.json({ success: true });
    } catch (e) {
      logger.error('Erro ao atualizar pagamento:', e);
      res.status(500).json({ error: 'Erro ao atualizar pagamento.' });
    }
  }

  // GET /driver/orders - Listar pedidos prontos e disponíveis
  async getAvailableOrders(req, res) {
    const { restaurantId } = req;
    const driverId = req.user.id;

    try {
      // 1. Meus Pedidos (vinculados a mim e não finalizados)
      const myOrders = await prisma.order.findMany({
        where: {
          restaurantId,
          orderType: 'DELIVERY',
          status: { in: ['READY', 'SHIPPED'] },
          deliveryOrder: {
            driverId,
            deliveryType: 'delivery'
          }
        },
        include: {
          deliveryOrder: { include: { customer: true } },
          items: { include: { product: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      // 2. Pedidos Disponíveis (prontos e sem motoboy)
      const availableOrders = await prisma.order.findMany({
        where: {
          restaurantId,
          orderType: 'DELIVERY',
          status: 'READY',
          deliveryOrder: {
            driverId: null,
            deliveryType: 'delivery'
          }
        },
        include: {
          deliveryOrder: { include: { customer: true } },
          items: { include: { product: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json({ myOrders, availableOrders });
    } catch (error) {
      logger.error('Erro ao buscar pedidos para entregador:', error);
      res.status(500).json({ error: 'Erro ao buscar pedidos para o entregador.' });
    }
  }

  // PATCH /driver/orders/:orderId/status
  async updateOrderStatus(req, res) {
    const { orderId } = req.params;
    const { status } = req.body;
    const driverId = req.user.id;

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ error: 'ID do pedido é obrigatório.' });
    }

    const validStatuses = ['SHIPPED', 'COMPLETED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status deve ser um destes: ${validStatuses.join(', ')}` });
    }

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { deliveryOrder: true }
      });

      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado.' });
      }

      // Vincula motoboy ao sair para entrega
      if (status === 'SHIPPED' && !order.deliveryOrder?.driverId) {
        await prisma.deliveryOrder.update({
          where: { orderId },
          data: { driverId }
        });
      }

      await OrderService.updateOrderStatus(orderId, status);

      res.json({ success: true });
    } catch (error) {
      logger.error('Erro ao atualizar status da entrega:', error);
      res.status(500).json({ error: 'Erro ao atualizar status da entrega.' });
    }
  }
}

module.exports = new DriverController();
