import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  useEffect(() => {
    const slug = getTenantSlug();
    const pathSlug = location.pathname.split('/')[1]?.toLowerCase();
    const finalSlug = slug || (pathSlug && pathSlug !== 'mesa' && pathSlug !== '' ? pathSlug : null);

    console.log('Domain Debug:', { hostname: window.location.hostname, detectedSlug: slug, finalSlug });

    if (!finalSlug) {
      setError(`Nenhum restaurante identificado no endereço: ${window.location.hostname}`);
      setLoading(false);
      return;
    }

    const fetchRestaurant = async () => {
      try {
        const data = await getRestaurantBySlug(finalSlug);
        setRestaurant(data);
      } catch (err: any) {
        console.error('Erro ao buscar restaurante:', err);
        setError(`Não foi possível carregar o cardápio da loja '${finalSlug}'`);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [location.pathname]);

  if (loading) return <div>Carregando...</div>;
  if (error || !restaurant) return <div>Erro: {error}</div>;

  return (
    <div>
      {tableNumber ? (
        <TableMenuWrapper restaurantId={restaurant.id} tableNumber={tableNumber} />
      ) : (
        <DeliveryPage restaurantSlug={restaurant.slug} />
      )}
    </div>
  );
};

export default TenantHandler;