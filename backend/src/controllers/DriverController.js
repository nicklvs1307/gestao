const prisma = require('../lib/prisma');
const logger = require('../config/logger');

class DriverController {
  constructor() {
    this.getAvailableOrders = this.getAvailableOrders.bind(this);
    this.getMyOrders = this.getAvailableOrders.bind(this);
    this.updateOrderStatus = this.updateOrderStatus.bind(this);
    this.getHistory = this.getHistory.bind(this); // Novo
    this.updatePaymentMethod = this.updatePaymentMethod.bind(this); // Novo
    this.geocode = this.geocode.bind(this); // Novo: Geolocalização centralizada
    this.getRoute = this.getRoute.bind(this); // Novo: Roteirização centralizada
  }

  // POST /driver/geocode
  async geocode(req, res) {
      const { address } = req.body;
      const { restaurantId } = req; // Pegar do middleware de auth
      const GeocodingService = require('../services/GeocodingService');
      const coords = await GeocodingService.getCoordinates(address, restaurantId);
      if (!coords) return res.status(404).json({ error: 'Endereço não localizado.' });
      res.json(coords);
  }

  // POST /driver/route
  async getRoute(req, res) {
      const { start, end } = req.body; // [lat, lng]
      const axios = require('axios');
      const apiKey = process.env.VITE_OPENROUTE_KEY || process.env.OPENROUTE_KEY;
      
      try {
          // Tentar ORS
          if (apiKey) {
              const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;
              const response = await axios.get(url);
              if (response.data.features?.length > 0) {
                  const coords = response.data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
                  return res.json({ route: coords });
              }
          }
          
          // Fallback OSRM
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
          const response = await axios.get(osrmUrl);
          if (response.data.routes?.length > 0) {
              const coords = response.data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
              return res.json({ route: coords });
          }
          
          res.status(404).json({ error: 'Rota não encontrada.' });
      } catch (e) {
          res.status(500).json({ error: 'Erro ao calcular rota.' });
      }
  }

  // ... (restante dos métodos)

  // Histórico de entregas do motoboy (Apenas as concluídas por ele hoje)
  async getHistory(req, res) {
    const { restaurantId } = req;
    const driverId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const orders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: 'COMPLETED',
          deliveryOrder: { driverId: driverId },
          updatedAt: { gte: today }
        },
        include: {
          deliveryOrder: true,
          payments: true
        },
        orderBy: { updatedAt: 'desc' }
      });
      res.json(orders);
    } catch (e) {
      res.status(500).json({ error: 'Erro ao buscar histórico.' });
    }
  }

  // Permitir que o motoboy corrija a forma de pagamento do pedido
  async updatePaymentMethod(req, res) {
    const { orderId } = req.params;
    const { method } = req.body;
    const { restaurantId } = req;

    try {
      const OrderService = require('../services/OrderService');
      await OrderService.updatePaymentMethod(orderId, method, restaurantId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Erro ao atualizar pagamento.' });
    }
  }

  // Listar pedidos prontos para entrega (READY) e pedidos do motoboy logado
  async getAvailableOrders(req, res) {
    const { restaurantId } = req;
    const driverId = req.user.id;

    try {
      // 1. Buscar Meus Pedidos (Já vinculados a mim e não finalizados)
      const myOrders = await prisma.order.findMany({
        where: {
          restaurantId,
          orderType: 'DELIVERY',
          status: { in: ['READY', 'SHIPPED'] },
          deliveryOrder: { 
            driverId: driverId,
            deliveryType: 'delivery' // Filtra apenas entregas reais
          }
        },
        include: {
          deliveryOrder: { include: { customer: true } },
          items: { include: { product: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      // 2. Buscar Pedidos Disponíveis (Prontos e sem motoboy vinculado)
      const availableOrders = await prisma.order.findMany({
        where: {
          restaurantId,
          orderType: 'DELIVERY',
          status: 'READY',
          deliveryOrder: { 
            driverId: null, // Sem dono
            deliveryType: 'delivery' // Filtra apenas entregas reais
          }
        },
        include: {
          deliveryOrder: { include: { customer: true } },
          items: { include: { product: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json({
          myOrders,
          availableOrders
      });
    } catch (error) {
      logger.error(error);
      res.status(500).json({ error: 'Erro ao buscar pedidos para o entregador.' });
    }
  }

  // Atualizar status da entrega (Assumir entrega ou Concluir)
  async updateOrderStatus(req, res) {
    const { orderId } = req.params;
    const { status } = req.body; // 'SHIPPED' (Saiu para entrega) ou 'COMPLETED' (Entregue)
    const driverId = req.user.id;

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { deliveryOrder: true }
      });

      if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

      // Se estiver saindo para entrega, vincula o motoboy se ainda não estiver vinculado
      if (status === 'SHIPPED' && !order.deliveryOrder?.driverId) {
        await prisma.deliveryOrder.update({
          where: { orderId: orderId },
          data: { driverId }
        });
      }

      // Usa o OrderService para garantir que baixa de estoque e financeiro sejam processados
      const OrderService = require('../services/OrderService');
      await OrderService.updateOrderStatus(orderId, status);

      res.json({ success: true });
    } catch (error) {
      logger.error(error);
      res.status(500).json({ error: 'Erro ao atualizar status da entrega.' });
    }
  }
}

module.exports = new DriverController();
