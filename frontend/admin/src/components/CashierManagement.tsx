import React, { useState, useEffect } from 'react';
import apiClient from '../services/api/client';
import { 
    getCashierStatus, 
    getCashierSummary, 
    openCashier, 
    closeCashier, 
    addCashierTransaction,
    getCashierHistory,
    updateOrderPaymentMethod,
    getPendingSettlements
} from '../services/api';
import { 
    Wallet, Lock, Unlock, DollarSign, History, 
    ArrowUpCircle, ArrowDownCircle, AlertCircle, CheckCircle, HelpCircle,
    Calendar, Clock, User, Receipt, Plus, Minus, X, Info, Edit2, ChevronDown, Check, RefreshCw, Loader2, ArrowUpRight, ArrowRight, Smartphone, Banknote, Search, ChevronRight, Filter,
    FileText, ShoppingBag, Truck, Calculator, Printer, ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { formatSP } from '@/lib/timezone';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useAuth } from '../context/AuthContext';
import { printCashierClosure } from '../services/printer';

const CashierManagement: React.FC = () => {
    const { user: authUser } = useAuth();
    const [cashierData, setCashierData] = useState<any>(null);
    const [summary, setSummary] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [sessionOrders, setSessionOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // View States
    const [selectedMethod, setSelectedMethod] = useState<string>('cash');
    const [isClosingProcess, setIsClosingProcess] = useState(false);
    const [step, setStep] = useState<'COUNT' | 'REVIEW'>('COUNT'); // Passos do fechamento

    // Form States
    const [initialAmount, setInitialAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [closingValues, setClosingValues] = useState<Record<string, string>>({
        cash: '', pix: '', credit_card: '', debit_card: '', other: ''
    });
    
    // ERP Features
    const [cashLeftover, setCashLeftover] = useState<string>('0'); // Fundo de troco para amanhã

    const [showTransactionModal, setShowTransactionModal] = useState<'none' | 'INCOME' | 'EXPENSE'>('none');
    const [transAmount, setTransAmount] = useState('');
    const [transDesc, setTransDesc] = useState('');

    const [pendingSettlementsList, setPendingSettlementsList] = useState<any[]>([]);
    const [showPendingSettlementsModal, setShowPendingSettlementsModal] = useState(false);

    const defaultMethods = [
        { id: 'cash', label: 'Dinheiro', icon: Banknote, color: 'emerald' },
        { id: 'pix', label: 'Pix', icon: Smartphone, color: 'blue' },
        { id: 'credit_card', label: 'Cartão Crédito', icon: Wallet, color: 'purple' },
        { id: 'debit_card', label: 'Cartão Débito', icon: Wallet, color: 'indigo' },
        { id: 'other', label: 'Outros', icon: Receipt, color: 'slate' }
    ];

    const getDisplayMethods = () => {
        if (!summary?.availableMethods) return defaultMethods;
        
        const dbMethods = summary.availableMethods.map((m: any) => {
            const lowName = m.name.toLowerCase();
            let icon = Banknote;
            if (lowName.includes('pix')) icon = Smartphone;
            else if (lowName.includes('cartão') || lowName.includes('credit') || lowName.includes('debit')) icon = Wallet;

            return {
                id: lowName.includes('dinheiro') ? 'cash' : m.name.toLowerCase(),
                label: m.name,
                type: m.type,
                icon,
                color: 'slate'
            };
        });

        if (!dbMethods.find((m: any) => m.id === 'cash')) {
            dbMethods.unshift(defaultMethods[0]);
        }

        return dbMethods;
    };

    const paymentMethods = getDisplayMethods();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statusData, summaryData, historyData, ordersData] = await Promise.all([
                getCashierStatus(),
                getCashierSummary().catch(() => null),
                getCashierHistory().catch(() => []),
                apiClient.get('/cashier/orders').then(r => r.data).catch(() => [])
            ]);
            setCashierData(statusData);
            setSummary(summaryData);
            setHistory(historyData);
            setSessionOrders(ordersData);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const normalize = (str: string) => {
        if (!str) return '';
        return str.toString().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .trim();
    };

    useEffect(() => { fetchData(); }, []);

    const handleOpen = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await openCashier(parseFloat(initialAmount));
            toast.success('Caixa aberto!');
            setInitialAmount(''); fetchData();
        } catch (error) { toast.error('Erro ao abrir.'); }
    };

    const handleMoneyCountConfirm = (total: number, details: Record<string, number>) => {
        setClosingValues(prev => ({ ...prev, cash: total.toFixed(2) }));
        setMoneyCountDetails(details);
    };

    const getExpectedValue = (methodId: string) => {
        if (!summary) return 0;
        
        // Lógica de cálculo esperado (ESCONDIDA NA INTERFACE, MAS USADA PARA AUDITORIA NO FRONT)
        const m = paymentMethods.find(pm => pm.id === methodId);
        const normLabel = normalize(m?.label || '');
        const normId = normalize(methodId);
        const normType = normalize((m as any)?.type || '');

        if (methodId === 'cash') {
            const sales = summary.salesByMethod?.cash || summary.salesByMethod?.dinheiro || 0;
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
    };

    const handleClose = async () => {
        // Validação estrita antes de fechar
        if (session?.pendingDriverSettlementsCount > 0) {
            toast.error(`Existem ${session.pendingDriverSettlementsCount} acertos de motoboy pendentes.`);
            return;
        }

        if (session?.activeOrdersCount > 0) {
            toast.error(`Existem ${session.activeOrdersCount} pedidos ativos.`);
            return;
        }

        if (session?.openTablesCount > 0) {
            toast.error(`Existem ${session.openTablesCount} mesas abertas.`);
            return;
        }
        
        try {
            // Garante que o objeto closingDetails tenha valores padrão de "0" para campos vazios
            const sanitizedDetails: Record<string, string> = {};
            Object.entries(closingValues).forEach(([method, val]) => {
                sanitizedDetails[method] = val || "0";
            });

            const totalInformed = Object.values(sanitizedDetails).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
            
            // Payload ERP completo
            const payload = {
                finalAmount: totalInformed,
                notes,
                closingDetails: sanitizedDetails,
                cashLeftover: parseFloat(cashLeftover) || 0
            };

            // Imprime o relatório de fechamento antes de enviar ao servidor
            try {
                const printerConfig = JSON.parse(localStorage.getItem('printer_config') || '{}');
                await printCashierClosure(summary, undefined, printerConfig, sanitizedDetails, sessionOrders);
            } catch (printError) {
                console.error('[PRINT_ERROR]: Falha ao imprimir fechamento:', printError);
            }

            await apiClient.post('/cashier/close', payload); // Usando endpoint direto para custom payload
            
            toast.success('Turno encerrado e auditado com sucesso!');
            setIsClosingProcess(false);
            setStep('COUNT');
            setNotes('');
            setClosingValues({ cash: '', pix: '', credit_card: '', debit_card: '', other: '' });
            fetchData();
        } catch (error: any) { 
            console.error('[CASHIER_FRONTEND_ERROR]:', error);
            toast.error(error.response?.data?.message || "Erro ao fechar caixa.");
        }
    };

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addCashierTransaction({ description: transDesc, amount: parseFloat(transAmount), type: showTransactionModal as any });
            toast.success(showTransactionModal === 'INCOME' ? 'Reforço registrado!' : 'Sangria realizada!');
            setShowTransactionModal('none'); setTransAmount(''); setTransDesc(''); fetchData();
        } catch (error) { toast.error('Erro na movimentação.'); }
    };

    const handleShowPendingSettlements = async () => {
        try {
            const data = await getPendingSettlements();
            setPendingSettlementsList(data);
            setShowPendingSettlementsModal(true);
        } catch (error) {
            toast.error("Erro ao carregar detalhes dos acertos.");
        }
    };
    
    // Cálculos para o Review Step
    const cashInHand = parseFloat(closingValues['cash'] || '0');
    const floatNext = parseFloat(cashLeftover || '0');
    const safeDeposit = Math.max(0, cashInHand - floatNext);

    if (loading && !cashierData) return (
        <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Sincronizando...</span>
        </div>
    );

    const isOpen = cashierData?.isOpen;
    const session = cashierData?.session;

    const hasBlocks = (session?.activeOrdersCount > 0) || (session?.pendingDriverSettlementsCount > 0) || (session?.openTablesCount > 0);

    return (
        <div className="space-y-4 animate-in fade-in duration-300 pb-10">
            {/* Header Profissional e Denso */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-[40]">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-900 text-white rounded-lg"><Wallet size={18} /></div>
                    <div className="flex flex-col">
                        <h2 className="text-base font-bold text-slate-900 leading-none tracking-tight">Gestão de Caixa</h2>
                        {isOpen && (
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                    <Clock size={12} className="text-slate-300"/> Aberto às {session?.openedAt ? formatSP(session.openedAt, 'HH:mm') : '--:--'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                    <User size={12} className="text-slate-300"/> {authUser?.name || 'Operador'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {isOpen && (
                        <div className="flex gap-2 mr-2">
                            <Button variant="outline" size="sm" onClick={() => setShowTransactionModal('INCOME')} className="h-8 text-[10px] font-bold border-emerald-100 text-emerald-600 hover:bg-emerald-50 bg-emerald-50/30">
                                <Plus size={14} className="mr-1"/> REFORÇO
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowTransactionModal('EXPENSE')} className="h-8 text-[10px] font-bold border-rose-100 text-rose-600 hover:bg-rose-50 bg-rose-50/30">
                                <Minus size={14} className="mr-1"/> SANGRIA
                            </Button>
                        </div>
                    )}
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border font-black uppercase text-[10px] tracking-widest",
                        isOpen ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
                    )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                        {isOpen ? 'CAIXA OPERACIONAL' : 'CAIXA FECHADO'}
                    </div>
                    <button onClick={fetchData} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors ml-2"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/></button>
                </div>
            </div>

            {isOpen && hasBlocks && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {session.activeOrdersCount > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg animate-in slide-in-from-top-2">
                            <AlertCircle size={18} className="text-amber-600 shrink-0"/>
                            <div>
                                <p className="text-[11px] font-bold text-amber-900 uppercase tracking-tight leading-none mb-1">Pedidos Ativos</p>
                                <p className="text-[10px] text-amber-600 font-bold uppercase">{session.activeOrdersCount} pendentes. Finalize-os para fechar.</p>
                            </div>
                        </div>
                    )}
                    {session.openTablesCount > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg animate-in slide-in-from-top-2">
                            <HelpCircle size={18} className="text-indigo-600 shrink-0"/>
                            <div>
                                <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-tight leading-none mb-1">Mesas Abertas</p>
                                <p className="text-[10px] text-indigo-600 font-bold uppercase">{session.openTablesCount} mesas ocupadas.</p>
                            </div>
                        </div>
                    )}
                    {session.pendingDriverSettlementsCount > 0 && (
                        <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-lg animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-3">
                                <Truck size={18} className="text-rose-600 shrink-0"/>
                                <div>
                                    <p className="text-[11px] font-bold text-rose-900 uppercase tracking-tight leading-none mb-1">Acertos Pendentes</p>
                                    <p className="text-[10px] text-rose-600 font-bold uppercase">{session.pendingDriverSettlementsCount} motoboy(s) aguardando acerto.</p>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleShowPendingSettlements}
                                className="h-8 text-[10px] font-bold text-rose-600 hover:bg-rose-100 uppercase"
                            >
                                Exibir Detalhes
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {!isOpen ? (
                /* TELA DE ABERTURA - MAIS PROFISSIONAL */
                <div className="max-w-md mx-auto py-12">
                    <Card className="p-8 border-slate-200 shadow-xl bg-white relative">
                        <div className="text-center space-y-3 mb-8">
                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner"><Unlock size={28} /></div>
                            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Iniciar Turno</h3>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Informe o fundo inicial para troco</p>
                        </div>
                        <form onSubmit={handleOpen} className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Fundo de Reserva (R$)</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</div>
                                    <input type="number" step="0.01" value={initialAmount} onChange={e => setInitialAmount(e.target.value)} required placeholder="0,00" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-lg pl-12 pr-4 text-xl font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-sm" />
                                </div>
                            </div>
                            <Button fullWidth size="lg" className="h-12 rounded-lg font-bold uppercase tracking-widest text-xs bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200">ABRIR CAIXA AGORA</Button>
                        </form>
                    </Card>
                </div>
            ) : step === 'COUNT' ? (
                /* PAINEL OPERACIONAL - CONFERÊNCIA CEGA */
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                    
                    {/* COLUNA ESQUERDA: CONFERÊNCIA (BLIND) */}
                    <div className="xl:col-span-4 space-y-4">
                        <Card className="p-0 border-slate-200 shadow-md overflow-hidden bg-white" noPadding>
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Conferência de Valores</h3>
                                <div className="flex gap-1">
                                    <div className="flex items-center gap-1 bg-slate-900 text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">
                                        <ShieldCheck size={10}/> MODO AUDITORIA
                                    </div>
                                </div>
                            </div>
                            
                            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                                {paymentMethods.map(m => {
                                    const isSelected = selectedMethod === m.id;
                                    const informedValue = closingValues[m.id] || '';

                                    return (
                                        <div 
                                            key={m.id} 
                                            onClick={() => setSelectedMethod(m.id)}
                                            className={cn(
                                                "p-3 transition-all cursor-pointer group hover:bg-slate-50 relative border-l-4",
                                                isSelected ? "bg-slate-50 border-slate-900" : "border-transparent"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("p-1.5 rounded-lg transition-all", isSelected ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 text-slate-400 group-hover:bg-white border border-slate-200")}>
                                                        <m.icon size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-800 uppercase tracking-tight leading-none">{m.label}</p>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Informe o total</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 items-center">
                                                <div className="flex-1 relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300">R$</span>
                                                    <input 
                                                        type="number"
                                                        value={closingValues[m.id]}
                                                        onChange={(e) => setClosingValues(prev => ({ ...prev, [m.id]: e.target.value }))}
                                                        className={cn(
                                                            "w-full h-8 bg-white border border-slate-200 rounded-md pl-7 pr-2 text-xs font-bold focus:border-slate-900 outline-none shadow-sm transition-all"
                                                        )}
                                                        placeholder="0,00"
                                                    />
                                                </div>
                                                
                                                <div className={cn("w-6 h-6 rounded-md flex items-center justify-center transition-all", isSelected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-300")}>
                                                    <ChevronRight size={12} />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="p-4 bg-slate-900 space-y-3 shrink-0">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Informado</span>
                                    <span className="text-lg font-black text-white tracking-tighter">R$ {(Object.values(closingValues).reduce((a, b) => a + (parseFloat(b) || 0), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                
                                <Button 
                                    fullWidth 
                                    onClick={() => setStep('REVIEW')} 
                                    disabled={hasBlocks}
                                    className={cn(
                                        "h-10 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg",
                                        hasBlocks ? "bg-slate-700 cursor-not-allowed opacity-50" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20"
                                    )}
                                >
                                    AUDITAR E FINALIZAR <ArrowRight size={14} className="ml-2"/>
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* COLUNA DIREITA (8): DETALHE DE VENDAS E HISTÓRICO */}
                    <div className="xl:col-span-8 space-y-4">
                        <Card className="p-0 border-slate-200 shadow-md overflow-hidden bg-white h-full flex flex-col" noPadding>
                            <div className="px-5 py-3 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-50 text-slate-600 rounded border border-slate-200 flex items-center justify-center">
                                        {React.createElement(paymentMethods.find(m => m.id === selectedMethod)?.icon || HelpCircle, { size: 16 })}
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Detalhamento: {paymentMethods.find(m => m.id === selectedMethod)?.label}</h3>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Movimentações da sessão</p>
                                    </div>
                                </div>
                                <div className="relative w-full md:w-56">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                    <input type="text" placeholder="Filtrar lançamento..." className="h-8 w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-4 text-[10px] font-bold uppercase outline-none focus:border-slate-900 transition-all" />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto max-h-[500px] p-4 space-y-1.5 bg-slate-50/30">
                                {sessionOrders.filter(o => {
                                    const method = normalize(o.payments?.[0]?.method || o.deliveryOrder?.paymentMethod || 'other');
                                    const currentDisplayMethod = paymentMethods.find(m => m.id === selectedMethod);
                                    const selId = normalize(selectedMethod);
                                    const selLabel = normalize(currentDisplayMethod?.label || '');
                                    const selType = normalize((currentDisplayMethod as any)?.type || '');
                                    return method === selId || method === selLabel || method === selType;
                                }).length > 0 ? (
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {sessionOrders
                                            .filter(o => {
                                                const method = normalize(o.payments?.[0]?.method || o.deliveryOrder?.paymentMethod || 'other');
                                                const currentDisplayMethod = paymentMethods.find(m => m.id === selectedMethod);
                                                const selId = normalize(selectedMethod);
                                                const selLabel = normalize(currentDisplayMethod?.label || '');
                                                const selType = normalize((currentDisplayMethod as any)?.type || '');
                                                return method === selId || method === selLabel || method === selType;
                                            })
                                            .map((order: any) => (
                                                <div key={order.id} className="bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3 hover:border-slate-300 transition-all group">
                                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                                        <div className="h-8 w-8 bg-slate-50 rounded flex items-center justify-center shrink-0 border border-slate-100 text-[10px] font-black text-slate-400 uppercase group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                            #{order.dailyOrderNumber || order.id.slice(-3)}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-[10px] font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                                                                {order.orderType === 'DELIVERY' ? <Truck size={10} className="text-blue-500"/> : <ShoppingBag size={10} className="text-indigo-500"/>}
                                                                {order.tableNumber ? `MESA ${order.tableNumber}` : order.deliveryOrder?.name || 'BALCÃO'}
                                                            </h4>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatSP(order.createdAt, 'HH:mm')} • {order.user?.name?.split(' ')[0] || 'ADMIN'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                        <div className="text-right">
                                                            <p className="text-xs font-black text-slate-900 leading-none">R$ {order.total.toFixed(2)}</p>
                                                        </div>
                                                        
                                                        <div className="w-[120px]">
                                                            <select 
                                                                className="w-full h-7 bg-slate-50 border border-slate-200 rounded px-2 text-[9px] font-bold uppercase outline-none focus:border-slate-900"
                                                                value={selectedMethod}
                                                                onChange={(e) => handleUpdatePayment(order.id, e.target.value)}
                                                            >
                                                                {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 opacity-20">
                                        <Filter size={32} strokeWidth={1.5} className="mb-2 text-slate-400" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center px-10 leading-tight">Nenhuma transação registrada nesta modalidade</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            ) : (
                /* REVIEW STEP - AUDITORIA E COFRE */
                <div className="max-w-3xl mx-auto space-y-4">
                    <Card className="p-0 border-slate-200 shadow-xl bg-white overflow-hidden">
                        <header className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={18} className="text-emerald-400" />
                                <h3 className="text-sm font-bold uppercase tracking-widest">Relatório de Auditoria</h3>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setStep('COUNT')} className="text-white hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest h-7">Voltar</Button>
                        </header>
                        
                        <div className="p-5 space-y-6">
                            {/* 1. Diferenças */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-1">
                                    <Receipt size={14} /> Balanço por Modalidade
                                </h4>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {paymentMethods.map(m => {
                                        const informed = parseFloat(closingValues[m.id] || '0');
                                        const expected = getExpectedValue(m.id);
                                        const diff = informed - expected;
                                        
                                        if (Math.abs(diff) < 0.01 && informed === 0) return null; // Skip empty

                                        return (
                                            <div key={m.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-white border border-slate-200 rounded text-slate-400"><m.icon size={14}/></div>
                                                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{m.label}</span>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <span className="block text-[8px] text-slate-400 uppercase font-black">Informado</span>
                                                        <span className="text-[11px] font-black text-slate-900">R$ {informed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="text-right hidden sm:block">
                                                        <span className="block text-[8px] text-slate-400 uppercase font-black">Sistema</span>
                                                        <span className="text-[11px] font-bold text-slate-500">R$ {expected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className={cn("px-2 py-1 rounded text-[10px] font-black w-20 text-center shadow-sm", diff < -0.01 ? "bg-rose-500 text-white" : diff > 0.01 ? "bg-blue-500 text-white" : "bg-emerald-500 text-white")}>
                                                        {Math.abs(diff) < 0.01 ? "OK" : `${diff > 0 ? '+' : ''}${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. Destino do Dinheiro */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-5"><DollarSign size={80} /></div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                                        <Wallet size={14} /> Numerário em Espécie
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dinheiro Total em Mãos</label>
                                            <div className="text-xl font-black text-slate-900 mt-0.5 tracking-tighter">R$ {cashInHand.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                        </div>
                                        <div className="relative">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Fundo de Troco (Próx. Turno)</label>
                                            <div className="relative mt-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xs">R$</span>
                                                <input 
                                                    type="number" 
                                                    className="w-full h-10 pl-8 pr-3 bg-white border border-slate-200 rounded-lg font-black text-slate-900 focus:border-slate-900 outline-none shadow-sm transition-all"
                                                    value={cashLeftover}
                                                    onChange={e => setCashLeftover(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-end bg-emerald-600 p-4 rounded-lg text-white shadow-xl shadow-emerald-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Depósito em Cofre</span>
                                        <ArrowUpRight size={20} className="opacity-80" />
                                    </div>
                                    <div className="text-3xl font-black tracking-tighter">R$ {safeDeposit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    <p className="text-[9px] font-bold uppercase opacity-80 mt-2 tracking-widest">Lançamento automático de saída para cofre da loja.</p>
                                </div>
                            </div>

                            {/* 3. Observações */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Notas de Auditoria</label>
                                <textarea 
                                    className="w-full h-20 bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] font-bold focus:border-slate-900 outline-none resize-none transition-all placeholder:text-slate-300"
                                    placeholder="Justificativa para quebras de caixa ou observações operacionais..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>

                            <Button fullWidth size="lg" onClick={handleClose} className="h-14 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-slate-200 border-b-4 border-slate-700 active:border-b-0 active:mt-1 transition-all">
                                <CheckCircle size={18} className="mr-2 text-emerald-400"/> FINALIZAR TURNO E IMPRIMIR RELATÓRIO
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* MODAL SANGREIA / REFORÇO */}
            {showTransactionModal !== 'none' && (
                <div className="ui-modal-overlay">
                    <div className="ui-modal-content w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200">
                            <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-lg text-white", showTransactionModal === 'INCOME' ? "bg-emerald-500" : "bg-rose-500")}>
                                        {showTransactionModal === 'INCOME' ? <Plus size={20} /> : <Minus size={20} />}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                        {showTransactionModal === 'INCOME' ? 'Reforço de Caixa' : 'Sangria de Caixa'}
                                    </h3>
                                </div>
                                <button onClick={() => setShowTransactionModal('none')} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"><X size={20}/></button>
                            </header>
                            <form onSubmit={handleTransaction} className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Valor da Operação (R$)</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">R$</div>
                                        <input type="number" step="0.01" required autoFocus value={transAmount} onChange={e => setTransAmount(e.target.value)} placeholder="0,00" className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg pl-12 pr-4 text-xl font-bold focus:border-blue-500 outline-none transition-all" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Observação / Motivo</label>
                                    <input type="text" required value={transDesc} onChange={e => setTransDesc(e.target.value)} placeholder="Ex: Adição de troco..." className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-4 text-sm font-semibold focus:border-blue-500 outline-none transition-all" />
                                </div>
                                <div className="pt-2">
                                    <Button fullWidth className={cn("h-11 rounded-lg font-bold uppercase tracking-wider text-xs shadow-lg", showTransactionModal === 'INCOME' ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500")}>
                                        CONFIRMAR MOVIMENTAÇÃO
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            {/* Modal de Pedidos Pendentes de Acerto */}
            {showPendingSettlementsModal && (
                <div className="ui-modal-overlay">
                    <div className="ui-modal-content w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                            <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg">
                                        <Truck size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter italic">Acertos Pendentes</h3>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Pedidos entregues sem fechamento financeiro</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowPendingSettlementsModal(false)} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-white transition-all"><X size={22}/></button>
                            </header>
                            
                            <div className="p-6 max-h-[60vh] overflow-y-auto bg-slate-50/30 space-y-3">
                                {pendingSettlementsList.length > 0 ? pendingSettlementsList.map((item) => (
                                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs border border-slate-100">
                                                #{item.order.dailyOrderNumber || item.order.id.slice(-3)}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-slate-900 uppercase italic leading-none">{item.driver?.name || 'ENTREGADOR NÃO ATRIBUÍDO'}</h4>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{formatSP(item.order.createdAt, 'HH:mm')} • {formatSP(item.order.createdAt, 'dd/MM')}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-900 italic leading-none">R$ {item.order.total.toFixed(2)}</p>
                                            <span className="text-[8px] font-bold text-rose-500 uppercase tracking-widest mt-1 inline-block bg-rose-50 px-1.5 py-0.5 rounded">Aguardando Acerto</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-12 text-center opacity-20">
                                        <CheckCircle size={48} className="mx-auto mb-3" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Tudo em dia!</p>
                                    </div>
                                )}
                            </div>

                            <footer className="p-6 bg-white border-t border-slate-100 flex flex-col gap-4">
                                <div className="p-4 bg-slate-900 rounded-2xl text-white flex justify-between items-center shadow-xl">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Pendente</span>
                                    <span className="text-xl font-black italic">R$ {pendingSettlementsList.reduce((acc, i) => acc + i.order.total, 0).toFixed(2)}</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase text-center tracking-widest leading-relaxed italic">
                                    Para fechar o caixa, você deve realizar o acerto financeiro <br/> desses pedidos no menu <span className="text-rose-500">"Gestão de Acertos"</span>.
                                </p>
                                <Button fullWidth onClick={() => setShowPendingSettlementsModal(false)} className="h-12 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest">
                                    ENTENDI, VOU VERIFICAR
                                </Button>
                            </footer>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default CashierManagement;