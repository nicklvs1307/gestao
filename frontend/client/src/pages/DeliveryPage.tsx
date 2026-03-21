import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRestaurantBySlug, createDeliveryOrder, generatePixPayment, checkPixStatus } from '../services/api';
import { getTenantSlug } from '../utils/tenant';
import type { Product, Restaurant, SizeOption, AddonOption } from '../types';
import DeliveryProductCard from '../components/DeliveryProductCard';
import Cart from '../components/Cart';
import FooterCart from '../components/FooterCart';
import Banner from '../components/Banner';
import FeaturedGrid from '../components/FeaturedGrid';
import CategoryShortcuts from '../components/CategoryShortcuts';
import ReorderSection from '../components/ReorderSection';
import BottomNav from '../components/BottomNav';
import VideoCarousel from '../components/VideoCarousel';
import { useLocalCart } from '../hooks/useLocalCart';
import { RestaurantProvider } from '../context/RestaurantContext';
import OrderSuccessModal from '../components/OrderSuccessModal';
import PixPaymentModal from '../components/PixPaymentModal';
import ProductDetailModal from '../components/ProductDetailModal';
import StoreClosedModal from '../components/StoreClosedModal';
import { Search, Heart, Clock, ShoppingBag, Palette } from 'lucide-react';
import { applyTheme } from '../utils/theme';
import { Button } from '../components/ui/Button';
import { isCategoryAvailable } from '../utils/availability';
import RestaurantMeta from '../components/RestaurantMeta';
import { getImageUrl } from '../utils/image';
import { motion, AnimatePresence } from 'framer-motion';

interface DeliveryPageProps {
  restaurantSlug?: string;
}

