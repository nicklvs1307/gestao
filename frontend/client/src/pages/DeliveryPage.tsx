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
import { Button } from '../components/ui/Button';
import { isCategoryAvailable } from '../utils/availability';
import RestaurantMeta from '../components/RestaurantMeta';
import { AnimatePresence, motion } from 'framer-motion';
import { DeliveryHeader, CategoryNav, SearchModal, ProductSection } from '../components/delivery';
import { RESTAURANT_KEY } from '../hooks/useRestaurant';
import { usePixelTracking } from '../hooks/usePixelTracking';
import ConsentBanner from '../components/ConsentBanner';

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
    refetchOnWindowFocus: false,
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

  // Definir isStoreOpen ANTES de funções que dependem dele
  const isStoreOpen = restaurant?.settings?.isOpen ?? true;

  const pixelConfig = {
    metaPixelId: restaurant?.settings?.metaPixelId,
    googleAnalyticsId: restaurant?.settings?.googleAnalyticsId,
  };

  const { trackPageView, trackViewContent, trackAddToCart, trackInitiateCheckout, trackPurchase, consentGranted, grantConsent, revokeConsent } = usePixelTracking(pixelConfig);

  useEffect(() => {
    if (restaurant?.id) {
      trackPageView(window.location.pathname);
    }
  }, [restaurant?.id, trackPageView]);

  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'orders' | 'profile'>('home');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const reorderSectionRef = useRef<HTMLDivElement>(null);

  const [isPixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeImage: string; pixCopiaECola: string } | null>(null);
  const [isPixPaymentLoading, setPixPaymentLoading] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    trackViewContent(product.name, product.id, product.price, product.categories?.[0]?.name);
  }, [trackViewContent]);

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
    trackAddToCart(product.name, product.id, product.price, quantity, product.categories?.[0]?.name);
  }, [addToCart, isStoreOpen, trackAddToCart]);

  const handlePixPayment = useCallback(async (orderId: string, deliveryInfo: any, orderTotal: number, orderItems: Array<{ productId: string; name: string; price: number; quantity: number; category?: string }>) => {
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
          trackPurchase(orderId, orderTotal, orderItems);
          setPixModalOpen(false);
          clearCart();
          setSuccessModalOpen(true);
          setCurrentOrderId(null);
        }
      } catch (error) {
        console.error("Erro ao verificar status do PIX", error);
      }
    }, 5000);
  }, [clearCart, trackPurchase]);

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
    if (!restaurant || isPlacingOrder) return;
    setIsPlacingOrder(true);

    try {
      const deliveryFee = deliveryInfo.deliveryType === 'delivery' ? (restaurant.settings?.deliveryFee || 0) : 0;
      const discount = deliveryInfo.discount || 0;
      const finalTotal = Math.max(0, localCartTotal + deliveryFee - discount);

      const itemsForTracking = localCartItems.map(item => ({
        productId: item.productId,
        name: item.product?.name || '',
        price: item.priceAtTime,
        quantity: item.quantity,
        category: item.product?.categories?.[0]?.name,
      }));

      trackInitiateCheckout(finalTotal, itemsForTracking);

      const newOrder = await createDeliveryOrder(restaurant.id, {
        items: localCartItems,
        total: finalTotal,
        deliveryInfo: {
          ...deliveryInfo,
          deliveryFee: deliveryFee,
          couponCode: deliveryInfo.couponCode || null,
          discount: discount
        },
      });

      const storedIds = localStorage.getItem('recent_orders');
      const ids = storedIds ? JSON.parse(storedIds) : [];
      const updatedIds = [newOrder.id, ...ids.filter((id: string) => id !== newOrder.id)].slice(0, 5);
      localStorage.setItem('recent_orders', JSON.stringify(updatedIds));

      if (deliveryInfo.paymentMethod === 'pix_online') {
        handlePixPayment(newOrder.id, deliveryInfo, finalTotal, itemsForTracking);
      } else {
        trackPurchase(newOrder.id, finalTotal, itemsForTracking);
        clearCart();
        navigate(`/order-status/${newOrder.id}`);
      }
    } catch (err) {
      toast.error('Falha ao enviar o pedido de delivery.');
      console.error(err);
    } finally {
      setIsPlacingOrder(false);
    }
  }, [restaurant, localCartItems, localCartTotal, navigate, clearCart, handlePixPayment, trackInitiateCheckout, trackPurchase, isPlacingOrder]);

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

  const allVisibleProducts = useMemo(() => {
    const getVisibleProducts = (category: Category) => {
      return (category.products || []).filter((p: Product) => 
        p.isAvailable && (p.allowDelivery || p.allowOnline) && !p.isFlavor
      );
    };
    return categories.flatMap(cat => getVisibleProducts(cat));
  }, [categories]);

  const featuredProducts = useMemo(() => {
    return allVisibleProducts.filter(p => p.isFeatured);
  }, [allVisibleProducts]);

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      {/* Skeleton Header */}
      <div className="h-32 md:h-44 bg-slate-200 skeleton" />
      <div className="px-5 -mt-8 relative z-10">
        <div className="w-20 h-20 bg-slate-300 rounded-xl skeleton mx-auto" />
      </div>
      <div className="mt-4 px-5 space-y-3">
        <div className="h-5 bg-slate-200 skeleton w-48 mx-auto" />
        <div className="h-3 bg-slate-200 skeleton w-32 mx-auto" />
      </div>
      {/* Skeleton Featured */}
      <div className="mt-6 px-5">
        <div className="h-4 bg-slate-200 skeleton w-24 mb-3" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="min-w-[110px] h-40 bg-slate-200 skeleton rounded-lg" />
          ))}
        </div>
      </div>
      {/* Skeleton Products */}
      <div className="mt-6 px-5 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex h-36 bg-slate-200 skeleton rounded-lg" />
        ))}
      </div>
    </div>
  );
  
  if (error || !restaurant) return (
    <div className="flex items-center justify-center min-h-screen bg-background text-destructive font-bold p-8 text-center" role="alert">
      {error ? 'Erro ao carregar cardápio.' : 'Restaurante não encontrado.'}
    </div>
  );

  return (
    <RestaurantProvider settings={restaurant.settings || null}>
      <RestaurantMeta restaurant={restaurant} />
      <div className="bg-background min-h-screen pb-28 font-sans selection:bg-primary selection:text-white transition-colors duration-500">
        {!isStoreOpen && (
          <div className="bg-destructive text-destructive-foreground p-3 text-center sticky top-0 z-[var(--z-header)] font-bold uppercase text-xs tracking-wider animate-pulse flex items-center justify-center gap-2" role="alert">
            <Clock size={14} aria-hidden="true" /> Loja Fechada no Momento - Não estamos aceitando pedidos
          </div>
        )}

        <div className="absolute top-3 right-4 z-[var(--z-header)] flex gap-2">
          <Button 
            onClick={handleSearchClick} 
            variant="ghost" 
            size="icon" 
            className="bg-black/20 backdrop-blur-md rounded-lg h-10 w-10 text-white hover:bg-black/40 border border-white/10"
            aria-label="Buscar produtos"
          >
            <Search size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-black/20 backdrop-blur-md rounded-lg h-10 w-10 text-white hover:bg-black/40 border border-white/10"
            aria-label="Favoritos"
          >
            <Heart size={16} />
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
          isPlacingOrder={isPlacingOrder}
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
          operatingHours={restaurant?.settings?.operatingHours}
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

        <ConsentBanner
          isVisible={!consentGranted}
          onAccept={grantConsent}
          onDecline={revokeConsent}
        />
      </div>
    </RestaurantProvider>
  );
};

export default DeliveryPage;
