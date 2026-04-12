import React from 'react';
import { Helmet } from 'react-helmet-async';
import type { Restaurant } from '../types';

interface RestaurantMetaProps {
  restaurant: Restaurant | null;
}

const RestaurantMeta: React.FC<RestaurantMetaProps> = ({ restaurant }) => {
  if (!restaurant) return null;

  const getAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = window.location.origin;
    return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const absoluteLogoUrl = getAbsoluteUrl(restaurant.logoUrl || '');
  const currentUrl = window.location.href;
  const locationInfo = [restaurant.city, restaurant.state].filter(Boolean).join(', ');

  const description = locationInfo
    ? `${restaurant.name} - ${locationInfo}. Peça online e receba em casa!`
    : `${restaurant.name}. Peça online e receba em casa!`;

  const ogDescription = restaurant.settings?.welcomeMessage || description;

  return (
    <Helmet>
      <title>{restaurant.name} | Cardápio Digital</title>
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={restaurant.name} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:locale" content="pt_BR" />
      {absoluteLogoUrl && <meta property="og:image" content={absoluteLogoUrl} />}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${restaurant.name} - Cardápio Digital`} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={restaurant.name} />
      <meta name="twitter:description" content={ogDescription} />
      {absoluteLogoUrl && <meta name="twitter:image" content={absoluteLogoUrl} />}
      
      {/* Favicon Dinâmico */}
      {absoluteLogoUrl && <link rel="icon" type="image/png" href={absoluteLogoUrl} />}
    </Helmet>
  );
};

export default RestaurantMeta;
