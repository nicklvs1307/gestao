const prisma = require('../lib/prisma');
const money = require('../utils/money');

class FinancialService {

  /**
   * Busca ou cria a categoria 'Vendas' padrao do sistema.
   * Centraliza a logica duplicada em TableService e FinancialService.
   */
  async getOrCreateVendasCategory(restaurantId, tx = prisma) {
    let category = await tx.transactionCategory.findFirst({
      where: { restaurantId, name: 'Vendas' }
    });

    if (!category) {
      category = await tx.transactionCategory.create({
        data: { name: 'Vendas', type: 'INCOME', isSystem: true, restaurantId }
      });
    }

    return category;
  }

  /**
   * Processa o lançamento financeiro de uma venda.
   * Centraliza a lógica de categorias e sessões de caixa.
   */
  async processOrderPayment(restaurantId, { order, paymentMethod, cashierId = null, tx = prisma, bankAccountId = null }) {
    const category = await this.getOrCreateVendasCategory(restaurantId, tx);

    const description = `VENDA #${order.dailyOrderNumber || order.id.slice(-4)}`;
    
    const transaction = await tx.financialTransaction.create({
        data: {
            restaurantId,
            cashierId,
            orderId: order.id,
            categoryId: category.id,
            description,
            amount: order.total,
            type: 'INCOME',
            status: 'PAID',
            dueDate: new Date(),
            paymentDate: new Date(),
            paymentMethod,
            bankAccountId
        }
    });

    // Atualiza saldo bancário se houver conta vinculada
    if (bankAccountId) {
        await this._updateAccountBalance(bankAccountId, order.total, 'INCOME', tx);
    }

    return transaction;
  }

  /**
   * Cria uma transação financeira e atualiza o saldo bancário se necessário.
   */
  async createTransaction(restaurantId, data) {
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.financialTransaction.create({
        data: {
          ...data,
          restaurant: { connect: { id: restaurantId } }
        }
      });

      if (transaction.status === 'PAID' && transaction.bankAccountId) {
        await this._updateAccountBalance(transaction.bankAccountId, transaction.amount, transaction.type, tx);
      }

      return transaction;
    });
  }

  /**
   * Atualiza uma transação, revertendo o saldo antigo e aplicando o novo.
   */
  async updateTransaction(id, data) {
    return await prisma.$transaction(async (tx) => {
      const oldT = await tx.financialTransaction.findUnique({ where: { id } });
      if (!oldT) throw new Error('Lançamento não encontrado');

      // Reverte efeito antigo no saldo
      if (oldT.status === 'PAID' && oldT.bankAccountId) {
        await this._updateAccountBalance(oldT.bankAccountId, -oldT.amount, oldT.type, tx);
      }

      const updated = await tx.financialTransaction.update({
        where: { id },
        data
      });

      // Aplica novo efeito no saldo
      if (updated.status === 'PAID' && updated.bankAccountId) {
        await this._updateAccountBalance(updated.bankAccountId, updated.amount, updated.type, tx);
      }

      return updated;
    });
  }

  /**
   * Realiza uma transferência entre contas bancárias.
   */
  async createTransfer(restaurantId, { fromAccountId, toAccountId, amount, date, description }) {
    return await prisma.$transaction(async (tx) => {
      const transferDate = date ? new Date(date) : new Date();
      const parsedAmount = parseFloat(amount);

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Valor da transferência deve ser maior que zero');
      }

      // Validar saldo suficiente na conta de origem
      const fromAccount = await tx.bankAccount.findUnique({ where: { id: fromAccountId } });
      if (!fromAccount) {
        throw new Error('Conta bancária de origem não encontrada');
      }
      if (fromAccount.balance < parsedAmount) {
        throw new Error(`Saldo insuficiente na conta de origem. Saldo atual: R$ ${fromAccount.balance.toFixed(2)}`);
      }

      const debit = await tx.financialTransaction.create({
        data: {
          description: `TRANSF. SAÍDA: ${description || 'Transferência'}`,
          amount: parsedAmount,
          type: 'EXPENSE',
          status: 'PAID',
          dueDate: transferDate,
          paymentDate: transferDate,
          restaurantId,
          bankAccountId: fromAccountId,
          paymentMethod: 'transfer'
        }
      });

      const credit = await tx.financialTransaction.create({
        data: {
          description: `TRANSF. ENTRADA: ${description || 'Transferência'}`,
          amount: parsedAmount,
          type: 'INCOME',
          status: 'PAID',
          dueDate: transferDate,
          paymentDate: transferDate,
          restaurantId,
          bankAccountId: toAccountId,
          paymentMethod: 'transfer',
          relatedTransactionId: debit.id
        }
      });

      await tx.financialTransaction.update({
        where: { id: debit.id },
        data: { relatedTransactionId: credit.id }
      });

      // Atualiza Saldos
      await tx.bankAccount.update({ where: { id: fromAccountId }, data: { balance: { decrement: parsedAmount } } });
      await tx.bankAccount.update({ where: { id: toAccountId }, data: { balance: { increment: parsedAmount } } });

      return { debit, credit };
    });
  }

  /**
   * Helper privado para atualizar saldo bancário.
   */
  async _updateAccountBalance(bankAccountId, amount, type, tx) {
    const adjustment = type === 'INCOME' ? amount : money.multiply(amount, -1);
    await tx.bankAccount.update({
      where: { id: bankAccountId },
      data: { balance: { increment: adjustment } }
    });
  }
}

module.exports = new FinancialService();