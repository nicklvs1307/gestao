import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Banner from '../components/Banner';
import VideoCarousel from '../components/VideoCarousel';
import Cart from '../components/Cart';
import FooterCart from '../components/FooterCart';
import AccountModal from '../components/AccountModal';
import ProductDetailModal from '../components/ProductDetailModal';
import StoreClosedModal from '../components/StoreClosedModal';
import ThankYouModal from '../components/ThankYouModal';
import OrderSuccessModal from '../components/OrderSuccessModal';
import SplashScreenHandler from '../components/SplashScreenHandler';
import InfoModal from '../components/InfoModal';
import { batchAddItemsToOrder, requestPayment } from '../services/api';
import type { Product, SizeOption, AddonOption, Category } from '../types';
import { useLocalCart } from '../hooks/useLocalCart';
import { useTableSession } from '../hooks/useTableSession';
import { useRestaurant } from '../contexts/RestaurantContext';
import { useModal } from '../hooks/useModal';
import { useProductFiltering } from '../hooks/useProductFiltering';
import { Search, Heart, Clock, Utensils, User, History, ReceiptText, X } from 'lucide-react';
import DeliveryProductCard from '../components/DeliveryProductCard';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { isCategoryAvailable } from '../utils/availability';
import { CategoryNavigator } from '../components/CategoryNavigator';
import { ProductGrid } from '../components/ProductGrid';
import { SearchModal } from '../components/SearchModal';
import { TableHeader } from '../components/TableHeader';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';

interface TableMenuProps {
  sessionData: any;
  isThankYouModalOpen: boolean;
  closeThankYouModal: () => void;
}

