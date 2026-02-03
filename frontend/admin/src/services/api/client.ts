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
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
