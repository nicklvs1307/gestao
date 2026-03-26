import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRestaurantBySlug as fetchRestaurant, createDeliveryOrder } from '../services/api';
import type { Restaurant, LocalCartItem } from '../types';

export const RESTAURANT_KEY = 'restaurant';

export const useRestaurant = (slug: string) => {
  return useQuery({
    queryKey: [RESTAURANT_KEY, slug],
    queryFn: () => fetchRestaurant(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

export const useCreateDeliveryOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ restaurantId, orderData }: { restaurantId: string; orderData: { items: LocalCartItem[]; total: number; deliveryInfo: any } }) =>
      createDeliveryOrder(restaurantId, orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};
