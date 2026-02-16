const evolutionService = require('../services/EvolutionService');
const aiService = require('../services/WhatsAppAIService');
const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');
const socketLib = require('../lib/socket');

// Controle de mensagens picadas (Debouncing)
const pendingMessages = new Map(); // key: customerPhone_restaurantId, value: { timer, content: [] }

const WhatsAppController = {
  // Conectar / Criar Instância
  connect: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    if (!restaurantId) return res.status(400).json({ error: 'Contexto de restaurante não identificado.' });

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) return res.status(404).json({ error: 'Restaurante não encontrado.' });

    const instanceName = `rest_${restaurant.slug}`;
    let instance;

    // 1. Tenta buscar uma instância local existente
    let existingLocalInstance = await prisma.whatsAppInstance.findUnique({ where: { restaurantId } });

    if (existingLocalInstance) {
      // Se a instância local existe, tenta verificar seu status na Evolution API
      const statusResponse = await evolutionService.getInstanceStatus(existingLocalInstance.name);
      if (statusResponse.instance && statusResponse.instance.status !== 'CLOSED') {
        // Se a instância existe na Evolution e não está fechada, atualiza o status local
        instance = await prisma.whatsAppInstance.update({
          where: { id: existingLocalInstance.id },
          data: {
            status: statusResponse.instance.state === 'open' ? 'CONNECTED' : 'CONNECTING',
            token: statusResponse.instance.token || existingLocalInstance.token // Usa o token do status ou mantém o existente
          }
        });

        // Notifica via Socket
        socketLib.emitToRestaurant(restaurantId, 'whatsapp_status', {
          status: instance.status,
          instanceName: instance.name
        });

        return res.json(instance);
      } else {
        // Se a instância existe localmente mas está "fechada" ou com problema na Evolution, deleta a local para tentar recriar
        await prisma.whatsAppInstance.delete({ where: { id: existingLocalInstance.id } });
        existingLocalInstance = null; // Garante que a lógica de criação abaixo será executada
      }
    }

    // 2. Se não há instância local ou a local foi deletada (por estar "velha" na Evolution), tenta criar uma nova
    try {
      instance = await evolutionService.createInstance(instanceName, restaurantId);
    } catch (createError) {
      // Se a criação falhar e for um "name already in use", tenta buscar a existente
      if (createError.message.includes('already in use')) {
        console.warn(`Instância '${instanceName}' já existe na Evolution API, tentando buscá-la...`);
        try {
          const statusResponse = await evolutionService.getInstanceStatus(instanceName);
          if (statusResponse.instance) {
            instance = await prisma.whatsAppInstance.upsert({
              where: { restaurantId },
              update: {
                name: instanceName,
                token: statusResponse.instance.token,
                status: statusResponse.instance.state === 'open' ? 'CONNECTED' : 'CONNECTING'
              },
              create: {
                name: instanceName,
                token: statusResponse.instance.token,
                status: statusResponse.instance.state === 'open' ? 'CONNECTED' : 'CONNECTING',
                restaurantId
              }
            });
          } else {
            throw new Error('Falha ao sincronizar instância existente com a Evolution API.');
          }
        } catch (fetchError) {
          console.error('connect:fetchExistingInstance', fetchError);
          throw new Error('Falha ao criar ou sincronizar instância de WhatsApp.');
        }
      } else {
        throw createError;
      }
    }

    // Configura o webhook automaticamente
    const webhookUrl = `${process.env.API_URL}/api/whatsapp/webhook`;
    await evolutionService.setWebhook(instance.name, webhookUrl);

    // Notifica via Socket
    socketLib.emitToRestaurant(restaurantId, 'whatsapp_status', {
      status: instance.status,
      instanceName: instance.name
    });

    res.json(instance);
  }),

  // Obter QR Code
  getQrCode: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const instance = await prisma.whatsAppInstance.findUnique({ where: { restaurantId } });
    
    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    const qrData = await evolutionService.getQrCode(instance.name);
    
    // Se recebeu um QR code novo, atualiza no DB
    if (qrData.base64) {
      await prisma.whatsAppInstance.update({
        where: { id: instance.id },
        data: { qrcode: qrData.base64 }
      });
    }

    res.json(qrData);
  }),

  // Status da Conexão
  status: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const instance = await prisma.whatsAppInstance.findUnique({ where: { restaurantId } });
    
    if (!instance) return res.json({ localStatus: 'NOT_CREATED' });

    const status = await evolutionService.getInstanceStatus(instance.name);
    
    const newState = status.instance?.state === 'open' ? 'CONNECTED' : 'DISCONNECTED';
    await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: { status: newState, token: status.instance?.token || instance.token }
    });

    // Notifica via Socket
    socketLib.emitToRestaurant(restaurantId, 'whatsapp_status', {
      status: newState,
      instanceName: instance.name
    });

    res.json({ ...status, localStatus: newState });
  }),

  // Deslogar instância
  logout: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const instance = await prisma.whatsAppInstance.findUnique({ where: { restaurantId } });
    if (!instance) return res.status(404).json({ error: 'Instância não encontrada.' });

    await evolutionService.logoutInstance(instance.name);
    
    await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: { status: 'DISCONNECTED', qrcode: null }
    });

    socketLib.emitToRestaurant(restaurantId, 'whatsapp_status', {
      status: 'DISCONNECTED',
      instanceName: instance.name
    });

    res.json({ message: 'Instância deslogada com sucesso.' });
  }),

  // Reiniciar instância
  restart: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const instance = await prisma.whatsAppInstance.findUnique({ where: { restaurantId } });
    if (!instance) return res.status(404).json({ error: 'Instância não encontrada.' });

    await evolutionService.restartInstance(instance.name);
    
    await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: { status: 'CONNECTING' }
    });

    socketLib.emitToRestaurant(restaurantId, 'whatsapp_status', {
      status: 'CONNECTING',
      instanceName: instance.name
    });

    res.json({ message: 'Instância reiniciada com sucesso.' });
  }),

  // Deletar instância
  delete: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const instance = await prisma.whatsAppInstance.findUnique({ where: { restaurantId } });
    if (!instance) return res.status(404).json({ error: 'Instância não encontrada.' });

    await evolutionService.deleteInstance(instance.name);
    
    await prisma.whatsAppInstance.delete({ where: { id: instance.id } });

    socketLib.emitToRestaurant(restaurantId, 'whatsapp_status', {
      status: 'NOT_CREATED',
      instanceName: instance.name
    });

    res.json({ message: 'Instância deletada com sucesso.' });
  }),

  // Atualizar Configurações da IA
  updateSettings: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const data = req.body;

    const settings = await prisma.whatsAppSettings.upsert({
      where: { restaurantId },
      update: data,
      create: { ...data, restaurantId }
    });

    res.json(settings);
  }),

  getSettings: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const settings = await prisma.whatsAppSettings.findUnique({ where: { restaurantId } });
    res.json(settings || {});
  }),

  /**
   * WEBHOOK PRINCIPAL - Lógica de Mensagens Picadas e Resposta Humanizada
   */
  webhook: asyncHandler(async (req, res) => {
    const { event, data, instance } = req.body;
    
    // Ignora eventos que não são de interesse ou mensagens de grupos
    if (data?.key?.remoteJid?.endsWith('@g.us')) {
      return res.sendStatus(200);
    }

    console.log(`[Webhook Evolution] Evento: ${event} na instância: ${instance}`);

    const dbInstance = await prisma.whatsAppInstance.findFirst({ 
      where: { name: instance },
      include: { restaurant: true }
    });

    if (!dbInstance) {
      console.warn(`Instância ${instance} não encontrada no banco de dados.`);
      return res.sendStatus(200);
    }

    const restaurantId = dbInstance.restaurantId;

    // 1. Tratamento de Atualização de Conexão
    if (event === 'CONNECTION_UPDATE') {
      const state = data.state;
      const newState = state === 'open' ? 'CONNECTED' : 'DISCONNECTED';
      
      await prisma.whatsAppInstance.update({
        where: { id: dbInstance.id },
        data: { status: newState }
      });

      socketLib.emitToRestaurant(restaurantId, 'whatsapp_status', {
        status: newState,
        instanceName: instance
      });
    }

    // 2. Tratamento de Atualização de QR Code
    if (event === 'QRCODE_UPDATED') {
      const qrcode = data.qrcode?.base64;
      if (qrcode) {
        await prisma.whatsAppInstance.update({
          where: { id: dbInstance.id },
          data: { qrcode, status: 'CONNECTING' }
        });

        socketLib.emitToRestaurant(restaurantId, 'whatsapp_qrcode', {
          qrcode,
          status: 'CONNECTING'
        });
      }
    }

    // 3. Tratamento de Mensagens Recebidas
    if (event === 'MESSAGES_UPSERT') {
      const message = data.message;
      const fromMe = data.key.fromMe;
      const customerPhone = data.key.remoteJid;
      
      // Notifica o frontend que chegou uma mensagem (opcional, para um chat em tempo real)
      socketLib.emitToRestaurant(restaurantId, 'whatsapp_message', data);

      let messageContent = message.conversation || 
                           message.extendedTextMessage?.text || 
                           message.imageMessage?.caption || 
                           "";

      if (message.audioMessage) {
        const transcription = await evolutionService.transcribeAudio(instance, data.key);
        if (transcription) {
          messageContent = transcription;
        }
      }

      if (!fromMe && messageContent) {
        const debouncerKey = `${customerPhone}_${restaurantId}`;
        
        if (pendingMessages.has(debouncerKey)) {
          clearTimeout(pendingMessages.get(debouncerKey).timer);
        }

        const currentData = pendingMessages.get(debouncerKey) || { content: [] };
        currentData.content.push(messageContent);

        const timer = setTimeout(async () => {
          const finalContent = currentData.content.join(" ");
          pendingMessages.delete(debouncerKey);

          const aiResponse = await aiService.handleMessage(
            restaurantId,
            customerPhone,
            finalContent
          );

          if (aiResponse) {
            const paragraphs = aiResponse.split('\n').filter(p => p.trim() !== "");
            
            for (const paragraph of paragraphs) {
              const typingTime = Math.min(Math.max(paragraph.length * 50, 1000), 4000);
              await evolutionService.sendText(instance, customerPhone, paragraph, typingTime);
            }
          }
        }, 5000); // 5 segundos de debounce

        pendingMessages.set(debouncerKey, { timer, content: currentData.content });
      }
    }

    res.status(200).send('OK');
  })
};

module.exports = WhatsAppController;
