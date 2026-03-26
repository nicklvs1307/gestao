import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getRestaurantBySlug, createDeliveryOrder, generatePixPayment, checkPixStatus } from '../services/api';
import { getTenantSlug } from '../utils/tenant';
import type { Product, Restaurant, SizeOption, AddonOption, Category } from '../types';
import Cart from '../components/Cart';
import FooterCart from '../components/FooterCart';
import FeaturedGrid from '../components/FeaturedGrid';
import ReorderSection from '../components/ReorderSection';
import BottomNav from '../components/BottomNav';
import VideoCarousel from '../components/VideoCarousel';
import { useLocalCart } from '../hooks/useLocalCart';
import { RestaurantProvider } from '../contexts/RestaurantContext';
import OrderSuccessModal from '../components/OrderSuccessModal';
import PixPaymentModal from '../components/PixPaymentModal';
import ProductDetailModal from '../components/ProductDetailModal';
import StoreClosedModal from '../components/StoreClosedModal';
import { Search, Heart, Clock } from 'lucide-react';
import { applyTheme } from '../utils/theme';
import { Button } from '../components/ui/Button';
import { isCategoryAvailable } from '../utils/availability';
import RestaurantMeta from '../components/RestaurantMeta';
import { AnimatePresence, motion } from 'framer-motion';
import { DeliveryHeader, CategoryNav, SearchModal, ProductSection } from '../components/delivery';
import { RESTAURANT_KEY } from '../hooks/useRestaurant';

interface DeliveryPageProps {
  restaurantSlug?: string;
}

