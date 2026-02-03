
import React from 'react';
import { useParams } from 'react-router-dom';
import { RestaurantProvider } from '../context/RestaurantContext';
import { useModal } from '../hooks/useModal';
import TableMenu from './TableMenu';
import { useTableSession } from '../hooks/useTableSession';

const TableMenuWrapper: React.FC = () => {
  const { restaurantId, tableNumber } = useParams<{ restaurantId: string; tableNumber: string }>();
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
