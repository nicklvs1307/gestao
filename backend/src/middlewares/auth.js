const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Support for Bearer token in header or token in query string (for SSE)
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Autenticação necessária.' });
    
    // SuperAdmin ou Permissão Mestra tem acesso total
    if (req.user.isSuperAdmin || (req.user.permissions && req.user.permissions.includes('all:manage'))) {
        return next();
    }
    
    // Verifica se a permissão está na lista do usuário
    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }
    
    res.status(403).json({ error: `Acesso negado. Você não tem a permissão necessária: ${permission}` });
  };
};

const checkAdmin = (req, res, next) => {
  if (req.user && (req.user.isSuperAdmin || (req.user.permissions && req.user.permissions.includes('all:manage')) || req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ error: 'Acesso negado. Esta ação requer privilégios de administrador.' });
  }
};

const setRestaurantId = async (req, res, next) => {
  const requestedRestaurantId = req.headers['x-restaurant-id'] || req.query.restaurantId;

  // 1. SuperAdmin tem acesso irrestrito
  if (req.user && (req.user.isSuperAdmin || req.user.role === 'superadmin') && requestedRestaurantId) {
    req.restaurantId = requestedRestaurantId;
    return next();
  }

  // 2. Franqueador pode acessar qualquer loja da sua franquia (VALIDADO)
  if (req.user && req.user.franchiseId && (req.user.permissions?.includes('franchise:manage') || req.user.role === 'franchisor') && requestedRestaurantId) {
      try {
          const restaurant = await prisma.restaurant.findFirst({
              where: { id: requestedRestaurantId, franchiseId: req.user.franchiseId }
          });
          
          if (!restaurant) {
              return res.status(403).json({ error: 'Acesso negado: Esta loja não pertence à sua franquia.' });
          }
          
          req.restaurantId = requestedRestaurantId;
          return next();
      } catch (error) {
          return res.status(500).json({ error: 'Erro ao validar contexto de franquia.' });
      }
  }

  // 3. Usuário comum de restaurante
  if (req.user && req.user.restaurantId) {
    req.restaurantId = req.user.restaurantId;
    next();
  } else if (req.user && (req.user.isSuperAdmin || req.user.role === 'superadmin')) {
    // Se for uma rota que EXIGE restaurante (como /api/products) e não foi passado ID, bloqueamos
    // Exceto se for uma rota de gerenciamento global
    const storeSpecificPaths = ['/api/products', '/api/categories', '/api/admin/orders', '/api/stock', '/api/financial'];
    const isStoreRoute = storeSpecificPaths.some(path => req.originalUrl.split('?')[0].startsWith(path));

    if (isStoreRoute && !requestedRestaurantId) {
      return res.status(400).json({ error: 'Contexto de loja não selecionado. Selecione uma loja para gerenciar.' });
    }
    
    if (requestedRestaurantId) {
        req.restaurantId = requestedRestaurantId;
    }
    
    next();
  } else {
    res.status(403).json({ error: 'Usuário não associado a um restaurante.' });
  }
};

const needsAuth = [authenticateToken, setRestaurantId];
const needsAdmin = [authenticateToken, setRestaurantId, checkAdmin];

module.exports = {
  authenticateToken,
  checkPermission,
  checkAdmin,
  setRestaurantId,
  needsAuth,
  needsAdmin
};