const DeliveryPage: React.FC<DeliveryPageProps> = ({ restaurantSlug }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const tenantSlug = getTenantSlug();
  const effectiveSlug = restaurantSlug || tenantSlug || slug;

  const { data: restaurant, isLoading, error } = useQuery({
    queryKey: [RESTAURANT_KEY, effectiveSlug],
    queryFn: () => getRestaurantBySlug(effectiveSlug!),
    enabled: !!effectiveSlug,
    staleTime: 1000 * 60 * 5,
  });

  const [activeCategory, setActiveCategory] = useState('todos');
  const [isCartOpen, setCartOpen] = useState(false);
  const [isSuccessModalOpen, setSuccessModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setProductModalOpen] = useState(false);
  const [isStoreClosedModalOpen, setStoreClosedModalOpen] = useState(false);

  const { localCartItems, handleAddToCart: addToCart, localCartTotal, handleRemoveFromCart, handleUpdateCartItemQuantity, clearCart, setLocalCartItems } = useLocalCart();

  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'orders' | 'profile'>('home');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const reorderSectionRef = useRef<HTMLDivElement>(null);

  const [isPixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeImage: string; pixCopiaECola: string } | null>(null);
  const [isPixPaymentLoading, setPixPaymentLoading] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (restaurant?.settings) {
      applyTheme(restaurant.settings);
    }
  }, [restaurant?.settings]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleTabChange = useCallback((tab: 'home' | 'search' | 'orders' | 'profile') => {
    setActiveTab(tab);
    if (tab === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSearchTerm('');
    } else if (tab === 'search') {
      setIsSearchOpen(true);
    } else if (tab === 'orders') {
      reorderSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (tab === 'profile') {
      toast.info('Perfil do Usuário - Em Breve!');
    }
  }, []);

  const handleProductCardClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setProductModalOpen(true);
  }, []);

  const handleAddToCartFromModal = useCallback((
    product: Product, 
    quantity: number, 
    selectedSize: SizeOption | null, 
    selectedAddons: AddonOption[],
    selectedFlavors?: Product[],
    observations?: string
  ) => {
    if (!isStoreOpen) {
      setStoreClosedModalOpen(true);
      return;
    }
    addToCart(product, quantity, selectedSize, selectedAddons, selectedFlavors, observations);
    setProductModalOpen(false);
    setCartOpen(true);
  }, [addToCart, isStoreOpen]);

  const handlePixPayment = useCallback(async (orderId: string, deliveryInfo: any) => {
    setPixPaymentLoading(true);
    setPixModalOpen(true);
    setCurrentOrderId(orderId);

    try {
      const data = await generatePixPayment(orderId);
      setPixData(data);
    } catch (error) {
      console.error("Erro ao gerar PIX:", error);
      toast.error("Erro ao gerar pagamento PIX. Tente novamente.");
      setPixModalOpen(false);
      return;
    } finally {
      setPixPaymentLoading(false);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const status = await checkPixStatus(orderId);
        if (status.paid) {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          setPixModalOpen(false);
          clearCart();
          setSuccessModalOpen(true);
          setCurrentOrderId(null);
        }
      } catch (error) {
        console.error("Erro ao verificar status do PIX", error);
      }
    }, 5000);
  }, [clearCart]);

  const handleCancelPixPayment = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setPixModalOpen(false);
    setPixPaymentLoading(false);
    setPixData(null);
    setCurrentOrderId(null);
    toast('Pedido cancelado. Você pode refazê-lo.', { icon: 'ℹ️' });
  }, []);

  const handleReorder = useCallback((items: any[]) => {
    const cartItems = items.map((item, index) => {
      // Usa priceAtTime diretamente do banco - não recalcula
      const unitPrice = item.priceAtTime || 0;

      return {
        localId: Date.now() + index,
        product: item.product,
        productId: item.productId,
        quantity: item.quantity,
        priceAtTime: Number(unitPrice),
        sizeId: item.sizeId || null,
        sizeJson: item.sizeJson || null,
        addonsJson: item.addonsJson || null,
        flavorsJson: item.flavorsJson || null,
        observations: item.observations || null,
      };
    });

    setLocalCartItems(cartItems);
    setCartOpen(true);
  }, [setLocalCartItems]);

  const handleSubmitDeliveryOrder = useCallback(async (deliveryInfo: any) => {
    if (!restaurant) return;

    try {
      const deliveryFee = deliveryInfo.deliveryType === 'delivery' ? (restaurant.settings?.deliveryFee || 0) : 0;
      const finalTotal = localCartTotal + deliveryFee;

      const newOrder = await createDeliveryOrder(restaurant.id, {
        items: localCartItems,
        total: finalTotal, 
        deliveryInfo: {
          ...deliveryInfo,
          deliveryFee: deliveryFee 
        },
      });

      const storedIds = localStorage.getItem('recent_orders');
      const ids = storedIds ? JSON.parse(storedIds) : [];
      const updatedIds = [newOrder.id, ...ids.filter((id: string) => id !== newOrder.id)].slice(0, 5);
      localStorage.setItem('recent_orders', JSON.stringify(updatedIds));

      if (deliveryInfo.paymentMethod === 'pix_online') {
        handlePixPayment(newOrder.id, deliveryInfo);
      } else {
        clearCart();
        navigate(`/order-status/${newOrder.id}`);
      }
    } catch (err) {
      toast.error('Falha ao enviar o pedido de delivery.');
      console.error(err);
    }
  }, [restaurant, localCartItems, localCartTotal, navigate, clearCart, handlePixPayment]);

  const handleSearchClick = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const categories = useMemo(() => {
    if (!restaurant?.categories) return [];
    return restaurant.categories.filter(cat => 
      cat.isActive && 
      (cat.allowDelivery || cat.allowOnline) && 
      isCategoryAvailable(cat)
    );
  }, [restaurant?.categories]);

  const isStoreOpen = restaurant?.settings?.isOpen ?? true;
  
  const allVisibleProducts = useMemo(() => {
    if (!categories.length) return [];
    const getVisibleProducts = (category: Category) => {
      return (category.products || []).filter((p: Product) => 
        p.isAvailable && (p.allowDelivery || p.allowOnline) && !p.isFlavor
      );
    };
    return categories.flatMap(cat => getVisibleProducts(cat));
  }, [categories]);

  const featuredProducts = useMemo(() => {
    if (!allVisibleProducts.length) return [];
    return allVisibleProducts.filter(p => p.isFeatured);
  }, [allVisibleProducts]);

  if (isLoading || !effectiveSlug) return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground text-sm font-bold animate-pulse" role="status" aria-live="polite">
      Carregando cardápio...
    </div>
  );
  
  if (error || !restaurant) return (
    <div className="flex items-center justify-center min-h-screen bg-background text-destructive font-bold p-8 text-center" role="alert">
      {error ? 'Erro ao carregar cardápio.' : 'Restaurante não encontrado.'}
    </div>
  );

  const restaurantSettings = restaurant?.settings ?? null;

  return (
    <RestaurantProvider settings={restaurantSettings}>
      <RestaurantMeta restaurant={restaurant} />
      <div className="bg-background min-h-screen pb-28 font-sans selection:bg-primary selection:text-white transition-colors duration-500">
        {!isStoreOpen && (
          <div className="bg-destructive text-destructive-foreground p-3 text-center sticky top-0 z-[100] font-black uppercase text-xs tracking-widest animate-pulse flex items-center justify-center gap-2" role="alert">
            <Clock size={16} aria-hidden="true" /> Loja Fechada no Momento - Não estamos aceitando pedidos
          </div>
        )}

        <div className="absolute top-3 right-4 z-20 flex gap-2">
          <Button 
            onClick={handleSearchClick} 
            variant="ghost" 
            size="icon" 
            className="bg-black/20 backdrop-blur-md rounded-full h-8 w-8 text-white hover:bg-black/40 border border-white/10"
            aria-label="Buscar produtos"
          >
            <Search size={14} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-black/20 backdrop-blur-md rounded-full h-8 w-8 text-white hover:bg-black/40 border border-white/10"
            aria-label="Favoritos"
          >
            <Heart size={14} />
          </Button>
        </div>

        <DeliveryHeader 
          restaurant={restaurant} 
          isStoreOpen={isStoreOpen}
          onSearchClick={handleSearchClick}
        />

        <div className="pt-2">
          <FeaturedGrid 
            products={featuredProducts}
            onProductClick={handleProductCardClick}
          />
        </div>

        <div ref={reorderSectionRef}>
          <ReorderSection 
            onProductClick={handleProductCardClick}
            onReorder={handleReorder}
          />
        </div>

        <div className="mb-4">
          <VideoCarousel videos={restaurant.settings?.videoBanners || []} />
        </div>

        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        <ProductSection
          categories={categories}
          activeCategory={activeCategory}
          onProductClick={handleProductCardClick}
        />

        {!isCartOpen && (
          <FooterCart 
            items={localCartItems}
            total={localCartTotal}
            onClick={() => setCartOpen(true)}
          />
        )}

        <Cart
          isOpen={isCartOpen}
          onClose={() => setCartOpen(false)}
          items={localCartItems}
          total={localCartTotal}
          onRemoveItem={handleRemoveFromCart}
          onUpdateItemQuantity={handleUpdateCartItemQuantity}
          onSubmitOrder={handleSubmitDeliveryOrder}
          isPlacingOrder={false}
          isDelivery={true}
        />

        <OrderSuccessModal 
          isOpen={isSuccessModalOpen}
          onClose={() => setSuccessModalOpen(false)}
        />

        <ProductDetailModal
          isOpen={isProductModalOpen}
          onClose={() => setProductModalOpen(false)}
          product={selectedProduct}
          onAddToCart={handleAddToCartFromModal}
          isStoreOpen={isStoreOpen}
        />

        <StoreClosedModal 
          isOpen={isStoreClosedModalOpen}
          onClose={() => setStoreClosedModalOpen(false)}
          restaurantName={restaurant.name}
        />

        {pixData && (
          <PixPaymentModal
            isOpen={isPixModalOpen}
            onClose={handleCancelPixPayment}
            qrCodeImage={pixData.qrCodeImage}
            pixCopiaECola={pixData.pixCopiaECola}
            onPaymentConfirmed={() => {}}
            onCancelPayment={handleCancelPixPayment}
            isLoading={isPixPaymentLoading}
          />
        )}

        <AnimatePresence>
          {isSearchOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                products={allVisibleProducts}
                onProductClick={handleProductCardClick}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <BottomNav 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          hasOrders={localStorage.getItem('recent_orders') !== null}
        />
      </div>
    </RestaurantProvider>
  );
};

export default DeliveryPage;
