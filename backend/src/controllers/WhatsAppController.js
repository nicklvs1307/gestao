const evolutionService = require('../services/EvolutionService');
const logger = require('../config/logger');
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
      // Se a criação falhar e for um "already in use", tenta buscar a existente para pegar o token
      if (createError.message.includes('already in use')) {
        logger.warn(`Instância '${instanceName}' já existe na Evolution API, recuperando dados...`);
        try {
          const instanceData = await evolutionService.fetchInstance(instanceName);
          if (instanceData) {
            instance = await prisma.whatsAppInstance.upsert({
              where: { restaurantId },
              update: {
                name: instanceName,
                token: instanceData.hash || instanceData.token, // Recupera o token correto
                status: instanceData.status === 'open' || instanceData.connectionStatus === 'open' ? 'CONNECTED' : 'CONNECTING'
              },
              create: {
                name: instanceName,
                token: instanceData.hash || instanceData.token,
                status: instanceData.status === 'open' || instanceData.connectionStatus === 'open' ? 'CONNECTED' : 'CONNECTING',
                restaurantId
              }
            });
          } else {
            throw new Error('Falha ao sincronizar: instância não encontrada na Evolution API.');
          }
        } catch (fetchError) {
          logger.error('connect:fetchExistingInstance', fetchError);
          throw new Error('Falha ao sincronizar instância de WhatsApp.');
        }
      } else {
        throw createError;
      }
    }

    // Configura o webhook automaticamente - Envolvido em try/catch para não travar a conexão
    try {
      const webhookUrl = `${process.env.API_URL}/api/whatsapp/webhook`;
      await evolutionService.setWebhook(instance.name, webhookUrl);
      logger.info(`Webhook configurado com sucesso para ${instance.name}`);
    } catch (webhookError) {
      logger.warn(`Aviso: Falha ao configurar webhook para ${instance.name}:`, webhookError.message);
      // Não lançamos erro aqui para permitir que o usuário veja a instância criada
    }

    // Notifica via Socket
    socketLib.emitToRestaurant(restaurantId, 'whatsapp_status', {
      status: instance.status,
      instanceName: instance.name
    });

    res.json({ ...instance, localStatus: instance.status });
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
        data: { qrcode: qrData.base64, status: 'CONNECTING' }
      });
      
      socketLib.emitToRestaurant(restaurantId, 'whatsapp_qrcode', {
        qrcode: qrData.base64,
        status: 'CONNECTING'
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
    
    // Mapeamento de estados da Evolution v2
    const state = status.instance?.state || status.instance?.status;
    let newState = 'DISCONNECTED';
    
    if (state === 'open') newState = 'CONNECTED';
    else if (state === 'connecting' || state === 'connecting') newState = 'CONNECTING';
    
    await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: { status: newState, token: status.instance?.token || instance.token }
    });

    // Notifica via Socket
    socketLib.emitToRestaurant(restaurantId, 'whatsapp_status', {
      status: newState,
      instanceName: instance.name
    });

    res.json({ ...status, localStatus: newState, name: instance.name });
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

  // === Gestão de Base de Conhecimento (RAG) ===
  getKnowledge: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const knowledge = await prisma.storeKnowledge.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(knowledge);
  }),

  addKnowledge: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const { question, answer, category } = req.body;

    const entry = await prisma.storeKnowledge.create({
      data: {
        question,
        answer,
        category,
        restaurantId
      }
    });

    res.status(201).json(entry);
  }),

  deleteKnowledge: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const restaurantId = req.restaurantId;

    // Garante que o item pertence ao restaurante
    await prisma.storeKnowledge.delete({
      where: { id, restaurantId }
    });

    res.json({ message: 'Conhecimento removido com sucesso.' });
  }),

  // Limpar histórico de conversa
  clearHistory: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const { customerPhone, all } = req.body;

    let success;
    if (all) {
      await prisma.whatsAppChatMessage.deleteMany({
        where: { restaurantId }
      });
      success = true;
    } else {
      if (!customerPhone) {
        return res.status(400).json({ error: 'Número do cliente não informado.' });
      }
      success = await aiService.clearChatHistory(restaurantId, customerPhone);
    }

    if (success) {
      res.json({ message: 'Histórico limpo com sucesso.' });
    } else {
      res.status(500).json({ error: 'Erro ao limpar histórico.' });
    }
  }),

  // Listar Conversas (Chats)
  getConversations: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const conversations = await prisma.whatsAppConversation.findMany({
      where: { restaurantId },
      include: {
        customer: true // Inclui dados do cadastro se houver
      },
      orderBy: { lastMessageAt: 'desc' }
    });
    res.json(conversations);
  }),

  // Atualizar Etiquetas da Conversa
  updateLabels: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const { phone } = req.params;
    const { labels } = req.body; // Array de strings

    const conversation = await prisma.whatsAppConversation.update({
      where: { 
        customerPhone_restaurantId: {
          customerPhone: phone,
          restaurantId
        }
      },
      data: { labels }
    });

    res.json(conversation);
  }),

  // Buscar Mensagens de uma Conversa
  getMessages: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const { phone } = req.params;

    const messages = await prisma.whatsAppChatMessage.findMany({
      where: { 
        restaurantId,
        customerPhone: phone
      },
      orderBy: { timestamp: 'asc' },
      take: 50
    });

    res.json(messages);
  }),

  // Alternar Status do Agente para uma Conversa específica
  toggleAgent: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const { phone } = req.params;
    const { enabled } = req.body;

    const conversation = await prisma.whatsAppConversation.update({
      where: { 
        customerPhone_restaurantId: {
          customerPhone: phone,
          restaurantId
        }
      },
      data: { isAgentEnabled: enabled }
    });

    res.json(conversation);
  }),

  // Enviar mensagem manual pelo painel
  sendMessage: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const { phone, message } = req.body;

    const instance = await prisma.whatsAppInstance.findUnique({ where: { restaurantId } });
    if (!instance || instance.status !== 'CONNECTED') {
      return res.status(400).json({ error: 'WhatsApp não conectado.' });
    }

    // Envia via Evolution API
    const response = await evolutionService.sendText(instance.name, phone, message);

    // Salva no banco como mensagem do assistente/sistema
    const savedMsg = await prisma.whatsAppChatMessage.create({
      data: {
        restaurantId,
        customerPhone: phone,
        role: 'assistant',
        content: message
      }
    });

    // Atualiza a conversa
    await prisma.whatsAppConversation.upsert({
      where: { customerPhone_restaurantId: { customerPhone: phone, restaurantId } },
      update: { lastMessage: message, lastMessageAt: new Date() },
      create: { customerPhone: phone, restaurantId, lastMessage: message }
    });

    // Notifica outros painéis abertos (Tempo Real)
    socketLib.emitToRestaurant(restaurantId, 'whatsapp_message', {
      key: { remoteJid: phone, fromMe: true, id: savedMsg.id },
      message: { conversation: message },
      pushName: 'Sistema'
    });

    res.json(savedMsg);
  }),

  /**
   * WEBHOOK PRINCIPAL - Lógica de Mensagens Picadas e Resposta Humanizada
   */
  webhook: asyncHandler(async (req, res) => {
    const { event, data, instance } = req.body;
    
    // Log inicial para debug de recebimento
    logger.info(`[Webhook Evolution] Recebido: ${event} | Instância: ${instance}`);

    // Ignora mensagens de grupos ( remoteJid termina com @g.us )
    if (data?.key?.remoteJid?.includes('@g.us')) {
      return res.sendStatus(200);
    }

    const dbInstance = await prisma.whatsAppInstance.findFirst({ 
      where: { name: instance },
      include: { restaurant: true }
    });

    if (!dbInstance) {
      logger.warn(`Instância ${instance} não encontrada no banco de dados.`);
      return res.sendStatus(200);
    }

    const restaurantId = dbInstance.restaurantId;
    // Normaliza o evento para maiúsculas e troca pontos por underscores para compatibilidade
    const normalizedEvent = event.toUpperCase().replace(/\./g, '_');

    // 1. Tratamento de Atualização de Conexão
    if (normalizedEvent === 'CONNECTION_UPDATE') {
      const state = data.state || data.status;
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
    if (normalizedEvent === 'QRCODE_UPDATED') {
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

    // 3. Tratamento de Mensagens Recebidas e ENVIADAS (Sincronização em tempo real)
    if (normalizedEvent === 'MESSAGES_UPSERT') {
      const message = data.message;
      const fromMe = data.key.fromMe;
      const customerPhone = data.key.remoteJid;
      
      // Notifica o frontend IMEDIATAMENTE (Independente se é FromMe ou não)
      // Isso resolve o problema de não atualizar quando o usuário responde pelo celular
      socketLib.emitToRestaurant(restaurantId, 'whatsapp_message', data);

      let messageContent = message.conversation || 
                           message.extendedTextMessage?.text || 
                           message.imageMessage?.caption || 
                           "";

      if (message.audioMessage) {
        const transcription = await evolutionService.transcribeAudio(instance, data.key);
        if (transcription) {
          messageContent = transcription;
        } else {
          messageContent = "🎤 Mensagem de áudio";
        }
      }

      if (messageContent) {
        const pushName = data.pushName || null;
        
        // Se for uma mensagem que EU mandei pelo celular, apenas atualizamos a conversa no banco
        if (fromMe) {
          await prisma.whatsAppConversation.upsert({
            where: { customerPhone_restaurantId: { customerPhone, restaurantId } },
            update: { 
              lastMessage: messageContent, 
              lastMessageAt: new Date(),
              unreadCount: 0 // Zera unread se eu respondi pelo celular
            },
            create: { 
              customerPhone, 
              restaurantId, 
              lastMessage: messageContent,
              customerName: pushName,
              unreadCount: 0
            }
          });

          // Salva no histórico como assistant
          await prisma.whatsAppChatMessage.create({
            data: {
              restaurantId,
              customerPhone,
              role: 'assistant',
              content: messageContent,
              externalId: data.key.id
            }
          });

          return res.sendStatus(200);
        }

        // --- MENSAGEM DO CLIENTE ---
        logger.info(`[WhatsApp] Mensagem recebida de ${customerPhone}`);
        
        // Busca foto de perfil se não tivermos ou se a última atualização for antiga (cache simples)
        let profilePic = null;
        const existingConv = await prisma.whatsAppConversation.findUnique({
          where: { customerPhone_restaurantId: { customerPhone, restaurantId } }
        });

        if (!existingConv || !existingConv.profilePictureUrl || (new Date().getTime() - new Date(existingConv.updatedAt).getTime() > 86400000)) {
           profilePic = await evolutionService.getProfilePicture(instance, customerPhone);
        }

        // --- NOVO: Vínculo automático com o cadastro de clientes ---
        // Normaliza o telefone para buscar no banco de clientes (remove @s.whatsapp.net e DDI se necessário)
        const cleanPhone = customerPhone.split('@')[0].replace(/\D/g, '');
        // Tenta achar um cliente que termine com esses números (para lidar com 9 dígitos ou DDI)
        const customer = await prisma.customer.findFirst({
          where: { 
            restaurantId,
            phone: { contains: cleanPhone.slice(-8) } // Busca flexível pelos últimos 8 dígitos
          }
        });

        // 1. Registra/Atualiza a Conversa no banco
        const conversation = await prisma.whatsAppConversation.upsert({
          where: { customerPhone_restaurantId: { customerPhone, restaurantId } },
          update: { 
            lastMessage: messageContent, 
            lastMessageAt: new Date(),
            customerName: pushName || undefined,
            profilePictureUrl: profilePic || undefined,
            unreadCount: { increment: 1 },
            customerId: customer ? customer.id : undefined
          },
          create: { 
            customerPhone, 
            restaurantId, 
            lastMessage: messageContent,
            customerName: pushName,
            profilePictureUrl: profilePic,
            unreadCount: 1,
            customerId: customer ? customer.id : null
          }
        });

        // Salva no histórico como user
        await prisma.whatsAppChatMessage.create({
          data: {
            restaurantId,
            customerPhone,
            role: 'user',
            content: messageContent,
            externalId: data.key.id
          }
        });

        const debouncerKey = `${customerPhone}_${restaurantId}`;
        
        // 2. Se o agente estiver desabilitado para este contato, encerra
        if (!conversation.isAgentEnabled) {
          logger.info(`[WhatsApp] Agente pausado para ${customerPhone}. Aguardando intervenção humana.`);
          return res.sendStatus(200);
        }

        if (pendingMessages.has(debouncerKey)) {
          clearTimeout(pendingMessages.get(debouncerKey).timer);
        }

        const currentData = pendingMessages.get(debouncerKey) || { content: [] };
        currentData.content.push(messageContent);

        const timer = setTimeout(async () => {
          const finalContent = currentData.content.join(" ");
          pendingMessages.delete(debouncerKey);

          // Comando para reiniciar histórico (útil para testes e para o cliente)
          if (finalContent.toLowerCase().includes('!reiniciar') || finalContent.toLowerCase().includes('!reset')) {
            await aiService.clearChatHistory(restaurantId, customerPhone);
            await evolutionService.sendText(instance, customerPhone, "Histórico de conversa reiniciado com sucesso! Como posso te ajudar agora?", 2000);
            return;
          }

          const aiResponse = await aiService.handleMessage(
            restaurantId,
            customerPhone,
            finalContent
          );

          if (aiResponse) {
            // Envia a resposta completa em uma única mensagem
            const typingTime = Math.min(Math.max(aiResponse.length * 50, 2000), 10000);
            await evolutionService.sendText(instance, customerPhone, aiResponse, typingTime);
          }
        }, 5000); // 5 segundos de debounce

        pendingMessages.set(debouncerKey, { timer, content: currentData.content });
      }
    }

    res.status(200).send('OK');
  })
};

module.exports = WhatsAppController;
