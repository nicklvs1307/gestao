import { useState, useEffect } from 'react';
import { getProducts, getCategories, getRestaurantSettings, getTableInfo, getOrderForTable } from '../services/api';
import type { Product, Category, RestaurantSettings, Table, Order } from '../types';

interface UseTableSessionProps {
  restaurantId: string;
  tableNumber: string;
  setIsThankYouModalOpen: (isOpen: boolean) => void;
  setShowSplashScreen: (show: boolean) => void;
  setIsAppVisible: (visible: boolean) => void;
  onFinishLoading: () => void;
}

export const useTableSession = ({ restaurantId, tableNumber, setIsThankYouModalOpen, setShowSplashScreen, setIsAppVisible, onFinishLoading }: UseTableSessionProps) => {
  console.log('useTableSession: received onFinishLoading is', onFinishLoading);
  const [order, setOrder] = useState<Order | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings | null>(null);
  const [tableInfo, setTableInfo] = useState<Table | null>(null);
  const [featuredImages, setFeaturedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch inicial de todos os dados
  useEffect(() => {
    if (!restaurantId || !tableNumber) {
      setError('ID do restaurante ou número da mesa não fornecido na URL.');
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [productsData, categoriesData, settingsRes, tableRes, orderRes] = await Promise.all([
          getProducts(restaurantId),
          getCategories(restaurantId),
          getRestaurantSettings(restaurantId),
          getTableInfo(restaurantId, tableNumber),
          getOrderForTable(restaurantId, tableNumber)
        ]);

        const settingsData: RestaurantSettings = settingsRes;
        const tableData: Table = tableRes;
        const orderData: Order = orderRes;

        const featuredProductImageUrls = productsData
          .filter(p => p.isFeatured && p.imageUrl)
          .map(p => p.imageUrl as string);

        setAllProducts(productsData);
        setCategories(categoriesData);
        setRestaurantSettings(settingsData);
        setTableInfo(tableData);
        setOrder(orderData);
        setFeaturedImages(featuredProductImageUrls);
        
        // Chamar onFinishLoading após o carregamento bem-sucedido dos dados
        console.log('useTableSession: calling onFinishLoading');
        if (typeof onFinishLoading === 'function') {
          try {
            onFinishLoading();
          } catch (callError: any) {
            console.error('Erro ao executar onFinishLoading:', callError);
            setError(callError.message); // Captura e exibe erro se onFinishLoading falhar
          }
        } else {
          console.warn('onFinishLoading não é uma função, não pode ser chamado.');
        }

      } catch (err: any) {
        setError(err.message);
        // Em caso de erro, também finaliza o loading para não travar a splash screen
        console.log('useTableSession: calling onFinishLoading after error');
        if (typeof onFinishLoading === 'function') {
          try {
            onFinishLoading();
          } catch (callError: any) {
            console.error('Erro ao executar onFinishLoading após erro principal:', callError);
          }
        } else {
          console.warn('onFinishLoading não é uma função no bloco de erro, não pode ser chamado.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [restaurantId, tableNumber, setIsThankYouModalOpen, setShowSplashScreen, setIsAppVisible, onFinishLoading]);

  // Polling para verificar a liberação da mesa
  useEffect(() => {
    if (setIsThankYouModalOpen && tableInfo && tableInfo.status === 'awaiting_payment') {
      const interval = setInterval(async () => {
        try {
          const res = await getTableInfo(tableInfo.restaurantId, tableInfo.number);
          const data: Table = res;
          if (data.status === 'free') {
            setIsThankYouModalOpen(false);
          }
        } catch (error) {
          console.error('Erro ao verificar status da mesa:', error);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [setIsThankYouModalOpen, tableInfo]);

  return {
    order,
    setOrder,
    allProducts,
    categories,
    restaurantSettings,
    tableInfo,
    featuredImages,
    isLoading,
    error,
  };
};
