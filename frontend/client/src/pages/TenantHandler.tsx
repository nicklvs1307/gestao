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
    const pathSlug = location.pathname.split('/')[1]?.toLowerCase();
    const finalSlug = slug || (pathSlug && pathSlug !== 'mesa' && pathSlug !== '' ? pathSlug : null);

    console.log('Domain Debug:', { hostname: window.location.hostname, detectedSlug: slug, finalSlug });

    if (!finalSlug) {
      setError(`Nenhum restaurante identificado no endereço: ${window.location.hostname}. Use um subdomínio como 'loja.kicardapio.towersfy.com'`);
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
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Loja não encontrada</h1>
          <p className="mt-4 text-gray-600 font-medium leading-relaxed">
            O cardápio que você tentou acessar no endereço <span className="text-primary font-bold">{window.location.hostname}</span> não está ativo ou o link está incorreto.
          </p>
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">Desenvolvido por</p>
            <h2 className="text-xl font-black text-primary">KiCardapio</h2>
          </div>
          <button 
            onClick={() => window.location.href = 'https://kicardapio.towersfy.com'}
            className="mt-8 w-full rounded-xl bg-primary py-3 text-white font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-transform"
          >
            Conhecer o Sistema
          </button>
        </div>
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
