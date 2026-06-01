const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const Food99AuthService = require('../services/Food99AuthService');
const Food99OrderAdapter = require('../services/Food99OrderAdapter');
const Food99MenuService = require('../services/Food99MenuService');

const getFood99Settings = async (req, res) => {
  try {
    let settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId: req.restaurantId },
    });

    if (!settings) {
      settings = await prisma.integrationSettings.create({
        data: { restaurantId: req.restaurantId },
      });
    }

    const credentialsConfigured = !!(process.env.FOOD99_CLIENT_ID && process.env.FOOD99_CLIENT_SECRET);

    res.json({ ...settings, food99CredentialsConfigured: credentialsConfigured });
  } catch (error) {
    logger.error('Erro ao buscar configurações da 99Food:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações da 99Food.' });
  }
};

const updateFood99Settings = async (req, res) => {
  const { food99MerchantId, food99IntegrationActive, food99Env, food99AppShopId } = req.body;

  try {
    const settings = await prisma.integrationSettings.upsert({
      where: { restaurantId: req.restaurantId },
      update: { food99MerchantId, food99IntegrationActive, food99Env, food99AppShopId },
      create: { restaurantId: req.restaurantId, food99MerchantId, food99IntegrationActive, food99Env, food99AppShopId },
    });

    const credentialsConfigured = !!(process.env.FOOD99_CLIENT_ID && process.env.FOOD99_CLIENT_SECRET);

    res.json({ ...settings, food99CredentialsConfigured: credentialsConfigured });
  } catch (error) {
    logger.error('Erro ao atualizar configurações da 99Food:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações da 99Food.' });
  }
};

const getFood99ConnectionStatus = async (req, res) => {
  try {
    const appShopId = req.query.app_shop_id || (await prisma.integrationSettings.findUnique({
      where: { restaurantId: req.restaurantId },
    }))?.food99AppShopId || null;

    const status = await Food99AuthService.checkConnectionStatus(appShopId);
    res.json(status);
  } catch (error) {
    logger.error('Erro ao verificar status da 99Food:', error);
    res.status(500).json({ error: 'Erro ao verificar status da 99Food.' });
  }
};

const getDebug = async (req, res) => {
  try {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId: req.restaurantId },
    });
    const debug = Food99AuthService.getDebugInfo();
    res.json({
      restaurantId: req.restaurantId,
      settings: {
        food99AppShopId: settings?.food99AppShopId,
        food99MerchantId: settings?.food99MerchantId,
        food99Env: settings?.food99Env,
        food99IntegrationActive: settings?.food99IntegrationActive,
      },
      ...debug,
    });
  } catch (error) {
    logger.error('[FOOD99 CTRL] Erro em getDebug:', error);
    res.status(500).json({ error: error.message });
  }
};

const confirmFood99Order = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId é obrigatório' });

    const result = await Food99OrderAdapter.confirmOrder(orderId, req.restaurantId);
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao confirmar pedido:', error);
    res.status(500).json({ error: error.message || 'Erro ao confirmar pedido' });
  }
};

const rejectFood99Order = async (req, res) => {
  try {
    const { orderId, reasonId, reason } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId é obrigatório' });

    const result = await Food99OrderAdapter.rejectOrder(orderId, req.restaurantId, reasonId, reason);
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao rejeitar pedido:', error);
    res.status(500).json({ error: error.message || 'Erro ao rejeitar pedido' });
  }
};

const markFood99Ready = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId é obrigatório' });

    const result = await Food99OrderAdapter.markReady(orderId, req.restaurantId);
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao marcar pronto:', error);
    res.status(500).json({ error: error.message || 'Erro ao marcar pronto' });
  }
};

const getAuthorizationUrl = async (req, res) => {
  try {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId: req.restaurantId },
    });

    if (!settings?.food99AppShopId) {
      return res.status(400).json({ error: 'App Shop ID não configurado' });
    }

    const result = await Food99AuthService.getAuthorizationUrl(settings.food99AppShopId);
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao gerar URL de autorização:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar URL de autorização' });
  }
};

