
import React from 'react';
import { useParams } from 'react-router-dom';
import { RestaurantProvider } from '../context/RestaurantContext';
import { useModal } from '../hooks/useModal';
import TableMenu from './TableMenu';
import { useTableSession } from '../hooks/useTableSession';

interface TableMenuWrapperProps {
  restaurantId?: string;
  tableNumber?: string;
}

const TableMenuWrapper: React.FC<TableMenuWrapperProps> = ({ 
  restaurantId: propRestaurantId, 
  tableNumber: propTableNumber 
}) => {
  const params = useParams<{ restaurantId: string; tableNumber: string }>();
  
  // Prioriza props (vindo do TenantHandler) ou cai no fallback dos params da URL
  const restaurantId = propRestaurantId || params.restaurantId;
  const tableNumber = propTableNumber || params.tableNumber;

  const { isOpen: isThankYouModalOpen, open: openThankYouModal, close: closeThankYouModal } = useModal();


  const {
    restaurantSettings,
    isLoading,
    error,
  } = useTableSession({
    restaurantId,
    tableNumber,
    setIsThankYouModalOpen: openThankYouModal,
  });

  if (isLoading) return <div>Carregando cardápio...</div>;
  if (error) return <div style={{ color: 'red' }}>Erro: {error}</div>;

  return (
    <RestaurantProvider settings={restaurantSettings}>
      <TableMenu />
    </RestaurantProvider>
  );
};

export default TableMenuWrapper;
