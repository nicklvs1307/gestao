const axios = require('axios');
const prisma = require('../lib/prisma');

class EvolutionService {
  constructor() {
    this.baseURL = process.env.EVOLUTION_API_URL;
    this.apiKey = process.env.EVOLUTION_API_KEY;
    
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'apikey': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Função auxiliar para logar erros de forma detalhada
   */
  _logError(method, error) {
    console.error(`Erro em ${method} da Evolution API:`);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
      console.error('  Headers:', error.response.headers);
    } else if (error.request) {
      console.error('  No response received:', error.request);
    } else {
      console.error('  Message:', error.message);
    }
    console.error('  Config:', error.config);
  }

  /**
   * Cria uma nova instância na Evolution API
   */
  async createInstance(instanceName, restaurantId) {
    try {
      const response = await this.api.post('/instance/create', {
        instanceName,
        token: '', // Deixa a API gerar o token
        qrcode: true,
        number: ''
      });

      const { hash } = response.data;
      
      // Salva no banco local
      return await prisma.whatsAppInstance.upsert({
        where: { restaurantId },
        update: {
          name: instanceName,
          token: hash,
          status: 'CONNECTING'
        },
        create: {
          name: instanceName,
          token: hash,
          status: 'CONNECTING',
          restaurantId
        }
      });
    } catch (error) {
      this._logError('createInstance', error);
      throw new Error('Falha ao criar instância de WhatsApp');
    }
  }

  /**
   * Obtém o QR Code da instância
   */
  async getQrCode(instanceName) {
    try {
      const response = await this.api.get(`/instance/connect/${instanceName}`);
      return response.data; // Normalmente retorna { base64: '...' }
    } catch (error) {
      this._logError('getQrCode', error);
      throw new Error('Falha ao obter QR Code');
    }
  }

  /**
   * Verifica o status da instância
   */
  async getInstanceStatus(instanceName) {
    try {
      const response = await this.api.get(`/instance/connectionState/${instanceName}`);
      return response.data;
    } catch (error) {
      this._logError('getInstanceStatus', error);
      return { instance: { state: 'DISCONNECTED' } }; // Retorna um status padrão em caso de erro
    }
  }

  /**
   * Envia uma mensagem de texto com simulação de digitação
   */
  async sendText(instanceName, number, text, delay = 1200) {
    try {
      const remoteJid = number.includes('@') ? number : `${number.replace(/\D/g, '')}@s.whatsapp.net`;
      
      const response = await this.api.post(`/message/sendText/${instanceName}`, {
        number: remoteJid,
        options: {
          delay: delay,
          presence: 'composing',
          linkPreview: true
        },
        textMessage: {
          text
        }
      });
      return response.data;
    } catch (error) {
      this._logError('sendText', error);
      // Não joga erro aqui, apenas loga, pois pode ser um erro recuperável de envio
    }
  }

  /**
   * Transcreve áudio recebido via OpenAI Whisper
   */
  async transcribeAudio(instanceName, messageKey) {
    try {
      // Busca o arquivo base64 do áudio na Evolution
      const response = await this.api.post(`/message/getBase64/${instanceName}`, {
        key: messageKey
      });
      
      const base64Data = response.data.base64;
      if (!base64Data) return null;

      // TODO: Integrar com a API Whisper da OpenAI aqui.
      // Por enquanto, apenas um placeholder.
      return "[Áudio recebido e processado]"; 
    } catch (error) {
      this._logError('transcribeAudio', error);
      return null;
    }
  }

  /**
   * Configura o Webhook para a instância
   */
  async setWebhook(instanceName, webhookUrl) {
    try {
      const response = await this.api.post(`/webhook/set/${instanceName}`, {
        url: webhookUrl,
        enabled: true,
        events: [
          'MESSAGES_UPSERT',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED'
        ]
      });
      return response.data;
    } catch (error) {
      this._logError('setWebhook', error);
      throw new Error('Falha ao configurar webhook');
    }
  }
}

module.exports = new EvolutionService();
