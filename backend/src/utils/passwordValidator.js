/**
 * Valida se uma senha atende aos requisitos mínimos de segurança.
 * Retorna null se válida, ou uma string com o erro.
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return 'Senha é obrigatória.';
  if (password.length < 8) return 'Senha deve ter pelo menos 8 caracteres.';
  if (!/[A-Z]/.test(password)) return 'Senha deve conter ao menos uma letra maiúscula.';
  if (!/[a-z]/.test(password)) return 'Senha deve conter ao menos uma letra minúscula.';
  if (!/[0-9]/.test(password)) return 'Senha deve conter ao menos um número.';
  return null;
};

module.exports = { validatePassword };
