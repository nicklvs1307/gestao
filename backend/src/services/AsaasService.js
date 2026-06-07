const logger = require('../config/logger');

class AsaasService {
  constructor(apiKey, environment = 'sandbox') {
    this.baseUrl = environment === 'production'
      ? 'https://api.asaas.com'
      : 'https://api-sandbox.asaas.com';
    this.apiKey = apiKey;
  }

  _getHeaders() {
    return {
      'access_token': this.apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'Kicardapio/1.0'
    };
  }

  async _request(method, endpoint, body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: this._getHeaders(),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    logger.info(`[AsaasService] ${method} ${endpoint}`);

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = errorBody.errors?.[0]?.description || errorBody.message || `HTTP ${response.status}`;
      logger.error(`[AsaasService] Erro ${response.status}: ${errorMessage}`, { endpoint, status: response.status });
      throw new Error(`Asaas API erro: ${errorMessage}`);
    }

    return response.json();
  }

  async createCustomer(customerData) {
    const { name, cpfCnpj, email, phone } = customerData;

    // Buscar cliente existente por CPF/CNPJ
    if (cpfCnpj) {
      try {
        const existing = await this._request('GET', `/v3/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`);
        if (existing.totalCount > 0) {
          logger.info(`[AsaasService] Cliente existente encontrado: ${existing.data[0].id}`);
          return existing.data[0];
        }
      } catch (err) {
        logger.warn(`[AsaasService] Busca de cliente falhou, criando novo: ${err.message}`);
      }
    }

    const body = {
      name: name || 'Cliente Cardápio',
    };

    if (cpfCnpj) body.cpfCnpj = cpfCnpj;
    if (email) body.email = email;
    if (phone) body.phone = phone.replace(/\D/g, '');

    const customer = await this._request('POST', '/v3/customers', body);
    logger.info(`[AsaasService] Cliente criado: ${customer.id}`);
    return customer;
  }

  async createPixPayment(customerId, value, orderId, description) {
    const today = new Date().toISOString().split('T')[0];

    const body = {
      customer: customerId,
      billingType: 'PIX',
      value: value,
      dueDate: today,
      description: description || `Pedido ${orderId}`,
      externalReference: orderId,
    };

    const payment = await this._request('POST', '/v3/payments', body);
    logger.info(`[AsaasService] Cobrança PIX criada: ${payment.id} (R$ ${value})`);
    return payment;
  }

  async getPixQrCode(paymentId) {
    const qrCode = await this._request('GET', `/v3/payments/${paymentId}/pixQrCode`);
    logger.info(`[AsaasService] QR Code obtido para pagamento: ${paymentId}`);
    return {
      encodedImage: qrCode.encodedImage,
      payload: qrCode.payload,
      expirationDate: qrCode.expirationDate,
    };
  }

  async getPaymentStatus(paymentId) {
    const payment = await this._request('GET', `/v3/payments/${paymentId}`);
    return {
      id: payment.id,
      status: payment.status,
      value: payment.value,
      dateCreated: payment.dateCreated,
    };
  }

  async validateApiKey() {
    try {
      await this._request('GET', '/v3/accounts');
      return true;
    } catch (err) {
      logger.error(`[AsaasService] Validação de API Key falhou: ${err.message}`);
      return false;
    }
  }
}

module.exports = AsaasService;
