const prisma = require('../lib/prisma');
const logger = require('../config/logger');
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
      logger.error('Erro ao listar clientes:', error);
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
      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.phone !== undefined) updateData.phone = normalizePhone(data.phone);
      if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
      if (data.street !== undefined) updateData.street = data.street;
      if (data.number !== undefined) updateData.number = data.number;
      if (data.neighborhood !== undefined) updateData.neighborhood = data.neighborhood;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.state !== undefined) updateData.state = data.state;
      if (data.complement !== undefined) updateData.complement = data.complement;
      if (data.reference !== undefined) updateData.reference = data.reference;
      if (data.address !== undefined) updateData.address = data.address;

      const updated = await prisma.customer.update({
        where: { id },
        data: updateData
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

  // Listar endereços de um cliente
  async listAddresses(req, res) {
    const { customerId } = req.params;
    try {
      const addresses = await prisma.customerAddress.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(addresses);
    } catch (error) {
      logger.error('Erro ao listar endereços:', error);
      res.status(500).json({ error: 'Erro ao listar endereços.' });
    }
  }

  // Criar novo endereço para cliente
  async createAddress(req, res) {
    const { customerId } = req.params;
    const data = req.body;
    try {
      const address = await prisma.customerAddress.create({
        data: {
          customerId,
          label: data.label,
          street: data.street,
          number: data.number,
          complement: data.complement,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          reference: data.reference
        }
      });
      res.status(201).json(address);
    } catch (error) {
      logger.error('Erro ao criar endereço:', error);
      res.status(500).json({ error: 'Erro ao criar endereço.' });
    }
  }

  // Atualizar endereço
  async updateAddress(req, res) {
    const { id } = req.params;
    const data = req.body;
    try {
      const updated = await prisma.customerAddress.update({
        where: { id },
        data: {
          label: data.label,
          street: data.street,
          number: data.number,
          complement: data.complement,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          reference: data.reference
        }
      });
      res.json(updated);
    } catch (error) {
      logger.error('Erro ao atualizar endereço:', error);
      res.status(500).json({ error: 'Erro ao atualizar endereço.' });
    }
  }

  // Deletar endereço
  async deleteAddress(req, res) {
    const { id } = req.params;
    try {
      await prisma.customerAddress.delete({ where: { id } });
      res.json({ message: 'Endereço excluído com sucesso.' });
    } catch (error) {
      logger.error('Erro ao deletar endereço:', error);
      res.status(500).json({ error: 'Erro ao excluir endereço.' });
    }
  }
}

module.exports = new CustomerController();
