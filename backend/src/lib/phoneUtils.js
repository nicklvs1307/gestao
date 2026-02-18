/**
 * Utilitário para padronização de números de telefone para WhatsApp (Brasil)
 * @param {string} phone O número original (com ou sem formatação)
 * @returns {string} O número apenas com dígitos e prefixo 55
 */
function normalizePhone(phone) {
  if (!phone) return '';
  
  // 1. Remove tudo que não for dígito
  let clean = phone.replace(/\D/g, '');
  
  // 2. Se o número for curto (sem DDI), adiciona 55 (Brasil)
  // No Brasil, números têm 10 (fixo) ou 11 (celular) dígitos (DDD + número)
  if (clean.length === 10 || clean.length === 11) {
    clean = '55' + clean;
  }
  
  // 3. Se o número já começar com 55 mas for muito longo (DDI + DDD + número), mantém como está
  // (Caso de números internacionais ou se já veio correto)
  
  return clean;
}

/**
 * Retorna o JID correto para a Evolution API/Baileys
 * @param {string} phone Número normalizado
 * @returns {string} numero@s.whatsapp.net
 */
function toJid(phone) {
  const normalized = normalizePhone(phone);
  return normalized.includes('@') ? normalized : `${normalized}@s.whatsapp.net`;
}

module.exports = {
  normalizePhone,
  toJid
};
