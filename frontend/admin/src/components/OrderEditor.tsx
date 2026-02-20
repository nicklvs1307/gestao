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
  const [activeTab, setActiveTab] = useState<'items' | 'payment'>('items');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
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
        const [prodData, catData, payData] = await Promise.all([
            getProducts(),
            getCategories(),
            getPaymentMethods(order.restaurantId)
        ]);
        setProducts(prodData);
        setCategories(catData);
        setPaymentMethods(payData.filter((p: any) => p.isActive));
    } catch (e) {
        toast.error("Erro ao carregar dados do catálogo.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleAddItem = async (product: Product) => {
      try {
          setIsSaving(true);
          await addItemsToOrder(order.id, [{
              productId: product.id,
              quantity: 1,
              priceAtTime: product.price
          }]);
          toast.success(`${product.name} adicionado!`);
          onRefresh();
      } catch (e) {
          toast.error("Erro ao adicionar item.");
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
          const subtotal = order.items.reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);
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

  const subtotal = order.items.reduce((acc, item) => acc + (item.priceAtTime * item.quantity), 0);
  const totalGeral = subtotal + deliveryFee + surcharge - discount;
  const totalPaid = order.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
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
                {order.items.map((item: any) => (
                    <div key={item.id} className="grid grid-cols-12 items-start p-2 rounded-xl hover:bg-slate-50 transition-colors group relative">
                        <div className="col-span-2 font-black text-slate-900 italic">{item.quantity}</div>
                        <div className="col-span-7">
                            <p className="text-[11px] font-black text-slate-800 uppercase italic leading-none">{item.product.name}</p>
                            {item.sizeJson && <p className="text-[8px] text-blue-500 font-bold mt-0.5">+ {JSON.parse(item.sizeJson).name}</p>}
                            {item.flavorsJson && JSON.parse(item.flavorsJson).map((f: any, i: number) => (
                                <p key={i} className="text-[8px] text-orange-500 font-bold mt-0.5">+ {f.name}</p>
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
                /* ABA DE PAGAMENTO E FINANCEIRO */
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
                        
                        {/* Coluna Financeiro (Esquerda) */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="p-6 rounded-[2rem] border-slate-200 shadow-sm bg-white">
                                <h3 className="text-sm font-black text-slate-900 uppercase italic mb-6 flex items-center gap-2">
                                    <DollarSign size={18} className="text-orange-500" /> Pagamento
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                                        <span>Itens:</span>
                                        <span className="text-slate-900 font-black italic">R$ {subtotal.toFixed(2)}</span>
                                    </div>
                                    
                                    {/* Campo Taxa de Entrega */}
                                    <div className="flex items-center gap-4 pt-2">
                                        <span className="flex-1 text-[10px] font-black text-slate-500 uppercase italic">Entrega:</span>
                                        <div className="relative w-28">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">R$</span>
                                            <input 
                                                type="number" 
                                                className="w-full h-9 pl-7 pr-2 bg-slate-100 border-none rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-orange-500/20"
                                                value={deliveryFee}
                                                onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>

                                    {/* Campo Acréscimo */}
                                    <div className="flex items-center gap-4">
                                        <span className="flex-1 text-[10px] font-black text-slate-500 uppercase italic">Acréscimo:</span>
                                        <div className="relative w-28">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">R$</span>
                                            <input 
                                                type="number" 
                                                className="w-full h-9 pl-7 pr-2 bg-slate-100 border-none rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-orange-500/20"
                                                value={surcharge}
                                                onChange={(e) => setSurcharge(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>

                                    {/* Campo Desconto */}
                                    <div className="flex items-center gap-4">
                                        <span className="flex-1 text-[10px] font-black text-slate-500 uppercase italic">Desconto:</span>
                                        <div className="relative w-28">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">R$</span>
                                            <input 
                                                type="number" 
                                                className="w-full h-9 pl-7 pr-2 bg-slate-100 border-none rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-orange-500/20"
                                                value={discount}
                                                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-[11px] font-black text-slate-900 uppercase italic">Total</span>
                                        <span className="text-xl font-black text-slate-900 italic tracking-tighter">R$ {totalGeral.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Coluna Meio: Formas de Pagamento (Largura Dobrada) */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="p-6 rounded-[2rem] border-slate-200 shadow-sm bg-white min-h-[300px] flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-black text-slate-900 uppercase italic flex items-center gap-2">
                                        <CreditCard size={18} className="text-blue-500" /> Formas de pagamento
                                    </h3>
                                    <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black italic">
                                        Faltam: R$ {remainingToPay.toFixed(2)}
                                    </div>
                                </div>

                                <div className="space-y-3 flex-1">
                                    {order.payments?.map((pay: any) => (
                                        <div key={pay.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center group animate-in slide-in-from-left-2">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-900 uppercase italic">{pay.method.toUpperCase()}</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 italic">REGISTRADO EM {format(new Date(pay.createdAt), 'HH:mm')}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl font-black text-sm italic text-slate-900 shadow-sm">
                                                    R$ {pay.amount.toFixed(2)}
                                                </div>
                                                <button onClick={() => handleRemovePayment(pay.id)} className="p-2 bg-rose-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 active:scale-90">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {isAddingPayment ? (
                                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-4 animate-in zoom-in-95 duration-200">
                                            <div className="grid grid-cols-2 gap-3">
                                                <select 
                                                    className="h-10 px-3 bg-white border border-blue-200 rounded-xl text-[10px] font-black text-blue-900 outline-none"
                                                    value={newPayment.methodId}
                                                    onChange={e => setNewPayment({...newPayment, methodId: e.target.value})}
                                                >
                                                    <option value="">FORMA...</option>
                                                    {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                                                </select>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-400">R$</span>
                                                    <input 
                                                        type="number" 
                                                        className="w-full h-10 pl-8 pr-3 bg-white border border-blue-200 rounded-xl text-sm font-black text-blue-900 outline-none"
                                                        value={newPayment.amount || ''}
                                                        onChange={e => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})}
                                                        placeholder="0,00"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={handleAddPayment} className="flex-1 h-10 bg-blue-600 text-white text-[9px] font-black uppercase rounded-xl shadow-md">Confirmar</button>
                                                <button onClick={() => setIsAddingPayment(false)} className="px-4 h-10 bg-slate-200 text-slate-600 text-[9px] font-black uppercase rounded-xl">Cancelar</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => {
                                                setIsAddingPayment(true);
                                                setNewPayment({...newPayment, amount: remainingToPay > 0 ? remainingToPay : 0});
                                            }}
                                            className="w-full h-14 border-2 border-dashed border-blue-200 rounded-2xl flex items-center justify-center gap-3 text-blue-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                                        >
                                            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                                            <span className="text-[10px] font-black uppercase tracking-widest italic">Adicionar Outra Forma de Pagamento</span>
                                        </button>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* Coluna Direita: Observações Combinadas */}
                        <div className="lg:col-span-1 space-y-4">
                            <Card className="p-5 rounded-[2rem] border-slate-200 shadow-sm bg-white">
                                <h3 className="text-[10px] font-black text-slate-900 uppercase italic mb-3 flex items-center gap-2">
                                    <Tag size={14} className="text-orange-500" /> Notas Internas
                                </h3>
                                <textarea 
                                    className="w-full bg-orange-50/50 border border-orange-100 rounded-2xl p-3 text-[11px] text-slate-700 italic placeholder:text-orange-300 focus:ring-2 focus:ring-orange-500/20 h-32 resize-none"
                                    placeholder="Clique para adicionar uma nota interna..."
                                    value={internalObs}
                                    onChange={(e) => setInternalObs(e.target.value)}
                                />
                            </Card>

                            <Card className="p-5 rounded-[2rem] border-slate-200 shadow-sm bg-white">
                                <h3 className="text-[10px] font-black text-slate-900 uppercase italic mb-3 flex items-center gap-2">
                                    <Truck size={14} className="text-blue-500" /> Observações para entrega
                                </h3>
                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold text-slate-600 italic h-24 overflow-y-auto">
                                    {order.deliveryOrder?.address || 'Sem observações específicas'}
                                </div>
                            </Card>
                        </div>

                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default OrderEditor;