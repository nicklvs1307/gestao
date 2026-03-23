import React, { useState, useEffect } from 'react';
import type { Order, Product, Category, PaymentMethod as PaymentMethodType } from '@/types/index.ts';
import { 
    getDrivers, assignDriver, getSettings, updateDeliveryType, 
    markOrderAsPrinted, emitInvoice, getProducts, getCategories,
    getPaymentMethods, updateOrderFinancials, addItemsToOrder, removeOrderItem,
    updateOrderCustomer, addOrderPayment, removeOrderPayment
} from '../services/api';
import { format } from 'date-fns';
import { 
  X, Clock, MapPin, CheckCircle, 
  Circle, PlayCircle, XCircle, Printer, Phone, 
  ExternalLink, Package, CreditCard, Loader2, FileText,
  ShoppingBag, Bike, Utensils, Info, ChevronRight, User, Truck, List,
  Search, Plus, Minus, Trash2, Tag, Percent, DollarSign, ArrowLeft
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { useAuth } from '../context/AuthContext';

interface OrderEditorProps {
  onClose: () => void;
  order: Order;
  onRefresh: () => void;
}

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pendente', icon: Circle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { value: 'PREPARING', label: 'Cozinha', icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { value: 'READY', label: 'Pronto', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { value: 'COMPLETED', label: 'Finalizado', icon: CheckCircle, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' },
    { value: 'CANCELED', label: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
];

