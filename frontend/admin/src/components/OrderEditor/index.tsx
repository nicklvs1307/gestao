import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Order, Product, Category, PaymentMethod as PaymentMethodType } from '@/types/index.ts';
import {
    getDrivers, assignDriver, getProducts, getCategories,
    getPaymentMethods, updateOrderFinancials, addItemsToOrder, removeOrderItem,
    updateOrderCustomer, addOrderPayment, removeOrderPayment, updateDeliveryType, updateOrderStatus
} from '../../services/api';
import { formatSP } from '@/lib/timezone';
import {
    CheckCircle, Printer,
    Loader2, FileText, User, MapPin,
    Search, Plus, Trash2, ArrowLeft, List, CreditCard, Truck, XCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { calculateProductPrice } from '../../features/pos/utils/priceCalculator';
import { getSettings, markOrderAsPrinted } from '../../services/api';
import { printOrder } from '../../services/printer';
import { OrderEditorProductDrawer } from './OrderEditorProductDrawer';
import { useScrollLock } from '../../hooks/useScrollLock';
import { OrderEditorPayment } from './OrderEditorPayment';

interface OrderEditorProps {
  onClose: () => void;
  order: Order;
  onRefresh: () => void;
}

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { value: 'PREPARING', label: 'Cozinha', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { value: 'READY', label: 'Pronto', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { value: 'SHIPPED', label: 'Em Rota', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { value: 'DELIVERED', label: 'Entregue', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' },
    { value: 'COMPLETED', label: 'Finalizado', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { value: 'CANCELED', label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const OrderEditor: React.FC<OrderEditorProps> = ({ onClose, order, onRefresh }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'items' | 'payment'>('items');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchTerm, 250);

  const [showProductDrawer, setShowProductDrawer] = useState(false);
  const [selectedProductForAdd, setSelectedProductForAdd] = useState<Product | null>(null);
  const [tempQty, setTempQty] = useState(1);
  const [tempObs, setTempObs] = useState('');
  const [selectedSizeId, setSelectedSizeId] = useState<string>('');
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState(order.deliveryOrder?.driverId || '');

  const [deliveryFee, setDeliveryFee] = useState(order.deliveryOrder?.deliveryFee || 0);
  const [discount, setDiscount] = useState(0);
  const [surcharge, setSurcharge] = useState(0);
  const [internalObs, setInternalObs] = useState('');

  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerForm, setCustomerData] = useState({
      name: order.deliveryOrder?.name || order.customerName || '',
      phone: order.deliveryOrder?.phone || '',
      address: order.deliveryOrder?.address || ''
  });

  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ methodId: '', amount: 0 });

  const [, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useScrollLock(true);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
        setIsLoading(true);
        const finalRestaurantId = order.restaurantId || user?.restaurantId || localStorage.getItem('selectedRestaurantId');
        if (!finalRestaurantId) return;

        const [prodData, catData, payData, driversData] = await Promise.all([
            getProducts(),
            getCategories(),
            getPaymentMethods(finalRestaurantId),
            getDrivers()
        ]);
        setProducts(prodData);
        setCategories(catData);
        setPaymentMethods(payData.filter((p: { isActive: boolean }) => p.isActive));
        setDrivers(driversData || []);
    } catch {
        toast.error("Erro ao carregar dados do catálogo.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleProductClick = useCallback((product: Product) => {
    setSelectedProductForAdd(product);
    setTempQty(1);
    setTempObs('');
    setSelectedSizeId(product.sizes?.[0]?.id || '');
    setSelectedAddonIds([]);
    setShowProductDrawer(true);
  }, []);

  const handleAddonToggle = useCallback((addonId: string, groupType: string, groupAddonIds: string[]) => {
    if (groupType === 'single') {
      const filtered = selectedAddonIds.filter(id => !groupAddonIds.includes(id));
      setSelectedAddonIds([...filtered, addonId]);
    } else {
      setSelectedAddonIds(prev => prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]);
    }
  }, [selectedAddonIds]);

  const calculatedPrice = useMemo(() => {
    if (!selectedProductForAdd) return 0;
    return calculateProductPrice(selectedProductForAdd, selectedSizeId, selectedAddonIds, tempQty);
  }, [selectedProductForAdd, selectedSizeId, selectedAddonIds, tempQty]);

  const handleConfirmAddToCart = async () => {
      if (!selectedProductForAdd) return;
      try {
          setIsSaving(true);
          const product = selectedProductForAdd;
          const size = product.sizes?.find(s => s.id === selectedSizeId);
          const selectedAddons = product.addonGroups?.flatMap(g => 
              g.addons.filter(a => selectedAddonIds.includes(a.id)).map(a => ({ ...a, groupName: g.name }))
          ) || [];

          await addItemsToOrder(order.id, [{
              productId: product.id,
              quantity: tempQty,
              observations: tempObs,
              sizeId: selectedSizeId,
              addonsIds: selectedAddonIds,
              sizeJson: size ? JSON.stringify(size) : null,
              addonsJson: JSON.stringify(selectedAddons),
              priceAtTime: calculatedPrice / tempQty
          }]);

          toast.success(`${product.name} adicionado!`);
          setShowProductDrawer(false);
          onRefresh();
      } catch {
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
      } catch {
          toast.error("Erro ao vincular entregador.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleRemoveItem = async (itemId: string) => {
      try {
          setIsSaving(true);
          await removeOrderItem(order.id, itemId);
          toast.success("Item removido");
          onRefresh();
      } catch {
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
      } catch {
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
          await addOrderPayment(order.id, { amount: newPayment.amount, method });
          toast.success("Pagamento adicionado!");
          setIsAddingPayment(false);
          setNewPayment({ methodId: '', amount: 0 });
          onRefresh();
      } catch {
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
      } catch {
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
          await updateOrderFinancials(order.id, { deliveryFee, total: newTotal, discount, surcharge });
          toast.success("Dados financeiros atualizados!");
          onRefresh();
      } catch {
          toast.error("Erro ao salvar alterações.");
      } finally {
          setIsSaving(false);
      }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const settingsData = await getSettings();
      const restaurantInfo = {
        name: settingsData.name, address: settingsData.address, phone: settingsData.phone,
        cnpj: settingsData.fiscalConfig?.cnpj, logoUrl: settingsData.logoUrl
      };
      const printerConfig = JSON.parse(localStorage.getItem('printer_config') || '{}');
      await printOrder(order, printerConfig, undefined, restaurantInfo);
      await markOrderAsPrinted(order.id);
      toast.success("Impressão enviada!");
    } catch {
      toast.error("Falha na impressão.");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleUpdateDeliveryType = async (type: 'delivery' | 'retirada') => {
    try {
      await updateDeliveryType(order.id, type);
      onRefresh();
    } catch {
      toast.error("Erro ao alterar tipo de entrega.");
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm(`Cancelar pedido #${order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}?`)) return;
    try {
      await updateOrderStatus(order.id, 'CANCELED');
      toast.success("Pedido cancelado!");
      onRefresh();
      onClose();
    } catch {
      toast.error("Erro ao cancelar pedido.");
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory = !selectedCategory || p.categories?.some(c => c.id === selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [products, debouncedSearch, selectedCategory]);

  const subtotal = (Array.isArray(order.items) ? order.items : []).reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);
  const totalGeral = subtotal + deliveryFee + surcharge - discount;
  const totalPaid = (Array.isArray(order.payments) ? order.payments : []).reduce((acc, p) => acc + p.amount, 0) || 0;
  const remainingToPay = totalGeral - totalPaid;

  const currentStatus = STATUS_OPTIONS.find(s => s.value === order.status) || STATUS_OPTIONS[0];
  const isDelivery = order.orderType === 'DELIVERY' || !!order.deliveryOrder;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col animate-in fade-in duration-300">
      {/* Overlay escuro com backdrop blur */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative z-10 w-full h-full flex flex-col bg-slate-100 m-2 rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50">
      
      {/* Header */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors" title="Voltar">
                <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div className="flex flex-col">
                <h1 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                    Pedido <span className="text-orange-600">#{order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}</span>
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {order.id}</p>
            </div>
            <div className={cn("px-2.5 py-1 rounded-lg text-[8px] font-black border uppercase tracking-widest ml-2", currentStatus.bg, currentStatus.color, currentStatus.border)}>
                {currentStatus.label} - {formatSP(order.createdAt, "dd/MMM 'às' HH:mm")}
            </div>
        </div>
        <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint} 
              disabled={isPrinting} 
              className="flex items-center gap-2 bg-slate-800 text-white h-9 px-4 rounded-xl font-black text-[10px] uppercase italic hover:bg-slate-900 transition-all shadow-md disabled:opacity-50"
            >
                {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} Imprimir
            </button>
            {order.status !== 'CANCELED' && order.status !== 'COMPLETED' && (
              <button 
                onClick={handleCancelOrder}
                className="flex items-center gap-2 bg-rose-600 text-white h-9 px-4 rounded-xl font-black text-[10px] uppercase italic hover:bg-rose-700 transition-all shadow-md"
              >
                <XCircle size={14} /> Cancelar
              </button>
            )}
            <button onClick={handleSaveFinancials} disabled={isSaving} className="flex items-center gap-2 bg-orange-600 text-white h-9 px-6 rounded-xl font-black text-[10px] uppercase italic hover:bg-orange-700 transition-all shadow-md disabled:opacity-50">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} SALVAR
            </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="h-12 bg-white border-b border-slate-100 flex items-center px-6 gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('items')}
          className={cn(
            "flex items-center gap-2 h-9 px-5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all",
            activeTab === 'items'
              ? "bg-orange-600 text-white shadow-md"
              : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          )}
        >
          <List size={14} /> Itens do Pedido
        </button>
        <button
          onClick={() => setActiveTab('payment')}
          className={cn(
            "flex items-center gap-2 h-9 px-5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all",
            activeTab === 'payment'
              ? "bg-orange-600 text-white shadow-md"
              : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          )}
        >
          <CreditCard size={14} /> Pagamento
        </button>
        <div className="flex-1" />
        {remainingToPay > 0 && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-rose-50 border border-rose-200 rounded-xl">
            <span className="text-[8px] font-black text-rose-500 uppercase italic">A Pagar:</span>
            <span className="text-sm font-black text-rose-600 italic">R$ {remainingToPay.toFixed(2).replace('.', ',')}</span>
          </div>
        )}
        {remainingToPay <= 0 && order.payments && order.payments.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle size={14} className="text-emerald-600" />
            <span className="text-[9px] font-black text-emerald-600 uppercase italic">Pago</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[400px] bg-white border-r border-slate-200 flex flex-col shadow-xl z-10">
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
                                        {order.deliveryOrder.complement && <span className="text-amber-600"> ({order.deliveryOrder.complement})</span>}
                                        {order.deliveryOrder.reference && <span className="text-blue-600"> - Ref: {order.deliveryOrder.reference}</span>}
                                    </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[8px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-black uppercase flex items-center gap-1">
                                      <Truck size={8} /> Delivery
                                    </span>
                                    {order.deliveryOrder?.phone && <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg font-black italic">{order.deliveryOrder.phone}</span>}
                                </div>
                            </>
                        )}
                    </div>
                    {!isEditingCustomer && (
                        <button onClick={() => setIsEditingCustomer(true)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm ml-3" title="Editar Cliente"><FileText size={14} /></button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                <div className="grid grid-cols-12 px-2 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <div className="col-span-2">Qtd</div>
                    <div className="col-span-7">Item</div>
                    <div className="col-span-3 text-right">Valor</div>
                </div>
                {order.items?.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 items-start p-2 rounded-xl hover:bg-slate-50 transition-colors group relative">
                        <div className="col-span-2 font-black text-slate-900 italic">{item.quantity}</div>
                        <div className="col-span-7">
                            <p className="text-[11px] font-black text-slate-800 uppercase italic leading-none">{item.product.name}</p>
                            {item.sizeJson && <p className="text-[8px] text-blue-600 font-bold mt-1 bg-blue-50 px-1.5 py-0.5 rounded-md inline-block mr-1">TAM: {JSON.parse(item.sizeJson).name}</p>}
                            {item.flavorsJson && JSON.parse(item.flavorsJson).map((f: { name: string }, i: number) => (
                                <p key={`flavor-${i}`} className="text-[8px] text-orange-600 font-bold mt-1 bg-orange-50 px-1.5 py-0.5 rounded-md inline-block mr-1">SABOR: {f.name}</p>
                            ))}
                            {item.addonsJson && JSON.parse(item.addonsJson).map((a: { name: string; quantity?: number }, i: number) => (
                                <p key={`addon-${i}`} className="text-[8px] text-slate-500 font-bold mt-1 bg-slate-100 px-1.5 py-0.5 rounded-md inline-block mr-1">+ {a.quantity || 1}x {a.name}</p>
                            ))}
                        </div>
                        <div className="col-span-3 text-right font-black text-slate-900 italic text-[11px]">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</div>
                        <button onClick={() => handleRemoveItem(item.id)} className="absolute -right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 bg-rose-50 text-rose-500 rounded-lg transition-all"><Trash2 size={12} /></button>
                    </div>
                ))}
            </div>

            <div className="p-5 bg-slate-900 text-white space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase italic">Valor Total</span>
                <span className="text-2xl font-black text-white italic tracking-tighter">R$ {totalGeral.toFixed(2).replace('.', ',')}</span>
            </div>
            </div>
        </div>

        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            {activeTab === 'items' ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 bg-white border-b border-slate-200 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="text" placeholder="Pesquise produtos pelo código, descrição ou detalhes" className="w-full h-12 pl-12 pr-4 bg-slate-100 border-none rounded-2xl text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            <button onClick={() => setSelectedCategory(null)} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase italic whitespace-nowrap transition-all border-2", !selectedCategory ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-white border-slate-200 text-slate-400")}>TODOS</button>
                            {categories.map(cat => (
                                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase italic whitespace-nowrap transition-all border-2", selectedCategory === cat.id ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-white border-slate-200 text-slate-400")}>{cat.name}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 custom-scrollbar">
                        {filteredProducts.map(prod => (
                            <button key={prod.id} onClick={() => handleProductClick(prod)} className="bg-white p-4 rounded-3xl border-2 border-transparent hover:border-blue-500 transition-all text-left shadow-sm group">
                                <h4 className="text-sm font-black text-slate-900 uppercase italic mb-1 group-hover:text-blue-600">{prod.name}</h4>
                                <p className="text-[10px] font-black text-slate-400 italic">R$ {prod.price.toFixed(2)}</p>
                                <div className="mt-4 flex justify-end">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all"><Plus size={16} /></div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <OrderEditorPayment
                    order={order}
                    subtotal={subtotal}
                    totalGeral={totalGeral}
                    remainingToPay={remainingToPay}
                    deliveryFee={deliveryFee}
                    discount={discount}
                    surcharge={surcharge}
                    isDelivery={isDelivery}
                    isSaving={isSaving}
                    drivers={drivers}
                    selectedDriverId={selectedDriverId}
                    paymentMethods={paymentMethods}
                    isAddingPayment={isAddingPayment}
                    newPayment={newPayment}
                    internalObs={internalObs}
                    onDeliveryFeeChange={setDeliveryFee}
                    onDiscountChange={setDiscount}
                    onSurchargeChange={setSurcharge}
                    onAssignDriver={handleAssignDriver}
                    onUpdateDeliveryType={handleUpdateDeliveryType}
                    onAddPayment={handleAddPayment}
                    onRemovePayment={handleRemovePayment}
                    onSetIsAddingPayment={setIsAddingPayment}
                    onNewPaymentChange={setNewPayment}
                    onInternalObsChange={setInternalObs}
                />
            )}
        </div>
      </div>

      {showProductDrawer && selectedProductForAdd && (
          <OrderEditorProductDrawer
              product={selectedProductForAdd}
              selectedSizeId={selectedSizeId}
              selectedAddonIds={selectedAddonIds}
              tempQty={tempQty}
              tempObs={tempObs}
              isSaving={isSaving}
              calculatedPrice={calculatedPrice}
              onSizeChange={setSelectedSizeId}
              onAddonToggle={handleAddonToggle}
              onQtyChange={setTempQty}
              onObsChange={setTempObs}
              onConfirm={handleConfirmAddToCart}
              onClose={() => setShowProductDrawer(false)}
          />
      )}
      </div>
    </div>
  );
};

export default OrderEditor;
