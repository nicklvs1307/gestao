import { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../../../services/api/client';
import {
  getCashierStatus,
  getCashierSummary,
  openCashier,
  addCashierTransaction,
  getCashierHistory,
  getPendingSettlements,
  updateOrderPaymentMethod,
} from '../../../services/api';
import { toast } from 'sonner';
import { printCashierClosure } from '../../../services/printer';
import { useAuth } from '../../../context/AuthContext';
import { Banknote, Smartphone, Wallet, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// --- Types ---

export interface PaymentMethod {
  id: string;
  label: string;
  type?: string;
  icon: LucideIcon;
  color: string;
}

export interface SessionData {
  openedAt: string;
  initialAmount: number;
  pendingDriverSettlementsCount: number;
  activeOrdersCount: number;
  openTablesCount: number;
  cashInHand: number;
  salesByMethod: Record<string, number>;
  adjustments: { sangria: number; reforco: number };
  user?: { name: string };
}

export interface CashierStatus {
  isOpen: boolean;
  session: SessionData | null;
}

export interface BreakdownTransaction {
  id: string;
  amount: number;
  orderId?: string;
  orderNumber?: number;
  orderTotal?: number;
  description: string;
  createdAt: string;
}

export interface BreakdownMethod {
  total: number;
  transactions: BreakdownTransaction[];
}

export interface SummaryData {
  sessionId: string;
  openedAt: string;
  initialAmount: number;
  totalSales: number;
  salesByMethod: Record<string, number>;
  breakdownByMethod: Record<string, BreakdownMethod>;
  adjustments: { sangria: number; reforco: number };
  transactions: any[];
  availableMethods: any[];
}

export type TransactionType = 'INCOME' | 'EXPENSE';
export type CashierStep = 'COUNT' | 'REVIEW';
export type TransactionModalState = 'none' | TransactionType;

// --- Default Methods ---

const DEFAULT_METHODS: PaymentMethod[] = [
  { id: 'cash', label: 'Dinheiro', icon: Banknote, color: 'emerald' },
  { id: 'pix', label: 'Pix', icon: Smartphone, color: 'blue' },
  { id: 'credit_card', label: 'Cartão Crédito', icon: Wallet, color: 'purple' },
  { id: 'debit_card', label: 'Cartão Débito', icon: Wallet, color: 'indigo' },
  { id: 'other', label: 'Outros', icon: Receipt, color: 'slate' },
];

// --- Utility ---

const normalize = (str: string): string => {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

// --- Hook ---

export function useCashier() {
  const { user: authUser } = useAuth();

  // Core data
  const [cashierData, setCashierData] = useState<CashierStatus | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [sessionOrders, setSessionOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View states
  const [selectedMethod, setSelectedMethod] = useState<string>('cash');
  const [step, setStep] = useState<CashierStep>('COUNT');

  // Form states
  const [initialAmount, setInitialAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [closingValues, setClosingValues] = useState<Record<string, string>>({
    cash: '',
    pix: '',
    credit_card: '',
    debit_card: '',
    other: '',
  });

  // ERP states
  const [cashLeftover, setCashLeftover] = useState<string>('0');

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Transaction modal
  const [transactionModalType, setTransactionModalType] = useState<TransactionModalState>('none');
  const [transAmount, setTransAmount] = useState('');
  const [transDesc, setTransDesc] = useState('');

  // Pending settlements
  const [pendingSettlementsList, setPendingSettlementsList] = useState<any[]>([]);
  const [showPendingSettlementsModal, setShowPendingSettlementsModal] = useState(false);

  // Order detail modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);

  // Confirmation & loading states
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // --- Derived data ---

  const isOpen = cashierData?.isOpen ?? false;
  const session = cashierData?.session ?? null;

  const hasBlocks = useMemo(
    () =>
      (session?.activeOrdersCount ?? 0) > 0 ||
      (session?.pendingDriverSettlementsCount ?? 0) > 0 ||
      (session?.openTablesCount ?? 0) > 0,
    [session]
  );

  const paymentMethods = useMemo<PaymentMethod[]>(() => {
    if (!summary?.availableMethods) return DEFAULT_METHODS;

    const dbMethods = summary.availableMethods.map((m: any) => {
      const lowName = m.name.toLowerCase();
      let icon: LucideIcon = Banknote;
      if (lowName.includes('pix')) icon = Smartphone;
      else if (lowName.includes('cartão') || lowName.includes('credit') || lowName.includes('debit')) icon = Wallet;

      return {
        id: lowName.includes('dinheiro') ? 'cash' : m.name.toLowerCase(),
        label: m.name,
        type: m.type,
        icon,
        color: 'slate',
      };
    });

    if (!dbMethods.find((m: any) => m.id === 'cash')) {
      dbMethods.unshift(DEFAULT_METHODS[0]);
    }

    return dbMethods;
  }, [summary]);

  const totalInformed = useMemo(
    () =>
      Object.values(closingValues).reduce(
        (acc, val) => acc + (parseFloat(val) || 0),
        0
      ) || 0,
    [closingValues]
  );

  const cashInHand = useMemo(() => parseFloat(closingValues['cash'] || '0'), [closingValues]);
  const floatNext = useMemo(() => parseFloat(cashLeftover || '0'), [cashLeftover]);
  const safeDeposit = useMemo(() => Math.max(0, cashInHand - floatNext), [cashInHand, floatNext]);

  // --- Filtered orders per selected method ---

  const filteredOrders = useMemo(() => {
    const currentDisplayMethod = paymentMethods.find(m => m.id === selectedMethod);
    const selId = normalize(selectedMethod);
    const selLabel = normalize(currentDisplayMethod?.label || '');
    const selType = normalize((currentDisplayMethod as any)?.type || '');

    return sessionOrders
      .filter(o => {
        const payments = o.payments || [];
        const hasThisMethod = payments.some(p => {
          const pMethod = normalize(p.method || '');
          return pMethod === selId || pMethod === selLabel || pMethod === selType;
        });
        
        if (!hasThisMethod) return false;
        
        if (!searchTerm) return true;
        
        const term = searchTerm.toLowerCase();
        return (
          o.id.toLowerCase().includes(term) ||
          (o.dailyOrderNumber?.toString().includes(term)) ||
          (o.deliveryOrder?.name?.toLowerCase().includes(term)) ||
          (o.customerName?.toLowerCase().includes(term)) ||
          (o.tableNumber?.toString().includes(term))
        );
      })
      .map(o => {
        const payments = o.payments || [];
        const selIdLower = selId.toLowerCase();
        const selLabelLower = selLabel.toLowerCase();
        const selTypeLower = selType.toLowerCase();
        
        const relevantPayments = payments.filter(p => {
          const pMethod = normalize(p.method || '');
          return pMethod === selIdLower || pMethod === selLabelLower || pMethod === selTypeLower;
        });
        
        const methodAmount = relevantPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const paidTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const isPartial = paidTotal < o.total;
        
        return { ...o, _methodAmount: methodAmount, _isPartial: isPartial };
      });
  }, [sessionOrders, selectedMethod, paymentMethods, searchTerm]);

  const totalByMethod = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o._methodAmount || 0), 0);
  }, [filteredOrders]);

  // --- Expected value for audit ---

  const getExpectedValue = useCallback(
    (methodId: string): number => {
      if (!summary) return 0;

      const m = paymentMethods.find(pm => pm.id === methodId);
      const normLabel = normalize(m?.label || '');
      const normId = normalize(methodId);
      const normType = normalize((m as any)?.type || '');

      if (methodId === 'cash') {
        const sales =
          summary.salesByMethod?.cash || summary.salesByMethod?.dinheiro || 0;
        const ref = summary.adjustments?.reforco || 0;
        const sang = summary.adjustments?.sangria || 0;
        const init = cashierData?.session?.initialAmount || 0;
        return init + sales + ref - sang;
      }

      return (
        summary?.salesByMethod?.[normLabel] ||
        summary?.salesByMethod?.[normId] ||
        (normType ? summary?.salesByMethod?.[normType] : 0) ||
        0
      );
    },
    [summary, paymentMethods, cashierData]
  );

  // --- Fetch all data ---

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusData, summaryData, , ordersData] = await Promise.all([
        getCashierStatus(),
        getCashierSummary().catch(() => null),
        getCashierHistory().catch(() => []),
        apiClient.get('/cashier/orders').then(r => r.data).catch(() => []),
      ]);
      setCashierData(statusData);
      setSummary(summaryData);
      setSessionOrders(ordersData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh session orders every 30s when cashier is open
  useEffect(() => {
    if (!isOpen) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const ordersData = await apiClient.get('/cashier/orders').then(r => r.data).catch(() => null);
        if (Array.isArray(ordersData)) {
          setSessionOrders(ordersData);
        }
      } catch {
        // Silently fail polling errors
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [isOpen]);

  // --- Handlers ---

  const handleOpen = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await openCashier(parseFloat(initialAmount));
        toast.success('Caixa aberto!');
        setInitialAmount('');
        fetchData();
      } catch {
        toast.error('Erro ao abrir.');
      }
    },
    [initialAmount, fetchData]
  );

  const executeClose = useCallback(async () => {
    console.log('[CASHIER] executeClose iniciado', { closingValues, totalInformed, summary });
    setIsClosing(true);
    try {
      const sanitizedDetails: Record<string, string> = {};
      Object.entries(closingValues).forEach(([method, val]) => {
        sanitizedDetails[method] = val || '0';
      });

      const payload = {
        finalAmount: totalInformed,
        notes,
        closingDetails: sanitizedDetails,
        cashLeftover: parseFloat(cashLeftover) || 0,
      };

      console.log('[CASHIER] Payload:', payload);

      try {
        const printerConfig = JSON.parse(localStorage.getItem('printer_config') || '{}');
        console.log('[CASHIER] Printer config:', printerConfig);
        await printCashierClosure(summary, undefined, printerConfig, sanitizedDetails, sessionOrders);
        console.log('[CASHIER] Impressao concluida');
      } catch (printError) {
        console.error('[PRINT_ERROR]:', printError);
      }

      console.log('[CASHIER] Enviando para API...');
      await apiClient.post('/cashier/close', payload);

      toast.success('Turno encerrado e auditado com sucesso!');
      setShowConfirmClose(false);
      setStep('COUNT');
      setNotes('');
      setClosingValues({ cash: '', pix: '', credit_card: '', debit_card: '', other: '' });
      fetchData();
    } catch (error: any) {
      console.error('[CASHIER_FRONTEND_ERROR]:', error);
      toast.error(error.response?.data?.message || 'Erro ao fechar caixa.');
    } finally {
      setIsClosing(false);
    }
  }, [closingValues, totalInformed, notes, cashLeftover, summary, fetchData]);

  const handleClose = useCallback(async () => {
    if ((session?.pendingDriverSettlementsCount ?? 0) > 0) {
      toast.error(`Existem ${session!.pendingDriverSettlementsCount} acertos de motoboy pendentes.`);
      return;
    }
    if ((session?.activeOrdersCount ?? 0) > 0) {
      toast.error(`Existem ${session!.activeOrdersCount} pedidos ativos.`);
      return;
    }
    if ((session?.openTablesCount ?? 0) > 0) {
      toast.error(`Existem ${session!.openTablesCount} mesas abertas.`);
      return;
    }
    setShowConfirmClose(true);
  }, [session]);

  const closeConfirmDialog = useCallback(() => setShowConfirmClose(false), []);

  const handleTransaction = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await addCashierTransaction({
          description: transDesc,
          amount: parseFloat(transAmount),
          type: transactionModalType as TransactionType,
        });
        toast.success(
          transactionModalType === 'INCOME'
            ? 'Reforço registrado!'
            : 'Sangria realizada!'
        );
        setTransactionModalType('none');
        setTransAmount('');
        setTransDesc('');
        fetchData();
      } catch {
        toast.error('Erro na movimentação.');
      }
    },
    [transDesc, transAmount, transactionModalType, fetchData]
  );

  const handleShowPendingSettlements = useCallback(async () => {
    try {
      const data = await getPendingSettlements();
      setPendingSettlementsList(data);
      setShowPendingSettlementsModal(true);
    } catch {
      toast.error('Erro ao carregar detalhes dos acertos.');
    }
  }, []);

  const handleUpdatePayment = useCallback(
    async (orderId: string, newMethod: string) => {
      try {
        await updateOrderPaymentMethod(orderId, newMethod);
        toast.success('Forma de pagamento atualizada!');
        fetchData();
      } catch {
        toast.error('Erro ao alterar pagamento.');
      }
    },
    [fetchData]
  );

  const openIncomeModal = useCallback(() => setTransactionModalType('INCOME'), []);
  const openExpenseModal = useCallback(() => setTransactionModalType('EXPENSE'), []);
  const closeTransactionModal = useCallback(() => setTransactionModalType('none'), []);
  const closeSettlementsModal = useCallback(() => setShowPendingSettlementsModal(false), []);

  const handleOrderClick = useCallback((order: any) => {
    setSelectedOrder(order);
    setShowOrderDetailModal(true);
  }, []);

  const closeOrderDetailModal = useCallback(() => {
    setShowOrderDetailModal(false);
    setSelectedOrder(null);
  }, []);

  return {
    // Auth
    authUser,

    // Data
    cashierData,
    summary,
    sessionOrders,
    loading,
    isOpen,
    session,
    hasBlocks,

    // Payment methods
    paymentMethods,
    selectedMethod,
    setSelectedMethod,

    // Step
    step,
    setStep,

    // Forms
    initialAmount,
    setInitialAmount,
    notes,
    setNotes,
    closingValues,
    setClosingValues,
    cashLeftover,
    setCashLeftover,

    // Search
    searchTerm,
    setSearchTerm,

    // ERP
    // Transaction modal
    transactionModalType,
    transAmount,
    setTransAmount,
    transDesc,
    setTransDesc,

    // Pending settlements
    pendingSettlementsList,
    showPendingSettlementsModal,

    // Order detail modal
    selectedOrder,
    showOrderDetailModal,

    // Computed
    totalInformed,
    cashInHand,
    floatNext,
    safeDeposit,
    filteredOrders,
    totalByMethod,

    // Actions
    fetchData,
    handleOpen,
    handleClose,
    handleTransaction,
    handleShowPendingSettlements,
    handleUpdatePayment,
    getExpectedValue,
    openIncomeModal,
    openExpenseModal,
    closeTransactionModal,
    closeSettlementsModal,
    closeOrderDetailModal,
    executeClose,
    closeConfirmDialog,
    handleOrderClick,
  };
}
