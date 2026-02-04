
import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import * as AppTypes from '../types';
import { applyTheme } from '../utils/theme';

interface RestaurantContextType {
  restaurantSettings: AppTypes.RestaurantSettings | null;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};

interface RestaurantProviderProps {
  children: ReactNode;
  settings: AppTypes.RestaurantSettings | null;
}

export const RestaurantProvider: React.FC<RestaurantProviderProps> = ({ children, settings }) => {
  useEffect(() => {
    if (settings) {
      applyTheme(settings);
      
      // Atualiza o Título da Aba
      if (settings.restaurantName) {
        document.title = settings.restaurantName;
      }

      // Atualiza o Favicon Dinamicamente
      if (settings.logoUrl) {
        const updateFavicon = (url: string) => {
          let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
          
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          
          // Adiciona o domínio se a URL for relativa
          const fullUrl = url.startsWith('http') 
            ? url 
            : `${import.meta.env.VITE_API_URL || ''}${url}`;
            
          link.href = fullUrl;
        };
        
        updateFavicon(settings.logoUrl);
      }
    }
  }, [settings]);

  return (
    <RestaurantContext.Provider value={{ restaurantSettings: settings }}>
      {children}
    </RestaurantContext.Provider>
  );
};
