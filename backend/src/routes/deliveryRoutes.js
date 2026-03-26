const express = require('express');
const logger = require('../config/logger');
const router = express.Router();
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const OrderController = require('../controllers/OrderController');
const { needsAuth, authenticateToken, setRestaurantId } = require('../middlewares/auth');

// Middleware para rotas de delivery que podem ou não ter auth
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (!err) req.user = user;
            next();
        });
    } else {
        next();
    }
};

router.get('/restaurant/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        const now = new Date();
        const startOfTodayUTC = new Date();
        startOfTodayUTC.setUTCHours(0, 0, 0, 0);

        let restaurant = await prisma.restaurant.findFirst({
            where: { 
                slug: {
                    equals: slug,
                    mode: 'insensitive'
                }
            },
            include: {
                settings: true,
                paymentMethods: {
                    where: { 
                        isActive: true,
                        allowDelivery: true
                    },
                    select: { id: true, name: true, type: true }
                },
                categories: {
                    orderBy: { order: 'asc' },
                    include: {
                        addonGroups: {
                            orderBy: { order: 'asc' },
                            include: {
                                addons: { orderBy: { order: 'asc' } },
                            },
                        },
                        products: {
                            where: { isAvailable: true },
                            orderBy: { order: 'asc' },
                            include: {
                                sizes: { orderBy: { order: 'asc' } },
                                addonGroups: {
                                    orderBy: { order: 'asc' },
                                    include: {
                                        addons: { orderBy: { order: 'asc' } },
                                    },
                                },
                                promotions: {
                                    where: { 
                                        isActive: true,
                                        startDate: { lte: now },
                                        endDate: { gte: startOfTodayUTC }
                                    }
                                }
                            },
                        },
                    },
                },
            },
        });
  
      if (!restaurant) {
        return res.status(404).json({ error: 'Restaurante não encontrado.' });
      }

      // Aplicar ordenação personalizada de grupos se existir o campo addonGroupsOrder
      // (Mesma lógica do ProductService para manter consistência no cardápio de delivery)
      restaurant.categories.forEach(category => {
          if (category.products) {
              category.products = category.products.map(product => {
                  if (product.addonGroupsOrder && Array.isArray(product.addonGroupsOrder) && product.addonGroupsOrder.length > 0) {
                      const orderMap = new Map();
                      product.addonGroupsOrder.forEach((id, index) => orderMap.set(id, index));

                      product.addonGroups.sort((a, b) => {
                          const orderA = orderMap.has(a.id) ? orderMap.get(a.id) : 999;
                          const orderB = orderMap.has(b.id) ? orderMap.get(b.id) : 999;
                          return orderA - orderB;
                      });
                  }
                  return product;
              });
          }
      });

      // Se não houver formas de pagamento, cria as padrões para não travar o cardápio
      if (restaurant.paymentMethods.length === 0) {
        const defaults = [
            { name: 'Dinheiro', type: 'CASH', allowDelivery: true, allowPos: true, allowTable: true },
            { name: 'Pix', type: 'PIX', allowDelivery: true, allowPos: true, allowTable: true },
            { name: 'Cartão de Crédito', type: 'CREDIT_CARD', allowDelivery: true, allowPos: true, allowTable: true },
            { name: 'Cartão de Débito', type: 'DEBIT_CARD', allowDelivery: true, allowPos: true, allowTable: true },
        ];

        await prisma.paymentMethod.createMany({
            data: defaults.map(d => ({ ...d, restaurantId: restaurant.id }))
        });

        // Recarrega apenas os pagamentos
        restaurant.paymentMethods = await prisma.paymentMethod.findMany({
            where: { 
                restaurantId: restaurant.id,
                isActive: true,
                allowDelivery: true
            },
            select: { id: true, name: true, type: true }
        });
      }
  
      res.json(restaurant);
    } catch (error) {
      logger.error(`Erro ao buscar restaurante pelo slug ${slug}:`, error);
      res.status(500).json({ error: 'Não foi possível buscar os dados do restaurante.' });
    }
  });

// Rota para buscar todos os pedidos de delivery de um restaurante (PROTEGIDO)
router.get('/restaurants/:restaurantId/delivery-orders', authenticateToken, setRestaurantId, async (req, res) => {
  const { restaurantId } = req.params;
  try {
    const deliveryOrders = await prisma.deliveryOrder.findMany({
      where: {
        order: {
          restaurantId: restaurantId,
        },
      },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    });
    res.json(deliveryOrders);
  } catch (error) {
    logger.error('Erro ao buscar pedidos de delivery:', error);
    res.status(500).json({ error: 'Erro ao buscar pedidos de delivery' });
  }
});

router.post('/restaurants/:restaurantId/delivery-orders', optionalAuth, (req, res) => OrderController.createDeliveryOrder(req, res));

// Rota para atribuir entregador ao pedido (PROTEGIDO)
router.patch('/delivery-orders/:orderId/assign-driver', authenticateToken, setRestaurantId, async (req, res) => {
    const { orderId } = req.params;
    const { driverId } = req.body;

    try {
        // Verifica se é pelo orderId ou deliveryOrderId. 
        // Vamos tentar buscar pelo orderId primeiro (relação 1:1)
        const deliveryOrder = await prisma.deliveryOrder.findUnique({
            where: { orderId: orderId }
        });

        if (!deliveryOrder) {
            return res.status(404).json({ error: 'Pedido de delivery não encontrado.' });
        }

        const updated = await prisma.deliveryOrder.update({
            where: { id: deliveryOrder.id },
            data: { driverId }
        });
        
        // Opcional: Atualizar status para OUT_FOR_DELIVERY se já não estiver
        
        res.json(updated);
    } catch (error) {
        logger.error('Erro ao atribuir entregador:', error);
        res.status(500).json({ error: 'Erro ao atribuir entregador.' });
    }
});

// Rota pública para acompanhamento de pedido (sem autenticação)
router.get('/public/order/:orderId', async (req, res) => {
    const { orderId } = req.params;
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: { include: { product: true } },
                deliveryOrder: true,
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        logoUrl: true
                    }
                }
            }
        });
        if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar pedido.' });
    }
});

// Rota para buscar detalhes de um pedido (PROTEGIDA - admin/restaurante)
router.get('/order/:orderId', authenticateToken, async (req, res) => {
    const { orderId } = req.params;
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: { include: { product: true } },
                deliveryOrder: true,
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        logoUrl: true
                    }
                }
            }
        });
        if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar pedido.' });
    }
});

module.exports = router;
