import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRestaurantBySlug, createDeliveryOrder, generatePixPayment, checkPixStatus } from '../services/api';
import { getTenantSlug } from '../utils/tenant';
import type { Product, Restaurant, SizeOption, AddonOption } from '../types';
import DeliveryProductCard from '../components/DeliveryProductCard';
import Cart from '../components/Cart';
import FooterCart from '../components/FooterCart';
import Banner from '../components/Banner';
import PromotionSlider from '../components/PromotionSlider';
import { useLocalCart } from '../hooks/useLocalCart';
import { RestaurantProvider } from '../context/RestaurantContext';
import OrderSuccessModal from '../components/OrderSuccessModal';
import PixPaymentModal from '../components/PixPaymentModal';
import ProductDetailModal from '../components/ProductDetailModal';
import { Search, Heart, Clock, ShoppingBag, Palette } from 'lucide-react';
import { applyTheme } from '../utils/theme';
import { Button } from '../components/ui/Button';
import { isCategoryAvailable } from '../utils/availability';
import RestaurantMeta from '../components/RestaurantMeta';

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
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setProductModalOpen] = useState(false);

  const { localCartItems, handleAddToCart: addToCart, localCartTotal, handleRemoveFromCart, handleUpdateCartItemQuantity, clearCart } = useLocalCart();

  const [isPixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeImage: string; pixCopiaECola: string } | null>(null);
  const [isPixPaymentLoading, setPixPaymentLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleProductCardClick = (product: Product) => {
    if (!isStoreOpen) {
        alert("Desculpe, a loja está fechada no momento e não estamos aceitando novos pedidos.");
        return;
    }
    setSelectedProduct(product);
    setProductModalOpen(true);
  };

  const handleAddToCartFromModal = (
    product: Product, 
    quantity: number, 
    selectedSize: SizeOption | null, 
    selectedAddons: AddonOption[],
    selectedFlavors?: Product[]
  ) => {
      addToCart(product, quantity, selectedSize, selectedAddons, selectedFlavors);
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
  const categories = allCategories.filter(isCategoryAvailable);
  const isStoreOpen = restaurant.settings?.isOpen ?? true;

  return (
    <RestaurantProvider settings={restaurant.settings || null}>
    <RestaurantMeta restaurant={restaurant} />
    <div className="bg-background min-h-screen pb-24 font-sans selection:bg-primary selection:text-white transition-colors duration-500">
        
        {/* Banner Loja Fechada */}
        {!isStoreOpen && (
            <div className="bg-destructive text-destructive-foreground p-3 text-center sticky top-0 z-[100] font-black uppercase text-xs tracking-widest animate-pulse flex items-center justify-center gap-2">
                <Clock size={16} /> Loja Fechada no Momento - Não estamos aceitando pedidos
            </div>
        )}

        {/* Novo Header com Capa e Logo Circular */}
        <header className="relative mb-6">
            {/* Imagem de Capa */}
            <div className="h-44 md:h-56 w-full bg-muted relative overflow-hidden">
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
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                    <Button variant="ghost" size="icon" className="bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 border border-white/10">
                        <Palette size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" className="bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 border border-white/10">
                        <Heart size={18} />
                    </Button>
                </div>
            </div>

            {/* Logo Circular Centralizada */}
            <div className="relative -mt-20 flex justify-center z-20">
                <div className="w-36 h-36 rounded-full border-[6px] border-background bg-card shadow-2xl overflow-hidden flex items-center justify-center transition-transform hover:scale-105 duration-300">
                    {restaurant.logoUrl ? (
                        <img src={restaurant.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                    ) : (
                        <div className="w-full h-full bg-primary flex items-center justify-center">
                            <span className="text-4xl font-black italic text-white uppercase">{restaurant.name.substring(0, 2)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Informações da Loja Centralizadas */}
            <div className="mt-4 px-5 text-center">
                <h1 className="text-3xl font-black text-foreground tracking-tight mb-1 uppercase italic leading-none">{restaurant.name}</h1>
                
                {/* Endereço */}
                {restaurant.settings?.address && (
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-8 line-clamp-1">
                        📍 {restaurant.settings.address}
                    </p>
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

            {/* Barra de Busca Refinada */}
            <div className="relative mt-8 px-5">
                <div className="max-w-xl mx-auto relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Pesquisar itens no cardápio..." 
                        className="w-full bg-card border-2 border-border/50 rounded-[2rem] py-4 pl-12 pr-4 text-sm focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground font-medium shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
        </header>

        {/* Conteúdo Condicional: Se houver pesquisa, mostra apenas os resultados */}
        {searchTerm ? (
            <div className="px-5 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black text-foreground italic uppercase tracking-tighter">
                        Resultados para "{searchTerm}"
                    </h2>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSearchTerm('')}
                        className="text-xs font-bold text-primary uppercase tracking-widest"
                    >
                        Limpar
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                    {categories.flatMap(cat => cat.products || [])
                        .filter(p => p.isAvailable && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(product => (
                            <DeliveryProductCard 
                                key={product.id} 
                                product={product} 
                                onAddToCart={handleProductCardClick} 
                            />
                        ))
                    }
                </div>
                {categories.flatMap(cat => cat.products || [])
                    .filter(p => p.isAvailable && p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground font-bold">Nenhum produto encontrado...</p>
                        </div>
                    )}
            </div>
        ) : (
            <>
                {/* Highlighted Banner (Promotions & Featured) */}
                <div className="px-5 mb-8">
                    <Banner 
                        restaurantId={restaurant.id} 
                        onProductClick={handleProductCardClick} 
                    />
                </div>

                {/* PROMOÇÕES (SLIDER HORIZONTAL) */}
                <PromotionSlider 
                    restaurantId={restaurant.id}
                    onProductClick={handleProductCardClick}
                />

                {/* Categories Nav */}
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
                        const products = category.products?.filter(p => p.isAvailable);

                        if (!products || products.length === 0) return null;

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
            </>
        )}

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
    </div>
    </RestaurantProvider>
  );
};

export default DeliveryPage;
