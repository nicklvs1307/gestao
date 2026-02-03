import axios from 'axios';

interface State {
  id: number;
  sigla: string;
  nome: string;
}

interface City {
  id: number;
  nome: string;
}

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // Cidade
  uf: string;
  erro?: boolean;
}

const IBGE_API_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades';

export const LocationService = {
  // Buscar endereço por CEP
  getAddressByCep: async (cep: string): Promise<ViaCepResponse | null> => {
    try {
      // Remove caracteres não numéricos
      const cleanCep = cep.replace(/\D/g, '');
      if (cleanCep.length !== 8) return null;

      const response = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (response.data.erro) return null;
      
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      return null;
    }
  },

  // Listar Estados (UF)
  getStates: async (): Promise<State[]> => {
    try {
      const response = await axios.get(`${IBGE_API_BASE}/estados?orderBy=nome`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar estados:', error);
      return [];
    }
  },

  // Listar Cidades por Estado (UF)
  getCitiesByState: async (uf: string): Promise<City[]> => {
    try {
      if (!uf) return [];
      const response = await axios.get(`${IBGE_API_BASE}/estados/${uf}/municipios`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar cidades:', error);
      return [];
    }
  }
};