const TableMenu: React.FC<TableMenuProps> = ({ 
  sessionData, 
  isThankYouModalOpen, 
  closeThankYouModal 
}) => {
  const { restaurantId, tableNumber } = useParams<{ restaurantId: string; tableNumber: string }>();
  const { restaurantSettings } = useRestaurant();
  const isStoreOpen = restaurantSettings?.isOpen ?? true;
  const { t } = useTranslation();

  // Extrair dados da sessão vindo do Wrapper (Repassado via props)
  const {
    order,
    setOrder,
    allProducts,
    categories,
    promotions,
    tableInfo,
    featuredImages,
    isLoading,
  } = sessionData;
   
  // Cores Dinâmicas
  const primaryColor = restaurantSettings?.primaryColor || '#ea580c'; // Default orange-600
   
  // Modais
  const { isOpen: isCartOpen, open: openCart, close: closeCart } = useModal();
  const { isOpen: isAccountModalOpen, open: openAccountModal, close: closeAccountModal } = useModal();
  const { isOpen: isProductDetailModalOpen, open: openProductDetailModal, close: closeProductDetailModal } = useModal();
  const { isOpen: isOrderSuccessModalOpen, open: openOrderSuccessModal, close: closeOrderSuccessModal } = useModal();
   
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'success' | 'error' | 'info' });
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [isAppVisible, setIsAppVisible] = useState(false);
  const [isExitingSplash, setIsExitingSplash] = useState(false);

  // Estados de Dados
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isStoreClosedModalOpen, setStoreClosedModalOpen] = useState(false);
   
  const {
    localCartItems,
    handleAddToCart: addToCart,
    handleRemoveFromCart,
    handleUpdateCartItemQuantity,
    localCartTotal,
    clearCart,
  } = useLocalCart();

  const handleStartSplashExit = useCallback(() => {
    setIsExitingSplash(true);
    setIsAppVisible(true);
    setTimeout(() => {
      setShowSplashScreen(false);
      setIsExitingSplash(false);
    }, 500);
  }, []);

  // Lógica de Inatividade (Screensaver)
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      if (showSplashScreen) return;
      clearTimeout(inactivityTimer);
      // Volta para a splash após 2 minutos de inatividade
      inactivityTimer = setTimeout(() => {
        setShowSplashScreen(true);
        setIsAppVisible(false);
      }, 120000); 
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [showSplashScreen]);

  const availableCategories = useMemo(() => {
    return categories.filter((cat: any) => 
        cat.isActive && 
        cat.allowPos && 
        isCategoryAvailable(cat)
    );
  }, [categories]);

  useEffect(() => {
    if (!isLoading && showSplashScreen && !isAppVisible) {
      // O Wrapper já carregou os dados, então podemos liberar a splash se quisermos
      // Mas aqui mantemos o comportamento de esperar o clique em "Iniciar" na SplashScreen
    }
  }, [isLoading, showSplashScreen, isAppVisible]);
  
  const showInfoModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setInfoModal({ isOpen: true, title, message, type });
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    openProductDetailModal();
  };

  const handleAddToCart = (
    product: Product,
    quantity: number,
    selectedSize: SizeOption | null,
    selectedAddons: AddonOption[],
    selectedFlavors?: Product[]
  ) => {
      if (!isStoreOpen) {
          setStoreClosedModalOpen(true);
          return;
      }
      addToCart(product, quantity, selectedSize, selectedAddons, selectedFlavors);
      closeProductDetailModal();
      openCart();
  };

  const handlePlaceOrder = async () => {
    if (!order || localCartItems.length === 0) return;
    setIsPlacingOrder(true);
    try {
      const updatedOrder = await batchAddItemsToOrder(order.id, localCartItems);
      setOrder(updatedOrder);
      clearCart();
      closeCart();
      openOrderSuccessModal();
    } catch (error) {
      showInfoModal(t('tableMenu.errorSendingOrder'), (error as Error).message, 'error');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleRequestAccountClosure = async () => {
    if (!tableInfo) return;
    try {
      await requestPayment(tableInfo.id);
      closeAccountModal();
      openThankYouModal();
    } catch (error) {
      showInfoModal(t('tableMenu.error'), (error as Error).message, 'error');
    }
  };

  const filteredProducts = useProductFiltering({
    allProducts,
    categories,
    activeCategory,
    searchTerm,
  });

  return (
    <SplashScreenHandler
      restaurantName={restaurantSettings?.restaurant?.name || ''}
      logoUrl={restaurantSettings?.restaurant?.logoUrl || ''}
      featuredImages={featuredImages}
      showSplashScreen={showSplashScreen}
      isAppVisible={isAppVisible}
      isExitingSplash={isExitingSplash}
      onStart={handleStartSplashExit}
    >
      <div className="bg-background min-h-screen pb-32 font-sans selection:bg-primary selection:text-white" style={{ '--primary': primaryColor } as React.CSSProperties}>
        
        {/* Banner Loja Fechada */}
        {!isStoreOpen && (
            <div className="bg-red-600 text-white p-3 text-center sticky top-0 z-[100] font-black uppercase text-xs tracking-widest animate-pulse flex items-center justify-center gap-2">
                <Clock size={16} /> {t('tableMenu.storeClosed')}
            </div>
        )}

        {/* HEADER MODERNO */}
        <TableHeader 
          restaurantSettings={restaurantSettings}
          tableNumber={tableNumber}
          isStoreOpen={isStoreOpen}
          onSearchOpen={() => setIsSearchOpen(true)}
          onOpenAccountModal={openAccountModal}
          t={t}
        />

        {/* VIDEO BANNERS (MP4) */}
        <div className="px-5 mb-8">
          <VideoCarousel videos={restaurantSettings?.videoBanners || []} />
        </div>
        {/* NAVEGAÇÃO DE CATEGORIAS */}
        <CategoryNavigator 
          categories={availableCategories} 
          activeCategory={activeCategory} 
          setActiveCategory={setActiveCategory} 
        />

        {/* LISTAGEM DE PRODUTOS */}
        <main className="p-5">
          <ProductGrid 
            products={filteredProducts} 
            isLoading={isLoading} 
            onProductClick={handleProductClick} 
          />
        </main>

        {/* FOOTER E CARRINHO */}
        <FooterCart 
          items={localCartItems}
          total={localCartTotal}
          onClick={openCart}
        />

        <Cart 
          isOpen={isCartOpen} 
          onClose={closeCart} 
          items={localCartItems}
          total={localCartTotal}
          onRemoveItem={handleRemoveFromCart}
          onUpdateItemQuantity={handleUpdateCartItemQuantity}
          onSubmitOrder={handlePlaceOrder}
          isPlacingOrder={isPlacingOrder}
          isDelivery={false}
        />
        {/* MODAL DE BUSCA OVERLAY */}
        <SearchModal 
          isOpen={isSearchOpen}
          onClose={() => {
            setIsSearchOpen(false);
            setSearchTerm('');
          }}
          filteredProducts={filteredProducts}
          onProductClick={handleProductClick}
          t={t}
        />

        <AccountModal 
          isOpen={isAccountModalOpen} 
          onClose={closeAccountModal} 
          order={order}
          onRequestClose={handleRequestAccountClosure}
          showInfoModal={showInfoModal}
        />

        <ProductDetailModal 
          isOpen={isProductDetailModalOpen} 
          onClose={closeProductDetailModal}
          product={selectedProduct}
          allProducts={allProducts}
          promotions={promotions}
          onAddToCart={handleAddToCart}
          isStoreOpen={isStoreOpen}
        />

        <StoreClosedModal 
          isOpen={isStoreClosedModalOpen}
          onClose={() => setStoreClosedModalOpen(false)}
          restaurantName={restaurantSettings?.restaurant?.name}
          operatingHours={restaurantSettings?.operatingHours}
        />

        <OrderSuccessModal isOpen={isOrderSuccessModalOpen} onClose={closeOrderSuccessModal} />
        <ThankYouModal isOpen={isThankYouModalOpen} logoUrl={restaurantSettings?.restaurantLogo} order={order} />
        
        <InfoModal 
          isOpen={infoModal.isOpen}
          onClose={() => setInfoModal({ ...infoModal, isOpen: false })}
          title={infoModal.title}
          message={infoModal.message}
          type={infoModal.type}
        />
      </div>
    </SplashScreenHandler>
  );
};

export default TableMenu;