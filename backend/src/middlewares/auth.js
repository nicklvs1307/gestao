const jwt = require('jsonwebtoken');

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
    if (!req.user) return res.sendStatus(401);
    
    // SuperAdmin tem acesso total
    if (req.user.isSuperAdmin) return next();
    
    // Verifica se a permissão está na lista do usuário
    if (req.user.permissions && (req.user.permissions.includes(permission) || req.user.permissions.includes('all:manage'))) {
      return next();
    }
    
    res.status(403).json({ error: `Acesso negado. Permissão necessária: ${permission}` });
  };
};

const checkAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.isSuperAdmin || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ error: 'Acesso negado. Somente administradores podem realizar esta ação.' });
  }
};

const setRestaurantId = (req, res, next) => {
  const requestedRestaurantId = req.headers['x-restaurant-id'] || req.query.restaurantId;

  if (req.user && (req.user.isSuperAdmin || req.user.role === 'superadmin') && requestedRestaurantId) {
    req.restaurantId = requestedRestaurantId;
    return next();
  }

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
