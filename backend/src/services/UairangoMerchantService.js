const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const api = require('./UairangoApiClient');

class UairangoMerchantService {
  async getMerchantDetails(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({ where: { restaurantId } });
    const merchantId = settings?.uairangoEstablishmentId;

    try {
      const response = await api.get(restaurantId, `/merchant/v1.0/merchants/${merchantId}`);
      return response.data;
    } catch (error) {
      const statusCode = error.response?.status;
      const apiData = error.response?.data;
      const fullBody = JSON.stringify(apiData || {});
      logger.error(`[UAIRANGO MERCHANT] FAILED GET /merchant/v1.0/merchants/${merchantId}`);
      logger.error(`[UAIRANGO MERCHANT] Status: ${statusCode} | Response: ${fullBody.substring(0, 300)}`);
      throw new Error('Falha ao buscar detalhes do estabelecimento');
    }
  }

  async getMerchantStatus(restaurantId) {
    const settings = await prisma.integrationSettings.findUnique({ where: { restaurantId } });
    const merchantId = settings?.uairangoEstablishmentId;

    try {
      const response = await api.get(restaurantId, `/merchant/v1.0/merchants/${merchantId}/status`);
      return response.data;
    } catch (error) {
      const statusCode = error.response?.status;
      const apiData = error.response?.data;
      const fullBody = JSON.stringify(apiData || {});
      logger.error(`[UAIRANGO MERCHANT] FAILED GET /merchant/v1.0/merchants/${merchantId}/status`);
      logger.error(`[UAIRANGO MERCHANT] Status: ${statusCode} | Response: ${fullBody.substring(0, 300)}`);
      throw new Error('Falha ao buscar status do estabelecimento');
    }
  }

  async getConnectionStatus(restaurantId) {
    try {
      const settings = await prisma.integrationSettings.findUnique({ where: { restaurantId } });

      if (!settings?.uairangoActive) {
        return { connected: false, error: 'Integração não ativa' };
      }

      const merchantId = settings?.uairangoEstablishmentId;
      if (!merchantId) {
        return { connected: false, error: 'Merchant ID não configurado' };
      }

      const [merchant, statusList] = await Promise.allSettled([
        this.getMerchantDetails(restaurantId),
        this.getMerchantStatus(restaurantId)
      ]);

      const merchantData = merchant.status === 'fulfilled' ? merchant.value : null;
      const statusData = statusList.status === 'fulfilled' ? statusList.value : [];

      const bothFailed = merchant.status === 'rejected' && statusList.status === 'rejected';

      if (bothFailed) {
        const merchantError = merchant.reason?.message || 'Erro desconhecido';
        const statusError = statusList.reason?.message || 'Erro desconhecido';

        logger.error(`[UAIRANGO MERCHANT] Conexão falhou para restaurante ${restaurantId}: merchant=${merchantError}, status=${statusError}`);

        if (merchantError.includes('token') || merchantError.includes('401') || statusError.includes('token') || statusError.includes('401')) {
          return { connected: false, error: 'Credenciais do aplicativo inválidas' };
        }

        return { connected: false, error: merchantError };
      }

      return {
        connected: true,
        merchant: merchantData,
        operations: statusData,
        tokenExpiresAt: settings.uairangoTokenExpiresAt
      };
    } catch (error) {
      logger.error(`[UAIRANGO MERCHANT] Erro ao testar conexão para restaurante ${restaurantId}:`, error.message);
      return { connected: false, error: error.message };
    }
  }

  async updateMerchantStatus(restaurantId, status, operations) {
    const settings = await prisma.integrationSettings.findUnique({ where: { restaurantId } });
    const merchantId = settings?.uairangoEstablishmentId;

    try {
      await api.put(restaurantId, `/merchant/v1.0/merchants/${merchantId}`, { status, operations });
      logger.info(`[UAIRANGO MERCHANT] Status atualizado para ${status}`);
      return { success: true };
    } catch (error) {
      const statusCode = error.response?.status;
      const apiData = error.response?.data;
      const fullBody = JSON.stringify(apiData || {});
      logger.error(`[UAIRANGO MERCHANT] FAILED PUT /merchant/v1.0/merchants/${merchantId}`);
      logger.error(`[UAIRANGO MERCHANT] Status: ${statusCode} | Response: ${fullBody.substring(0, 300)}`);
      throw new Error(error.response?.data?.error?.message || 'Falha ao atualizar status');
    }
  }
}

module.exports = new UairangoMerchantService();
