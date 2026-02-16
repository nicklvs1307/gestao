const axios = require('axios');
const prisma = require('../lib/prisma');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  /**
   * Função auxiliar para logar erros de forma detalhada
   */
  _logError(method, error) {
    console.error(`Erro em ${method} da Evolution API:`);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
      if (error.response.data && error.response.data.response && error.response.data.response.message) {
        console.error('  Evolution API Message:', JSON.stringify(error.response.data.response.message, null, 2));
      }
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
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });
      
      const { token } = response.data; // <<<<<< Correção aqui, usando 'token'
      
      // Salva no banco local
      return await prisma.whatsAppInstance.upsert({
        where: { restaurantId },
        update: {
          name: instanceName,
          token: token,
          status: 'CONNECTING'
        },
        create: {
          name: instanceName,
          token: token,
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
   * Desloga a instância
   */
  async logoutInstance(instanceName) {
    try {
      const response = await this.api.delete(`/instance/logout/${instanceName}`);
      return response.data;
    } catch (error) {
      this._logError('logoutInstance', error);
      throw new Error('Falha ao deslogar instância');
    }
  }

  /**
   * Reinicia a instância
   */
  async restartInstance(instanceName) {
    try {
      const response = await this.api.post(`/instance/restart/${instanceName}`);
      return response.data;
    } catch (error) {
      this._logError('restartInstance', error);
      throw new Error('Falha ao reiniciar instância');
    }
  }

  /**
   * Deleta a instância
   */
  async deleteInstance(instanceName) {
    try {
      const response = await this.api.delete(`/instance/delete/${instanceName}`);
      return response.data;
    } catch (error) {
      this._logError('deleteInstance', error);
      throw new Error('Falha ao deletar instância');
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
        text: text,
        options: {
          delay: delay,
          presence: 'composing',
          linkPreview: true
        }
      });
      return response.data;
    } catch (error) {
      this._logError('sendText', error);
    }
  }

  /**
   * Transcreve áudio recebido via OpenAI Whisper
   */
  async transcribeAudio(instanceName, messageKey) {
    if (!this.openai) {
      console.warn('OpenAI não configurado para transcrição de áudio.');
      return null;
    }

    try {
      // Busca o arquivo base64 do áudio na Evolution
      // Endpoint correto na Evolution v2: /chat/getBase64FromMediaMessage/{{instance}}
      const response = await this.api.post(`/chat/getBase64FromMediaMessage/${instanceName}`, {
        message: {
          key: messageKey
        },
        convertToMp4: false
      });
      
      const base64Data = response.data.base64;
      if (!base64Data) {
        console.warn('Base64 do áudio não recebido da Evolution API.');
        return null;
      }

      // Cria um arquivo temporário
      const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.ogg`);
      fs.writeFileSync(tempFilePath, Buffer.from(base64Data, 'base64'));

      try {
        const transcription = await this.openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: "whisper-1",
        });

        return transcription.text;
      } finally {
        // Limpa o arquivo temporário
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
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