const OrderEditor: React.FC<OrderEditorProps> = ({ onClose, order, onRefresh }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'items' | 'payment'>('items');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Estados para Customização de Itens (Drawer)
  const [showProductDrawer, setShowProductDrawer] = useState(false);
  const [selectedProductForAdd, setSelectedProductForAdd] = useState<Product | null>(null);
  const [tempQty, setTempQty] = useState(1);
  const [tempObs, setTempObs] = useState('');
  const [selectedSizeId, setSelectedSizeId] = useState<string>('');
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  // Logística
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState(order.deliveryOrder?.driverId || '');

  // Estados financeiros editáveis
  const [deliveryFee, setDeliveryFee] = useState(order.deliveryOrder?.deliveryFee || 0);
  const [discount, setDiscount] = useState(0);
  const [surcharge, setSurcharge] = useState(0);
  const [internalObs, setInternalObs] = useState('');

  // Estados para Edição de Cliente
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerForm, setCustomerData] = useState({
      name: order.deliveryOrder?.name || order.customerName || '',
      phone: order.deliveryOrder?.phone || '',
      address: order.deliveryOrder?.address || ''
  });

  // Estados para Novos Pagamentos
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ methodId: '', amount: 0 });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
    // Previne scroll do body
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const loadData = async () => {
    try {
        setIsLoading(true);
        const finalRestaurantId = order.restaurantId || user?.restaurantId || localStorage.getItem('selectedRestaurantId');
        
        if (!finalRestaurantId) {
            console.error("[OrderEditor] Nao foi possivel identificar o restaurantId");
            return;
        }

        const [prodData, catData, payData, driversData] = await Promise.all([
            getProducts(),
            getCategories(),
            getPaymentMethods(finalRestaurantId),
            getDrivers()
        ]);
        setProducts(prodData);
        setCategories(catData);
        setPaymentMethods(payData.filter((p: any) => p.isActive));
        setDrivers(driversData || []);
    } catch (e) {
        toast.error("Erro ao carregar dados do catálogo.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProductForAdd(product);
    setTempQty(1);
    setTempObs('');
    setSelectedSizeId(product.sizes?.[0]?.id || '');
    setSelectedAddonIds([]);
    setShowProductDrawer(true);
  };

  const calculateCurrentPrice = () => {
      if (!selectedProductForAdd) return 0;
      const product = selectedProductForAdd;
      const size = product.sizes?.find(s => s.id === selectedSizeId);
      let basePrice = size?.price || product.price;

      const addonsPrice = product.addonGroups?.reduce((total, group) => {
          const selectedInGroup = group.addons.filter(a => selectedAddonIds.includes(a.id));
          if (selectedInGroup.length === 0) return total;

          if (group.isFlavorGroup) {
              const prices = selectedInGroup.map(a => a.price);
              const rule = group.priceRule || 'higher';
              if (rule === 'average') {
                  return total + (prices.reduce((a, b) => a + b, 0) / prices.length);
              } else {
                  return total + Math.max(...prices);
              }
          }
          return total + selectedInGroup.reduce((sum, addon) => sum + addon.price, 0);
      }, 0) || 0;

      return (basePrice + addonsPrice) * tempQty;
  };

  const handleConfirmAddToCart = async () => {
      if (!selectedProductForAdd) return;
      try {
          setIsSaving(true);
          const product = selectedProductForAdd;
          const size = product.sizes?.find(s => s.id === selectedSizeId);
          const selectedAddons = product.addonGroups?.flatMap(g => g.addons).filter(a => selectedAddonIds.includes(a.id)) || [];

          await addItemsToOrder(order.id, [{
              productId: product.id,
              quantity: tempQty,
              observations: tempObs,
              sizeId: selectedSizeId,
              addonsIds: selectedAddonIds,
              sizeJson: size ? JSON.stringify(size) : null,
              addonsJson: JSON.stringify(selectedAddons),
              priceAtTime: calculateCurrentPrice() / tempQty
          }]);

          toast.success(`${product.name} adicionado!`);
          setShowProductDrawer(false);
          onRefresh();
      } catch (e) {
          toast.error("Erro ao adicionar item.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleAssignDriver = async (driverId: string) => {
      try {
          setIsSaving(true);
          await assignDriver(order.id, driverId);
          setSelectedDriverId(driverId);
          toast.success("Entregador vinculado!");
          onRefresh();
      } catch (e) {
          toast.error("Erro ao vincular entregador.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleAddItem = async (product: Product) => {
      // Redireciona para o fluxo de customização
      handleProductClick(product);
  };

  const handleRemoveItem = async (itemId: string) => {
      try {
          setIsSaving(true);
          await removeOrderItem(order.id, itemId);
          toast.success("Item removido");
          onRefresh();
      } catch (e) {
          toast.error("Erro ao remover item.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleUpdateCustomer = async () => {
      try {
          setIsSaving(true);
          await updateOrderCustomer(order.id, customerForm);
          toast.success("Cliente atualizado!");
          setIsEditingCustomer(false);
          onRefresh();
      } catch (e) {
          toast.error("Erro ao atualizar cliente.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleAddPayment = async () => {
      if (!newPayment.methodId || newPayment.amount <= 0) {
          toast.error("Selecione a forma e o valor.");
          return;
      }
      try {
          setIsSaving(true);
          const method = paymentMethods.find(p => p.id === newPayment.methodId)?.name || 'Outro';
          await addOrderPayment(order.id, {
              amount: newPayment.amount,
              method: method
          });
          toast.success("Pagamento adicionado!");
          setIsAddingPayment(false);
          setNewPayment({ methodId: '', amount: 0 });
          onRefresh();
      } catch (e) {
          toast.error("Erro ao adicionar pagamento.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleRemovePayment = async (paymentId: string) => {
      try {
          setIsSaving(true);
          await removeOrderPayment(paymentId);
          toast.success("Pagamento removido!");
          onRefresh();
      } catch (e) {
          toast.error("Erro ao remover pagamento.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleSaveFinancials = async () => {
      try {
          setIsSaving(true);
          const currentItems = Array.isArray(order.items) ? order.items : [];
          const subtotal = currentItems.reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);
          const newTotal = subtotal + deliveryFee + surcharge - discount;
          
          await updateOrderFinancials(order.id, {
              deliveryFee,
              total: newTotal,
              discount,
              surcharge
          });
          
          toast.success("Dados financeiros atualizados!");
          onRefresh();
      } catch (e) {
          toast.error("Erro ao salvar alterações.");
      } finally {
          setIsSaving(false);
      }
  };

  const filteredProducts = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || p.categories?.some(c => c.id === selectedCategory);
      return matchesSearch && matchesCategory;
  });

  const subtotal = (Array.isArray(order.items) ? order.items : []).reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);
  const totalGeral = subtotal + deliveryFee + surcharge - discount;
  const totalPaid = (Array.isArray(order.payments) ? order.payments : []).reduce((acc, p) => acc + p.amount, 0) || 0;
  const remainingToPay = totalGeral - totalPaid;

  const currentStatus = STATUS_OPTIONS.find(s => s.value === order.status) || STATUS_OPTIONS[0];
  const isDelivery = order.orderType === 'DELIVERY' || !!order.deliveryOrder;

  return (
    <div className="fixed inset-0 z-[250] bg-slate-100 flex flex-col animate-in fade-in duration-200">
      
      {/* HEADER SUPERIOR (BARRA DE TÍTULO) */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div className="flex flex-col">
                <h1 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                    Pedido <span className="text-orange-600">#{order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}</span>
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    ID: {order.id}
                </p>
            </div>
            <div className={cn("px-2.5 py-1 rounded-lg text-[8px] font-black border uppercase tracking-widest ml-2", currentStatus.bg, currentStatus.color, currentStatus.border)}>
                {currentStatus.label} - {format(new Date(order.createdAt), "dd/MMM 'às' HH:mm")}
            </div>
        </div>

        <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-blue-600 text-white h-9 px-4 rounded-xl font-black text-[10px] uppercase italic hover:bg-blue-700 transition-all shadow-md">
                <Printer size={14} /> Imprimir Caixa
            </button>
            <button 
                onClick={handleSaveFinancials}
                disabled={isSaving}
                className="flex items-center gap-2 bg-emerald-600 text-white h-9 px-6 rounded-xl font-black text-[10px] uppercase italic hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50"
            >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} SALVAR
            </button>
            <button onClick={onClose} className="bg-slate-200 text-slate-600 h-9 px-4 rounded-xl font-black text-[10px] uppercase italic hover:bg-slate-300 transition-all">
                FECHAR
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUNA ESQUERDA: CARRINHO E RESUMO (35%) */}
        <div className="w-[400px] bg-white border-r border-slate-200 flex flex-col shadow-xl z-10">
            {/* Identificação do Cliente - Expandida */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        {isEditingCustomer ? (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                <input className="w-full h-8 px-2 bg-white border border-slate-200 rounded text-[10px] font-bold" value={customerForm.name} onChange={e => setCustomerData({...customerForm, name: e.target.value})} placeholder="Nome do Cliente" />
                                <input className="w-full h-8 px-2 bg-white border border-slate-200 rounded text-[10px] font-bold" value={customerForm.phone} onChange={e => setCustomerData({...customerForm, phone: e.target.value})} placeholder="Telefone" />
                                <textarea className="w-full h-12 p-2 bg-white border border-slate-200 rounded text-[10px] font-bold resize-none" value={customerForm.address} onChange={e => setCustomerData({...customerForm, address: e.target.value})} placeholder="Endereço Completo" />
                                <div className="flex gap-1">
                                    <button onClick={handleUpdateCustomer} className="flex-1 h-7 bg-emerald-600 text-white text-[8px] font-black uppercase rounded shadow-sm">Gravar</button>
                                    <button onClick={() => setIsEditingCustomer(false)} className="px-3 h-7 bg-slate-200 text-slate-600 text-[8px] font-black uppercase rounded">Cancelar</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-[11px] font-black text-slate-900 uppercase italic flex items-center gap-2 mb-1">
                                    <User size={14} className="text-orange-500" /> {order.deliveryOrder?.name || order.customerName || 'Consumidor'}
                                </h2>
                                {isDelivery && order.deliveryOrder?.address && (
                                    <p className="text-[9px] font-bold text-slate-500 uppercase italic leading-tight line-clamp-2">
                                        <MapPin size={10} className="inline mr-1 text-slate-400" /> {order.deliveryOrder.address}
                                    </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[8px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-black uppercase">
                                        {isDelivery ? 'Delivery' : 'Mesa ' + order.tableNumber}
                                    </span>
                                    {order.deliveryOrder?.phone && (
                                        <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg font-black italic">
                                            {order.deliveryOrder.phone}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    {!isEditingCustomer && (
                        <div className="flex flex-col gap-1 ml-3">
                            <button onClick={() => setIsEditingCustomer(true)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                                <User size={14} />
                            </button>
                            <button onClick={() => setIsEditingCustomer(true)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm" title="Editar Cliente">
                                <FileText size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Lista de Itens do Carrinho */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                <div className="grid grid-cols-12 px-2 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <div className="col-span-2">Qtd</div>
                    <div className="col-span-7">Item</div>
                    <div className="col-span-3 text-right">Valor</div>
                </div>
                {order.items?.map((item: any) => (
                    <div key={item.id} className="grid grid-cols-12 items-start p-2 rounded-xl hover:bg-slate-50 transition-colors group relative">
                        <div className="col-span-2 font-black text-slate-900 italic">{item.quantity}</div>
                        <div className="col-span-7">
                            <p className="text-[11px] font-black text-slate-800 uppercase italic leading-none">{item.product.name}</p>
                            {/* Exibição de Tamanho */}
                            {item.sizeJson && (
                                <p className="text-[8px] text-blue-600 font-bold mt-1 bg-blue-50 px-1.5 py-0.5 rounded-md inline-block mr-1">
                                    TAM: {JSON.parse(item.sizeJson).name}
                                </p>
                            )}
                            {/* Exibição de Sabores */}
                            {item.flavorsJson && JSON.parse(item.flavorsJson).map((f: any, i: number) => (
                                <p key={`flavor-${i}`} className="text-[8px] text-orange-600 font-bold mt-1 bg-orange-50 px-1.5 py-0.5 rounded-md inline-block mr-1">
                                    SABOR: {f.name}
                                </p>
                            ))}
                            {/* Exibição de Adicionais/Complementos */}
                            {item.addonsJson && JSON.parse(item.addonsJson).map((a: any, i: number) => (
                                <p key={`addon-${i}`} className="text-[8px] text-slate-500 font-bold mt-1 bg-slate-100 px-1.5 py-0.5 rounded-md inline-block mr-1">
                                    + {a.quantity || 1}x {a.name}
                                </p>
                            ))}
                        </div>
                        <div className="col-span-3 text-right font-black text-slate-900 italic text-[11px]">
                            R$ {(item.priceAtTime * item.quantity).toFixed(2)}
                        </div>
                        <button 
                            onClick={() => handleRemoveItem(item.id)}
                            className="absolute -right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 bg-rose-50 text-rose-500 rounded-lg transition-all"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Resumo de Valores Inferior - Botão Reduzido */}
            <div className="p-5 bg-slate-900 text-white space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase italic">Valor Total</span>
                    <span className="text-2xl font-black text-white italic tracking-tighter">R$ {totalGeral.toFixed(2).replace('.', ',')}</span>
                </div>
                
                <button 
                    onClick={() => setActiveTab(activeTab === 'items' ? 'payment' : 'items')}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase italic tracking-widest transition-all shadow-lg active:scale-95 border-b-4 border-blue-800 active:border-b-0"
                >
                    {activeTab === 'items' ? 'IR PARA PAGAMENTO' : 'ADICIONAR MAIS ITENS'}
                </button>
            </div>
        </div>

        {/* LADO DIREITO: CATÁLOGO OU PAGAMENTO (65%) */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            
            {activeTab === 'items' ? (
                /* ABA DE ITENS (PRODUTOS) */
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Filtros e Busca */}
                    <div className="p-4 bg-white border-b border-slate-200 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Pesquise produtos pelo código, descrição ou detalhes"
                                className="w-full h-12 pl-12 pr-4 bg-slate-100 border-none rounded-2xl text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            <button 
                                onClick={() => setSelectedCategory(null)}
                                className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase italic whitespace-nowrap transition-all border-2", !selectedCategory ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-white border-slate-200 text-slate-400")}
                            >
                                TODOS
                            </button>
                            {categories.map(cat => (
                                <button 
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase italic whitespace-nowrap transition-all border-2", selectedCategory === cat.id ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-white border-slate-200 text-slate-400")}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grid de Produtos */}
                    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 custom-scrollbar">
                        {filteredProducts.map(prod => (
                            <button 
                                key={prod.id}
                                onClick={() => handleAddItem(prod)}
                                className="bg-white p-4 rounded-3xl border-2 border-transparent hover:border-blue-500 transition-all text-left shadow-sm group"
                            >
                                <h4 className="text-sm font-black text-slate-900 uppercase italic mb-1 group-hover:text-blue-600">{prod.name}</h4>
                                <p className="text-[10px] font-black text-slate-400 italic">R$ {prod.price.toFixed(2)}</p>
                                <div className="mt-4 flex justify-end">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <Plus size={16} />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                /* PAINEL DE CONTROLE INDUSTRIAL (PAGAMENTO E LOGÍSTICA) */
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-slate-100">
                    <div className="grid grid-cols-12 gap-3">
                        
                        {/* BLOCO 1: RESUMO FINANCEIRO (DENSE) */}
                        <div className="col-span-3 space-y-3">
                            <Card className="p-4 rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign size={40} /></div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase italic mb-4 tracking-widest">Resumo Financeiro</h3>
                                
                                <div className="space-y-2.5">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase italic">Subtotal</span>
                                        <span className="text-[11px] font-black text-slate-900 italic">R$ {subtotal.toFixed(2)}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                        <span className="text-[9px] font-black text-slate-500 uppercase italic flex-1">Entrega</span>
                                        <div className="flex items-center bg-white px-2 py-1 rounded-lg border border-slate-200">
                                            <span className="text-[8px] font-black text-slate-400 mr-1">R$</span>
                                            <input type="number" className="w-14 bg-transparent border-none p-0 text-[11px] font-black text-slate-900 focus:ring-0" value={deliveryFee} onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                        <span className="text-[9px] font-black text-slate-500 uppercase italic flex-1">Acréscimo</span>
                                        <div className="flex items-center bg-white px-2 py-1 rounded-lg border border-slate-200">
                                            <span className="text-[8px] font-black text-slate-400 mr-1">R$</span>
                                            <input type="number" className="w-14 bg-transparent border-none p-0 text-[11px] font-black text-slate-900 focus:ring-0" value={surcharge} onChange={e => setSurcharge(parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-rose-50/30 p-2 rounded-xl border border-rose-100/50">
                                        <span className="text-[9px] font-black text-rose-600 uppercase italic flex-1">Desconto</span>
                                        <div className="flex items-center bg-white px-2 py-1 rounded-lg border border-slate-200">
                                            <span className="text-[8px] font-black text-slate-400 mr-1">R$</span>
                                            <input type="number" className="w-14 bg-transparent border-none p-0 text-[11px] font-black text-rose-600 focus:ring-0" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex justify-between items-end">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-slate-400 uppercase italic leading-none">Total Geral</span>
                                            <span className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">R$ {totalGeral.toFixed(2)}</span>
                                        </div>
                                        {remainingToPay > 0 && (
                                            <div className="flex flex-col text-right">
                                                <span className="text-[8px] font-black text-rose-500 uppercase italic leading-none">A Pagar</span>
                                                <span className="text-sm font-black text-rose-600 italic tracking-tighter leading-none">R$ {remainingToPay.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-4 rounded-2xl border-slate-200 shadow-sm bg-slate-900 text-white overflow-hidden relative group">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform"><Clock size={40} /></div>
                                <h3 className="text-[9px] font-black text-slate-500 uppercase italic mb-3 tracking-widest">Registro de Pagamentos</h3>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar-white pr-1">
                                    {order.payments?.map((pay: any) => (
                                        <div key={pay.id} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg group/pay border border-slate-700/50">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase italic leading-none">{pay.method}</span>
                                                <span className="text-[7px] font-bold text-slate-500 uppercase mt-0.5">{format(new Date(pay.createdAt), 'HH:mm')}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black italic">R$ {pay.amount.toFixed(2)}</span>
                                                <button onClick={() => handleRemovePayment(pay.id)} className="p-1 hover:bg-rose-500 rounded transition-colors text-slate-500 hover:text-white">
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {!order.payments?.length && (
                                        <div className="text-center py-4 border-2 border-dashed border-slate-800 rounded-xl text-[9px] font-black text-slate-600 uppercase italic">Nenhum pagamento registrado</div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => {
                                        setIsAddingPayment(true);
                                        setNewPayment({ methodId: '', amount: remainingToPay > 0 ? remainingToPay : 0 });
                                    }}
                                    className="w-full mt-4 h-9 border border-blue-500/50 rounded-xl flex items-center justify-center gap-2 text-blue-400 hover:bg-blue-500 hover:text-white transition-all text-[9px] font-black uppercase italic"
                                >
                                    <Plus size={14} /> Registrar Pagamento
                                </button>
                            </Card>
                        </div>

                        {/* BLOCO 2: LOGÍSTICA E DESPACHO (CENTRO) */}
                        <div className="col-span-5 space-y-3">
                            <Card className="p-4 rounded-2xl border-slate-200 shadow-sm bg-white min-h-[400px]">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-[10px] font-black text-slate-900 uppercase italic flex items-center gap-2 tracking-widest">
                                        <Truck size={16} className="text-blue-500" /> Logística de Entrega
                                    </h3>
                                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                                        <button 
                                            onClick={() => updateDeliveryType(order.id, 'delivery').then(() => onRefresh())}
                                            className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase italic transition-all", isDelivery ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                        >
                                            Delivery
                                        </button>
                                        <button 
                                            onClick={() => updateDeliveryType(order.id, 'pickup').then(() => onRefresh())}
                                            className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase italic transition-all", !isDelivery ? "bg-orange-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                        >
                                            Balcão
                                        </button>
                                    </div>
                                </div>

                                {isDelivery ? (
                                    <div className="space-y-6">
                                        {/* Seleção de Motoboy (Industrial) */}
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[9px] font-black text-slate-500 uppercase italic tracking-widest">Vincular Entregador</label>
                                                {selectedDriverId && (
                                                    <span className="text-[8px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-md font-black italic">VINCULADO</span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-12 gap-2">
                                                <div className="col-span-9 relative">
                                                    <Bike size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <select 
                                                        className="w-full h-11 pl-9 pr-4 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none italic uppercase"
                                                        value={selectedDriverId}
                                                        onChange={e => handleAssignDriver(e.target.value)}
                                                    >
                                                        <option value="">SELECIONE O MOTOBOY...</option>
                                                        {drivers.map(d => (
                                                            <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button className="col-span-3 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-md">
                                                    <Phone size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Detalhes do Destino */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase italic">Destinatário</span>
                                                <p className="text-[10px] font-black text-slate-900 uppercase italic truncate">{order.deliveryOrder?.name || 'Não informado'}</p>
                                            </div>
                                            <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase italic">Telefone</span>
                                                <p className="text-[10px] font-black text-slate-900 italic">{order.deliveryOrder?.phone || 'Não informado'}</p>
                                            </div>
                                        </div>

                                        {/* Pagamento e Troco */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                                                <span className="text-[8px] font-black text-slate-400 uppercase italic">Pagamento</span>
                                                <p className="text-[10px] font-black text-emerald-600 uppercase italic truncate">{order.deliveryOrder?.paymentMethod || 'Não informado'}</p>
                                            </div>
                                            {order.deliveryOrder?.changeFor && order.deliveryOrder.changeFor > 0 ? (
                                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
                                                    <span className="text-[8px] font-black text-amber-600 uppercase italic">Troco Para</span>
                                                    <p className="text-[10px] font-black text-amber-700 italic">R$ {order.deliveryOrder.changeFor.toFixed(2).replace('.', ',')}</p>
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 opacity-50">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase italic">Troco</span>
                                                    <p className="text-[10px] font-black text-slate-400 italic">Sem Troco</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl space-y-2">
                                            <span className="text-[8px] font-black text-blue-400 uppercase italic tracking-widest flex items-center gap-1">
                                                <MapPin size={10} /> Endereço de Entrega
                                            </span>
                                            <p className="text-[11px] font-black text-slate-700 italic leading-snug">
                                                {order.deliveryOrder?.address || 'Retirada no Balcão'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4">
                                        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
                                            <ShoppingBag size={32} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-slate-900 uppercase italic">Pedido para Retirada</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase italic mt-1">Nenhuma logística de entrega necessária</p>
                                        </div>
                                        <button 
                                            onClick={() => updateDeliveryType(order.id, 'delivery').then(() => onRefresh())}
                                            className="px-6 h-10 border border-orange-200 rounded-xl text-[9px] font-black text-orange-600 hover:bg-orange-50 transition-all uppercase italic"
                                        >
                                            Mudar para Entrega
                                        </button>
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* BLOCO 3: REGISTROS E NOTAS (DIREITA) */}
                        <div className="col-span-4 space-y-3">
                            {isAddingPayment && (
                                <Card className="p-4 rounded-2xl border-blue-500 shadow-xl bg-white animate-in zoom-in-95 duration-200 ring-2 ring-blue-500/20">
                                    <h3 className="text-[10px] font-black text-blue-600 uppercase italic mb-4 tracking-widest flex items-center gap-2">
                                        <Plus size={14} /> Novo Recebimento
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase italic px-1">Método</label>
                                            <select 
                                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-slate-900 outline-none"
                                                value={newPayment.methodId}
                                                onChange={e => setNewPayment({...newPayment, methodId: e.target.value})}
                                            >
                                                <option value="">FORMA...</option>
                                                {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-slate-400 uppercase italic px-1">Valor (R$)</label>
                                            <input 
                                                type="number" 
                                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-black text-slate-900 outline-none"
                                                value={newPayment.amount || ''}
                                                onChange={e => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})}
                                                placeholder="0,00"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleAddPayment} className="flex-1 h-10 bg-blue-600 text-white text-[9px] font-black uppercase rounded-lg shadow-md hover:bg-blue-700 transition-all">Confirmar</button>
                                        <button onClick={() => setIsAddingPayment(false)} className="px-4 h-10 bg-slate-200 text-slate-600 text-[9px] font-black uppercase rounded-lg">Cancelar</button>
                                    </div>
                                </Card>
                            )}

                            <Card className="p-4 rounded-2xl border-slate-200 shadow-sm bg-white">
                                <h3 className="text-[10px] font-black text-slate-900 uppercase italic mb-3 flex items-center gap-2 tracking-widest">
                                    <Tag size={14} className="text-orange-500" /> Notas Internas
                                </h3>
                                <textarea 
                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-black text-slate-700 italic placeholder:text-slate-300 focus:ring-1 focus:ring-orange-500/20 h-32 resize-none"
                                    placeholder="Registrar nota técnica ou observação de cozinha..."
                                    value={internalObs}
                                    onChange={(e) => setInternalObs(e.target.value)}
                                />
                                <div className="mt-2 text-[7px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-1">
                                    <Info size={8} /> Visível apenas para a equipe administrativa
                                </div>
                            </Card>

                            <Card className="p-4 rounded-2xl border-slate-200 shadow-sm bg-white">
                                <h3 className="text-[10px] font-black text-slate-900 uppercase italic mb-3 flex items-center gap-2 tracking-widest">
                                    <FileText size={14} className="text-blue-500" /> Observações do Cliente
                                </h3>
                                <div className="p-3 bg-blue-50/30 border border-blue-100/50 rounded-xl text-[10px] font-bold text-slate-600 italic h-24 overflow-y-auto custom-scrollbar leading-snug">
                                    {order.deliveryOrder?.observations || 'Nenhuma observação informada pelo cliente para esta entrega.'}
                                </div>
                            </Card>
                        </div>

                    </div>
                </div>
            )}

        </div>
      </div>

      {/* DRAWER DE PERSONALIZAÇÃO (INDUSTRIAL/COMPACTO) */}
      {showProductDrawer && selectedProductForAdd && (
          <div className="fixed inset-0 z-[300] flex justify-end animate-in fade-in duration-200">
              <div onClick={() => setShowProductDrawer(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
              <div className="relative w-[500px] bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-300">
                  <header className="h-12 border-b border-slate-100 px-6 flex items-center justify-between shrink-0 bg-slate-50">
                      <div className="flex items-center gap-3">
                          <h3 className="text-[12px] font-black text-slate-900 uppercase italic tracking-tighter leading-none">{selectedProductForAdd.name}</h3>
                      </div>
                      <button onClick={() => setShowProductDrawer(false)} className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors"><X size={16} /></button>
                  </header>

                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
                      {/* Seleção de Tamanho */}
                      {selectedProductForAdd.sizes?.length > 0 && (
                          <div className="space-y-3">
                              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                                  <div className="w-1 h-3 bg-orange-500" /> Tamanho
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                  {selectedProductForAdd.sizes.map(size => (
                                      <button 
                                          key={size.id} 
                                          onClick={() => setSelectedSizeId(size.id)}
                                          className={cn(
                                              "h-10 border-2 rounded-lg text-[10px] font-black uppercase italic transition-all",
                                              selectedSizeId === size.id ? "border-orange-500 bg-orange-50 text-orange-600" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                                          )}
                                      >
                                          {size.name}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}

                      {/* Grupos de Adicionais */}
                      {selectedProductForAdd.addonGroups?.map(group => (
                          <div key={group.id} className="space-y-3">
                              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                                  <div className="w-1 h-3 bg-blue-500" /> {group.name}
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                  {group.addons.map(addon => {
                                      const isSelected = selectedAddonIds.includes(addon.id);
                                      return (
                                          <button 
                                              key={addon.id} 
                                              onClick={() => {
                                                  if (group.type === 'single') {
                                                      const others = group.addons.map(a => a.id);
                                                      const filtered = selectedAddonIds.filter(id => !others.includes(id));
                                                      setSelectedAddonIds([...filtered, addon.id]);
                                                  } else {
                                                      setSelectedAddonIds(prev => isSelected ? prev.filter(id => id !== addon.id) : [...prev, addon.id]);
                                                  }
                                              }}
                                              className={cn(
                                                  "p-2 border-2 rounded-lg flex flex-col items-center justify-center text-center gap-0.5 transition-all",
                                                  isSelected ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-50 bg-white text-slate-500 hover:border-slate-200"
                                              )}
                                          >
                                              <span className="text-[9px] font-black uppercase italic leading-none">{addon.name}</span>
                                              {addon.price > 0 && <span className="text-[8px] font-black text-emerald-600">+R${addon.price.toFixed(2)}</span>}
                                          </button>
                                      );
                                  })}
                              </div>
                          </div>
                      ))}

                      <div className="space-y-3">
                          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Observações</h4>
                          <textarea 
                              className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] font-bold outline-none focus:border-orange-500 resize-none"
                              placeholder="Instruções específicas..."
                              value={tempObs}
                              onChange={e => setTempObs(e.target.value)}
                          />
                      </div>
                  </div>

                  <footer className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 shrink-0">
                      <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                          <button onClick={() => setTempQty(Math.max(1, tempQty - 1))} className="w-8 h-8 flex items-center justify-center rounded bg-slate-900 text-white hover:bg-slate-700 transition-all"><Minus size={14} /></button>
                          <span className="w-10 text-center text-sm font-black text-white italic">{tempQty}</span>
                          <button onClick={() => setTempQty(tempQty + 1)} className="w-8 h-8 flex items-center justify-center rounded bg-slate-900 text-white hover:bg-slate-700 transition-all"><Plus size={14} /></button>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                          <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-500 uppercase italic leading-none">Subtotal</span>
                              <span className="text-xl font-black text-white italic tracking-tighter leading-none">R$ {calculateCurrentPrice().toFixed(2)}</span>
                          </div>
                          <button 
                              onClick={handleConfirmAddToCart}
                              disabled={isSaving}
                              className="h-10 px-6 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[10px] font-black uppercase italic tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                          >
                              {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'ADICIONAR'}
                          </button>
                      </div>
                  </footer>
              </div>
          </div>
      )}
    </div>
  );
};

export default OrderEditor;