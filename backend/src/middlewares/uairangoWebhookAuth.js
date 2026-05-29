const logger = require('../config/logger');

function uairangoWebhookAuth(req, res, next) {
  const secret = process.env.UAIRANGO_WEBHOOK_SECRET;

  if (!secret) {
    logger.error('[UAIRANGO WEBHOOK] UAIRANGO_WEBHOOK_SECRET não configurado');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const receivedSecret = req.params.secret;

  if (!receivedSecret) {
    logger.warn('[UAIRANGO WEBHOOK] Secret ausente no path');
    return res.status(401).json({ error: 'Missing webhook secret' });
  }

  if (receivedSecret !== secret) {
    logger.warn('[UAIRANGO WEBHOOK] Secret inválido no path');
    return res.status(403).json({ error: 'Invalid webhook secret' });
  }

  next();
}

module.exports = uairangoWebhookAuth;
