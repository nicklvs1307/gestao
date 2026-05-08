const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const Food99AuthService = require('../services/Food99AuthService');
const Food99OrderService = require('../services/Food99OrderService');

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
    const status = await Food99AuthService.checkConnectionStatus();

    if (status.connected && req.query.app_shop_id) {
      try {
        const token = await Food99AuthService.getValidToken(req.query.app_shop_id);
        status.tokenActive = !!token;
        status.message = token
          ? `Token ativo para shop ${req.query.app_shop_id}`
          : `Sem token válido para shop ${req.query.app_shop_id}`;
      } catch {
        status.tokenActive = false;
      }
    }

    res.json(status);
  } catch (error) {
    logger.error('Erro ao verificar status da 99Food:', error);
    res.status(500).json({ error: 'Erro ao verificar status da 99Food.' });
  }
};

const confirmFood99Order = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId é obrigatório' });

    const result = await Food99OrderService.confirmOrder(orderId, req.restaurantId);
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

    const result = await Food99OrderService.rejectOrder(orderId, req.restaurantId, reasonId, reason);
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

    const result = await Food99OrderService.markReady(orderId, req.restaurantId);
    res.json(result);
  } catch (error) {
    logger.error('[FOOD99] Erro ao marcar pronto:', error);
    res.status(500).json({ error: error.message || 'Erro ao marcar pronto' });
  }
};

module.exports = {
  getFood99Settings,
  updateFood99Settings,
  getFood99ConnectionStatus,
  confirmFood99Order,
  rejectFood99Order,
  markFood99Ready,
};
