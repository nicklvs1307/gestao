const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');
const CASHIER_CONSTANTS = require('../constants/cashier');
const money = require('../utils/money');

class CashierService {
  /**
   * Busca a sessão ativa e calcula o saldo atual em dinheiro.
   */
  async getActiveSessionStatus(restaurantId) {
    const session = await prisma.cashierSession.findFirst({
      where: { restaurantId, status: CASHIER_CONSTANTS.STATUS.OPEN },
      include: { user: { select: { name: true } } }
    });

    if (!session) return { isOpen: false, session: null };

    // Busca todas as transações da sessão
    const transactions = await prisma.financialTransaction.findMany({
      where: { cashierId: session.id, status: 'PAID' },
      select: { amount: true, type: true, paymentMethod: true, description: true }
    });

    // Calcula saldo em dinheiro (Dinheiro em mãos)
    const cashInHand = transactions.reduce((acc, t) => {
      if (t.paymentMethod === CASHIER_CONSTANTS.METHODS.CASH) {
        return t.type === 'INCOME' ? money.add(acc, t.amount) : money.subtract(acc, t.amount);
      }
      return acc;
    }, session.initialAmount);

    // Resumo por método de pagamento
    const salesByMethod = transactions.reduce((acc, t) => {
      if (t.type === 'INCOME') {
        const method = t.paymentMethod || 'other';
        acc[method] = money.add(acc[method] || 0, t.amount);
      }
      return acc;
    }, {});

    // Sangrias e Reforços
    const adjustments = transactions.reduce((acc, t) => {
      if (t.description.includes(CASHIER_CONSTANTS.TRANSACTION_PREFIXES.SANGRIA)) acc.sangria = money.add(acc.sangria, t.amount);
      if (t.description.includes(CASHIER_CONSTANTS.TRANSACTION_PREFIXES.REFORCO)) acc.reforco = money.add(acc.reforco, t.amount);
      return acc;
    }, { sangria: 0, reforco: 0 });

    // Busca acertos de entregadores pendentes do dia (Conta quantos motoboys únicos têm pendência)
    // Filtramos apenas pedidos criados a partir da abertura deste caixa
    const pendingDeliveries = await prisma.deliveryOrder.findMany({
        where: {
            order: { 
              restaurantId, 
              isSettled: false,
              createdAt: { gte: session.openedAt }
            },
            status: 'DELIVERED'
        },
        select: { driverId: true }
    });

    const uniqueDriversWithPending = new Set(
        pendingDeliveries
            .map(d => d.driverId)
            .filter(id => id !== null) // Filtra apenas motoboys cadastrados
    );

    const pendingDriverSettlementsCount = uniqueDriversWithPending.size;

    // Novos contadores para feedback de fechamento
    const activeOrdersCount = await prisma.order.count({
        where: { restaurantId, status: { in: ['BUILDING', 'PENDING', 'PREPARING', 'READY', 'SHIPPED'] } }
    });

    const openTablesCount = await prisma.order.count({
        where: { restaurantId, orderType: 'TABLE', status: { notIn: ['COMPLETED', 'CANCELED'] } }
    });

    return {
      isOpen: true,
      session: { 
        ...session, 
        cashInHand, 
        salesByMethod, 
        adjustments,
        pendingDriverSettlementsCount,
        activeOrdersCount,
        openTablesCount
      }
    };
  }

  /**
   * Lista pedidos que impedem o fechamento do caixa (Entregues mas sem acerto)
   */
  async getPendingSettlements(restaurantId) {
    const session = await prisma.cashierSession.findFirst({
        where: { restaurantId, status: CASHIER_CONSTANTS.STATUS.OPEN }
    });
    if (!session) return [];

    return await prisma.deliveryOrder.findMany({
        where: {
            order: { 
                restaurantId, 
                isSettled: false,
                createdAt: { gte: session.openedAt }
            },
            status: 'DELIVERED'
        },
        include: {
            order: {
                select: {
                    id: true,
                    dailyOrderNumber: true,
                    total: true,
                    createdAt: true
                }
            },
            driver: {
                select: { name: true }
            }
        },
        orderBy: { order: { createdAt: 'desc' } }
    });
  }

