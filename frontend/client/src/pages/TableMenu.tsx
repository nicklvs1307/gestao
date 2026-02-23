import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Banner from '../components/Banner';
import PromotionSlider from '../components/PromotionSlider';
import Cart from '../components/Cart';
import FooterCart from '../components/FooterCart';
import AccountModal from '../components/AccountModal';
import ProductDetailModal from '../components/ProductDetailModal';
import ThankYouModal from '../components/ThankYouModal';
import OrderSuccessModal from '../components/OrderSuccessModal';
import SplashScreenHandler from '../components/SplashScreenHandler';
import InfoModal from '../components/InfoModal';
import { batchAddItemsToOrder, requestPayment } from '../services/api';
import type { Product, SizeOption, AddonOption, Category } from '../types';
import { useLocalCart } from '../hooks/useLocalCart';
import { useTableSession } from '../hooks/useTableSession';
import { useRestaurant } from '../context/RestaurantContext';
import { useModal } from '../hooks/useModal';
import { Search, Heart, Clock, Utensils, User, History, ReceiptText } from 'lucide-react';
import DeliveryProductCard from '../components/DeliveryProductCard';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { isCategoryAvailable } from '../utils/availability';

interface TableMenuProps {
  sessionData: any;
}

const TableMenu: React.FC<TableMenuProps> = ({ sessionData }) => {
  const { restaurantId, tableNumber } = useParams<{ restaurantId: string; tableNumber: string }>();
  const { restaurantSettings } = useRestaurant();
  const isStoreOpen = restaurantSettings?.isOpen ?? true;

  // Extrair dados da sessão vindo do Wrapper (Repassado via props)
  const {
    order,
    setOrder,
    allProducts,
    categories,
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
  const { isOpen: isThankYouModalOpen, open: openThankYouModal } = useModal();
  const { isOpen: isOrderSuccessModalOpen, open: openOrderSuccessModal, close: closeOrderSuccessModal } = useModal();
  
  const [activeCategory, setActiveCategory] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'success' | 'error' | 'info' });
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [isAppVisible, setIsAppVisible] = useState(false);
  const [isExitingSplash, setIsExitingSplash] = useState(false);

  // Estados de Dados
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    
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
    return categories.filter(isCategoryAvailable);
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
    if (!isStoreOpen) {
        showInfoModal('Loja Fechada', 'Desculpe, não estamos aceitando novos pedidos no momento.', 'info');
        return;
    }
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
      showInfoModal('Erro ao Enviar', (error as Error).message, 'error');
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
      showInfoModal('Erro', (error as Error).message, 'error');
    }
  };

  const filteredProducts = useMemo(() => {
    let products = allProducts;
    
    // Filtro de Categorias corrigido para n:m
    if (activeCategory !== 'todos') {
      products = products.filter(p => 
        p.categoryId === activeCategory || 
        (p.categories && p.categories.some((c: any) => c.id === activeCategory))
      );
    }

    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(low) || p.description?.toLowerCase().includes(low));
    }
    return products.filter(p => p.isAvailable);
  }, [allProducts, activeCategory, searchTerm]);

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
                <Clock size={16} /> Restaurante Fechado - Não estamos aceitando novos pedidos
            </div>
        )}

        {/* HEADER MODERNO */}
        <header className="p-5 pb-2">
            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl border-4 border-white overflow-hidden shrink-0">
                        {restaurantSettings?.restaurantLogo ? (
                            <img src={restaurantSettings.restaurantLogo} className="w-full h-full object-contain" alt="Logo" />
                        ) : (
                            <span className="font-black italic text-primary">FS</span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tighter italic">
                            {restaurantSettings?.restaurantName || 'Carregando...'}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            {isStoreOpen ? (
                                <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-lg tracking-[0.1em] uppercase">
                                    Mesa {tableNumber}
                                </span>
                            ) : (
                                <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg tracking-[0.1em] uppercase">
                                    Fechado
                                </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                                <History size={10} /> Autoatendimento
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={openAccountModal}
                        variant="secondary"
                        className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-slate-400 shadow-lg border border-slate-100 hover:text-primary transition-all active:scale-90 p-0"
                    >
                        <ReceiptText size={20} />
                        <span className="text-[7px] font-black uppercase mt-0.5">Conta</span>
                    </Button>
                </div>
            </div>

            <div className="relative mt-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Buscar no cardápio..." 
                    className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400 text-slate-900 font-bold shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </header>

        {/* BANNER E PROMOÇÕES */}
        <div className="px-5 mb-8 pt-4">
            <Banner 
                restaurantId={restaurantId!} 
                onProductClick={handleProductClick} 
            />
        </div>

        <PromotionSlider 
            restaurantId={restaurantId!}
            onProductClick={handleProductClick}
        />

        {/* NAVEGAÇÃO DE CATEGORIAS */}
        <nav className="sticky top-0 bg-background/90 backdrop-blur-md z-30 py-4 border-b border-border overflow-x-auto no-scrollbar flex gap-3 px-5">
            <button 
                onClick={() => setActiveCategory('todos')}
                className={cn(
                    "px-6 py-3 rounded-2xl font-black text-xs uppercase italic tracking-widest transition-all",
                    activeCategory === 'todos' ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-slate-100 text-slate-400"
                )}
            >
                🔥 Tudo
            </button>
            {availableCategories.map(cat => (
                <button 
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                        "px-6 py-3 rounded-2xl font-black text-xs uppercase italic tracking-widest whitespace-nowrap transition-all",
                        activeCategory === cat.id ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-slate-100 text-slate-400"
                    )}
                >
                    {cat.name}
                </button>
            ))}
        </nav>

        {/* LISTAGEM DE PRODUTOS */}
        <main className="p-5">
            {isLoading && allProducts.length === 0 ? (
                <div className="grid grid-cols-2 gap-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="aspect-[4/5] bg-slate-100 animate-pulse rounded-3xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {filteredProducts.map(product => (
                        <DeliveryProductCard 
                            key={product.id} 
                            product={product} 
                            onAddToCart={() => handleProductClick(product)} 
                        />
                    ))}
                </div>
            )}
            {!isLoading && filteredProducts.length === 0 && (
                <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4 grayscale">
                    <Search size={48} strokeWidth={1} />
                    <p className="font-black uppercase tracking-widest text-xs">Nenhum item encontrado</p>
                </div>
            )}
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
            onAddToCart={handleAddToCart}
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