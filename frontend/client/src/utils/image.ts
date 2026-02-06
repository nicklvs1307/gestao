const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Resolve a URL completa de uma imagem.
 * Se a imagem for um caminho relativo (/uploads/...), concatena com a API_URL.
 */
export const getImageUrl = (path: string | null | undefined): string | undefined => {
  if (!path) return undefined;
  
  // Se já for uma URL completa (http/https), retorna como está
  if (path.startsWith('http')) return path;
  
  // Remove a barra inicial da API_URL se existir para evitar barra dupla
  const baseUrl = API_URL.replace(/\/api$/, '').replace(/\/$/, '');
  
  // Garante que o path comece com barra
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${cleanPath}`;
};