const API_URL = import.meta.env.VITE_API_URL || '';

export const getImageUrl = (path: string | null | undefined): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  
  // Se o caminho já começa com /api/uploads ou /uploads, remove o /api se a baseURL for usada
  // ou apenas retorna o caminho se for relativo ao domínio atual
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Em produção, se API_URL for '/api', o navegador resolve para o domínio atual
  if (API_URL === '/api' || !API_URL) {
    return cleanPath;
  }

  // Caso seja uma URL absoluta (desenvolvimento)
  const baseUrl = API_URL.replace(/\/api$/, '').replace(/\/$/, '');
  return `${baseUrl}${cleanPath}`;
};