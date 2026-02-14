const prisma = require('../lib/prisma');
const { startOfDay, endOfDay, parseISO } = require('date-fns');
const asyncHandler = require('../middlewares/asyncHandler');

class WaiterController {
  // GET /admin/waiters/settlement?date=2023-10-27
  getSettlement = asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const { date } = req.query;

    if (!restaurantId) {
        res.status(400);
        throw new Error('Contexto de loja não selecionado.');
    }

    // 1. Definir o intervalo de tempo (Dia todo)
    const queryDate = date ? parseISO(date) : new Date();
    const start = startOfDay(queryDate);
    const end = endOfDay(queryDate);

    // 2. Buscar a taxa de serviço do restaurante
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { serviceTaxPercentage: true }
    });

    if (!restaurant) {
        res.status(404);
        throw new Error('Restaurante não encontrado.');
    }

    const serviceRate = (restaurant.serviceTaxPercentage || 0) / 100;

    // 3. Buscar usuários que tenham a permissão de garçom e tiveram pedidos no período
    const waiters = await prisma.user.findMany({
      where: {
        restaurantId,
        roleRef: {
          permissions: {
            some: {
              name: 'waiter:pos'
            }
          }
        }
      },
      include: {
        createdOrders: {
          where: {
            createdAt: { gte: start, lte: end },
            status: { in: ['COMPLETED', 'DELIVERED'] }, // Apenas pedidos finalizados/entregues
            orderType: 'TABLE' // Apenas pedidos de mesa contam para comissão (regra comum)
          },
          select: {
            id: true,
            total: true,
            status: true
          }
        }
      }
    });

    // 4. Processar os dados
    const settlementData = waiters.map(waiter => {
      const totalSales = waiter.createdOrders.reduce((acc, order) => acc + order.total, 0);
      
      let commissionAmount = 0;
      if (serviceRate > 0 && totalSales > 0) {
          const baseAmount = totalSales / (1 + serviceRate);
          commissionAmount = totalSales - baseAmount;
      }

      return {
        waiterId: waiter.id,
        waiterName: waiter.name || waiter.email,
        totalOrders: waiter.createdOrders.length,
        totalSales: totalSales,
        serviceRate: restaurant.serviceTaxPercentage || 0,
        commissionAmount: commissionAmount
      };
    });

    // Filtrar apenas quem trabalhou (opcional, mas limpa a tela)
    const activeWaiters = settlementData.filter(w => w.totalOrders > 0);

    return res.json(activeWaiters);
  });

  // POST /admin/waiters/settlement/pay
  paySettlement = asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const { waiterId, amount, date } = req.body;

    if (!restaurantId) {
        res.status(400);
        throw new Error('Contexto de loja não selecionado.');
    }

    const waiter = await prisma.user.findUnique({ where: { id: waiterId } });
    
    if (!waiter) {
        res.status(404);
        throw new Error('Garçom não encontrado.');
    }

    // Criar lançamento no financeiro
    const transaction = await prisma.financialTransaction.create({
      data: {
        description: `COMISSÃO: ${waiter.name || waiter.email} (Ref: ${date})`,
        amount: parseFloat(amount),
        type: 'EXPENSE',
        status: 'PAID',
        dueDate: new Date(),
        paymentDate: new Date(),
        paymentMethod: 'cash',
        restaurantId: restaurantId
      }
    });

    res.json(transaction);
  });
}

module.exports = new WaiterController();
