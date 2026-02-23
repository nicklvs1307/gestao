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
  const { isOpen: isThankYouModalOpen, open: openThankYouModal, close: closeThankYouModal } = useModal();

  const restaurantId = propRestaurantId || params.restaurantId;
  const tableNumber = propTableNumber || params.tableNumber;

  if (!restaurantId || !tableNumber) {
    return <div className="p-10 text-center font-black uppercase text-xs opacity-30">Aguardando dados da mesa...</div>;
  }

  const session = useTableSession({
    restaurantId,
    tableNumber,
    setIsThankYouModalOpen: openThankYouModal,
    setShowSplashScreen: () => {}, // Mocked, TableMenu will handle internal logic
    setIsAppVisible: () => {}, // Mocked
    onFinishLoading: () => {}, // Mocked
  });

  if (session.isLoading && !session.allProducts.length) return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando Sessão de Mesa...</p>
    </div>
  );
  
  if (session.error) return (
    <div className="flex h-screen flex-col items-center justify-center p-10 text-center">
        <div className="text-red-500 font-black uppercase text-xl italic tracking-tighter mb-4">Erro Crítico</div>
        <div className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-loose max-w-xs">{session.error}</div>
    </div>
  );

  return (
    <RestaurantProvider settings={session.restaurantSettings}>
      <TableMenu 
        sessionData={session}
        isThankYouModalOpen={isThankYouModalOpen}
        closeThankYouModal={closeThankYouModal}
      />
    </RestaurantProvider>
  );
};

export default TableMenuWrapper;
