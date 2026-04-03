const { getModulesForPlan } = require('../config/planModules');
const { getPermissionsForModules } = require('../config/modulePermissions');
const prisma = require('../lib/prisma');

const checkModuleEnabled = (module) => {
  return async (req, res, next) => {
    if (req.user.isSuperAdmin || (req.user.permissions && req.user.permissions.includes('all:manage'))) {
      return next();
    }

    let enabledModules = req.user.enabledModules;

    if (!enabledModules && req.restaurantId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: req.restaurantId },
        select: { enabledModules: true, plan: true, status: true }
      });

      if (restaurant) {
        if (restaurant.status === 'SUSPENDED') {
          return res.status(403).json({ error: 'Restaurante suspenso. Entre em contato com o suporte.' });
        }

        enabledModules = restaurant.enabledModules || getModulesForPlan(restaurant.plan);
      }
    }

    if (!enabledModules || !enabledModules.includes(module)) {
      return res.status(403).json({ error: 'Módulo não disponível neste restaurante.' });
    }

    next();
  };
};

const checkRestaurantStatus = async (req, res, next) => {
  if (req.user.isSuperAdmin) {
    return next();
  }

  if (req.user.restaurantStatus === 'SUSPENDED') {
    return res.status(403).json({ error: 'Restaurante suspenso. Entre em contato com o suporte.' });
  }

  if (req.restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.restaurantId },
      select: { status: true, expiresAt: true }
    });

    if (restaurant) {
      if (restaurant.status === 'SUSPENDED') {
        return res.status(403).json({ error: 'Restaurante suspenso. Entre em contato com o suporte.' });
      }

      if (restaurant.expiresAt && new Date(restaurant.expiresAt) < new Date()) {
        return res.status(403).json({ error: 'Assinatura expirada. Entre em contato com o suporte.' });
      }
    }
  }

  next();
};

module.exports = {
  checkModuleEnabled,
  checkRestaurantStatus
};
