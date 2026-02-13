const prisma = require('../lib/prisma');
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

            const orders = await prisma.order.findMany({
                where: {
                    restaurantId,
                    status: 'COMPLETED',
                    createdAt: { gte: start, lte: end }
                },
                include: {
                    items: {
                        include: {
                            product: {
                                include: {
                                    ingredients: {
                                        include: { ingredient: true }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const grossRevenue = orders.reduce((acc, order) => acc + order.total, 0);

            let totalCmv = 0;
            orders.forEach(order => {
                order.items.forEach(item => {
                    let itemCost = 0;
                    if (item.product.ingredients && item.product.ingredients.length > 0) {
                        itemCost = item.product.ingredients.reduce((sum, link) => {
                            return sum + ((link.ingredient.lastUnitCost || 0) * link.quantity);
                        }, 0);
                    }
                    totalCmv += (itemCost * item.quantity);
                });
            });

            const expenses = await prisma.financialTransaction.findMany({
                where: {
                    restaurantId,
                    type: 'EXPENSE',
                    status: 'PAID',
                    paymentDate: { gte: start, lte: end }
                },
                include: {
                    category: true
                }
            });

            const expensesByCategory = expenses.reduce((acc, exp) => {
                const catName = exp.category?.name || 'Diversos';
                if (!acc[catName]) acc[catName] = 0;
                acc[catName] += exp.amount;
                return acc;
            }, {});

            const totalOperatingExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

            const otherIncomes = await prisma.financialTransaction.findMany({
                where: {
                    restaurantId,
                    type: 'INCOME',
                    status: 'PAID',
                    paymentDate: { gte: start, lte: end },
                    orderId: null
                }
            });

            const totalOtherIncomes = otherIncomes.reduce((acc, inc) => acc + inc.amount, 0);

            const grossProfit = grossRevenue - totalCmv;
            const netProfit = grossProfit - totalOperatingExpenses + totalOtherIncomes;

            res.json({
                period: { start, end },
                grossRevenue,
                totalCmv,
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
            console.error('Erro ao gerar DRE:', error);
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

            const staffDetails = await Promise.all(stats.map(async (s) => {
                const user = await prisma.user.findUnique({
                    where: { id: s.userId },
                    select: { name: true, role: true }
                });
                return {
                    userId: s.userId,
                    name: user?.name || 'Desconhecido',
                    role: user?.role,
                    totalRevenue: s._sum.total || 0,
                    ordersCount: s._count.id || 0,
                    averageTicket: (s._sum.total || 0) / (s._count.id || 1)
                };
            }));

            res.json(staffDetails.sort((a, b) => b.totalRevenue - a.totalRevenue));
        } catch (error) {
            console.error('Erro ao buscar desempenho de equipe:', error);
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
            console.error('Erro no sumário:', error);
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
            console.error('Erro no histórico de vendas:', error);
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
            console.error('Erro nos métodos de pagamento:', error);
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
            console.error('Erro ao buscar estatísticas:', error);
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
            console.error('Erro no relatório de vendas:', error);
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

            const productDetails = await Promise.all(topSelling.map(async (item) => {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                    select: { name: true, price: true }
                });
                return {
                    ...product,
                    totalQuantity: item._sum.quantity
                };
            }));

            res.json(productDetails);
        } catch (error) {
            console.error('Erro ao buscar produtos mais vendidos:', error);
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
            console.error('Erro na Curva ABC:', error);
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
            console.error('Erro ao buscar estatísticas de entrega:', error);
            res.status(500).json({ error: 'Erro ao buscar estatísticas de entrega.' });
        }
    },

    async getDetailedPayments(req, res) {
        try {
            const { restaurantId } = req;
            const { startDate, endDate } = req.query;
            const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
            const end = endDate ? new Date(endDate) : new Date();

            const payments = await prisma.payment.findMany({
                where: {
                    order: {
                        restaurantId,
                        status: 'COMPLETED',
                        createdAt: { gte: start, lte: end }
                    }
                },
                include: {
                    order: {
                        select: { dailyOrderNumber: true, tableNumber: true, customerName: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.json(payments);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar detalhamento de pagamentos.' });
        }
    },

    async getConsumedItems(req, res) {
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

    async getHourlySales(req, res) {
        // ... (conteúdo original)
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
    }
};

module.exports = ReportController;