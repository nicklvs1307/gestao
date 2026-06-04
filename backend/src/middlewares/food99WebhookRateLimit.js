const rateLimit = require('express-rate-limit');

const food99WebhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Too many webhook requests' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

module.exports = food99WebhookRateLimit;