const listShops = async (req, res) => {
  try {
    const { pageNo, pageSize } = req.query;
    const result = await Food99AuthService.listShops(
      parseInt(pageNo) || 1,
      parseInt(pageSize) || 30
    );
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao listar lojas:', error);
    res.status(500).json({ error: error.message || 'Erro ao listar lojas' });
  }
};

const setShopOnline = async (req, res) => {
  try {
    const { online } = req.body;
    if (online === undefined) return res.status(400).json({ error: 'Campo "online" é obrigatório' });

    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId: req.restaurantId },
    });

    if (!settings?.food99AppShopId) {
      return res.status(400).json({ error: 'App Shop ID não configurado' });
    }

    const token = await Food99AuthService.getValidToken(settings.food99AppShopId);
    if (!token) {
      return res.status(500).json({ error: 'Token não disponível' });
    }

    const bizStatus = online ? 1 : 2;
    const autoSwitch = online ? 1 : 2;
    const result = await Food99AuthService.setShopStatus(token, bizStatus, autoSwitch);
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao definir status da loja:', error);
    res.status(500).json({ error: error.message || 'Erro ao definir status da loja' });
  }
};

const setConfirmMethod = async (req, res) => {
  try {
    const { method } = req.body;
    if (!method || ![1, 2].includes(method)) {
      return res.status(400).json({ error: 'Método inválido. Use 1 (BAPP) ou 2 (OPENAPI)' });
    }

    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId: req.restaurantId },
    });

    if (!settings?.food99AppShopId) {
      return res.status(400).json({ error: 'App Shop ID não configurado' });
    }

    const token = await Food99AuthService.getValidToken(settings.food99AppShopId);
    if (!token) {
      return res.status(500).json({ error: 'Token não disponível' });
    }

    const result = await Food99AuthService.setConfirmMethod(token, method);
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao definir método de confirmação:', error);
    res.status(500).json({ error: error.message || 'Erro ao definir método de confirmação' });
  }
};

const getShopDetail = async (req, res) => {
  try {
    logger.info(`[FOOD99 CTRL] getShopDetail chamado: restaurantId=${req.restaurantId} userId=${req.userId}`);

    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId: req.restaurantId },
    });

    logger.info(`[FOOD99 CTRL] getShopDetail settings: appShopId=${settings?.food99AppShopId || 'AUSENTE'} env=${settings?.food99Env || 'production'} active=${settings?.food99IntegrationActive}`);

    if (!settings?.food99AppShopId) {
      return res.status(400).json({ error: 'App Shop ID não configurado' });
    }

    const token = await Food99AuthService.getValidToken(settings.food99AppShopId);
    if (!token) {
      logger.error(`[FOOD99 CTRL] getShopDetail: token não obtido para shop ${settings.food99AppShopId}`);
      return res.status(500).json({ error: 'Token não disponível' });
    }

    const result = await Food99AuthService.getShopDetail(token);
    logger.info(`[FOOD99 CTRL] getShopDetail: sucesso, retornou ${JSON.stringify(result)?.slice(0, 200)}`);
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao buscar detalhes da loja:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes da loja.' });
  }
};

const syncMenu = async (req, res) => {
  try {
    const result = await Food99MenuService.syncMenu(req.restaurantId);
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao sincronizar cardápio:', error);
    res.status(500).json({ error: error.message || 'Erro ao sincronizar cardápio' });
  }
};

const getMenuStatus = async (req, res) => {
  try {
    const { taskId } = req.query;
    if (!taskId) return res.status(400).json({ error: 'taskId é obrigatório' });

    const result = await Food99MenuService.getMenuStatus(req.restaurantId, taskId);
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao verificar status do cardápio:', error);
    res.status(500).json({ error: error.message || 'Erro ao verificar status do cardápio' });
  }
};

