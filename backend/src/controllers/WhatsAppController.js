const evolutionService = require('../services/EvolutionService');
const aiService = require('../services/WhatsAppAIService');
const prisma = require('../lib/prisma');
const asyncHandler = require('../middlewares/asyncHandler');

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
        // Se já está conectada ou conectando, retorna.
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
          // Tenta buscar o status da instância que já existe
          const statusResponse = await evolutionService.getInstanceStatus(instanceName);
          if (statusResponse.instance) {
            // Se encontrou na Evolution, salva/atualiza no DB local
            instance = await prisma.whatsAppInstance.upsert({
              where: { restaurantId },
              update: {
                name: instanceName,
                token: statusResponse.instance.token, // Pega o token da instância existente
                status: statusResponse.instance.state === 'open' ? 'CONNECTED' : 'CONNECTING'
              },
              create: {
                name: instanceName,
                token: statusResponse.instance.token,
                status: statusResponse.instance.state === 'open' ? 'CONNECTED' : 'CONNECTING',
                restaurantId
              }
            });
            console.log(`Instância '${instanceName}' sincronizada com o banco de dados local.`);
          } else {
            // Se não encontrou na Evolution mesmo com "name in use", algo está muito errado
            throw new Error('Falha ao sincronizar instância existente com a Evolution API.');
          }
        } catch (fetchError) {
          this._logError('connect:fetchExistingInstance', fetchError); // Loga erro de busca da instância
          throw new Error('Falha ao criar ou sincronizar instância de WhatsApp.');
        }
      } else {
        // Outro erro na criação, relança o erro original
        throw createError;
      }
    }

    // Configura o webhook automaticamente após criar/sincronizar a instância
    const webhookUrl = `${process.env.API_URL}/api/whatsapp/webhook`; // API_URL deve ser o domínio público do seu backend
    await evolutionService.setWebhook(instance.name, webhookUrl);

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
    res.json(qrData);
  }),

  // Status da Conexão
  status: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const instance = await prisma.whatsAppInstance.findUnique({ where: { restaurantId } });
    
    if (!instance) return res.json({ localStatus: 'NOT_CREATED' }); // Mudado para localStatus para consistência

    const status = await evolutionService.getInstanceStatus(instance.name);
    
    // Atualiza status local
    const newState = status.instance?.state === 'open' ? 'CONNECTED' : 'DISCONNECTED';
    await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: { status: newState, token: status.instance?.token || instance.token } // Atualiza o token também
    });

    res.json({ ...status, localStatus: newState });
  }),

  // Deslogar instância
  logout: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const instance = await prisma.whatsAppInstance.findUnique({ where: { restaurantId } });
    if (!instance) return res.status(404).json({ error: 'Instância não encontrada.' });

    await evolutionService.logoutInstance(instance.name);
    
    // Atualiza o status local para DESCONECTADO
    await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: { status: 'DISCONNECTED', qrcode: null } // Limpa QR Code também
    });

    res.json({ message: 'Instância deslogada com sucesso.' });
  }),

  // Reiniciar instância
  restart: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const instance = await prisma.whatsAppInstance.findUnique({ where: { restaurantId } });
    if (!instance) return res.status(404).json({ error: 'Instância não encontrada.' });

    await evolutionService.restartInstance(instance.name);
    
    // Atualiza o status local para CONECTANDO
    await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: { status: 'CONNECTING' }
    });

    res.json({ message: 'Instância reiniciada com sucesso.' });
  }),

  // Deletar instância
  delete: asyncHandler(async (req, res) => {
    const restaurantId = req.restaurantId;
    const instance = await prisma.whatsAppInstance.findUnique({ where: { restaurantId } });
    if (!instance) return res.status(404).json({ error: 'Instância não encontrada.' });

    await evolutionService.deleteInstance(instance.name);
    
    // Remove a instância do banco de dados local
    await prisma.whatsAppInstance.delete({ where: { id: instance.id } });

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
    // Adicionando log detalhado para visualizar o webhook
    console.log('--- Webhook Recebido ---');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('-------------------------');

    const { event, data, instance } = req.body;

    if (event === 'MESSAGES_UPSERT') {
      const message = data.message;
      const fromMe = data.key.fromMe;
      const customerPhone = data.key.remoteJid;
      
      let messageContent = message.conversation || 
                           message.extendedTextMessage?.text || 
                           message.imageMessage?.caption || 
                           "";

      if (message.audioMessage) {
        // Log para áudio recebido
        console.log(`Áudio recebido de ${customerPhone}. Tentando transcrever...`);
        const transcription = await evolutionService.transcribeAudio(instance, data.key);
        if (transcription) {
          messageContent = transcription;
          console.log(`Transcrição do áudio: "${transcription}"`);
        } else {
          console.warn('Falha na transcrição do áudio.');
          messageContent = "[Áudio não transcrito]"; // Fallback caso a transcrição falhe
        }
      }

      if (!fromMe && messageContent) {
        const dbInstance = await prisma.whatsAppInstance.findFirst({ where: { name: instance } });
        if (!dbInstance) {
          console.warn(`Instância ${instance} não encontrada no banco de dados. Ignorando mensagem.`);
          return res.sendStatus(200);
        }

        const debouncerKey = `${customerPhone}_${dbInstance.restaurantId}`;
        
        if (pendingMessages.has(debouncerKey)) {
          clearTimeout(pendingMessages.get(debouncerKey).timer);
          console.log(`Reiniciando timer de debounce para ${customerPhone}...`);
        }

        const currentData = pendingMessages.get(debouncerKey) || { content: [] };
        currentData.content.push(messageContent);
        console.log(`Mensagem adicionada ao buffer de ${customerPhone}. Conteúdo atual: ${currentData.content.join(' ')}`);

        const timer = setTimeout(async () => {
          const finalContent = currentData.content.join(" ");
          pendingMessages.delete(debouncerKey);
          console.log(`Debounce finalizado para ${customerPhone}. Processando: "${finalContent}"`);

          const aiResponse = await aiService.handleMessage(
            dbInstance.restaurantId,
            customerPhone,
            finalContent
          );

          if (aiResponse) {
            console.log(`Resposta da IA para ${customerPhone}: "${aiResponse}"`);
            const paragraphs = aiResponse.split('\n').filter(p => p.trim() !== "");
            
            for (const paragraph of paragraphs) {
              const typingTime = Math.min(Math.max(paragraph.length * 50, 1000), 4000);
              console.log(`Enviando parágrafo: "${paragraph}" com delay de ${typingTime}ms`);
              await evolutionService.sendText(instance, customerPhone, paragraph, typingTime);
            }
          } else {
            console.warn(`IA não gerou resposta para ${customerPhone}.`);
          }
        }, 5000); // 5 segundos de debounce

        pendingMessages.set(debouncerKey, { timer, content: currentData.content });
      }
    }

    res.status(200).send('OK');
  })
};

module.exports = WhatsAppController;
