import React, { useState, useEffect } from 'react';
import apiClient from '../services/api/client';
import { 
    getCashierStatus, 
    getCashierSummary, 
    openCashier, 
    closeCashier, 
    addCashierTransaction,
    getCashierHistory,
    updateOrderPaymentMethod 
} from '../services/api';
import { 
    Wallet, Lock, Unlock, DollarSign, History, 
    ArrowUpCircle, ArrowDownCircle, AlertCircle, CheckCircle, HelpCircle,
    Calendar, Clock, User, Receipt, Plus, Minus, X, Info, Edit2, ChevronDown, Check, RefreshCw, Loader2, ArrowUpRight, Smartphone, Banknote, Search, ChevronRight, Filter,
    FileText, ShoppingBag, Truck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

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

    // Form States
    const [initialAmount, setInitialAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [closingValues, setClosingValues] = useState<Record<string, string>>({
        cash: '', pix: '', credit_card: '', debit_card: '', other: ''
    });

    const [showTransactionModal, setShowTransactionModal] = useState<'none' | 'INCOME' | 'EXPENSE'>('none');
    const [transAmount, setTransAmount] = useState('');
    const [transDesc, setTransDesc] = useState('');

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

    const handleClose = async () => {
        // Validação estrita antes de fechar
        if (session?.pendingDriverSettlementsCount > 0) {
            toast.error(`Existem ${session.pendingDriverSettlementsCount} acertos de motoboy pendentes.`);
            return;
        }

        if(!confirm('Deseja encerrar o turno com os valores informados?')) return;
        
        try {
            // Garante que o objeto closingDetails tenha valores padrão de "0" para campos vazios
            const sanitizedDetails: Record<string, string> = {};
            Object.entries(closingValues).forEach(([method, val]) => {
                sanitizedDetails[method] = val || "0";
            });

            const totalInformed = Object.values(sanitizedDetails).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
            
            await closeCashier(totalInformed, notes, sanitizedDetails);
            toast.success('Caixa fechado com sucesso!');
            setIsClosingProcess(false);
            setNotes('');
            setClosingValues({ cash: '', pix: '', credit_card: '', debit_card: '', other: '' });
            fetchData();
        } catch (error: any) { 
            const msg = error.response?.data?.message || 'Erro ao fechar o caixa.';
            toast.error(msg);
            console.error('[CASHIER_FRONTEND_ERROR]:', error);
        }
    };

    const handleUpdatePayment = async (orderId: string, newMethod: string) => {
        try {
            await updateOrderPaymentMethod(orderId, newMethod);
            toast.success('Pagamento corrigido!');
            fetchData();
        } catch (error) { toast.error('Erro ao atualizar.'); }
    };

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addCashierTransaction({ description: transDesc, amount: parseFloat(transAmount), type: showTransactionModal as any });
            toast.success(showTransactionModal === 'INCOME' ? 'Reforço registrado!' : 'Sangria realizada!');
            setShowTransactionModal('none'); setTransAmount(''); setTransDesc(''); fetchData();
        } catch (error) { toast.error('Erro na movimentação.'); }
    };

    if (loading && !cashierData) return (
        <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Sincronizando...</span>
        </div>
    );

    const isOpen = cashierData?.isOpen;
    const session = cashierData?.session;

    const getExpectedCash = () => {
        if (!summary || !session) return 0;
        const salesByMethod = summary.salesByMethod || {};
        const cashSales = salesByMethod['cash'] || salesByMethod['dinheiro'] || 0;
        const reinforcements = summary.adjustments?.reforco || 0;
        const withdraws = summary.adjustments?.sangria || 0;
        const initial = session.initialAmount || 0;
        return initial + cashSales + reinforcements - withdraws;
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300 pb-10">
            {/* Header Profissional e Denso */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-[40]">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg"><Wallet size={18} /></div>
                    <div className="flex flex-col">
                        <h2 className="text-base font-bold text-slate-900 leading-none">Gestão de Caixa</h2>
                        {isOpen && (
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                                    <Clock size={12}/> Aberto às {session?.openedAt ? format(new Date(session.openedAt), 'HH:mm') : '--:--'}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                                    <User size={12}/> {authUser?.name || 'Operador'}
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
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold uppercase text-[10px] tracking-wider",
                        isOpen ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
                    )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                        {isOpen ? 'CAIXA OPERACIONAL' : 'CAIXA FECHADO'}
                    </div>
                    <button onClick={fetchData} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors ml-2"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/></button>
                </div>
            </div>

            {!isOpen ? (
                /* TELA DE ABERTURA - MAIS PROFISSIONAL */
                <div className="max-w-md mx-auto py-12">
                    <Card className="p-8 border-slate-200 shadow-xl bg-white relative">
                        <div className="text-center space-y-3 mb-8">
                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-2"><Unlock size={28} /></div>
                            <h3 className="text-xl font-bold text-slate-900">Iniciar Novo Turno</h3>
                            <p className="text-xs text-slate-500 font-medium">Informe o fundo de caixa inicial para troco.</p>
                        </div>
                        <form onSubmit={handleOpen} className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider ml-1">Fundo de Reserva (R$)</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</div>
                                    <input type="number" step="0.01" value={initialAmount} onChange={e => setInitialAmount(e.target.value)} required placeholder="0,00" className="w-full h-12 bg-slate-50 border border-slate-200 rounded-lg pl-12 pr-4 text-xl font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
                                </div>
                            </div>
                            <Button fullWidth size="lg" className="h-12 rounded-lg font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100">ABRIR CAIXA AGORA</Button>
                        </form>
                    </Card>
                </div>
            ) : (
                /* PAINEL OPERACIONAL */
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                    
                    {/* COLUNA ESQUERDA (3): RESUMO FINANCEIRO */}
                    <div className="xl:col-span-4 space-y-4">
                        <Card className="p-0 border-slate-200 shadow-md overflow-hidden bg-white" noPadding>
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Conferência de Turno</h3>
                                <div className="flex gap-1">
                                    {session?.pendingDriverSettlementsCount > 0 && (
                                        <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-bold animate-pulse">
                                            <AlertCircle size={10}/> {session.pendingDriverSettlementsCount} ACERTOS
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="divide-y divide-slate-100">
                                {paymentMethods.map(m => {
                                    const normLabel = normalize(m.label);
                                    const normId = normalize((m as any).id);
                                    const normType = normalize((m as any).type);

                                    const expected = m.id === 'cash' 
                                        ? getExpectedCash() 
                                        : (
                                            summary?.salesByMethod?.[normLabel] || 
                                            summary?.salesByMethod?.[normId] || 
                                            (normType ? summary?.salesByMethod?.[normType] : 0) ||
                                            0
                                        );
                                    
                                    const informedValue = closingValues[m.id] || closingValues[m.label] || '';
                                    const informed = parseFloat(informedValue || '0');
                                    const diff = informed - expected;
                                    const isSelected = selectedMethod === m.id;

                                    return (
                                        <div 
                                            key={m.id} 
                                            onClick={() => setSelectedMethod(m.id)}
                                            className={cn(
                                                "p-3.5 transition-all cursor-pointer group hover:bg-slate-50 relative border-l-4",
                                                isSelected ? "bg-blue-50/40 border-blue-500" : "border-transparent"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("p-1.5 rounded-lg", isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-white border border-slate-200")}>
                                                        <m.icon size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{m.label}</p>
                                                        <p className="text-[10px] font-medium text-slate-400 uppercase">SISTEMA: R$ {(expected || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {informedValue && (
                                                        <span className={cn(
                                                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                                            Math.abs(diff) < 0.01 ? "bg-emerald-100 text-emerald-700" : diff < 0 ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                                                        )}>
                                                            {Math.abs(diff) < 0.01 ? 'FECHOU' : `DIF: R$ ${diff.toFixed(2)}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 items-center">
                                                <div className="flex-1 relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">R$</span>
                                                    <input 
                                                        type="number"
                                                        value={closingValues[m.id]}
                                                        onChange={(e) => setClosingValues(prev => ({ ...prev, [m.id]: e.target.value }))}
                                                        className="w-full h-9 bg-white border border-slate-200 rounded-md pl-8 pr-3 text-sm font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
                                                        placeholder="Informar valor contado..."
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className={cn(
                                                    "w-7 h-7 rounded-md flex items-center justify-center transition-all",
                                                    isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-300"
                                                )}>
                                                    <ChevronRight size={14} />
                                                </div>
                                            </div>

                                            {m.id === 'cash' && isSelected && (
                                                <div className="mt-3 grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                                                        <p className="text-[9px] font-bold text-emerald-700 uppercase leading-none mb-1">Entradas (+)</p>
                                                        <p className="text-xs font-bold text-emerald-700 italic">R$ {( (session?.initialAmount || 0) + (summary?.salesByMethod?.cash || 0) + (summary?.adjustments?.reforco || 0) ).toFixed(2)}</p>
                                                    </div>
                                                    <div className="bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                                                        <p className="text-[9px] font-bold text-rose-700 uppercase leading-none mb-1">Saídas (-)</p>
                                                        <p className="text-xs font-bold text-rose-700 italic">R$ {(summary?.adjustments?.sangria || 0).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="p-4 bg-slate-900 space-y-3">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total em Mãos</span>
                                    <span className="text-xl font-bold text-white tracking-tight">R$ {(Object.values(closingValues).reduce((a, b) => a + (parseFloat(b) || 0), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <textarea 
                                    className="w-full bg-white/10 border border-white/10 rounded-lg p-3 text-xs font-medium text-white placeholder:text-slate-500 focus:border-blue-500 outline-none h-16 resize-none transition-all" 
                                    placeholder="OBSERVAÇÕES DO FECHAMENTO..." 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)} 
                                />
                                <div className="space-y-2">
                                    {/* Checklist de Segurança Visual */}
                                    <div className="grid grid-cols-1 gap-1 py-1">
                                        <div className={cn("flex items-center gap-2 text-[9px] font-bold px-2 py-1 rounded", session?.pendingDriverSettlementsCount === 0 ? "text-emerald-400" : "bg-rose-500/20 text-rose-300")}>
                                            {session?.pendingDriverSettlementsCount === 0 ? <Check size={10}/> : <X size={10}/>} ACERTOS MOTOBOY: {session?.pendingDriverSettlementsCount || 0}
                                        </div>
                                    </div>

                                    <Button 
                                        fullWidth 
                                        onClick={handleClose} 
                                        disabled={session?.pendingDriverSettlementsCount > 0}
                                        className={cn(
                                            "h-10 rounded-lg font-bold uppercase tracking-widest text-xs transition-all shadow-lg",
                                            session?.pendingDriverSettlementsCount > 0 ? "bg-slate-700 cursor-not-allowed opacity-50" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20"
                                        )}
                                    >
                                        FINALIZAR TURNO
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* COLUNA DIREITA (9): DETALHE DE VENDAS E HISTÓRICO */}
                    <div className="xl:col-span-8 space-y-4">
                        <Card className="p-0 border-slate-200 shadow-md overflow-hidden bg-white h-full flex flex-col" noPadding>
                            <div className="px-5 py-4 border-b border-slate-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 flex items-center justify-center">
                                        {React.createElement(paymentMethods.find(m => m.id === selectedMethod)?.icon || HelpCircle, { size: 20 })}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 uppercase">Detalhamento: {paymentMethods.find(m => m.id === selectedMethod)?.label}</h3>
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Histórico de movimentações da sessão atual</p>
                                    </div>
                                </div>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input type="text" placeholder="Filtrar pedido ou mesa..." className="h-9 w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 text-xs font-semibold outline-none focus:border-blue-500 transition-all" />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto max-h-[600px] p-4 space-y-2 bg-slate-50/50">
                                {sessionOrders.filter(o => {
                                    const method = normalize(o.payments?.[0]?.method || o.deliveryOrder?.paymentMethod || 'other');
                                    const currentDisplayMethod = paymentMethods.find(m => m.id === selectedMethod);
                                    const selId = normalize(selectedMethod);
                                    const selLabel = normalize(currentDisplayMethod?.label || '');
                                    const selType = normalize((currentDisplayMethod as any)?.type || '');
                                    return method === selId || method === selLabel || method === selType;
                                }).length > 0 ? (
                                    <div className="space-y-2">
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
                                                <div key={order.id} className="bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-blue-300 transition-all group">
                                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                                        <div className="h-9 w-9 bg-slate-100 rounded-md flex items-center justify-center shrink-0 border border-slate-200 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                                                            <span className="text-sm font-bold text-slate-700 italic tracking-tighter">{order.dailyOrderNumber || order.id.slice(-3)}</span>
                                                        </div>
                                                        <div className="min-w-[120px]">
                                                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                                                                {order.orderType === 'DELIVERY' ? <Truck size={12} className="text-blue-500"/> : <ShoppingBag size={12} className="text-indigo-500"/>}
                                                                {order.tableNumber ? `MESA ${order.tableNumber}` : order.deliveryOrder?.name || 'BALCÃO'}
                                                            </h4>
                                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{format(new Date(order.createdAt), 'HH:mm')} • {order.user?.name || 'ADMIN'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Lançamento</p>
                                                            <p className="text-sm font-bold text-slate-900">R$ {order.total.toFixed(2)}</p>
                                                        </div>
                                                        
                                                        <div className="h-8 w-px bg-slate-100 hidden sm:block" />

                                                        <div className="w-[140px]">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-0.5">Forma:</p>
                                                            <select 
                                                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-[10px] font-bold uppercase outline-none focus:border-blue-500"
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
                                    <div className="flex flex-col items-center justify-center h-48 opacity-25">
                                        <Filter size={40} strokeWidth={1.5} className="mb-2 text-slate-400" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Nenhum registro encontrado</p>
                                    </div>
                                )}
                            </div>

                            <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subtotal Acumulado</span>
                                </div>
                                <span className="text-sm font-bold text-slate-900 tracking-tight">R$ {(summary?.salesByMethod?.[selectedMethod] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* MODAL SANGREIA / REFORÇO - REDESIGN PARA DENSIDADE */}
            <AnimatePresence>
                {showTransactionModal !== 'none' && (
                    <div className="ui-modal-overlay">
                        <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="ui-modal-content w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200">
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
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CashierManagement;