const getCurrentMenu = async (req, res) => {
  try {
    const result = await Food99MenuService.getCurrentMenu(req.restaurantId);
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao buscar cardápio atual:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar cardápio atual' });
  }
};

const updateItemStatus = async (req, res) => {
  try {
    const { integrationCode, available } = req.body;
    if (!integrationCode || available === undefined) {
      return res.status(400).json({ error: 'integrationCode e available são obrigatórios' });
    }

    const result = await Food99MenuService.updateItemStatus(
      req.restaurantId,
      integrationCode,
      available
    );
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao atualizar status do item:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar status do item' });
  }
};

const refreshToken = async (req, res) => {
  try {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId: req.restaurantId },
    });

    if (!settings?.food99AppShopId) {
      return res.status(400).json({ error: 'App Shop ID não configurado' });
    }

    const token = await Food99AuthService.refreshToken(settings.food99AppShopId);
    res.json({ success: !!token, message: token ? 'Token renovado com sucesso' : 'Falha ao renovar token' });
  } catch (error) {
    logger.error('[FOOD99] Erro ao renovar token:', error);
    res.status(500).json({ error: error.message || 'Erro ao renovar token' });
  }
};

const unbindShop = async (req, res) => {
  try {
    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId: req.restaurantId },
    });

    if (!settings?.food99AppShopId) {
      return res.status(400).json({ error: 'App Shop ID não configurado' });
    }

    const token = await Food99AuthService.getValidToken(settings.food99AppShopId);
    if (!token) {
      return res.status(500).json({ error: 'Token não disponível' });
    }

    const result = await Food99AuthService.unbindShop(token);
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao desvincular loja:', error);
    res.status(500).json({ error: error.message || 'Erro ao desvincular loja' });
  }
};

const handleCancelApply = async (req, res) => {
  try {
    const { orderId, applyId, agree, reason } = req.body;
    if (!orderId || !applyId || agree === undefined) {
      return res.status(400).json({ error: 'orderId, applyId e agree são obrigatórios' });
    }

    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId: req.restaurantId },
    });

    if (!settings?.food99AppShopId) {
      return res.status(400).json({ error: 'App Shop ID não configurado' });
    }

    const token = await Food99AuthService.getValidToken(settings.food99AppShopId);
    if (!token) {
      return res.status(500).json({ error: 'Token não disponível' });
    }

    const result = await Food99AuthService.handleCancelApply(token, orderId, applyId, agree, reason);
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao processar cancel apply:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar solicitação de cancelamento' });
  }
};

const handleRefundApply = async (req, res) => {
  try {
    const { orderId, applyId, agree, reason } = req.body;
    if (!orderId || !applyId || agree === undefined) {
      return res.status(400).json({ error: 'orderId, applyId e agree são obrigatórios' });
    }

    const settings = await prisma.integrationSettings.findUnique({
      where: { restaurantId: req.restaurantId },
    });

    if (!settings?.food99AppShopId) {
      return res.status(400).json({ error: 'App Shop ID não configurado' });
    }

    const token = await Food99AuthService.getValidToken(settings.food99AppShopId);
    if (!token) {
      return res.status(500).json({ error: 'Token não disponível' });
    }

    const result = await Food99AuthService.handleRefundApply(token, orderId, applyId, agree, reason);
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao processar refund apply:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar solicitação de reembolso' });
  }
};

module.exports = {
  getFood99Settings,
  updateFood99Settings,
  getFood99ConnectionStatus,
  getDebug,
  confirmFood99Order,
  rejectFood99Order,
  markFood99Ready,
  getAuthorizationUrl,
  listShops,
  setShopOnline,
  setConfirmMethod,
  getShopDetail,
  syncMenu,
  getMenuStatus,
  getCurrentMenu,
  updateItemStatus,
  refreshToken,
  unbindShop,
  handleCancelApply,
  handleRefundApply,
};
