const prisma = require('../lib/prisma');

class PaymentMethodController {
  async list(req, res) {
    try {
      const { restaurantId } = req.params;
      let methods = await prisma.paymentMethod.findMany({
        where: { restaurantId },
        orderBy: { createdAt: 'asc' }
      });

      // Se não houver métodos, cria os padrões
      if (methods.length === 0) {
        const defaults = [
          { name: 'Dinheiro', type: 'CASH', allowDelivery: true, allowPos: true, allowTable: true },
          { name: 'Pix', type: 'PIX', allowDelivery: true, allowPos: true, allowTable: true },
          { name: 'Cartão de Crédito', type: 'CREDIT_CARD', allowDelivery: true, allowPos: true, allowTable: true },
          { name: 'Cartão de Débito', type: 'DEBIT_CARD', allowDelivery: true, allowPos: true, allowTable: true },
          { name: 'Outros', type: 'OTHER', allowDelivery: true, allowPos: true, allowTable: true },
        ];

        await prisma.paymentMethod.createMany({
          data: defaults.map(d => ({ ...d, restaurantId }))
        });

        methods = await prisma.paymentMethod.findMany({
          where: { restaurantId },
          orderBy: { createdAt: 'asc' }
        });
      }

      res.json(methods);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar formas de pagamento' });
    }
  }

  async listPublic(req, res) {
    try {
      const { restaurantId } = req.params;
      const methods = await prisma.paymentMethod.findMany({
        where: { 
          restaurantId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          type: true,
          allowDelivery: true,
          allowPos: true,
          allowTable: true
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json(methods);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar formas de pagamento' });
    }
  }

  async create(req, res) {
    try {
      const { restaurantId } = req.params;
      const { name, type, isActive, allowDelivery, allowPos, allowTable } = req.body;

      const method = await prisma.paymentMethod.create({
        data: {
          name,
          type,
          isActive: isActive !== undefined ? isActive : true,
          allowDelivery: allowDelivery !== undefined ? allowDelivery : true,
          allowPos: allowPos !== undefined ? allowPos : true,
          allowTable: allowTable !== undefined ? allowTable : true,
          restaurantId
        }
      });

      res.status(201).json(method);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar forma de pagamento' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, type, isActive, allowDelivery, allowPos, allowTable } = req.body;

      const method = await prisma.paymentMethod.update({
        where: { id },
        data: {
          name,
          type,
          isActive,
          allowDelivery,
          allowPos,
          allowTable
        }
      });

      res.json(method);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar forma de pagamento' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await prisma.paymentMethod.delete({
        where: { id }
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Erro ao deletar forma de pagamento' });
    }
  }
}

module.exports = new PaymentMethodController();
