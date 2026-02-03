const prisma = require('../lib/prisma');

class DeliveryAreaController {
  async getAreas(req, res) {
    try {
      const areas = await prisma.deliveryArea.findMany({
        where: { restaurantId: req.restaurantId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(areas);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar áreas de entrega.' });
    }
  }

  async createArea(req, res) {
    try {
      const { name, type, fee, radius, geometry } = req.body;
      const area = await prisma.deliveryArea.create({
        data: {
          name, type, 
          fee: parseFloat(fee), 
          radius: radius ? parseFloat(radius) : null,
          geometry,
          restaurantId: req.restaurantId
        }
      });
      res.status(201).json(area);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar área de entrega.' });
    }
  }

  async updateArea(req, res) {
    try {
      const { id } = req.params;
      const { name, type, fee, radius, geometry, isActive } = req.body;
      const area = await prisma.deliveryArea.update({
        where: { id },
        data: {
          name, type, 
          fee: parseFloat(fee), 
          radius: radius ? parseFloat(radius) : null,
          geometry,
          isActive
        }
      });
      res.json(area);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar área de entrega.' });
    }
  }

  async deleteArea(req, res) {
    try {
      await prisma.deliveryArea.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir área.' });
    }
  }
}

module.exports = new DeliveryAreaController();
