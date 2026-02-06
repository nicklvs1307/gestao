const prisma = require('../lib/prisma');

class FinancialService {
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
    const adjustment = type === 'INCOME' ? amount : -amount;
    await tx.bankAccount.update({
      where: { id: bankAccountId },
      data: { balance: { increment: adjustment } }
    });
  }
}

module.exports = new FinancialService();