  /**
   * Abre uma nova sessão de caixa.
   */
  async openSession(restaurantId, userId, initialAmount) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.cashierSession.findFirst({
        where: { restaurantId, status: CASHIER_CONSTANTS.STATUS.OPEN }
      });

      if (existing) throw new AppError("Já existe um caixa aberto para este restaurante.", 400);

      return await tx.cashierSession.create({
        data: {
          restaurantId,
          userId,
          initialAmount: parseFloat(initialAmount) || 0,
          status: CASHIER_CONSTANTS.STATUS.OPEN,
          openedAt: new Date()
        }
      });
    });
  }

  /**
   * Fecha a sessão atual com lógica ERP (Snapshot, Cofre, Auditoria).
   */
  async closeSession(restaurantId, { finalAmount, notes, closingDetails, cashLeftover, moneyCountJson }) {
    const session = await prisma.cashierSession.findFirst({
      where: { restaurantId, status: CASHIER_CONSTANTS.STATUS.OPEN }
    });

    if (!session) throw new AppError("Nenhum caixa aberto encontrado.", 404);

    // --- 1. BLOQUEIOS DE SEGURANÇA (ESTRITO ERP) ---
    const activeOrders = await prisma.order.count({
        where: { restaurantId, status: { in: ['BUILDING', 'PENDING', 'PREPARING', 'READY', 'SHIPPED'] } }
    });
    if (activeOrders > 0) throw new AppError(`Existem ${activeOrders} pedidos ativos. Finalize-os antes de fechar.`, 400);

    const pendingDeliveries = await prisma.deliveryOrder.findMany({
        where: { 
            order: { 
                restaurantId, 
                isSettled: false,
                createdAt: { gte: session.openedAt }
            }, 
            status: 'DELIVERED',
            driverId: { not: null } // Apenas bloqueia se houver um entregador para acertar
        },
        select: { driverId: true }
    });

    if (pendingDeliveries.length > 0) {
        const uniqueDrivers = new Set(pendingDeliveries.map(d => d.driverId).filter(id => id !== null));
        const driversCount = uniqueDrivers.size;
        const msg = driversCount > 0 
            ? `Existem acertos pendentes de ${driversCount} entregador(es).` 
            : `Existem ${pendingDeliveries.length} entregas sem acerto financeiro.`;
        throw new AppError(msg, 400);
    }

    const openTables = await prisma.order.count({
        where: { restaurantId, orderType: 'TABLE', status: { notIn: ['COMPLETED', 'CANCELED'] } }
    });
    if (openTables > 0) throw new AppError(`Existem ${openTables} mesas abertas.`, 400);


    // --- 2. CÁLCULO DO SNAPSHOT (O que o sistema esperava) ---
    // Recalcula tudo do zero para garantir integridade (Audit Trail)
    const transactions = await prisma.financialTransaction.findMany({
      where: { 
        cashierId: session.id, 
        status: 'PAID',
        // Excluir transações de pedidos cancelados
        order: { status: { not: 'CANCELED' } }
      },
      include: { order: { select: { id: true, status: true } } }
    });

    // Filtrar vendas (excluir reforços, sangrias e entradas de acerto de entregadores)
    const salesTransactions = transactions.filter(t => 
        t.type === 'INCOME' && 
        !t.description.includes(CASHIER_CONSTANTS.TRANSACTION_PREFIXES.REFORCO) && 
        !t.description.includes(CASHIER_CONSTANTS.TRANSACTION_PREFIXES.SANGRIA) &&
        !t.description.includes('ENTRADA ACERTO')
    );

    // Totais do Sistema
    let systemTotal = session.initialAmount;
    let systemCash = session.initialAmount;

    salesTransactions.forEach(t => {
        systemTotal = money.add(systemTotal, t.amount);
        if (t.paymentMethod === CASHIER_CONSTANTS.METHODS.CASH) systemCash = money.add(systemCash, t.amount);
    });

    const expectedAmount = money.round(systemTotal);
    const expectedCashAmount = money.round(systemCash);
    const informedCash = parseFloat(closingDetails?.cash || closingDetails?.dinheiro || 0);
    // Diferença do caixa: comparar DINHEIRO esperado vs DINHEIRO informado
    const difference = money.calcDifference(expectedCashAmount, informedCash);

    // --- 3. LÓGICA DE TRANSFERÊNCIA PARA O COFRE (SAFE DROP) ---
    const nextShiftFloat = parseFloat(cashLeftover || 0);
    
    // O que vai para o cofre = (Dinheiro Informado) - (Fundo de Troco Próximo Turno)
    let safeDepositAmount = 0;
    if (informedCash > nextShiftFloat) {
        safeDepositAmount = money.subtract(informedCash, nextShiftFloat);
    }

    logger.info(`[CASHIER_SERVICE] Calculando fechamento: 
        Esperado: ${expectedAmount}
        Informado: ${finalAmount}
        Diferença: ${difference}
        Dinheiro Informado: ${informedCash}
        Fundo Troco (prox): ${nextShiftFloat}
        Sangria Cofre: ${safeDepositAmount}`);

    // Executa tudo numa transação atômica
    return await prisma.$transaction(async (tx) => {
        // A. Se houver sangria para cofre, cria as transações
        if (safeDepositAmount > 0) {
            // Busca ou cria a conta Cofre
            let safeAccount = await tx.bankAccount.findFirst({
                where: { restaurantId, name: CASHIER_CONSTANTS.ACCOUNTS.SAFE }
            });

            if (!safeAccount) {
                safeAccount = await tx.bankAccount.create({
                    data: { restaurantId, name: CASHIER_CONSTANTS.ACCOUNTS.SAFE, type: 'SAFE', balance: 0 }
                });
            }

            // 1. Sai do Caixa
            await tx.financialTransaction.create({
                data: {
                    restaurantId,
                    cashierId: session.id, // Vincula a esta sessão que está fechando
                    description: CASHIER_CONSTANTS.TRANSACTION_PREFIXES.CLOSING_SAFE_EXPENSE,
                    amount: safeDepositAmount,
                    type: 'EXPENSE',
                    status: 'PAID',
                    paymentMethod: CASHIER_CONSTANTS.METHODS.CASH,
                    dueDate: new Date(),
                    paymentDate: new Date(),
                }
            });

            // 2. Entra no Cofre
            await tx.financialTransaction.create({
                data: {
                    restaurantId,
                    bankAccountId: safeAccount.id,
                    description: CASHIER_CONSTANTS.TRANSACTION_PREFIXES.CLOSING_SAFE_INCOME(session.id),
                    amount: safeDepositAmount,
                    type: 'INCOME',
                    status: 'PAID',
                    dueDate: new Date(),
                    paymentDate: new Date(),
                }
            });

            // Atualiza saldo do cofre
            await tx.bankAccount.update({
                where: { id: safeAccount.id },
                data: { balance: { increment: safeDepositAmount } }
            });
        }

        // B. Fecha o Caixa com os dados de Auditoria
        return await tx.cashierSession.update({
            where: { id: session.id },
            data: {
                status: CASHIER_CONSTANTS.STATUS.CLOSED,
                closedAt: new Date(),
                finalAmount: parseFloat(finalAmount) || 0,
                notes: notes || '',
                closingDetails: closingDetails || {},
                
                // Novos Campos ERP
                expectedAmount: expectedAmount,
                difference: difference,
                cashLeftover: nextShiftFloat,
                safeEntryAmount: safeDepositAmount,
                moneyCountJson: moneyCountJson || {}
            }
        });
    });
  }
}

module.exports = new CashierService();