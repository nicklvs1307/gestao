const axios = require('axios');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const IntegrationBaseService = require('./IntegrationBaseService');

class UairangoOrderAdapter extends IntegrationBaseService {
  constructor() {
    super('uairango');
    this.BASE_URL = 'https://www.uairango.com/api2';
  }

  async getSettings(restaurantId) {
    return await prisma.integrationSettings.findUnique({
      where: { restaurantId }
    });
  }

  async getAccessToken(restaurantId) {
    const settings = await this.getSettings(restaurantId);
    if (!settings?.uairangoActive || !settings?.uairangoToken) {
      return null;
    }

    try {
      const response = await axios.post(`${this.BASE_URL}/login`, {
        token: settings.uairangoToken
      });

      if (response.data && response.data.success && response.data.token) {
        return response.data.token;
      }
      return null;
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao obter token:`, error.message);
      return null;
    }
  }

  getPlatformOrderId(rawData) {
    return rawData.cod_pedido || rawData.id;
  }

  parseOrder(rawData, restaurantId) {
    const isDelivery = rawData.tipo_entrega === 'Delivery';
    const orderType = isDelivery ? 'DELIVERY' : 'PICKUP';

    const products = rawData.produtos || [];
    const items = products.map(item => {
      const addonsData = [];
      if (Array.isArray(item.adicionais)) {
        for (const addon of item.adicionais) {
          addonsData.push({
            name: addon.nome || 'Adicional',
            price: parseFloat(addon.valor || 0),
            quantity: addon.quantidade || 1
          });
        }
      }

      return {
        productId: null,
        quantity: parseInt(item.quantidade || 1),
        priceAtTime: parseFloat(item.valor || 0),
        observations: item.obs || null,
        addonsJson: addonsData.length > 0 ? JSON.stringify(addonsData) : null,
        sizeJson: item.opcao ? JSON.stringify({ name: item.opcao, price: parseFloat(item.valor || 0) }) : null,
        flavorsJson: null
      };
    });

    const deliveryData = isDelivery ? {
      address: this._formatAddress(rawData.endereco),
      complement: rawData.endereco?.complemento || '',
      reference: rawData.endereco?.ponto_referencia || '',
      neighborhood: rawData.endereco?.bairro || '',
      city: rawData.endereco?.cidade || '',
      state: rawData.endereco?.uf || '',
      zipCode: rawData.endereco?.cep || '',
      deliveryType: 'delivery',
      deliveryFee: parseFloat(rawData.taxa_entrega || 0),
      notes: rawData.observacao || null,
      latitude: rawData.endereco?.lat ? parseFloat(rawData.endereco.lat) : null,
      longitude: rawData.endereco?.lng ? parseFloat(rawData.endereco.lng) : null,
    } : null;

    const customerData = isDelivery ? {
      name: rawData.usuario?.nome || 'Cliente',
      phone: rawData.usuario?.tel1 || rawData.usuario?.tel_localizador || '',
    } : null;

    const total = parseFloat(rawData.valor_total || 0);
    const extraCharge = isDelivery ? parseFloat(rawData.taxa_entrega || 0) : 0;

    const paymentMethod = this.mapPaymentMethod(rawData.forma_pagamento);

    return {
      orderType,
      total: total - (rawData.taxa_entrega || 0),
      discount: 0,
      extraCharge,
      items,
      customer: customerData,
      deliveryData,
      paymentMethod,
      customerNote: rawData.observacao || null,
    };
  }

  _formatAddress(endereco) {
    if (!endereco) return '';
    return `${endereco.rua || ''}, ${endereco.num || 'S/N'} - ${endereco.bairro || ''}, ${endereco.cidade || ''}/${endereco.uf || ''}`;
  }

  async confirmOrderOnPlatform(restaurantId, platformOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    try {
      await axios.post(
        `${this.BASE_URL}/auth/pedido/confirma/${platformOrderId}`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      logger.info(`[UAIRANGO] Pedido ${platformOrderId} confirmado`);
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao confirmar:`, error.message);
    }
  }

  async rejectOrderOnPlatform(restaurantId, platformOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    try {
      await axios.post(
        `${this.BASE_URL}/auth/pedido/cancela/${platformOrderId}`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      logger.info(`[UAIRANGO] Pedido ${platformOrderId} cancelado`);
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao cancelar:`, error.message);
    }
  }

  async markReadyOnPlatform(restaurantId, platformOrderId) {
    const token = await this.getAccessToken(restaurantId);
    if (!token) return;

    try {
      await axios.post(
        `${this.BASE_URL}/auth/pedido/notifica/${platformOrderId}`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      logger.info(`[UAIRANGO] Pedido ${platformOrderId} marcado como pronto`);
    } catch (error) {
      logger.error(`[UAIRANGO] Erro ao notificar:`, error.message);
    }
  }
}

const uairangoOrderAdapter = new UairangoOrderAdapter();

module.exports = uairangoOrderAdapter;
module.exports.UairangoOrderAdapter = UairangoOrderAdapter;