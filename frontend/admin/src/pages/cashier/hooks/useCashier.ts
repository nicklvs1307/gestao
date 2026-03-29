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
import { printCashierClosure } from '../../../services/printing';
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

export interface SummaryData {
  sessionId: string;
  openedAt: string;
  initialAmount: number;
  totalSales: number;
  salesByMethod: Record<string, number>;
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
  const [showMoneyCounter, setShowMoneyCounter] = useState(false);
  const [moneyCountDetails, setMoneyCountDetails] = useState<Record<string, number>>({});
  const [cashLeftover, setCashLeftover] = useState<string>('0');

  // Transaction modal
  const [transactionModalType, setTransactionModalType] = useState<TransactionModalState>('none');
  const [transAmount, setTransAmount] = useState('');
  const [transDesc, setTransDesc] = useState('');

  // Pending settlements
  const [pendingSettlementsList, setPendingSettlementsList] = useState<any[]>([]);
  const [showPendingSettlementsModal, setShowPendingSettlementsModal] = useState(false);

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

  const cashInHand = parseFloat(closingValues['cash'] || '0');
  const floatNext = parseFloat(cashLeftover || '0');
  const safeDeposit = Math.max(0, cashInHand - floatNext);

  // --- Filtered orders per selected method ---

  const filteredOrders = useMemo(() => {
    const currentDisplayMethod = paymentMethods.find(m => m.id === selectedMethod);
    const selId = normalize(selectedMethod);
    const selLabel = normalize(currentDisplayMethod?.label || '');
    const selType = normalize((currentDisplayMethod as any)?.type || '');

    return sessionOrders.filter(o => {
      const method = normalize(
        o.payments?.[0]?.method || o.deliveryOrder?.paymentMethod || 'other'
      );
      return method === selId || method === selLabel || method === selType;
    });
  }, [sessionOrders, selectedMethod, paymentMethods]);

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

  const handleMoneyCountConfirm = useCallback(
    (total: number, details: Record<string, number>) => {
      setClosingValues(prev => ({ ...prev, cash: total.toFixed(2) }));
      setMoneyCountDetails(details);
    },
    []
  );

  const executeClose = useCallback(async () => {
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
        moneyCountJson: moneyCountDetails,
      };

      try {
        await printCashierClosure(summary);
      } catch (printError) {
        console.error('[PRINT_ERROR]:', printError);
      }

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
  }, [closingValues, totalInformed, notes, cashLeftover, moneyCountDetails, summary, fetchData]);

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

    // ERP
    showMoneyCounter,
    setShowMoneyCounter,
    moneyCountDetails,

    // Transaction modal
    transactionModalType,
    transAmount,
    setTransAmount,
    transDesc,
    setTransDesc,

    // Pending settlements
    pendingSettlementsList,
    showPendingSettlementsModal,

    // Confirm close
    showConfirmClose,
    isClosing,

    // Computed
    totalInformed,
    cashInHand,
    floatNext,
    safeDeposit,
    filteredOrders,

    // Actions
    fetchData,
    handleOpen,
    handleMoneyCountConfirm,
    handleClose,
    handleTransaction,
    handleShowPendingSettlements,
    handleUpdatePayment,
    getExpectedValue,
    openIncomeModal,
    openExpenseModal,
    closeTransactionModal,
    closeSettlementsModal,
    executeClose,
    closeConfirmDialog,
  };
}