const DeliveryPage: React.FC<DeliveryPageProps> = ({ restaurantSlug }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Lógica de Resolução do Slug:
  // 1. Prop passada explicitamente (ex: via TenantHandler)
  // 2. Subdomínio (ex: pizzaria.towersfy.com)
  // 3. Parâmetro da URL (ex: towersfy.com/pizzaria)
  const tenantSlug = getTenantSlug();
  const effectiveSlug = restaurantSlug || tenantSlug || slug;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const handleTabChange = (tab: 'home' | 'search' | 'orders' | 'profile') => {
    setActiveTab(tab);
    if (tab === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSearchTerm('');
    } else if (tab === 'search') {
      searchInputRef.current?.focus();
      searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (tab === 'orders') {
      reorderSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (tab === 'profile') {
      alert('Perfil do Usuário - Em Breve!');
    }
  };

  const [isPixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeImage: string; pixCopiaECola: string } | null>(null);
  const [isPixPaymentLoading, setPixPaymentLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleProductCardClick = (product: Product) => {
    setSelectedProduct(product);
    setProductModalOpen(true);
  };

  const handleAddToCartFromModal = (
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
  };

  const handlePixPayment = async (orderId: string, deliveryInfo: any) => {
    setPixPaymentLoading(true);
    setPixModalOpen(true);
    setCurrentOrderId(orderId);

    try {
        const data = await generatePixPayment(orderId);
        setPixData(data);
    } catch (error) {
        console.error("Erro ao gerar PIX:", error);
        alert("Erro ao gerar pagamento PIX. Tente novamente.");
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
  };

  const handleCancelPixPayment = async () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setPixModalOpen(false);
    setPixPaymentLoading(false);
    setPixData(null);
    setCurrentOrderId(null);
    alert('Pedido cancelado. Você pode refazê-lo.');
  };

  const handleReorder = (items: any[]) => {
    // Converte OrderItems para LocalCartItems
    const cartItems: any[] = items.map((item, index) => ({
      localId: Date.now() + index,
      product: item.product,
      productId: item.productId,
      quantity: item.quantity,
      priceAtTime: item.priceAtTime,
      sizeId: item.sizeId || null,
      sizeJson: item.sizeJson || null,
      addonsJson: item.addonsJson || null,
      flavorsJson: item.flavorsJson || null,
      observations: item.observations || null,
    }));

    setLocalCartItems(cartItems);
    setCartOpen(true);
  };

  const handleSubmitDeliveryOrder = async (deliveryInfo: any) => {
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

      // Salva o ID do pedido no localStorage para o "Peça Novamente"
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
      alert('Falha ao enviar o pedido de delivery.');
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!effectiveSlug) return;
      try {
        const data = await getRestaurantBySlug(effectiveSlug);
        setRestaurant(data);
        if (data.settings) {
            applyTheme(data.settings);
        }
      } catch (err) {
        setError('Restaurante não encontrado.');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [effectiveSlug]);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-background text-foreground text-sm font-bold animate-pulse">Carregando cardápio...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen bg-background text-destructive font-bold p-8 text-center">{error}</div>;
  if (!restaurant) return <div className="flex items-center justify-center min-h-screen bg-background text-foreground font-bold">Restaurante não encontrado.</div>;

  const allCategories = restaurant.categories || [];
  // No DeliveryPage, filtramos categorias que estão ativas E permitem Delivery OU Online
  const categories = allCategories.filter(cat => 
    cat.isActive && 
    (cat.allowDelivery || cat.allowOnline) && 
    isCategoryAvailable(cat)
  );
  const isStoreOpen = restaurant.settings?.isOpen ?? true;

  const getVisibleProducts = (category: any) => {
    return (category.products || []).filter((p: any) => 
        p.isAvailable && (p.allowDelivery || p.allowOnline) && !p.isFlavor
    );
  };
  
  const allVisibleProducts = categories.flatMap(cat => getVisibleProducts(cat));

  const featuredProducts = allVisibleProducts.filter(p => p.isFeatured);

  return (
    <RestaurantProvider settings={restaurant.settings || null}>
    <RestaurantMeta restaurant={restaurant} />
    <div className="bg-background min-h-screen pb-28 font-sans selection:bg-primary selection:text-white transition-colors duration-500">
        
        {/* Banner Loja Fechada */}
        {!isStoreOpen && (
            <div className="bg-destructive text-destructive-foreground p-3 text-center sticky top-0 z-[100] font-black uppercase text-xs tracking-widest animate-pulse flex items-center justify-center gap-2">
                <Clock size={16} /> Loja Fechada no Momento - Não estamos aceitando pedidos
            </div>
        )}

        {/* Novo Header com Capa e Logo Circular */}
        <header className="relative mb-4">
            {/* Imagem de Capa Reduzida */}
            <div className="h-32 md:h-44 w-full bg-muted relative overflow-hidden">
                {restaurant.settings?.backgroundImageUrl ? (
                    <>
                        <img 
                            src={restaurant.settings.backgroundImageUrl} 
                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                            alt="Capa" 
                        />
                        {/* Filtro Preto Transparente */}
                        <div className="absolute inset-0 bg-black/50 z-10" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-slate-900" />
                )}
                {/* Gradiente sutil para legibilidade */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 z-20" />
                
        {/* Botões de Ação no Header */}
                <div className="absolute top-3 right-4 z-20 flex gap-2">
                    <Button onClick={() => setIsSearchOpen(true)} variant="ghost" size="icon" className="bg-black/20 backdrop-blur-md rounded-full h-8 w-8 text-white hover:bg-black/40 border border-white/10">
                        <Search size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="bg-black/20 backdrop-blur-md rounded-full h-8 w-8 text-white hover:bg-black/40 border border-white/10">
                        <Heart size={14} />
                    </Button>
                </div>
            </div>

            {/* Logo Circular Subindo para o Topo */}
            <div className="relative -mt-16 flex justify-center z-20">
                <div className="w-24 h-24 rounded-full border-[4px] border-background bg-card shadow-2xl overflow-hidden flex items-center justify-center transition-transform hover:scale-105 duration-300">
                    {restaurant.logoUrl ? (
                        <img src={restaurant.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                    ) : (
                        <div className="w-full h-full bg-primary flex items-center justify-center">
                            <span className="text-2xl font-black italic text-white uppercase">{restaurant.name.substring(0, 2)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Informações da Loja Centralizadas */}
            <div className="mt-4 px-5 text-center">
                <h1 className="text-xl font-black text-slate-900 tracking-tight mb-1 uppercase italic leading-none">{restaurant.name}</h1>
                
                {/* Endereço Reduzido */}
                {restaurant.address && (
                    <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-8 block truncate hover:text-primary transition-colors text-center"
                    >
                        📍 {restaurant.address}
                    </a>
                )}
                <div className="flex flex-wrap justify-center items-center gap-3">
                    {isStoreOpen ? (
                        <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 border border-emerald-500/20 shadow-sm">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Aberto
                        </span>
                    ) : (
                        <span className="bg-destructive/10 text-destructive px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 border border-destructive/20 shadow-sm">
                            <span className="w-1.5 h-1.5 bg-destructive rounded-full"></span> Fechado
                        </span>
                    )}
                    
                    <div className="flex items-center gap-4 text-muted-foreground bg-muted/30 px-4 py-1.5 rounded-full border border-border/40 backdrop-blur-sm shadow-sm">
                        <span className="text-[10px] font-bold uppercase flex items-center gap-1.5">
                            <Clock size={14} className="text-primary" /> {restaurant.settings?.deliveryTime || '30-45 min'}
                        </span>
                        <div className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                        <span className="text-[10px] font-bold uppercase flex items-center gap-1.5">
                            <ShoppingBag size={14} className="text-primary" /> {restaurant.settings?.deliveryFee ? `R$ ${restaurant.settings.deliveryFee.toFixed(2).replace('.', ',')}` : 'Frete Grátis'}
                        </span>
                    </div>
                </div>
            </div>
        </header>

        <div className="pt-2">
            <FeaturedGrid 
                products={featuredProducts}
                onProductClick={handleProductCardClick}
            />
        </div>

        {/* 3. Peça Novamente */}
        <div ref={reorderSectionRef}>
            <ReorderSection 
                onProductClick={handleProductCardClick}
                onReorder={handleReorder}
            />
        </div>

        <div className="mb-4">
            <VideoCarousel videos={restaurant.settings?.videoBanners || []} />
        </div>

        {/* Categories Nav Sticky (Mantido para scroll longo) */}
        <nav className="sticky top-0 bg-background/90 backdrop-blur-md z-30 py-4 border-b border-border overflow-x-auto no-scrollbar flex gap-3 px-5">
            <button 
                onClick={() => setActiveCategory('todos')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${activeCategory === 'todos' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-secondary text-muted-foreground'}`}
            >
                🔥 Todos
            </button>
            {categories.map(cat => (
                <button 
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-secondary text-muted-foreground'}`}
                >
                    {cat.name}
                </button>
            ))}
        </nav>

        {/* Main Content */}
        <main className="p-5 space-y-8">
            {categories.map(category => {
                if (activeCategory !== 'todos' && activeCategory !== category.id) return null;
                const products = getVisibleProducts(category);

                if (products.length === 0) return null;

                return (
                    <section key={category.id}>
                        <h2 className="text-lg font-black text-foreground mb-4 italic uppercase tracking-tighter">
                            {category.name}
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {products.map(product => (
                                <DeliveryProductCard 
                                    key={product.id} 
                                    product={product} 
                                    onAddToCart={handleProductCardClick} 
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </main>


        {/* Footer Cart - só aparece se o carrinho modal estiver fechado */}
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
                className="fixed inset-0 z-[200] bg-white flex flex-col"
              >
                <div className="p-5 flex items-center gap-4 border-b border-slate-100">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Buscar pratos ou sabores..." 
                            className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400 text-slate-900 font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => {
                            setIsSearchOpen(false);
                            setSearchTerm('');
                        }}
                        className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 pb-10">
                    {searchTerm && (
                        <div className="mb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resultados para "{searchTerm}"</p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allVisibleProducts
                            .filter(p => 
                                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                p.addonGroups?.some((g: any) => g.addons?.some((a: any) => a.name.toLowerCase().includes(searchTerm.toLowerCase()))) ||
                                p.categories?.some((c: any) => c.addonGroups?.some((g: any) => g.addons?.some((a: any) => a.name.toLowerCase().includes(searchTerm.toLowerCase()))))
                            )
                            .map(product => (
                                <DeliveryProductCard 
                                    key={product.id} 
                                    product={product} 
                                    onAddToCart={() => {
                                        handleProductCardClick(product);
                                        setIsSearchOpen(false);
                                    }} 
                                />
                            ))
                        }
                        {searchTerm && allVisibleProducts
                            .filter(p => 
                                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                p.addonGroups?.some((g: any) => g.addons?.some((a: any) => a.name.toLowerCase().includes(searchTerm.toLowerCase()))) ||
                                p.categories?.some((c: any) => c.addonGroups?.some((g: any) => g.addons?.some((a: any) => a.name.toLowerCase().includes(searchTerm.toLowerCase()))))
                            ).length === 0 && (
                                <div className="text-center py-12 col-span-full">
                                    <p className="text-muted-foreground font-bold">Nenhum produto encontrado...</p>
                                </div>
                            )}
                    </div>
                </div>
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
