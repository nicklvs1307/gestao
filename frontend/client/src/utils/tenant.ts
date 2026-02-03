export const getTenantSlug = (): string | null => {
  const hostname = window.location.hostname;

  // Se for localhost ou IP, não tem subdomínio válido
  if (hostname.includes('localhost') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    // Para testes locais, você pode forçar um slug aqui se quiser
    // return 'minha-pizzaria-teste'; 
    return null; 
  }

  const parts = hostname.split('.');

  // Lógica para domínios de produção
  // Ex: pizzaria.kicardapio.towersfy.com -> parts = ['pizzaria', 'kicardapio', 'towersfy', 'com']
  // Ex: pizzaria.kicardapio.com.br -> parts = ['pizzaria', 'kicardapio', 'com', 'br']
  
  // Se tiver 3 ou mais partes, assumimos que a primeira é o slug
  if (parts.length >= 3) {
    const subdomain = parts[0];
    
    // Ignora subdomínios reservados do sistema
    if (['www', 'api', 'admin', 'kicardapio', 'app'].includes(subdomain)) {
      return null;
    }
    
    return subdomain;
  }

  return null;
};
