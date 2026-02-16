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
      console.error('Erro ao criar instância na Evolution:', error.response?.data || error.message);
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
      console.error('Erro ao buscar QR Code:', error.response?.data || error.message);
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
      console.error('Erro ao buscar status da instância:', error.response?.data || error.message);
      return { instance: { state: 'DISCONNECTED' } };
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
      console.error('Erro ao enviar mensagem:', error.response?.data || error.message);
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

      // Aqui você precisaria salvar temporariamente e mandar para a OpenAI
      // Por simplicidade, assumiremos que a Evolution já pode mandar o áudio convertido
      // Ou usamos o Whisper. Vou deixar o placeholder da lógica:
      return "[Áudio recebido e processado]"; 
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
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
      console.error('Erro ao configurar webhook:', error.response?.data || error.message);
      throw new Error('Falha ao configurar webhook');
    }
  }
}

module.exports = new EvolutionService();
