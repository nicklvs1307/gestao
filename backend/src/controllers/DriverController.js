const prisma = require('../lib/prisma');

class DriverController {
  constructor() {
    this.getAvailableOrders = this.getAvailableOrders.bind(this);
    this.getMyOrders = this.getAvailableOrders.bind(this);
    this.updateOrderStatus = this.updateOrderStatus.bind(this);
  }

  // Listar pedidos prontos para entrega (READY) e pedidos do motoboy logado
  async getAvailableOrders(req, res) {
    const { restaurantId } = req;
    const driverId = req.user.id;

    try {
      const orders = await prisma.order.findMany({
        where: {
          restaurantId,
          orderType: 'DELIVERY',
          OR: [
            { status: 'READY' }, // Prontos na cozinha esperando motoboy
            { 
              status: { in: ['SHIPPED', 'READY'] }, 
              deliveryOrder: { driverId: driverId } // Meus pedidos atuais
            }
          ]
        },
        include: {
          deliveryOrder: {
            include: { customer: true }
          },
          items: {
            include: { product: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json(orders);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar pedidos para o entregador.' });
    }
  }

  // Atualizar status da entrega (Assumir entrega ou Concluir)
  async updateOrderStatus(req, res) {
    const { orderId } = req.params;
    const { status } = req.body; // 'SHIPPED' (Saiu para entrega) ou 'COMPLETED' (Entregue)
    const driverId = req.user.id;

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { deliveryOrder: true }
      });

      if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

      // Se estiver saindo para entrega, vincula o motoboy se ainda não estiver vinculado
      const updateData = { status };
      
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: updateData
        });

        // Atualiza a tabela deliveryOrder associada
        let deliveryStatus = 'PENDING';
        if (status === 'SHIPPED') deliveryStatus = 'OUT_FOR_DELIVERY';
        if (status === 'COMPLETED') deliveryStatus = 'DELIVERED';

        await tx.deliveryOrder.update({
          where: { orderId: orderId },
          data: { 
            status: deliveryStatus,
            driverId: driverId // Garante que o motoboy que clicou é o que está levando
          }
        });
      });

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar status da entrega.' });
    }
  }
}

module.exports = new DriverController();
