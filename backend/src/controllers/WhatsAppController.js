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
    const instanceName = `rest_${restaurant.slug}`;
    const instance = await evolutionService.createInstance(instanceName, restaurantId);
    
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
    
    if (!instance) return res.json({ status: 'NOT_CREATED' });

    const status = await evolutionService.getInstanceStatus(instance.name);
    
    // Atualiza status local
    const newState = status.instance?.state === 'open' ? 'CONNECTED' : 'DISCONNECTED';
    await prisma.whatsAppInstance.update({
      where: { id: instance.id },
      data: { status: newState }
    });

    res.json({ ...status, localStatus: newState });
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
