const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const UairangoAuthService = require('./UairangoAuthService');

const BASE_URL = 'https://www.uairango.com/api2';

async function withRetry(fn, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      logger.warn(`[UAIRANGO MERCHANT] Tentativa ${i + 1} falhou, tentando novamente em ${delayMs * Math.pow(2, i)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
}

class UairangoMerchantService {
  async getMerchantDetails(restaurantId) {
    const token = await UairangoAuthService.getAccessToken(restaurantId);
    if (!token) throw new Error('Token de acesso não disponível');

    const settings = await prisma.integrationSettings.findUnique({ where: { restaurantId } });
    const merchantId = settings?.uairangoEstablishmentId;

    try {
      const response = await withRetry(() => axios.get(
        `${BASE_URL}/merchant/v1.0/merchants/${merchantId}`,
        { headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000 }
      ));
      return response.data;
    } catch (error) {
      logger.error(`[UAIRANGO MERCHANT] Erro ao buscar detalhes:`, error.message);
      throw new Error('Falha ao buscar detalhes do estabelecimento');
    }
  }

  async getMerchantStatus(restaurantId) {
    const token = await UairangoAuthService.getAccessToken(restaurantId);
    if (!token) throw new Error('Token de acesso não disponível');

    const settings = await prisma.integrationSettings.findUnique({ where: { restaurantId } });
    const merchantId = settings?.uairangoEstablishmentId;

    try {
      const response = await withRetry(() => axios.get(
        `${BASE_URL}/merchant/v1.0/merchants/${merchantId}/status`,
        { headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000 }
      ));
      return response.data;
    } catch (error) {
      logger.error(`[UAIRANGO MERCHANT] Erro ao buscar status:`, error.message);
      throw new Error('Falha ao buscar status do estabelecimento');
    }
  }

  async getConnectionStatus(restaurantId) {
    try {
      const token = await UairangoAuthService.getAccessToken(restaurantId);
      if (!token) return { connected: false, error: 'Token não disponível' };

      const settings = await prisma.integrationSettings.findUnique({ where: { restaurantId } });
      const merchantId = settings?.uairangoEstablishmentId;
      if (!merchantId) return { connected: false, error: 'Merchant ID não configurado' };

      const [merchant, statusList] = await Promise.allSettled([
        this.getMerchantDetails(restaurantId),
        this.getMerchantStatus(restaurantId)
      ]);

      const merchantData = merchant.status === 'fulfilled' ? merchant.value : null;
      const statusData = statusList.status === 'fulfilled' ? statusList.value : [];

      return {
        connected: true,
        merchant: merchantData,
        operations: statusData,
        tokenExpiresAt: settings.uairangoTokenExpiresAt
      };
    } catch (error) {
      logger.error(`[UAIRANGO MERCHANT] Erro ao testar conexão:`, error.message);
      return { connected: false, error: error.message };
    }
  }

  async updateMerchantStatus(restaurantId, status, operations) {
    const token = await UairangoAuthService.getAccessToken(restaurantId);
    if (!token) throw new Error('Token de acesso não disponível');

    const settings = await prisma.integrationSettings.findUnique({ where: { restaurantId } });
    const merchantId = settings?.uairangoEstablishmentId;

    try {
      await withRetry(() => axios.put(
        `${BASE_URL}/merchant/v1.0/merchants/${merchantId}`,
        { status, operations },
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 10000 }
      ));
      logger.info(`[UAIRANGO MERCHANT] Status atualizado para ${status}`);
      return { success: true };
    } catch (error) {
      logger.error(`[UAIRANGO MERCHANT] Erro ao atualizar status:`, error.message);
      throw new Error(error.response?.data?.error?.message || 'Falha ao atualizar status');
    }
  }

  async getCancellationReasons(restaurantId, platformOrderId) {
    const token = await UairangoAuthService.getAccessToken(restaurantId);
    if (!token) throw new Error('Token de acesso não disponível');

    try {
      const response = await withRetry(() => axios.get(
        `${BASE_URL}/order/v1.0/orders/${platformOrderId}/cancellationReasons`,
        { headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000 }
      ));
      return response.data;
    } catch (error) {
      if (error.response?.status === 204) return [];
      logger.error(`[UAIRANGO] Erro ao buscar motivos de cancelamento:`, error.message);
      throw new Error('Falha ao buscar motivos de cancelamento');
    }
  }

  async requestCancellation(restaurantId, platformOrderId, cancellationCode, reason) {
    const token = await UairangoAuthService.getAccessToken(restaurantId);
    if (!token) throw new Error('Token de acesso não disponível');

    try {
      await withRetry(() => axios.post(
        `${BASE_URL}/order/v1.0/orders/${platformOrderId}/requestCancellation`,
        { cancellationCode, reason },
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 10000 }
      ));
      logger.info(`[UAIRANGO] Cancelamento solicitado para pedido ${platformOrderId}`);
      return { success: true };
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao solicitar cancelamento:`, error.message);
      throw new Error(error.response?.data?.error?.message || 'Falha ao solicitar cancelamento');
    }
  }
}

module.exports = new UairangoMerchantService();
