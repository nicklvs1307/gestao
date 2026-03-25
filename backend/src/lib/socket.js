const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

module.exports = {
  init: (httpServer) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [];

    io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins.includes('*') ? true : (allowedOrigins.length > 0 ? allowedOrigins : false),
        methods: ['GET', 'POST']
      }
    });

    // Middleware de autenticação para Socket.IO
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token
        || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        next(new Error('Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      const restaurantId = socket.handshake.query.restaurantId;

      if (restaurantId) {
        // Verifica se o usuário tem acesso ao restaurante
        const user = socket.user;
        const hasAccess =
          user.isSuperAdmin ||
          user.role === 'superadmin' ||
          user.restaurantId === restaurantId ||
          (user.franchiseId && user.permissions?.includes('franchise:manage'));

        if (hasAccess) {
          socket.join(`restaurant_${restaurantId}`);
        } else {
          socket.disconnect(true);
          return;
        }
      }

      socket.on('disconnect', () => {
        // Log removido para evitar excesso de logs
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
  emitToRestaurant: (restaurantId, event, data) => {
    if (io) {
      io.to(`restaurant_${restaurantId}`).emit(event, data);
    }
  }
};
