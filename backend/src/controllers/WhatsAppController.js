const evolutionService = require('../services/EvolutionService');
const aiService = require('../services/WhatsAppAIService');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middlewares/asyncHandler');

// Controle de mensagens picadas (Debouncing)
const pendingMessages = new Map(); // key: customerPhone_restaurantId, value: { timer, content: [] }

const WhatsAppController = {
  // ... (métodos connect, getQrCode, status, settings permanecem iguais)
  connect: asyncHandler(async (req, res) => {
    const { restaurantId } = req.user;
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    const instanceName = `rest_${restaurant.slug}`;
    const instance = await evolutionService.createInstance(instanceName, restaurantId);
    res.json(instance);
  }),

  getQrCode: asyncHandler(async (req, res) => {
    const { restaurantId } = req.user;
    const instance = await prisma.whatsAppInstance.findUnique({ where: { restaurantId } });
    if (!instance) return res.status(404).json({ error: 'Instância não encontrada' });
    const qrData = await evolutionService.getQrCode(instance.name);
    res.json(qrData);
  }),

  status: asyncHandler(async (req, res) => {
    const { restaurantId } = req.user;
    const instance = await prisma.whatsAppInstance.findUnique({ where: { restaurantId } });
    if (!instance) return res.json({ status: 'NOT_CREATED' });
    const status = await evolutionService.getInstanceStatus(instance.name);
    const newState = status.instance?.state === 'open' ? 'CONNECTED' : 'DISCONNECTED';
    await prisma.whatsAppInstance.update({ where: { id: instance.id }, data: { status: newState } });
    res.json({ ...status, localStatus: newState });
  }),

  updateSettings: asyncHandler(async (req, res) => {
    const { restaurantId } = req.user;
    const settings = await prisma.whatsAppSettings.upsert({
      where: { restaurantId },
      update: req.body,
      create: { ...req.body, restaurantId }
    });
    res.json(settings);
  }),

  getSettings: asyncHandler(async (req, res) => {
    const { restaurantId } = req.user;
    const settings = await prisma.whatsAppSettings.findUnique({ where: { restaurantId } });
    res.json(settings || {});
  }),

  /**
   * WEBHOOK PRINCIPAL - Lógica de Mensagens Picadas e Resposta Humanizada
   */
  webhook: asyncHandler(async (req, res) => {
    const { event, data, instance } = req.body;

    if (event === 'MESSAGES_UPSERT') {
      const message = data.message;
      const fromMe = data.key.fromMe;
      const customerPhone = data.key.remoteJid;
      
      // Captura texto de conversa ou legenda de imagem/áudio
      let messageContent = message.conversation || 
                           message.extendedTextMessage?.text || 
                           message.imageMessage?.caption || 
                           "";

      // Se for áudio, tenta transcrever
      if (message.audioMessage) {
        const transcription = await evolutionService.transcribeAudio(instance, data.key);
        if (transcription) messageContent = transcription;
      }

      if (!fromMe && messageContent) {
        const dbInstance = await prisma.whatsAppInstance.findFirst({ where: { name: instance } });
        if (!dbInstance) return res.sendStatus(200);

        const debouncerKey = `${customerPhone}_${dbInstance.restaurantId}`;
        
        // Se já existe um timer, cancela (cliente mandou outra mensagem)
        if (pendingMessages.has(debouncerKey)) {
          clearTimeout(pendingMessages.get(debouncerKey).timer);
        }

        // Adiciona mensagem ao buffer
        const currentData = pendingMessages.get(debouncerKey) || { content: [] };
        currentData.content.push(messageContent);

        // Define novo timer (espera 5 segundos de silêncio do cliente)
        const timer = setTimeout(async () => {
          const finalContent = currentData.content.join(" ");
          pendingMessages.delete(debouncerKey);

          // Chama a IA para processar o bloco de mensagens
          const aiResponse = await aiService.handleMessage(
            dbInstance.restaurantId,
            customerPhone,
            finalContent
          );

          if (aiResponse) {
            // Lógica de Resposta Picada (Simulando humano)
            const paragraphs = aiResponse.split('\n').filter(p => p.trim() !== "");
            
            for (const paragraph of paragraphs) {
              // Tempo de digitação baseado no tamanho do texto
              const typingTime = Math.min(Math.max(paragraph.length * 50, 1000), 4000);
              await evolutionService.sendText(instance, customerPhone, paragraph, typingTime);
            }
          }
        }, 5000);

        pendingMessages.set(debouncerKey, { timer, content: currentData.content });
      }
    }

    res.status(200).send('OK');
  })
};

module.exports = WhatsAppController;
