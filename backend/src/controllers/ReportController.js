const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const { startOfDay, endOfDay } = require('date-fns');

const ReportController = {
    // GET /api/admin/reports/dre?startDate=...&endDate=...
    async getDre(req, res) {
        try {
            const { restaurantId } = req;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ error: 'Datas são obrigatórias' });
            }

            const start = startOfDay(new Date(startDate));
            const end = endOfDay(new Date(endDate));

            // 1. Agregação de Receita Bruta (Rápido)
            const revenueStats = await prisma.order.aggregate({
                where: {
                    restaurantId,
                    status: 'COMPLETED',
                    createdAt: { gte: start, lte: end }
                },
                _sum: { total: true }
            });
            const grossRevenue = revenueStats._sum.total || 0;

            // 2. Cálculo de CMV (Otimizado: Traz apenas o necessário para o cálculo)
            const orders = await prisma.order.findMany({
                where: {
                    restaurantId,
                    status: 'COMPLETED',
                    createdAt: { gte: start, lte: end }
                },
                select: {
                    items: {
                        select: {
                            quantity: true,
                            product: {
                                select: {
                                    ingredients: {
                                        select: {
                                            quantity: true,
                                            ingredient: { select: { lastUnitCost: true, averageCost: true } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            let totalCmv = 0;
            orders.forEach(order => {
                order.items.forEach(item => {
                    let itemCost = 0;
                    if (item.product?.ingredients?.length > 0) {
                        itemCost = item.product.ingredients.reduce((sum, link) => {
                            // Prioriza Custo Médio (mais preciso para DRE)
                            const cost = link.ingredient.averageCost || link.ingredient.lastUnitCost || 0;
                            return sum + (cost * link.quantity);
                        }, 0);
                    }
                    totalCmv += (itemCost * item.quantity);
                });
            });

            // 3. Agregação de Despesas por Categoria (GroupBy direto no Banco)
            const expenseStats = await prisma.financialTransaction.groupBy({
                by: ['categoryId'],
                where: {
                    restaurantId,
                    type: 'EXPENSE',
                    status: 'PAID',
                    paymentDate: { gte: start, lte: end }
                },
                _sum: { amount: true }
            });

            // Busca nomes das categorias para o breakdown
            const categoryIds = expenseStats.map(s => s.categoryId).filter(Boolean);
            const categories = await prisma.transactionCategory.findMany({
                where: { id: { in: categoryIds } },
                select: { id: true, name: true }
            });

            const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
            const expensesByCategory = {};
            let totalOperatingExpenses = 0;

            expenseStats.forEach(s => {
                const name = categoryMap[s.categoryId] || 'Diversos';
                expensesByCategory[name] = s._sum.amount || 0;
                totalOperatingExpenses += (s._sum.amount || 0);
            });

            // 4. Outras Receitas (Agregação)
            const otherIncomeStats = await prisma.financialTransaction.aggregate({
                where: {
                    restaurantId,
                    type: 'INCOME',
                    status: 'PAID',
                    paymentDate: { gte: start, lte: end },
                    orderId: null
                },
                _sum: { amount: true }
            });
            const totalOtherIncomes = otherIncomeStats._sum.amount || 0;

            const grossProfit = grossRevenue - totalCmv;
            const netProfit = grossProfit - totalOperatingExpenses + totalOtherIncomes;

            res.json({
                period: { start, end },
                grossRevenue,
                totalCmv: Math.round(totalCmv * 100) / 100,
                cmvPercentage: grossRevenue > 0 ? (totalCmv / grossRevenue) * 100 : 0,
                grossProfit,
                grossMargin: grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0,
                operatingExpenses: {
                    total: totalOperatingExpenses,
                    breakdown: expensesByCategory
                },
                netProfit,
                netMargin: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0
            });

        } catch (error) {
            logger.error('Erro ao gerar DRE:', error);
            res.status(500).json({ error: 'Erro ao processar DRE Gerencial.' });
        }
    },

    async getStaffPerformance(req, res) {
        try {
            const { restaurantId } = req;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ error: 'Datas são obrigatórias' });
            }

            const start = startOfDay(new Date(startDate));
            const end = endOfDay(new Date(endDate));

            const stats = await prisma.order.groupBy({
                by: ['userId'],
                where: {
                    restaurantId,
                    status: 'COMPLETED',
                    userId: { not: null },
                    createdAt: { gte: start, lte: end }
                },
                _sum: { total: true },
                _count: { id: true }
            });

            // Batch fetch users to avoid N+1 query
            const userIds = stats.map(s => s.userId);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true, roleRef: { select: { name: true } } }
            });
            const userMap = new Map(users.map(u => [u.id, u]));

            const staffDetails = stats.map(s => {
                const user = userMap.get(s.userId);
                return {
                    userId: s.userId,
                    name: user?.name || 'Desconhecido',
                    role: user?.roleRef?.name,
                    totalRevenue: s._sum.total || 0,
                    ordersCount: s._count.id || 0,
                    averageTicket: (s._sum.total || 0) / (s._count.id || 1)
                };
            });

            res.json(staffDetails.sort((a, b) => b.totalRevenue - a.totalRevenue));
        } catch (error) {
            logger.error('Erro ao buscar desempenho de equipe:', error);
            res.status(500).json({ error: 'Erro ao buscar desempenho de equipe.' });
        }
    },

    async getSummary(req, res) {
        try {
            const { restaurantId } = req;
            const today = new Date();
            const start = startOfDay(today);
            const end = endOfDay(today);

            const salesToday = await prisma.order.aggregate({
                where: {
                    restaurantId,
                    status: { not: 'CANCELED' },
                    createdAt: { gte: start, lte: end }
                },
                _sum: { total: true }
            });

            const activeProducts = await prisma.product.count({
                where: { restaurantId, isAvailable: true }
            });

            const expensesToday = await prisma.financialTransaction.aggregate({
                where: {
                    restaurantId,
                    type: 'EXPENSE',
                    status: 'PAID',
                    paymentDate: { gte: start, lte: end }
                },
                _sum: { amount: true }
            });

            const revenue = salesToday._sum.total || 0;
            const expense = expensesToday._sum.amount || 0;

            res.json({
                totalRevenue: revenue,
                activeProducts,
                netProfit: revenue - expense
            });
        } catch (error) {
            logger.error('Erro no sumário:', error);
            res.status(500).json({ error: 'Erro ao buscar sumário.' });
        }
    },

    async getSalesHistory(req, res) {
        try {
            const { restaurantId } = req;
            const today = new Date();
            const { subDays, format } = require('date-fns');
            const last7Days = subDays(today, 6);
            
            const start = startOfDay(last7Days);
            const end = endOfDay(today);

            const sales = await prisma.order.findMany({
                where: {
                    restaurantId,
                    status: { not: 'CANCELED' },
                    createdAt: { gte: start, lte: end }
                },
                select: { total: true, createdAt: true }
            });

            const historyMap = {};
            for (let i = 0; i <= 6; i++) {
                const d = subDays(today, i);
                const key = format(d, 'yyyy-MM-dd');
                historyMap[key] = 0;
            }

            sales.forEach(sale => {
                const key = format(sale.createdAt, 'yyyy-MM-dd');
                if (historyMap[key] !== undefined) {
                    historyMap[key] += sale.total;
                }
            });

            const history = Object.keys(historyMap).sort().map(date => ({
                date,
                amount: historyMap[date]
            }));

            res.json(history);
        } catch (error) {
            logger.error('Erro no histórico de vendas:', error);
            res.status(500).json({ error: 'Erro ao buscar histórico.' });
        }
    },

    async getPaymentMethodsReport(req, res) {
        try {
            const { restaurantId } = req;
            const { subDays } = require('date-fns');
            const start = startOfDay(subDays(new Date(), 30));

            const payments = await prisma.payment.groupBy({
                by: ['method'],
                where: {
                    order: {
                        restaurantId,
                        createdAt: { gte: start }
                    }
                },
                _sum: { amount: true }
            });

            const formatted = payments.map(p => ({
                method: p.method,
                total: p._sum.amount || 0
            }));

            res.json(formatted);
        } catch (error) {
            logger.error('Erro nos métodos de pagamento:', error);
            res.status(500).json({ error: 'Erro ao buscar métodos de pagamento.' });
        }
    },

    async getDashboardStats(req, res) {
        try {
            const { restaurantId } = req;
            const today = new Date();
            const start = startOfDay(today);
            const end = endOfDay(today);

            const salesToday = await prisma.order.aggregate({
                where: {
                    restaurantId,
                    status: { not: 'CANCELED' },
                    createdAt: { gte: start, lte: end }
                },
                _sum: { total: true },
                _count: { id: true }
            });

            const pendingOrders = await prisma.order.count({
                where: {
                    restaurantId,
                    status: { in: ['PENDING', 'PREPARING', 'READY'] }
                }
            });

            const lowStockProducts = await prisma.product.count({
                where: {
                    restaurantId,
                    stock: { lte: 5 },
                    isAvailable: true
                }
            });

            res.json({
                salesToday: salesToday._sum.total || 0,
                ordersCount: salesToday._count.id || 0,
                pendingOrders,
                lowStockProducts
            });
        } catch (error) {
            logger.error('Erro ao buscar estatísticas:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    },

    async getSalesPeriod(req, res) {
        try {
            const { restaurantId } = req;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ error: 'Datas são obrigatórias' });
            }

            const start = startOfDay(new Date(startDate));
            const end = endOfDay(new Date(endDate));

            const sales = await prisma.order.findMany({
                where: {
                    restaurantId,
                    status: { not: 'CANCELED' },
                    createdAt: { gte: start, lte: end }
                },
                include: { payments: true },
                orderBy: { createdAt: 'desc' }
            });

            const paymentStats = {
                cash: 0, credit_card: 0, debit_card: 0, pix: 0, meal_voucher: 0, other: 0
            };

            let totalSales = 0;
            sales.forEach(order => {
                totalSales += order.total;
                if (order.payments && order.payments.length > 0) {
                    order.payments.forEach(p => {
                        const method = p.method || 'other';
                        if (paymentStats[method] !== undefined) paymentStats[method] += p.amount;
                        else paymentStats.other += p.amount;
                    });
                } else {
                     paymentStats.other += order.total;
                }
            });

            res.json({
                period: { start, end },
                totalSales,
                count: sales.length,
                paymentStats,
                sales
            });
        } catch (error) {
            logger.error('Erro no relatório de vendas:', error);
            res.status(500).json({ error: 'Erro ao gerar relatório' });
        }
    },

    async getTopProducts(req, res) {
        try {
            const { restaurantId } = req;
            const topSelling = await prisma.orderItem.groupBy({
                by: ['productId'],
                where: {
                    order: {
                        restaurantId,
                        status: { not: 'CANCELED' }
                    }
                },
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 10
            });

            // Batch fetch products to avoid N+1 query
            const productIds = topSelling.map(item => item.productId);
            const products = await prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true, price: true }
            });
            const productMap = new Map(products.map(p => [p.id, p]));

            const productDetails = topSelling.map(item => {
                const product = productMap.get(item.productId);
                return {
                    ...product,
                    totalQuantity: item._sum.quantity
                };
            });

            res.json(productDetails);
        } catch (error) {
            logger.error('Erro ao buscar produtos mais vendidos:', error);
            res.status(500).json({ error: 'Erro interno' });
        }
    },

    async getAbcAnalysis(req, res) {
        try {
            const { restaurantId } = req;
            const { startDate, endDate } = req.query;
            const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
            const end = endDate ? new Date(endDate) : new Date();

            const items = await prisma.orderItem.findMany({
                where: {
                    order: {
                        restaurantId,
                        status: 'COMPLETED',
                        createdAt: { gte: start, lte: end }
                    }
                },
                include: { product: { select: { name: true } } }
            });

            const productStats = items.reduce((acc, item) => {
                const id = item.productId;
                if (!acc[id]) {
                    acc[id] = { id, name: item.product.name, totalRevenue: 0, totalQty: 0 };
                }
                acc[id].totalRevenue += (item.priceAtTime * item.quantity);
                acc[id].totalQty += item.quantity;
                return acc;
            }, {});

            const sortedProducts = Object.values(productStats).sort((a, b) => b.totalRevenue - a.totalRevenue);
            const totalGeneralRevenue = sortedProducts.reduce((sum, p) => sum + p.totalRevenue, 0);

            let accumulatedRevenue = 0;
            const abcData = sortedProducts.map((p) => {
                accumulatedRevenue += p.totalRevenue;
                const accumulatedPercentage = (accumulatedRevenue / (totalGeneralRevenue || 1)) * 100;
                
                let classification = 'C';
                if (accumulatedPercentage <= 70) classification = 'A';
                else if (accumulatedPercentage <= 90) classification = 'B';

                return { ...p, percentage: (p.totalRevenue / (totalGeneralRevenue || 1)) * 100, accumulatedPercentage, classification };
            });

            res.json({
                period: { start, end },
                totalRevenue: totalGeneralRevenue,
                products: abcData
            });
        } catch (error) {
            logger.error('Erro na Curva ABC:', error);
            res.status(500).json({ error: 'Erro ao gerar Curva ABC.' });
        }
    },

    async getDeliveryAreaStats(req, res) {
        try {
            const { restaurantId } = req;
            const stats = await prisma.deliveryOrder.groupBy({
                by: ['address'],
                where: {
                    order: {
                        restaurantId,
                        status: 'COMPLETED'
                    }
                },
                _count: { id: true },
                _sum: { deliveryFee: true }
            });

            const areaMap = {};
            stats.forEach((s) => {
                if (!s.address) return;
                
                const parts = s.address.split('-') || [];
                const neighborhood = parts.length > 1 ? parts[parts.length - 1].trim() : (parts[0]?.trim() || 'Centro/Geral');
                
                if (!areaMap[neighborhood]) {
                    areaMap[neighborhood] = { name: neighborhood, count: 0, totalFees: 0 };
                }
                areaMap[neighborhood].count += s._count.id;
                areaMap[neighborhood].totalFees += s._sum.deliveryFee || 0;
            });

            res.json(Object.values(areaMap).sort((a, b) => b.count - a.count));
        } catch (error) {
            logger.error('Erro ao buscar estatísticas de entrega:', error);
            res.status(500).json({ error: 'Erro ao buscar estatísticas de entrega.' });
        }
    },

    async getDetailedPayments(req, res) {
        try {
            const { restaurantId } = req;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ error: 'Datas são obrigatórias' });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            const payments = await prisma.payment.findMany({
                where: {
                    order: {
                        restaurantId,
                        status: 'COMPLETED',
                        createdAt: { gte: start, lte: end }
                    }
                },
                select: {
                    id: true,
                    amount: true,
                    method: true,
                    createdAt: true,
                    order: {
                        select: { 
                            dailyOrderNumber: true, 
                            tableNumber: true, 
                            customerName: true,
                            total: true 
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.json(payments);
        } catch (error) {
            logger.error('Erro em getDetailedPayments:', error);
            res.status(500).json({ error: 'Erro ao buscar detalhamento de pagamentos.' });
        }
    },

    async getConsumedItems(req, res) {
        try {
            const { restaurantId } = req;
            const { start, end } = req.query;
            const startDate = start ? new Date(start) : new Date(new Date().setDate(new Date().getDate() - 30));
            const endDate = end ? new Date(end) : new Date();

            const items = await prisma.orderItem.findMany({
                where: {
                    order: {
                        restaurantId,
                        status: 'COMPLETED',
                        createdAt: { gte: startDate, lte: endDate }
                    }
                },
                include: {
                    product: { select: { name: true, categories: { select: { name: true } } } },
                    order: { select: { dailyOrderNumber: true, tableNumber: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.json(items);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar itens consumidos.' });
        }
    },

    async getProductionTimeReport(req, res) {
        try {
            const { restaurantId } = req;
            const { startDate, endDate } = req.query;
            const start = startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date());
            const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date());

            const orders = await prisma.order.findMany({
                where: {
                    restaurantId,
                    status: 'COMPLETED',
                    preparingAt: { not: null },
                    readyAt: { not: null },
                    completedAt: { gte: start, lte: end }
                },
                select: {
                    id: true, dailyOrderNumber: true, tableNumber: true,
                    preparingAt: true, readyAt: true, completedAt: true
                },
                orderBy: { completedAt: 'desc' }
            });

            const report = orders.map(o => {
                const startProd = new Date(o.preparingAt).getTime();
                const endProd = new Date(o.readyAt || o.completedAt).getTime();
                const durationMinutes = Math.round((endProd - startProd) / 60000);
                return { ...o, durationMinutes };
            });

            res.json(report);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar tempo de produção.' });
        }
    },

    async getStatusTimeReport(req, res) {
        try {
            const { restaurantId } = req;
            const { startDate, endDate } = req.query;
            const start = startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date());
            const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date());

            const orders = await prisma.order.findMany({
                where: {
                    restaurantId,
                    status: 'COMPLETED',
                    createdAt: { gte: start, lte: end }
                },
                select: {
                    id: true, dailyOrderNumber: true, tableNumber: true,
                    createdAt: true, pendingAt: true, preparingAt: true, readyAt: true, completedAt: true
                }
            });

            const report = orders.map(o => {
                const created = new Date(o.createdAt).getTime();
                const pending = o.pendingAt ? new Date(o.pendingAt).getTime() : created;
                const preparing = o.preparingAt ? new Date(o.preparingAt).getTime() : pending;
                const ready = o.readyAt ? new Date(o.readyAt).getTime() : preparing;
                const completed = new Date(o.completedAt).getTime();

                return {
                    id: o.id,
                    dailyOrderNumber: o.dailyOrderNumber,
                    tableNumber: o.tableNumber,
                    waitToPrepareMinutes: Math.round((preparing - created) / 60000),
                    prepareToReadyMinutes: Math.round((ready - preparing) / 60000),
                    readyToCompleteMinutes: Math.round((completed - ready) / 60000),
                    totalCycleMinutes: Math.round((completed - created) / 60000)
                };
            });

            res.json(report);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar tempo por status.' });
        }
    },


    async getSalesHeatmap(req, res) {
        try {
            const { restaurantId } = req;
            
            // Busca dados da loja para centralizar o mapa
            const restaurant = await prisma.restaurant.findUnique({
                where: { id: restaurantId },
                select: { latitude: true, longitude: true }
            });

            const orders = await prisma.deliveryOrder.findMany({
                where: {
                    order: {
                        restaurantId,
                        status: 'COMPLETED'
                    },
                    latitude: { not: null },
                    longitude: { not: null }
                },
                select: {
                    latitude: true,
                    longitude: true,
                    address: true,
                    order: {
                        select: { 
                            total: true,
                            dailyOrderNumber: true,
                            customerName: true
                        }
                    }
                }
            });

            const points = orders.map(o => ({
                lat: o.latitude,
                lng: o.longitude,
                weight: o.order.total,
                address: o.address,
                orderNumber: o.order.dailyOrderNumber,
                customer: o.order.customerName
            }));

            res.json({
                restaurant: {
                    lat: restaurant?.latitude,
                    lng: restaurant?.longitude
                },
                points
            });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar dados do mapa de calor.' });
        }
    },

    async getCouponsReport(req, res) {
        try {
            const { restaurantId } = req;
            const coupons = await prisma.promotion.findMany({
                where: { 
                    restaurantId,
                    code: { not: null }
                },
                include: {
                    product: { select: { name: true } }
                }
            });

            // Lógica simplificada: como não temos uma tabela de "CupomUsado",
            // vamos estimar o impacto baseados no status do cupom.
            // Idealmente, no futuro, criar uma tabela de relação Order <=> Promotion.
            
            res.json(coupons);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar relatório de cupons.' });
        }
    },

    // GET /api/admin/reports/billing
    // Parâmetros: startDate, endDate, orderTypes[], excludeDays[]
    async getBillingReport(req, res) {
        try {
            const { restaurantId } = req;
            const { startDate, endDate, orderTypes, excludeDays } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ error: 'Datas são obrigatórias' });
            }

            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            // Parse arrays
            const orderTypesFilter = orderTypes ? orderTypes.split(',') : [];
            const excludeDaysFilter = excludeDays ? excludeDays.split(',').map(Number) : [];

            const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

            // Buscar todos os pedidos no período
            const whereClause = {
                restaurantId,
                createdAt: { gte: start, lte: end },
            };

            const orders = await prisma.order.findMany({
                where: whereClause,
                select: {
                    id: true,
                    total: true,
                    discount: true,
                    extraCharge: true,
                    status: true,
                    orderType: true,
                    createdAt: true,
                    items: { select: { quantity: true } },
                    deliveryOrder: {
                        select: { deliveryFee: true, deliveryType: true }
                    }
                }
            });

            // Agrupar por dia
            const dailyData = {};
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateKey = d.toISOString().split('T')[0];
                const dayOfWeek = d.getDay();
                
                dailyData[dateKey] = {
                    date: dateKey,
                    dayOfWeek,
                    dayName: dayNames[dayOfWeek],
                    orders: 0,
                    revenue: 0,
                    accumulated: 0,
                    avgTicket: 0,
                    itemsCount: 0,
                    deliveryFee: 0,
                    extraCharge: 0,
                    discount: 0,
                    canceledOrders: 0,
                    canceledRevenue: 0,
                    deliveryOrders: 0,
                    pickupOrders: 0,
                    tableOrders: 0
                };
            }

            let accumulatedRevenue = 0;

            orders.forEach(order => {
                const dateKey = order.createdAt.toISOString().split('T')[0];
                const dayOfWeek = new Date(order.createdAt).getDay();
                
                if (excludeDaysFilter.includes(dayOfWeek)) return;
                
                const day = dailyData[dateKey];
                if (!day) return;

                const deliveryType = order.deliveryOrder?.deliveryType;
                const isPickup = order.orderType === 'PICKUP' || deliveryType === 'pickup';
                const isDelivery = order.orderType === 'DELIVERY' || deliveryType === 'delivery';

                if (orderTypesFilter.length > 0) {
                    const orderTypeValue = isPickup ? 'PICKUP' : isDelivery ? 'DELIVERY' : 'TABLE';
                    if (!orderTypesFilter.includes(orderTypeValue)) return;
                }
                
                const isCompleted = order.status === 'COMPLETED';
                const isCanceled = order.status === 'CANCELED';
                const deliveryFee = order.deliveryOrder?.deliveryFee || 0;

                if (isPickup) day.pickupOrders++;
                else if (isDelivery) day.deliveryOrders++;
                else day.tableOrders++;

                // Itens
                day.itemsCount += order.items.reduce((sum, item) => sum + item.quantity, 0);

                // Taxas
                day.deliveryFee += deliveryFee;
                day.extraCharge += order.extraCharge || 0;
                day.discount += order.discount || 0;

                if (isCompleted) {
                    day.orders++;
                    day.revenue += order.total;
                    accumulatedRevenue += order.total;
                    day.avgTicket = day.revenue / day.orders;
                }

                if (isCanceled) {
                    day.canceledOrders++;
                    day.canceledRevenue += order.total;
                }
            });

            // Calcular acumulado
            const sortedDates = Object.keys(dailyData).sort((a, b) => b.localeCompare(a));
            sortedDates.forEach(date => {
                dailyData[date].accumulated = accumulatedRevenue;
                let acc = 0;
                sortedDates.forEach(d => {
                    if (d <= date) {
                        acc += dailyData[d].revenue;
                        dailyData[d].accumulated = acc;
                    }
                });
            });

            const result = Object.values(dailyData).filter(d => 
                !excludeDaysFilter.includes(d.dayOfWeek)
            ).sort((a, b) => b.date.localeCompare(a.date));

            // Calcular totais
            const totals = result.reduce((acc, day) => ({
                totalOrders: acc.totalOrders + day.orders,
                totalRevenue: acc.totalRevenue + day.revenue,
                totalItems: acc.totalItems + day.itemsCount,
                totalDeliveryFee: acc.totalDeliveryFee + day.deliveryFee,
                totalExtraCharge: acc.totalExtraCharge + day.extraCharge,
                totalDiscount: acc.totalDiscount + day.discount,
                totalCanceledOrders: acc.totalCanceledOrders + day.canceledOrders,
                totalCanceledRevenue: acc.totalCanceledRevenue + day.canceledRevenue,
            }), {
                totalOrders: 0,
                totalRevenue: 0,
                totalItems: 0,
                totalDeliveryFee: 0,
                totalExtraCharge: 0,
                totalDiscount: 0,
                totalCanceledOrders: 0,
                totalCanceledRevenue: 0
            });

            totals.avgTicket = totals.totalOrders > 0 ? totals.totalRevenue / totals.totalOrders : 0;

            res.json({ daily: result, totals });
        } catch (error) {
            logger.error('Erro no relatório de faturamento:', error);
            res.status(500).json({ error: 'Erro ao buscar relatório de faturamento.' });
        }
    }
};

module.exports = ReportController;