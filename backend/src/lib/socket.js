const { Server } = require('socket.io');

let io;

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: '*', // Em produção, restringir para as origens permitidas
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', (socket) => {
      const restaurantId = socket.handshake.query.restaurantId;
      if (restaurantId) {
        socket.join(`restaurant_${restaurantId}`);
        console.log(`Socket conectado: ${socket.id} - Restaurante: ${restaurantId}`);
      }

      socket.on('disconnect', () => {
        console.log(`Socket desconectado: ${socket.id}`);
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io não inicializado!');
    }
    return io;
  },
  // Função auxiliar para emitir eventos para um restaurante específico
  emitToRestaurant: (restaurantId, event, data) => {
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit(event, data);
    }
  }
};
