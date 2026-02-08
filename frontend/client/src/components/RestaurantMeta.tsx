import React from 'react';
import { Helmet } from 'react-helmet-async';
import type { Restaurant } from '../types';

interface RestaurantMetaProps {
  restaurant: Restaurant | null;
}

const RestaurantMeta: React.FC<RestaurantMetaProps> = ({ restaurant }) => {
  if (!restaurant) return null;

  // Garante que a URL da imagem seja absoluta para os crawlers
  const getAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = window.location.origin;
    return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const absoluteLogoUrl = getAbsoluteUrl(restaurant.logoUrl || '');

  return (
    <Helmet>
      <title>{restaurant.name} | Cardápio Digital</title>
      <meta name="description" content={`Peça agora no ${restaurant.name}. Confira nosso cardápio completo!`} />
      
      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={`${restaurant.name} - Cardápio Online`} />
      <meta property="og:description" content="Faça seu pedido online de forma rápida e prática e receba em casa." />
      {absoluteLogoUrl && <meta property="og:image" content={absoluteLogoUrl} />}
      <meta property="og:image:width" content="400" />
      <meta property="og:image:height" content="400" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={restaurant.name} />
      <meta name="twitter:description" content="Confira nosso cardápio digital." />
      {absoluteLogoUrl && <meta name="twitter:image" content={absoluteLogoUrl} />}
      
      {/* Favicon Dinâmico */}
      {absoluteLogoUrl && <link rel="icon" type="image/png" href={absoluteLogoUrl} />}
    </Helmet>
  );
};

export default RestaurantMeta;
