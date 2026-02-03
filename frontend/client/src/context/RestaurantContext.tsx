
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
    }
  }, [settings]);

  return (
    <RestaurantContext.Provider value={{ restaurantSettings: settings }}>
      {children}
    </RestaurantContext.Provider>
  );
};
