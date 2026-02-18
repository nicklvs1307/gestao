const prisma = require('../lib/prisma');
const { normalizePhone } = require('../lib/phoneUtils');

class CustomerController {
  // Listar todos os clientes com paginação e busca
  async index(req, res) {
    const { restaurantId } = req;
    const { search, page = 1, limit = 50 } = req.query;
    
    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const where = {
        restaurantId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } }
          ]
        })
      };

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { name: 'asc' }
        }),
        prisma.customer.count({ where })
      ]);

      res.json({
        customers,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Erro ao listar clientes:', error);
      res.status(500).json({ error: 'Erro ao listar clientes.' });
    }
  }

  // Criar novo cliente
  async store(req, res) {
    const { restaurantId } = req;
    const data = req.body;
    try {
      const cleanPhone = normalizePhone(data.phone);
      const customer = await prisma.customer.create({
        data: {
          name: data.name,
          phone: cleanPhone,
          zipCode: data.zipCode,
          street: data.street,
          number: data.number,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          complement: data.complement,
          reference: data.reference,
          address: data.address,
          restaurantId
        }
      });
      res.status(201).json(customer);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Já existe um cliente com este telefone.' });
      }
      res.status(500).json({ error: 'Erro ao criar cliente.' });
    }
  }

  // Buscar um cliente específico
  async show(req, res) {
    const { id } = req.params;
    try {
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          deliveryOrders: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { order: true }
          }
        }
      });
      if (!customer) return res.status(404).json({ error: 'Cliente não encontrado.' });
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar cliente.' });
    }
  }

  // Atualizar dados do cliente
  async update(req, res) {
    const { id } = req.params;
    const data = req.body;
    try {
      const updated = await prisma.customer.update({
        where: { id },
        data: {
          name: data.name,
          phone: normalizePhone(data.phone),
          zipCode: data.zipCode,
          street: data.street,
          number: data.number,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          complement: data.complement,
          reference: data.reference,
          address: data.address
        }
      });
      res.json(updated);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Já existe um cliente com este telefone.' });
      }
      res.status(500).json({ error: 'Erro ao atualizar cliente.' });
    }
  }

  // Excluir cliente
  async delete(req, res) {
    const { id } = req.params;
    try {
      await prisma.customer.delete({ where: { id } });
      res.json({ message: 'Cliente excluído com sucesso.' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir cliente.' });
    }
  }
}

module.exports = new CustomerController();
