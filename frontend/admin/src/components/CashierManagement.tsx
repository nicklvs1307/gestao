import React, { useState, useEffect } from 'react';
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
    ArrowUpCircle, ArrowDownCircle, AlertCircle, CheckCircle,
    Calendar, Clock, User, Receipt, Plus, Minus, X, Info, Edit2, ChevronDown, Check, RefreshCw, Loader2, ArrowUpRight, Smartphone, Banknote
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { AnimatePresence, motion } from 'framer-motion';

const CashierManagement: React.FC = () => {
    const [cashierData, setCashierData] = useState<any>(null);
    const [summary, setSummary] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [sessionOrders, setSessionOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [activeTab, setActiveTab] = useState<'summary' | 'orders' | 'history'>('summary');
    const [orderFilter, setOrderModeFilter] = useState<'all' | 'open' | 'completed'>('all');

    const [initialAmount, setInitialAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [closingValues, setClosingValues] = useState<Record<string, string>>({
        cash: '',
        pix: '',
        credit_card: '',
        debit_card: '',
        other: ''
    });

    const [showTransactionModal, setShowTransactionModal] = useState<'none' | 'INCOME' | 'EXPENSE'>('none');
    const [transAmount, setTransAmount] = useState('');
    const [transDesc, setTransDesc] = useState('');

    const [editingOrder, setEditingOrder] = useState<string | null>(null);

    const paymentMethods = [
        { id: 'cash', label: 'Dinheiro', icon: Banknote },
        { id: 'pix', label: 'Pix', icon: Smartphone },
        { id: 'credit_card', label: 'Cartão Crédito', icon: Wallet },
        { id: 'debit_card', label: 'Cartão Débito', icon: Wallet },
        { id: 'other', label: 'Outros', icon: Receipt }
    ];

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

    useEffect(() => { fetchData(); }, []);

    const handleOpen = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await openCashier(parseFloat(initialAmount));
            toast.success('Caixa aberto!');
            setInitialAmount(''); fetchData();
        } catch (error) { toast.error('Erro ao abrir.'); }
    };

    const handleClose = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!confirm('Deseja encerrar o turno com os valores informados?')) return;
        
        try {
            // Calcula o total informado somando todos os campos
            const totalInformed = Object.values(closingValues).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
            
            await closeCashier(totalInformed, notes, closingValues);
            toast.success('Caixa fechado com sucesso!');
            setClosingValues({ cash: '', pix: '', credit_card: '', debit_card: '', other: '' }); 
            setNotes(''); 
            fetchData();
        } catch (error) { toast.error('Erro ao fechar o caixa.'); }
    };

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addCashierTransaction({ description: transDesc, amount: parseFloat(transAmount), type: showTransactionModal as any });
            toast.success(showTransactionModal === 'INCOME' ? 'Reforço registrado!' : 'Sangria realizada!');
            setShowTransactionModal('none'); setTransAmount(''); setTransDesc(''); fetchData();
        } catch (error) { toast.error('Erro na movimentação.'); }
    };

    const handleUpdatePayment = async (orderId: string, newMethod: string) => {
        try {
            await updateOrderPaymentMethod(orderId, newMethod);
            toast.success('Pagamento corrigido!');
            setEditingOrder(null); fetchData();
        } catch (error) { toast.error('Erro ao atualizar.'); }
    };

    if (loading && !cashierData) return (
        <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando Frente de Caixa...</span>
        </div>
    );

    const isOpen = cashierData?.isOpen;
    const session = cashierData?.session;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Premium */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl shadow-slate-200"><Wallet size={32} /></div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Frente de Caixa</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                            <Clock size={12} className="text-orange-500" /> Controle de Turno e Sangrias
                        </p>
                    </div>
                </div>
                
                <div className={cn(
                    "flex items-center gap-3 px-6 py-3 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest",
                    isOpen ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-rose-100 bg-rose-50 text-rose-600 shadow-lg shadow-rose-100"
                )}>
                    <div className={cn("w-2 h-2 rounded-full", isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                    OPERACIONAL: {isOpen ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Coluna de Ação (Abertura/Fechamento) */}
                <div className="lg:col-span-4 space-y-8">
                    <AnimatePresence mode="wait">
                        {!isOpen ? (
                            <motion.div key="open" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                                <Card className="p-6 space-y-6 border-slate-100 shadow-xl bg-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl -mr-12 -mt-12 rounded-full" />
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100"><Unlock size={20} /></div>
                                        <div><h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter leading-none">Iniciar Turno</h3><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Provisionar saldo de troco</p></div>
                                    </div>
                                    <form onSubmit={handleOpen} className="space-y-4 relative z-10">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Fundo de Caixa (R$)</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input type="number" step="0.01" value={initialAmount} onChange={e => setInitialAmount(e.target.value)} required placeholder="0.00" className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 text-sm font-bold focus:border-blue-500 outline-none transition-all" />
                                            </div>
                                        </div>
                                        <Button fullWidth className="h-11 rounded-xl font-black uppercase tracking-widest italic bg-blue-600 hover:bg-blue-500 text-[10px]">ABRIR CAIXA</Button>
                                    </form>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div key="close" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                                <Card className="p-6 space-y-6 border-rose-100 shadow-xl bg-slate-900 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 blur-3xl -mr-12 -mt-12 rounded-full" />
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="p-3 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-900/40"><Lock size={20} /></div>
                                        <div><h3 className="text-sm font-black uppercase italic tracking-tighter leading-none">Fechar Caixa</h3><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Conferência ponto-a-ponto</p></div>
                                    </div>
                                    <form onSubmit={handleClose} className="space-y-4 relative z-10">
                                        <div className="space-y-3">
                                            {paymentMethods.map(m => (
                                                <div key={m.id} className="space-y-1">
                                                    <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-1">
                                                        <m.icon size={10} /> {m.label}
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-600 text-[10px] italic">R$</span>
                                                        <input 
                                                            type="number" 
                                                            step="0.01" 
                                                            required 
                                                            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 text-xs font-black italic focus:border-rose-500 outline-none transition-all text-white" 
                                                            value={closingValues[m.id]} 
                                                            onChange={e => setClosingValues(prev => ({ ...prev, [m.id]: e.target.value }))}
                                                            placeholder="0,00"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1 italic">Observações</label>
                                            <textarea className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold text-white uppercase italic tracking-tight focus:border-rose-500 outline-none transition-all h-20" placeholder="NOTAS DE FECHAMENTO..." value={notes} onChange={e => setNotes(e.target.value)} />
                                        </div>

                                        <Button fullWidth className="h-11 rounded-xl font-black uppercase tracking-widest italic bg-rose-600 hover:bg-rose-500 border-none text-[10px] shadow-lg shadow-rose-900/40">FINALIZAR TURNO</Button>
                                    </form>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Histórico de Sessões Premium */}
                    <Card className="p-8 border-slate-100 shadow-xl bg-white space-y-6">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] flex items-center gap-3 italic"><History size={14} className="text-orange-500" /> Histórico Recente</h4>
                        <div className="space-y-3">
                            {history.slice(0, 5).map((h: any) => (
                                <div key={h.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-orange-500/20 transition-all cursor-default">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-2 h-2 rounded-full", h.status === 'OPEN' ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300")} />
                                        <div><p className="text-[10px] font-black text-slate-900 uppercase italic leading-none mb-1">{format(new Date(h.openedAt), 'dd/MMM • HH:mm')}</p><p className="text-[8px] font-bold text-slate-400 uppercase">{h.user?.name || 'Sistema'}</p></div>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-900 italic">{h.status === 'OPEN' ? 'ABERTO' : `R$ ${h.finalAmount?.toFixed(2)}`}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Coluna Principal: Fluxo e Conferência */}
                <div className="lg:col-span-8 space-y-8">
                    {isOpen ? (
                        <>
                            {/* Navegação por Abas */}
                            <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100 gap-1">
                                <button onClick={() => setActiveTab('summary')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'summary' ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50")}>Resumo Financeiro</button>
                                <button onClick={() => setActiveTab('orders')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'orders' ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50")}>Comandas da Sessão</button>
                                <button onClick={() => setActiveTab('history')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'history' ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50")}>Histórico de Turnos</button>
                            </div>

                            {activeTab === 'summary' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                    {/* Dashboard de Turno Atual */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <Card className="p-6 border-slate-100 bg-white">
                                            <div className="flex justify-between items-start mb-6"><div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center shadow-inner"><Unlock size={24} /></div><span className="text-[8px] font-black uppercase bg-slate-100 px-2 py-1 rounded italic tracking-widest">Abertura</span></div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fundo de Caixa</p>
                                            <h4 className="text-3xl font-black text-slate-900 italic tracking-tighter">R$ {session.initialAmount.toFixed(2).replace('.', ',')}</h4>
                                        </Card>
                                        <Card className="p-6 border-emerald-100 bg-emerald-50/20">
                                            <div className="flex justify-between items-start mb-6"><div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100"><ArrowUpCircle size={24} /></div><span className="text-[8px] font-black uppercase bg-emerald-100 text-emerald-600 px-2 py-1 rounded italic tracking-widest">Vendas</span></div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Entradas</p>
                                            <h4 className="text-3xl font-black text-emerald-600 italic tracking-tighter">R$ {summary?.totalSales?.toFixed(2).replace('.', ',') || '0,00'}</h4>
                                        </Card>
                                        <Card className="p-6 border-orange-100 bg-orange-50/20">
                                            <div className="flex justify-between items-start mb-6"><div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-100"><CheckCircle size={24} /></div><span className="text-[8px] font-black uppercase bg-orange-100 text-orange-600 px-2 py-1 rounded italic tracking-widest">Saldo</span></div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Estimado</p>
                                            <h4 className="text-3xl font-black text-orange-600 italic tracking-tighter">R$ {(session.initialAmount + (summary?.totalSales || 0)).toFixed(2).replace('.', ',')}</h4>
                                        </Card>
                                    </div>

                                    {/* Ações Rápidas de Operação */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <Button fullWidth onClick={() => setShowTransactionModal('INCOME')} className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/10 italic gap-2"><Plus size={18} strokeWidth={3} /> Reforço</Button>
                                        <Button fullWidth onClick={() => setShowTransactionModal('EXPENSE')} className="h-12 rounded-2xl bg-orange-600 hover:bg-orange-500 text-[9px] font-black uppercase tracking-widest shadow-lg shadow-orange-900/10 italic gap-2"><Minus size={18} strokeWidth={3} /> Sangria</Button>
                                    </div>

                                    {/* Alerta de Motoboys Pendentes */}
                                    {session.pendingDriverSettlementsCount > 0 && (
                                        <Card className="p-4 border-orange-200 bg-orange-50/50 flex items-center justify-between group cursor-pointer hover:bg-orange-50 transition-all shadow-sm" onClick={() => window.location.href='/drivers/settlement'}>
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-white text-orange-500 rounded-xl shadow-sm"><AlertCircle size={20} /></div>
                                                <div>
                                                    <h4 className="text-[10px] font-black text-slate-900 uppercase italic">Atenção: Acertos Pendentes</h4>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Existem {session.pendingDriverSettlementsCount} motoboy(s) aguardando prestação de contas.</p>
                                                </div>
                                            </div>
                                            <ArrowUpRight size={20} className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                                        </Card>
                                    )}

                                    {/* Faturamento por Modalidade */}
                                    <Card className="p-8 border-slate-100 bg-white shadow-xl space-y-8">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 italic"><Receipt size={14} className="text-orange-500" /> Faturamento por Modalidade</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                                            {paymentMethods.map(m => (
                                                <div key={m.id} className="space-y-2 group cursor-default">
                                                    <div className="flex items-center gap-2"><m.icon size={12} className="text-slate-300 group-hover:text-orange-500 transition-colors"/><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p></div>
                                                    <p className="text-xl font-black text-slate-900 italic tracking-tighter">R$ {(summary?.salesByMethod?.[m.id] || 0).toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {activeTab === 'orders' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit gap-1 shadow-inner">
                                        <button onClick={() => setOrderModeFilter('all')} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", orderFilter === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>Todas</button>
                                        <button onClick={() => setOrderModeFilter('open')} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", orderFilter === 'open' ? "bg-white text-rose-600 shadow-sm" : "text-slate-400")}>Em Aberto</button>
                                        <button onClick={() => setOrderModeFilter('completed')} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", orderFilter === 'completed' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400")}>Pagas</button>
                                    </div>

                                    <Card className="p-0 overflow-hidden border-slate-200 shadow-xl bg-white" noPadding>
                                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 italic"><Receipt size={14} className="text-orange-500" /> Comandas da Sessão</h3>
                                            <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase text-orange-600" onClick={fetchData}><RefreshCw size={12} className="mr-1"/> Atualizar</Button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50/50">
                                                        <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Pedido</th>
                                                        <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Cliente / Mesa</th>
                                                        <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                                        <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Método</th>
                                                        <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Valor</th>
                                                        <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {sessionOrders
                                                        .filter(o => {
                                                            if(orderFilter === 'open') return o.status !== 'COMPLETED' && o.status !== 'CANCELED';
                                                            if(orderFilter === 'completed') return o.status === 'COMPLETED';
                                                            return true;
                                                        })
                                                        .length > 0 ? sessionOrders
                                                        .filter(o => {
                                                            if(orderFilter === 'open') return o.status !== 'COMPLETED' && o.status !== 'CANCELED';
                                                            if(orderFilter === 'completed') return o.status === 'COMPLETED';
                                                            return true;
                                                        })
                                                        .map((order: any) => (
                                                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <p className="font-black text-slate-900 text-xs uppercase italic">#{order.dailyOrderNumber || order.id.slice(-4)}</p>
                                                                <p className="text-[8px] font-bold text-slate-400 uppercase">{format(new Date(order.createdAt), 'HH:mm')}</p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <p className="font-black text-slate-700 text-xs uppercase">{order.tableNumber ? `Mesa ${order.tableNumber}` : order.deliveryOrder?.name || 'Balcão'}</p>
                                                                <p className="text-[8px] font-bold text-slate-400 uppercase">{order.orderType}</p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                                                    order.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600" : 
                                                                    order.status === 'CANCELED' ? "bg-rose-50 text-rose-600" : "bg-orange-50 text-orange-600"
                                                                )}>
                                                                    {order.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="relative">
                                                                    {editingOrder === order.id ? (
                                                                        <div className="absolute left-0 top-0 mt-8 bg-white shadow-2xl rounded-2xl border border-slate-100 p-2 z-20 w-48">
                                                                            {paymentMethods.map(m => (
                                                                                <button key={m.id} onClick={() => handleUpdatePayment(order.id, m.id)} className="w-full text-left p-2.5 hover:bg-orange-50 rounded-xl text-[9px] font-black uppercase flex items-center justify-between transition-colors">
                                                                                    {m.label}
                                                                                    {(order.payments?.[0]?.method === m.id || order.deliveryOrder?.paymentMethod === m.id) && <Check size={14} className="text-emerald-500" />}
                                                                                </button>
                                                                            ))}
                                                                            <button onClick={() => setEditingOrder(null)} className="w-full mt-2 py-2 text-[8px] font-black uppercase text-rose-500 hover:bg-rose-50 rounded-xl">Cancelar</button>
                                                                        </div>
                                                                    ) : (
                                                                        <button onClick={() => setEditingOrder(order.id)} className="flex items-center gap-2 group/btn" disabled={order.status === 'CANCELED'}>
                                                                            <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 italic group-hover/btn:border-orange-300 transition-colors">
                                                                                {paymentMethods.find(m => m.id === (order.payments?.[0]?.method || order.deliveryOrder?.paymentMethod))?.label || 'PENDENTE'}
                                                                            </span>
                                                                            {order.status !== 'CANCELED' && <Edit2 size={10} className="text-slate-300 group-hover/btn:text-orange-500 opacity-0 group-hover:opacity-100 transition-all"/>}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-black text-sm italic tracking-tighter text-slate-900">
                                                                R$ {order.total.toFixed(2).replace('.', ',')}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Ver Detalhes"><Info size={16} className="text-slate-300 hover:text-orange-500"/></Button>
                                                            </td>
                                                        </tr>
                                                    )) : (
                                                        <tr><td colSpan={6} className="px-6 py-20 text-center opacity-20"><div className="flex flex-col items-center"><History size={48} strokeWidth={1} className="mb-3"/><p className="text-[10px] font-black uppercase tracking-widest">Nenhuma comanda encontrada com este filtro</p></div></td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                    <div className="grid grid-cols-1 gap-3">
                                        {history.map((h: any) => (
                                            <Card key={h.id} className="p-5 flex items-center justify-between border-slate-100 hover:shadow-md transition-all cursor-default">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", h.status === 'OPEN' ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-400")}>
                                                        {h.status === 'OPEN' ? <Unlock size={20}/> : <Lock size={20}/>}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-900 uppercase italic leading-none mb-1">{format(new Date(h.openedAt), 'dd/MMM/yyyy • HH:mm')}</p>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Operador: {h.user?.name || 'Sistema'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo de Fechamento</p>
                                                    <span className="text-sm font-black text-slate-900 italic">{h.status === 'OPEN' ? 'EM ABERTO' : `R$ ${h.finalAmount?.toFixed(2)}`}</span>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-12 bg-slate-50/50 border-4 border-dashed border-slate-200 rounded-[4rem] text-center animate-in fade-in duration-700">
                            <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center text-slate-200 shadow-xl mb-10"><Lock size={64} strokeWidth={1.5} /></div>
                            <h3 className="text-3xl font-black text-slate-300 uppercase tracking-tighter italic">Operação Suspensa</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-4 max-w-xs leading-relaxed">Aguardando comando de abertura de turno para liberar registros financeiros.</p>
                            <Button variant="outline" className="mt-10 rounded-2xl italic font-black uppercase tracking-widest" onClick={fetchData}><RefreshCw size={16} className="mr-2"/> VERIFICAR STATUS</Button>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL SANGREIA / REFORÇO PREMIUM */}
            <AnimatePresence>
                {showTransactionModal !== 'none' && (
                    <div className="ui-modal-overlay">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="ui-modal-content w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
                            <header className="px-10 py-8 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4"><div className={cn("p-3 rounded-2xl shadow-xl", showTransactionModal === 'INCOME' ? "bg-emerald-500 text-white shadow-emerald-100" : "bg-orange-500 text-white shadow-orange-100")}>{showTransactionModal === 'INCOME' ? <Plus size={24} /> : <Minus size={24} />}</div><div><h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">{showTransactionModal === 'INCOME' ? 'Reforço de Caixa' : 'Realizar Sangria'}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Movimentação Avulsa</p></div></div>
                                <Button variant="ghost" size="icon" onClick={() => setShowTransactionModal('none')} className="rounded-full bg-slate-50"><X size={24}/></Button>
                            </header>
                            <form onSubmit={handleTransaction} className="p-10 space-y-8 bg-slate-50/30">
                                <Input label="Valor da Movimentação (R$)" type="number" step="0.01" required autoFocus value={transAmount} onChange={e => setTransAmount(e.target.value)} icon={DollarSign} />
                                <Input label="Motivo da Operação" required value={transDesc} onChange={e => setTransDesc(e.target.value)} placeholder="Ex: Adição de troco miúdo..." />
                                <div className="pt-4"><Button fullWidth size="lg" className={cn("h-16 rounded-2xl font-black uppercase tracking-widest italic shadow-xl", showTransactionModal === 'INCOME' ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/10" : "bg-orange-600 hover:bg-orange-500 shadow-orange-900/10")}>CONFIRMAR REGISTRO</Button></div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CashierManagement;