const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class BankAccountController {
  // Listar todas as contas
  async index(req, res) {
    const { restaurantId } = req;
    try {
      const accounts = await prisma.bankAccount.findMany({
        where: { restaurantId },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { transactions: true }
          }
        }
      });
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar contas bancárias.' });
    }
  }

  // Criar nova conta
  async store(req, res) {
    const { restaurantId } = req;
    const { name, type, balance } = req.body;
    try {
      const account = await prisma.bankAccount.create({
        data: {
          name,
          type: type || 'CASH',
          balance: parseFloat(balance || 0),
          restaurant: { connect: { id: restaurantId } }
        }
      });
      res.status(201).json(account);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar conta bancária.' });
    }
  }

  // Atualizar conta
  async update(req, res) {
    const { id } = req.params;
    const { name, type, balance } = req.body;
    try {
      const account = await prisma.bankAccount.update({
        where: { id },
        data: {
          name,
          type,
          balance: parseFloat(balance)
        }
      });
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar conta.' });
    }
  }

  // Excluir conta
  async delete(req, res) {
    const { id } = req.params;
    try {
      await prisma.bankAccount.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir conta (pode ter lançamentos vinculados).' });
    }
  }
}

module.exports = new BankAccountController();
