import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Order, Product, Category, PaymentMethod as PaymentMethodType } from '@/types/index.ts';
import { useNavigate } from 'react-router-dom';
import {
    getDrivers, assignDriver, getProducts, getCategories,
    getPaymentMethods, updateOrderFinancials, addItemsToOrder, removeOrderItem,
    updateOrderCustomer, addOrderPayment, removeOrderPayment, updateDeliveryType, updateOrderStatus, getSettings, markOrderAsPrinted,
    getIfoodCancellationReasons, rejectIfoodOrder, emitInvoice
} from '../../services/api';
import {
    acceptIfoodCancellation,
    refuseIfoodCancellation,
    acceptIfoodDispute,
    rejectIfoodDispute,
    offerIfoodAlternative
} from '../../services/api/integrations';
import { formatSP } from '@/lib/timezone';
import {
    CheckCircle, Printer,
    Loader2, FileText, User, MapPin, Phone,
    Search, Plus, Trash2, ArrowLeft, List, CreditCard, Truck, XCircle, ChevronDown, ShoppingCart, ChefHat, Wine,
    Calendar, Ticket, Tag, Clock, Info, Wallet, ArrowRight, ShieldCheck, AlertTriangle, Package, PlayCircle, Circle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { calculateProductPrice } from '../../features/pos/utils/priceCalculator';
import { printOrder, type PrintTarget } from '../../services/printer';
import { OrderEditorProductDrawer } from './OrderEditorProductDrawer';
import { useScrollLock } from '../../hooks/useScrollLock';
import { OrderEditorPayment } from './OrderEditorPayment';

interface OrderEditorProps {
  onClose: () => void;
  order: Order;
  onRefresh: () => void;
}

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pendente', icon: Circle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { value: 'PREPARING', label: 'Cozinha', icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { value: 'READY', label: 'Pronto', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { value: 'SHIPPED', label: 'Em Rota', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { value: 'DELIVERED', label: 'Entregue', icon: Package, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' },
    { value: 'COMPLETED', label: 'Finalizado', icon: ShieldCheck, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { value: 'CANCELED', label: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'items' | 'payment' | 'details'>('items');
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

  const [deliveryFee, setDeliveryFee] = useState(order.deliveryFee || order.deliveryOrder?.deliveryFee || 0);
  const [discount, setDiscount] = useState(order.discount || 0);
  const [surcharge, setSurcharge] = useState(order.extraCharge || 0);
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
  const [isEmitting, setIsEmitting] = useState(false);
  const [printMenuAnchor, setPrintMenuAnchor] = useState<null | HTMLElement>(null);
  const [printingTarget, setPrintingTarget] = useState<PrintTarget | null>(null);

  // Estados para modal de cancelamento iFood
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReasons, setCancellationReasons] = useState<Array<{ cancelCodeId: string; description: string }>>([]);
  const [selectedCancelReason, setSelectedCancelReason] = useState('');
  const [isLoadingReasons, setIsLoadingReasons] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Estados para disputas iFood
  const [isHandlingDispute, setIsHandlingDispute] = useState(false);
  const [showAlternativeModal, setShowAlternativeModal] = useState(false);
  const [alternativeType, setAlternativeType] = useState<string>('');
  const [alternativeValue, setAlternativeValue] = useState<string>('');

  // Estados para cancelamento solicitado pelo cliente
  const [isHandlingCancellation, setIsHandlingCancellation] = useState(false);

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

  const handleUpdateDeliveryType = async (type: 'delivery' | 'retirada') => {
    try {
      await updateDeliveryType(order.id, type);
      onRefresh();
    } catch {
      toast.error("Erro ao alterar tipo de entrega.");
    }
  };

  const handleCancelOrder = async () => {
    // Verificar se é pedido iFood para fluxo de cancelamento correto
    const isIfoodOrder = !!order.ifoodOrderId;
    
    if (isIfoodOrder) {
      // Para pedidos iFood, buscar motivos de cancelamento
      setIsLoadingReasons(true);
      try {
        const result = await getIfoodCancellationReasons(order.id);
        console.log('[DEBUG] Motivos de cancelamento:', result);
        
        // Debug da estrutura
        console.log('[DEBUG] result.reasons:', result.reasons);
        console.log('[DEBUG] Tipo:', typeof result.reasons);
        console.log('[DEBUG] É array:', Array.isArray(result.reasons));
        
        // Garantir que reasons é um array válido
        let reasons = result.reasons;
        
        // Se não for array, tentar converter
        if (!Array.isArray(reasons)) {
          if (reasons && typeof reasons === 'object') {
            // Pode ser um objeto com keys como array
            reasons = Object.values(reasons);
          } else {
            reasons = [];
          }
        }
        
        console.log('[DEBUG] Reasons processado:', reasons);
        
        if (result.success && Array.isArray(reasons) && reasons.length > 0) {
          setCancellationReasons(reasons);
          setSelectedCancelReason(reasons[0]?.cancelCodeId || '');
          console.log('[DEBUG] Primeiro código selecionado:', reasons[0]?.cancelCodeId);
          setShowCancelModal(true);
        } else {
          // Se não conseguir motivos, tenta cancelamento direto (rejeição)
          if (!window.confirm(`Cancelar pedido #${order.dailyOrderNumber || order.id.slice(-4).toUpperCase()} no iFood?`)) return;
          setIsCancelling(true);
          const rejectResult = await rejectIfoodOrder(order.id, '501');
          if (!rejectResult.success) {
            if (rejectResult.alreadyAccepted) {
              toast.error("Pedido já aceito. Selecione um motivo de cancelamento.");
              return;
            }
            toast.error(rejectResult.error || 'Erro ao cancelar pedido no iFood');
            return;
          }
          await updateOrderStatus(order.id, 'CANCELED');
          toast.success("Pedido cancelado!");
          onRefresh();
          onClose();
        }
      } catch (err) {
        console.error('Erro ao buscar motivos de cancelamento:', err);
        toast.error("Erro ao buscar motivos de cancelamento");
      } finally {
        setIsLoadingReasons(false);
      }
    } else {
      // Pedidos não-iFood usam o fluxo normal
      if (!window.confirm(`Cancelar pedido #${order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}?`)) return;
      try {
        await updateOrderStatus(order.id, 'CANCELED');
        toast.success("Pedido cancelado!");
        onRefresh();
        onClose();
      } catch {
        toast.error("Erro ao cancelar pedido.");
      }
    }
  };

  // Função para confirmar o cancelamento com motivo
  const handleConfirmCancellation = async () => {
    if (!selectedCancelReason) {
      toast.error("Selecione um motivo de cancelamento");
      return;
    }
    
    setIsCancelling(true);
    try {
      // Usar force=true para garantir que o cancelamento seja enviado ao iFood
      const result = await rejectIfoodOrder(order.id, selectedCancelReason, true);
      if (!result.success) {
        if (result.alreadyAccepted) {
          toast.error("O iFood recusou o cancelamento. O pedido continua ativo.");
        } else {
          toast.error(result.error || 'Erro ao cancelar pedido no iFood');
        }
        return;
      }
      
      // Atualizar status local após cancelamento no iFood
      await updateOrderStatus(order.id, 'CANCELED');
      toast.success("Pedido cancelado!");
      setShowCancelModal(false);
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Erro ao confirmar cancelamento:', err);
      toast.error("Erro ao cancelar pedido");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleAcceptCancellation = async () => {
    if (!order.ifoodOrderId) return;
    setIsHandlingCancellation(true);
    try {
      const result = await acceptIfoodCancellation(order.id);
      if (result.success) {
        toast.success('Cancelamento aceito');
        await updateOrderStatus(order.id, 'CANCELED');
        onRefresh();
        onClose();
      } else {
        toast.error(result.error || 'Erro ao aceitar cancelamento');
      }
    } catch {
      toast.error('Erro ao processar');
    } finally {
      setIsHandlingCancellation(false);
    }
  };

  const handleRefuseCancellation = async () => {
    if (!order.ifoodOrderId) return;
    setIsHandlingCancellation(true);
    try {
      const result = await refuseIfoodCancellation(order.id);
      if (result.success) {
        toast.success('Cancelamento recusado');
        onRefresh();
      } else {
        toast.error(result.error || 'Erro ao recusar cancelamento');
      }
    } catch {
      toast.error('Erro ao processar');
    } finally {
      setIsHandlingCancellation(false);
    }
  };

  const handleAcceptDispute = async () => {
    if (!order.disputeId) return;
    setIsHandlingDispute(true);
    try {
      const result = await acceptIfoodDispute(order.disputeId, order.id, 'CUSTOMER_SATISFACTION');
      if (result.success) {
        toast.success('Disputa aceita - reembolso processado');
        await updateOrderStatus(order.id, 'CANCELED');
        onRefresh();
        onClose();
      } else {
        toast.error(result.error || 'Erro ao aceitar disputa');
      }
    } catch {
      toast.error('Erro ao processar');
    } finally {
      setIsHandlingDispute(false);
    }
  };

  const handleRejectDispute = async () => {
    if (!order.disputeId) return;
    setIsHandlingDispute(true);
    try {
      const result = await rejectIfoodDispute(order.disputeId, order.id, 'Loja não concorda com a solicitação');
      if (result.success) {
        toast.success('Disputa recusada');
        onRefresh();
      } else {
        toast.error(result.error || 'Erro ao recusar disputa');
      }
    } catch {
      toast.error('Erro ao processar');
    } finally {
      setIsHandlingDispute(false);
    }
  };

  const handleOfferAlternative = async () => {
    if (!order.disputeId || !alternativeType) return;
    setIsHandlingDispute(true);
    try {
      const value = alternativeValue ? parseFloat(alternativeValue) : undefined;
      const result = await offerIfoodAlternative(order.disputeId, order.id, alternativeType, value);
      if (result.success) {
        toast.success('Alternativa oferecida ao cliente');
        setShowAlternativeModal(false);
        onRefresh();
      } else {
        toast.error(result.error || 'Erro ao oferecer alternativa');
      }
    } catch {
      toast.error('Erro ao processar');
    } finally {
      setIsHandlingDispute(false);
    }
  };

  const handleEmitInvoice = async () => {
    setIsEmitting(true);
    try {
      const res = await emitInvoice(order.id);
      toast.success("Nota emitida com sucesso!");
      if (res.pdfUrl) window.open(res.pdfUrl, '_blank');
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Erro ao emitir nota.");
    } finally {
      setIsEmitting(false);
    }
  };

  const handleNavigateToCheckout = () => {
    navigate(`/pos/checkout/${order.id}`);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'CANCELED' && order.ifoodOrderId && order.status !== 'PENDING') {
      handleCancelOrder();
      return;
    }
    try {
      await updateOrderStatus(order.id, newStatus);
      toast.success(`Status alterado para ${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}`);
      onRefresh();
    } catch {
      toast.error("Erro ao alterar status.");
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

  const printTargetLabels: Record<PrintTarget, string> = {
    all: 'Imprimir Todos',
    cashier: 'Imprimir Caixa',
    kitchen: 'Imprimir Cozinha',
    bar: 'Imprimir Bar',
  };

  const handleOpenPrintMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintMenuAnchor(e.currentTarget);
  };

  const handleClosePrintMenu = () => {
    setPrintMenuAnchor(null);
  };

  const handlePrintTarget = useCallback(async (target: PrintTarget) => {
    handleClosePrintMenu();
    setIsPrinting(true);
    setPrintingTarget(target);
    try {
      const settingsData = await getSettings();
      const restaurantInfo = {
        name: settingsData.name,
        address: settingsData.address,
        phone: settingsData.phone,
        cnpj: settingsData.fiscalConfig?.cnpj,
        logoUrl: settingsData.logoUrl
      };
      const printerConfig = JSON.parse(localStorage.getItem('printer_config') || '{}');
      await printOrder(order, printerConfig, undefined, restaurantInfo, target);
      await markOrderAsPrinted(order.id);
      toast.success(`${printTargetLabels[target]} enviado!`);
    } catch {
      toast.error("Falha na impressão.");
    } finally {
      setIsPrinting(false);
      setPrintingTarget(null);
    }
  }, [order]);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col animate-in fade-in duration-300" onWheel={(e) => e.stopPropagation()}>
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
        <div className="flex items-center gap-3 relative">
            <div className="relative">
              <button 
                onClick={handleOpenPrintMenu}
                disabled={isPrinting}
                className="flex items-center gap-1.5 bg-slate-800 text-white h-9 px-4 rounded-xl font-black text-[10px] uppercase italic hover:bg-slate-900 transition-all shadow-md disabled:opacity-50"
              >
                {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                {printingTarget ? printTargetLabels[printingTarget] : 'Imprimir'}
                {!isPrinting && <ChevronDown size={12} className="ml-1" />}
              </button>
              
              {/* Print Menu Dropdown */}
              {printMenuAnchor && (
                <div 
                  className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-[400] min-w-[180px] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(['all', 'cashier', 'kitchen', 'bar'] as PrintTarget[]).map((target) => (
                    <button
                      key={target}
                      onClick={() => handlePrintTarget(target)}
                      disabled={isPrinting}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                      {target === 'all' && <Printer size={16} className="text-slate-500" />}
                      {target === 'cashier' && <ShoppingCart size={16} className="text-blue-500" />}
                      {target === 'kitchen' && <ChefHat size={16} className="text-orange-500" />}
                      {target === 'bar' && <Wine size={16} className="text-purple-500" />}
                      {printTargetLabels[target]}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Overlay to close menu */}
              {printMenuAnchor && (
                <div 
                  className="fixed inset-0 z-[350]" 
                  onClick={handleClosePrintMenu}
                />
              )}
            </div>
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
        <button
          onClick={() => setActiveTab('details')}
          className={cn(
            "flex items-center gap-2 h-9 px-5 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all",
            activeTab === 'details'
              ? "bg-orange-600 text-white shadow-md"
              : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          )}
        >
          <Info size={14} /> Detalhes
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
                {(order.notes || order.deliveryOrder?.notes) && (
                    <div className="mx-2 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Tag size={10} /> Observação do Cliente
                        </p>
                        <p className="text-xs font-bold text-amber-800 leading-snug">{order.notes || order.deliveryOrder?.notes}</p>
                    </div>
                )}
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
                            {item.observations && (
                                <p className="text-[8px] text-rose-600 font-bold mt-1 bg-rose-50 px-1.5 py-0.5 rounded-md inline-block mr-1">OBS: {item.observations}</p>
                            )}
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
            ) : activeTab === 'payment' ? (
                <OrderEditorPayment
                    order={order}
                    subtotal={subtotal}
                    totalGeral={totalGeral}
                    remainingToPay={remainingToPay}
                    deliveryFee={deliveryFee}
                    discount={discount}
                    surcharge={surcharge}
                    platformFee={order.platformFee}
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
            ) : (
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="max-w-2xl mx-auto space-y-6">
                        {/* DADOS DO PEDIDO */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><List size={14} /> Dados do Pedido</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Nº Pedido</span>
                                    <span className="text-lg font-black text-slate-900">#{order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}</span>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Tipo</span>
                                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md uppercase inline-block", order.orderType === 'PICKUP' ? "bg-purple-100 text-purple-700" : order.orderType === 'DELIVERY' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700")}>
                                        {order.orderType === 'PICKUP' ? 'Retirada' : order.orderType === 'DELIVERY' ? 'Delivery' : 'Mesa'}
                                    </span>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Criado em</span>
                                    <span className="text-xs font-bold text-slate-700">{formatSP(order.createdAt, 'dd/MM/yyyy HH:mm:ss')}</span>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Status</span>
                                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md uppercase inline-block", currentStatus.bg, currentStatus.color, currentStatus.border)}>{currentStatus.label}</span>
                                </div>
                                {order.pendingAt && (
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Pendente desde</span>
                                        <span className="text-xs font-bold text-amber-600">{formatSP(order.pendingAt, 'HH:mm:ss')}</span>
                                    </div>
                                )}
                                {order.preparingAt && (
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Preparo iniciou</span>
                                        <span className="text-xs font-bold text-blue-600">{formatSP(order.preparingAt, 'HH:mm:ss')}</span>
                                    </div>
                                )}
                                {order.readyAt && (
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Pronto em</span>
                                        <span className="text-xs font-bold text-emerald-600">{formatSP(order.readyAt, 'HH:mm:ss')}</span>
                                    </div>
                                )}
                                {order.completedAt && (
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Finalizado em</span>
                                        <span className="text-xs font-bold text-slate-600">{formatSP(order.completedAt, 'dd/MM HH:mm')}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AGENDAMENTO */}
                        {order.scheduledDateTime && (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
                                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><Calendar size={14} /> Pedido Agendado</h3>
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-100 p-3 rounded-xl">
                                        <Calendar size={24} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-blue-800 block">
                                            {formatSP(order.scheduledDateTime, 'dd/MM/yyyy')} às {formatSP(order.scheduledDateTime, 'HH:mm')}
                                        </span>
                                        <span className="text-[10px] font-bold text-blue-500 uppercase">Entrega agendada</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CLIENTE */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><User size={14} /> Cliente</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome</span>
                                    <span className="text-sm font-bold text-slate-900">{order.deliveryOrder?.name || order.customerName || 'Consumidor'}</span>
                                </div>
                                {order.customerDocument && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CPF/CNPJ</span>
                                        <span className="text-xs font-bold text-slate-600 font-mono">{order.customerDocument}</span>
                                    </div>
                                )}
                                {order.deliveryOrder?.phone && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Telefone</span>
                                        <span className="text-xs font-bold text-blue-600 flex items-center gap-1"><Phone size={12} /> {order.deliveryOrder.phone}</span>
                                    </div>
                                )}
                                {order.deliveryOrder?.address && (
                                    <div className="pt-2 border-t border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Endereço</span>
                                        <p className="text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-xl">
                                            {order.deliveryOrder.address}
                                            {order.deliveryOrder.complement && <><br/><span className="text-amber-600">Comp: {order.deliveryOrder.complement}</span></>}
                                            {order.deliveryOrder.reference && <><br/><span className="text-blue-600">Ref: {order.deliveryOrder.reference}</span></>}
                                        </p>
                                    </div>
                                )}
                                {order.deliveryOrder?.neighborhood && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bairro</span>
                                        <span className="text-xs font-bold text-slate-700">{order.deliveryOrder.neighborhood}</span>
                                    </div>
                                )}
                                {order.deliveryOrder?.city && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cidade</span>
                                        <span className="text-xs font-bold text-slate-700">{order.deliveryOrder.city}/{order.deliveryOrder.state}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* INTEGRAÇÃO */}
                        {(order.ifoodOrderId || order.displayId || order.customerDocument || order.benefits) && (
                            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 shadow-sm">
                                <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <img src="https://www.ifood.com.br/static/images/ifood-logo.svg" className="h-4" alt="iFood" /> Integração
                                </h3>
                                <div className="space-y-3">
                                    {order.ifoodOrderId && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">iFood ID</span>
                                            <span className="text-[10px] font-bold text-slate-600 font-mono">{order.ifoodOrderId}</span>
                                        </div>
                                    )}
                                    {order.displayId && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Código Coleta</span>
                                            <span className="text-sm font-bold text-orange-600 flex items-center gap-1"><Ticket size={14} /> {order.displayId}</span>
                                        </div>
                                    )}
                                    {order.customerDocument && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Documento</span>
                                            <span className="text-xs font-bold text-slate-600">{order.customerDocument}</span>
                                        </div>
                                    )}
                                    {order.benefits && order.benefits.length > 0 && (
                                        <div className="pt-2 border-t border-orange-200">
                                            <span className="text-[9px] font-black text-green-600 uppercase flex items-center gap-2 mb-2"><Tag size={12} /> Cupons</span>
                                            {order.benefits.map((benefit, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-white/60 p-2 rounded-xl mb-1">
                                                    <span className="text-xs font-bold text-slate-600">{benefit.name}</span>
                                                    <span className="text-xs font-bold text-green-600">- R$ {benefit.value.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* CANCELAMENTO SOLICITADO PELO CLIENTE */}
                        {order.cancellationRequested && (
                            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-sm">
                                <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><AlertTriangle size={14} /> Cancelamento Solicitado</h3>
                                <div className="space-y-3">
                                    <div className="bg-white/60 p-3 rounded-xl">
                                        <p className="text-[9px] font-black text-rose-500 uppercase mb-1">Motivo:</p>
                                        <p className="text-xs font-bold text-slate-700">{order.cancellationReason || 'Cliente solicitou cancelamento'}</p>
                                        {order.cancellationDeadline && (
                                            <p className="text-[10px] font-bold text-orange-600 mt-1">
                                                Prazo: {formatSP(order.cancellationDeadline, 'HH:mm:ss')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAcceptCancellation}
                                            disabled={isHandlingCancellation}
                                            className="flex-1 h-10 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase rounded-xl disabled:opacity-50 transition-colors"
                                        >
                                            {isHandlingCancellation ? <Loader2 size={14} className="animate-spin" /> : 'Aceitar'}
                                        </button>
                                        <button
                                            onClick={handleRefuseCancellation}
                                            disabled={isHandlingCancellation}
                                            className="flex-1 h-10 bg-white border-2 border-rose-300 text-rose-600 hover:bg-rose-50 text-[10px] font-black uppercase rounded-xl disabled:opacity-50 transition-colors"
                                        >
                                            Recusar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* DISPUTA IFOOD */}
                        {order.disputeId && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
                                <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><AlertTriangle size={14} /> Disputa Pós-Entrega</h3>
                                <div className="space-y-3">
                                    <div className="bg-white/60 p-3 rounded-xl">
                                        <p className="text-[9px] font-black text-amber-600 uppercase mb-1">Motivo:</p>
                                        <p className="text-xs font-bold text-slate-700">{order.disputeReason || 'Cliente abriu disputa'}</p>
                                        {order.disputeExpiresAt && (
                                            <p className="text-[10px] font-bold text-orange-600 mt-1">
                                                Responder até: {formatSP(order.disputeExpiresAt, 'HH:mm:ss')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAcceptDispute}
                                            disabled={isHandlingDispute}
                                            className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase rounded-xl disabled:opacity-50 transition-colors"
                                        >
                                            {isHandlingDispute ? <Loader2 size={14} className="animate-spin" /> : 'Aceitar'}
                                        </button>
                                        <button
                                            onClick={handleRejectDispute}
                                            disabled={isHandlingDispute}
                                            className="flex-1 h-10 bg-white border-2 border-amber-300 text-amber-600 hover:bg-amber-50 text-[10px] font-black uppercase rounded-xl disabled:opacity-50 transition-colors"
                                        >
                                            Recusar
                                        </button>
                                        <button
                                            onClick={() => setShowAlternativeModal(true)}
                                            disabled={isHandlingDispute}
                                            className="flex-1 h-10 bg-white border-2 border-blue-300 text-blue-600 hover:bg-blue-50 text-[10px] font-black uppercase rounded-xl disabled:opacity-50 transition-colors"
                                        >
                                            Alternativa
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* OBSERVAÇÕES */}
                        {(order.notes || order.deliveryOrder?.notes) && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
                                <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><Info size={14} /> Observações</h3>
                                <p className="text-xs font-bold text-amber-800">{order.notes || order.deliveryOrder?.notes}</p>
                            </div>
                        )}

                        {/* FINANCEIRO */}
                        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Wallet size={14} /> Financeiro</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                                    <span>Subtotal</span><span className="text-white">R$ {subtotal.toFixed(2)}</span>
                                </div>
                                {deliveryFee > 0 && (
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                                        <span>Taxa Entrega</span><span className="text-blue-400">+ R$ {deliveryFee.toFixed(2)}</span>
                                    </div>
                                )}
                                {(order.platformFee || 0) > 0 && (
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                                        <span>Taxa Plataforma</span><span className="text-amber-400">+ R$ {(order.platformFee || 0).toFixed(2)}</span>
                                    </div>
                                )}
                                {discount > 0 && (
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                                        <span>Desconto</span><span className="text-rose-400">- R$ {discount.toFixed(2)}</span>
                                    </div>
                                )}
                                {surcharge > 0 && (
                                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                                        <span>Acréscimo</span><span className="text-amber-400">+ R$ {surcharge.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                                    <span className="text-[9px] font-black text-blue-400 uppercase">Total</span>
                                    <span className="text-2xl font-black italic">R$ {totalGeral.toFixed(2).replace('.', ',')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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

      {/* Modal de Cancelamento iFood */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowCancelModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900 uppercase italic">Cancelar Pedido</h2>
              <button onClick={() => setShowCancelModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <XCircle size={20} className="text-slate-400" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-3">
                O pedido já foi aceito no iFood. Para cancelar, selecione o motivo:
              </p>
              
              {isLoadingReasons ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={24} className="animate-spin text-orange-500" />
                  <span className="ml-2 text-sm text-slate-500">Carregando motivos...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {cancellationReasons.map((reason, index) => {
                    const isSelected = selectedCancelReason === reason.cancelCodeId;
                    return (
                      <button
                        key={`${reason.cancelCodeId}-${index}`}
                        type="button"
                        onClick={() => {
                          console.log('[DEBUG] Cliquei no motivo:', reason.cancelCodeId, 'selecionado:', !isSelected);
                          setSelectedCancelReason(reason.cancelCodeId);
                        }}
                        className={`w-full flex items-center p-3 rounded-lg border cursor-pointer transition-all text-left ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-slate-300'
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{reason.description}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={isCancelling}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCancellation}
                disabled={!selectedCancelReason || isCancelling}
                className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCancelling && <Loader2 size={16} className="animate-spin" />}
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alternativa de Disputa */}
      {showAlternativeModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAlternativeModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900 uppercase italic">Oferecer Alternativa</h2>
              <button onClick={() => setShowAlternativeModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <XCircle size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tipo de Alternativa</label>
                <select
                  value={alternativeType}
                  onChange={e => setAlternativeType(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="">Selecione...</option>
                  <option value="REFUND_PARTIAL">Reembolso Parcial</option>
                  <option value="REFUND_TOTAL">Reembolso Total</option>
                  <option value="CREDIT">Crédito para Próximo Pedido</option>
                  <option value="REPLACEMENT">Substituição do Produto</option>
                </select>
              </div>
              {(alternativeType === 'REFUND_PARTIAL' || alternativeType === 'CREDIT') && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    value={alternativeValue}
                    onChange={e => setAlternativeValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setShowAlternativeModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  disabled={isHandlingDispute}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleOfferAlternative}
                  disabled={!alternativeType || isHandlingDispute}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isHandlingDispute && <Loader2 size={16} className="animate-spin" />}
                  Oferecer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer de Status */}
      {activeTab === 'details' && (
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          <div className="flex flex-wrap justify-center gap-2">
            {STATUS_OPTIONS.map((status) => {
              const isActive = order.status === status.value;
              const isPaid = order.status === 'COMPLETED' || (order.payments && order.payments.length > 0);
              const isDisabled = (status.value === 'COMPLETED' && !isPaid);
              const StatusIcon = status.icon;
              return (
                <button
                  key={status.value}
                  onClick={() => handleStatusChange(status.value)}
                  disabled={isActive || isDisabled}
                  className={cn(
                    "flex items-center gap-2 h-10 px-4 rounded-xl text-[10px] uppercase tracking-wider font-black transition-all border shadow-sm",
                    isActive
                      ? cn(status.bg, status.color, status.border, "scale-105 shadow-md")
                      : isDisabled
                        ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-900 hover:text-slate-900 active:scale-95"
                  )}
                >
                  <StatusIcon size={14} strokeWidth={isActive ? 3 : 2} className={isActive ? "animate-pulse" : ""} />
                  {status.label}
                </button>
              );
            })}
          </div>
          {order.status === 'COMPLETED' && (
            <div className="flex gap-2 mt-3 justify-center">
              <button
                onClick={handleEmitInvoice}
                disabled={isEmitting}
                className="flex items-center gap-2 h-10 px-6 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white rounded-xl transition-all font-black uppercase tracking-wider text-[10px]"
              >
                {isEmitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                {order.invoice ? 'Visualizar NF-e' : 'Emitir NF-e'}
              </button>
            </div>
          )}
          {order.status !== 'COMPLETED' && order.status !== 'CANCELED' && remainingToPay > 0 && (
            <div className="flex gap-2 mt-3 justify-center">
              <button
                onClick={handleNavigateToCheckout}
                className="flex items-center gap-2 h-12 px-8 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-100 active:scale-95"
              >
                Ir para Pagamento <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default OrderEditor;
