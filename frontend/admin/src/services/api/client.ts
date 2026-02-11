import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Adiciona o token a cada requisição
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const selectedRestaurantId = localStorage.getItem('selectedRestaurantId');
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (selectedRestaurantId) {
      config.headers['x-restaurant-id'] = selectedRestaurantId;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para lidar com erros de resposta
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. Lida com desautenticação
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const isLoginPath = window.location.pathname.includes('/login');
      if (!isLoginPath) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    // 2. Extrai a mensagem de erro amigável do backend
    let message = 'Ocorreu um erro inesperado.';
    
    if (error.response && error.response.data) {
      message = error.response.data.error || error.response.data.message || message;
    } else if (error.request) {
      message = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    } else {
      message = error.message;
    }

    // Cria um novo erro com a mensagem extraída
    const customError = new Error(message);
    (customError as any).status = error.response?.status;
    (customError as any).data = error.response?.data;

    return Promise.reject(customError);
  }
);

export default apiClient;
