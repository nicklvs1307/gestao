import axios from 'axios';

export const createApiClient = (baseURL: string = import.meta.env.VITE_API_URL || '/api') => {
  const apiClient = axios.create({
    baseURL,
  });

  apiClient.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      // Somente desloga se for 401 (Não Autorizado / Token Expirado)
      // 403 (Proibido) apenas significa que o usuário não tem permissão para aquela rota específica
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return apiClient;
};
