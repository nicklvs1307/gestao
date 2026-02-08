import React from 'react';
import { Helmet } from 'react-helmet-async';
import type { Restaurant } from '../types';

interface RestaurantMetaProps {
  restaurant: Restaurant | null;
}

const RestaurantMeta: React.FC<RestaurantMetaProps> = ({ restaurant }) => {
  if (!restaurant) return null;

  return (
    <Helmet>
      <title>{restaurant.name} | Cardápio Digital</title>
      <meta name="description" content={`Peça agora no ${restaurant.name}. Confira nosso cardápio completo!`} />
      
      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={`${restaurant.name} - Cardápio Online`} />
      <meta property="og:description" content="Faça seu pedido online de forma rápida e prática." />
      {restaurant.logoUrl && <meta property="og:image" content={restaurant.logoUrl} />}
      
      {/* Favicon Dinâmico */}
      {restaurant.logoUrl && <link rel="icon" type="image/png" href={restaurant.logoUrl} />}
    </Helmet>
  );
};

export default RestaurantMeta;
