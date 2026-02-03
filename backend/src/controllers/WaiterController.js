const prisma = require('../lib/prisma');
const { startOfDay, endOfDay, parseISO } = require('date-fns');

class WaiterController {
  // GET /admin/waiters/settlement?date=2023-10-27
  async getSettlement(req, res) {
    const restaurantId = req.restaurantId;
    const { date } = req.query;

    if (!restaurantId) {
        return res.status(400).json({ error: 'Contexto de loja não selecionado.' });
    }

    try {
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
          return res.status(404).json({ error: 'Restaurante não encontrado.' });
      }

      const serviceRate = (restaurant.serviceTaxPercentage || 0) / 100;

      // 3. Buscar usuários do tipo STAFF que tiveram pedidos no período
      // Vamos buscar todos os Staff e seus pedidos
      const waiters = await prisma.user.findMany({
        where: {
          restaurantId,
          role: 'staff', // Assumindo que garçons são 'staff'
        },
        include: {
          createdOrders: {
            where: {
              createdAt: { gte: start, lte: end },
              status: { in: ['COMPLETED', 'DELIVERED', 'PAID'] }, // Apenas pedidos finalizados/pagos
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
        
        // Regra de Negócio:
        // O 'total' do pedido no banco geralmente JÁ INCLUI os 10%.
        // Ex: Conta deu 100. Com 10% = 110. O total salvo é 110.
        // A comissão é: 110 - (110 / 1.1) = 10.
        // OU, simplificando se o rate for pequeno: Total * Rate (Isso daria comissão sobre comissão, mas é comum em sistemas simples).
        // Vamos usar a matemática reversa para ser exato: ValorOriginal = Total / (1 + rate). Comissão = Total - ValorOriginal.
        
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

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar acerto de garçons' });
    }
  }

  // POST /admin/waiters/settlement/pay
  async paySettlement(req, res) {
    const { restaurantId } = req.user;
    const { waiterId, amount, date } = req.body;

    try {
      const waiter = await prisma.user.findUnique({ where: { id: waiterId } });
      
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao processar pagamento.' });
    }
  }
}

module.exports = new WaiterController();
