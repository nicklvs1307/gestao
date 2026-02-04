import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getTenantSlug } from '../utils/tenant';
import { getRestaurantBySlug } from '../services/api';
import TableMenuWrapper from './TableMenuWrapper';
import DeliveryPage from './DeliveryPage';
import { Restaurant } from '../types';

const TenantHandler = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { tableNumber } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const slug = getTenantSlug();
    
    // Se não houver subdomínio, mas houver um slug na URL (fallback)
    // Ex: kicardapio.towersfy.com/minha-loja
    const pathSlug = location.pathname.split('/')[1];
    const finalSlug = slug || (pathSlug && pathSlug !== 'mesa' ? pathSlug : null);

    if (!finalSlug) {
      setLoading(false);
      return;
    }

    const fetchRestaurant = async () => {
      try {
        const data = await getRestaurantBySlug(finalSlug);
        setRestaurant(data);
      } catch (err: any) {
        console.error('Erro ao buscar restaurante:', err);
        const debugMsg = err.response?.data?.error || err.message || JSON.stringify(err);
        setError(`Não foi possível carregar o cardápio da loja '${finalSlug}'. Detalhes: ${debugMsg}`);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [location.pathname]);

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="mt-4 text-gray-600 font-medium">Carregando cardápio...</p>
    </div>
  );

  if (error || !restaurant) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Ops! Loja não encontrada</h1>
        <p className="mt-2 text-gray-600">O endereço que você acessou não parece estar correto ou a loja não existe.</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-6 rounded-lg bg-primary px-6 py-2 text-white shadow-md hover:opacity-90 transition-opacity"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  // Se houver número da mesa na URL (ex: /mesa/5)
  if (tableNumber) {
    return <TableMenuWrapper restaurantId={restaurant.id} tableNumber={tableNumber} />;
  }

  // Caso contrário, mostra a página de Delivery/Catálogo
  return <DeliveryPage restaurantSlug={restaurant.slug} />;
};

export default TenantHandler;
