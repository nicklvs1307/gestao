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
    ArrowUpCircle, ArrowDownCircle, AlertCircle, CheckCircle,
    Calendar, Clock, User, Receipt, Plus, Minus, X, Info, Edit2, ChevronDown, Check, RefreshCw, Loader2, ArrowUpRight, Smartphone, Banknote, Search, ChevronRight, Filter
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

    const paymentMethods = [
        { id: 'cash', label: 'Dinheiro', icon: Banknote, color: 'emerald' },
        { id: 'pix', label: 'Pix', icon: Smartphone, color: 'blue' },
        { id: 'credit_card', label: 'Cartão Crédito', icon: Wallet, color: 'purple' },
        { id: 'debit_card', label: 'Cartão Débito', icon: Wallet, color: 'indigo' },
        { id: 'other', label: 'Outros', icon: Receipt, color: 'slate' }
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

    const handleClose = async () => {
        if(!confirm('Deseja encerrar o turno com os valores informados?')) return;
        try {
            const totalInformed = Object.values(closingValues).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
            await closeCashier(totalInformed, notes, closingValues);
            toast.success('Caixa fechado com sucesso!');
            setIsClosingProcess(false);
            fetchData();
        } catch (error) { toast.error('Erro ao fechar o caixa.'); }
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
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando Frente de Caixa...</span>
        </div>
    );

    const isOpen = cashierData?.isOpen;
    const session = cashierData?.session;

    // Cálculo de Dinheiro Esperado (Abertura + Vendas + Reforços - Sangrias)
    const getExpectedCash = () => {
        if (!summary) return 0;
        const sales = summary.salesByMethod?.cash || 0;
        const reinforcements = summary.transactions?.filter((t: any) => t.type === 'INCOME' && t.paymentMethod === 'cash').reduce((a: any, b: any) => a + b.amount, 0) || 0;
        const withdraws = summary.transactions?.filter((t: any) => t.type === 'EXPENSE' && t.paymentMethod === 'cash').reduce((a: any, b: any) => a + b.amount, 0) || 0;
        return session.initialAmount + sales + reinforcements - withdraws;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header Compacto */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><Wallet size={24} /></div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Fechamento de Frente de Caixa</h2>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                            {isOpen ? `Aberto em: ${format(new Date(session.openedAt), 'dd/MM/yyyy HH:mm')}` : 'Caixa Encerrado'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {isOpen && !isClosingProcess && (
                        <div className="flex gap-2 mr-4">
                            <Button variant="secondary" size="sm" onClick={() => setShowTransactionModal('INCOME')} className="h-9 rounded-xl text-[9px] font-black italic gap-1.5"><Plus size={14}/> REFORÇO</Button>
                            <Button variant="secondary" size="sm" onClick={() => setShowTransactionModal('EXPENSE')} className="h-9 rounded-xl text-[9px] font-black italic gap-1.5"><Minus size={14}/> SANGRIA</Button>
                        </div>
                    )}
                    <div className={cn(
                        "flex items-center gap-3 px-4 py-2 rounded-xl border-2 font-black uppercase text-[9px] tracking-widest",
                        isOpen ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-rose-100 bg-rose-50 text-rose-600 shadow-sm"
                    )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                        {isOpen ? 'OPERACIONAL' : 'CAIXA FECHADO'}
                    </div>
                </div>
            </div>

            {!isOpen ? (
                /* TELA DE ABERTURA */
                <div className="max-w-md mx-auto py-10">
                    <Card className="p-8 space-y-8 border-slate-100 shadow-2xl bg-white relative overflow-hidden">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner"><Unlock size={32} /></div>
                            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Iniciar Novo Turno</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Defina o fundo de reserva (troco)</p>
                        </div>
                        <form onSubmit={handleOpen} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Valor de Abertura (R$)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                    <input type="number" step="0.01" value={initialAmount} onChange={e => setInitialAmount(e.target.value)} required placeholder="0.00" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 text-lg font-black italic focus:border-blue-500 outline-none transition-all" />
                                </div>
                            </div>
                            <Button fullWidth size="lg" className="h-14 rounded-2xl font-black uppercase tracking-widest italic bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-100">ABRIR CAIXA AGORA</Button>
                        </form>
                    </Card>
                </div>
            ) : (
                /* TELA DE FECHAMENTO (STILO SAIPOS) */
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    
                    {/* COLUNA ESQUERDA: MASTER FINANCEIRO */}
                    <div className="xl:col-span-5 space-y-6">
                        <Card className="p-0 border-slate-200 shadow-xl overflow-hidden bg-white" noPadding>
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Conferência de Valores</h3>
                                <RefreshCw size={14} className="text-slate-300 cursor-pointer hover:text-orange-500 transition-colors" onClick={fetchData}/>
                            </div>
                            
                            <div className="divide-y divide-slate-100">
                                {paymentMethods.map(m => {
                                    const expected = m.id === 'cash' ? getExpectedCash() : (summary?.salesByMethod?.[m.id] || 0);
                                    const informed = parseFloat(closingValues[m.id] || '0');
                                    const diff = informed - expected;
                                    const isSelected = selectedMethod === m.id;

                                    return (
                                        <div 
                                            key={m.id} 
                                            onClick={() => setSelectedMethod(m.id)}
                                            className={cn(
                                                "p-5 transition-all cursor-pointer group hover:bg-slate-50 relative",
                                                isSelected ? "bg-orange-50/30 ring-2 ring-inset ring-orange-500/20" : ""
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("p-2 rounded-xl shadow-sm", isSelected ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-white")}>
                                                        <m.icon size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight">{m.label}</p>
                                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Esperado: R$ {expected.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={cn(
                                                        "text-[10px] font-black italic",
                                                        diff === 0 ? "text-emerald-500" : diff < 0 ? "text-rose-500" : "text-blue-500"
                                                    )}>
                                                        {diff === 0 ? 'CONFERIDO' : `DIF: R$ ${diff.toFixed(2)}`}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 items-center">
                                                <div className="flex-1 relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 italic">EM CAIXA: R$</span>
                                                    <input 
                                                        type="number"
                                                        value={closingValues[m.id]}
                                                        onChange={(e) => setClosingValues(prev => ({ ...prev, [m.id]: e.target.value }))}
                                                        className="w-full h-10 bg-white border border-slate-200 rounded-xl pl-20 pr-4 text-xs font-black italic focus:border-orange-500 outline-none shadow-inner"
                                                        placeholder="0.00"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                                    isSelected ? "bg-orange-500 text-white" : "bg-slate-50 text-slate-200"
                                                )}>
                                                    <ChevronRight size={18} />
                                                </div>
                                            </div>

                                            {/* Breakdown apenas para Dinheiro */}
                                            {m.id === 'cash' && (
                                                <div className="mt-4 grid grid-cols-2 gap-2">
                                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                        <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Abertura (+)</p>
                                                        <p className="text-[9px] font-bold text-emerald-600 italic">R$ {session.initialAmount.toFixed(2)}</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                        <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Vendas (+)</p>
                                                        <p className="text-[9px] font-bold text-emerald-600 italic">R$ {(summary?.salesByMethod?.cash || 0).toFixed(2)}</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                        <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Reforços (+)</p>
                                                        <p className="text-[9px] font-bold text-blue-600 italic">R$ {summary.transactions?.filter((t:any) => t.type === 'INCOME').reduce((a:any, b:any) => a + b.amount, 0).toFixed(2)}</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                        <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Sangrias (-)</p>
                                                        <p className="text-[9px] font-bold text-rose-600 italic">R$ {summary.transactions?.filter((t:any) => t.type === 'EXPENSE').reduce((a:any, b:any) => a + b.amount, 0).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="p-6 bg-slate-900 space-y-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Informado</span>
                                    <span className="text-2xl font-black text-white italic">R$ {Object.values(closingValues).reduce((a, b) => a + (parseFloat(b) || 0), 0).toFixed(2)}</span>
                                </div>
                                <textarea 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold text-white uppercase italic tracking-tight focus:border-orange-500 outline-none h-20" 
                                    placeholder="NOTAS DE FECHAMENTO..." 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)} 
                                />
                                <Button fullWidth size="lg" onClick={handleClose} className="h-14 rounded-2xl font-black uppercase tracking-widest italic bg-emerald-600 hover:bg-emerald-500 border-none shadow-xl shadow-emerald-900/20">FECHAR FRENTE DE CAIXA</Button>
                            </div>
                        </Card>
                    </div>

                    {/* COLUNA DIREITA: DETALHE DE VENDAS */}
                    <div className="xl:col-span-7 space-y-6">
                        <Card className="p-0 border-slate-200 shadow-xl overflow-hidden bg-white h-full flex flex-col" noPadding>
                            <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center">
                                        {paymentMethods.find(m => m.id === selectedMethod)?.icon({ size: 20 })}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase italic">Vendas em {paymentMethods.find(m => m.id === selectedMethod)?.label}</h3>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Confira e ajuste os registros abaixo</p>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                    <input type="text" placeholder="Filtrar pedido..." className="h-9 bg-slate-50 border border-slate-100 rounded-lg pl-9 pr-4 text-[10px] font-bold outline-none focus:border-orange-500 transition-all w-40" />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-slate-50/50">
                                {sessionOrders.filter(o => (o.payments?.[0]?.method || o.deliveryOrder?.paymentMethod || 'other') === selectedMethod).length > 0 ? (
                                    sessionOrders
                                        .filter(o => (o.payments?.[0]?.method || o.deliveryOrder?.paymentMethod || 'other') === selectedMethod)
                                        .map((order: any) => (
                                            <div key={order.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-4 group hover:border-orange-500/30 transition-all">
                                                <div className="flex items-start gap-4">
                                                    <div className="h-12 w-12 bg-slate-100 rounded-xl flex flex-col items-center justify-center shrink-0">
                                                        <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5">Nº</span>
                                                        <span className="text-sm font-black text-slate-900 italic tracking-tighter leading-none">{order.dailyOrderNumber || order.id.slice(-4)}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight">{order.tableNumber ? `MESA ${order.tableNumber}` : order.deliveryOrder?.name || 'BALCÃO'}</h4>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase"><Clock size={10}/> {format(new Date(order.createdAt), 'HH:mm')}</div>
                                                            <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase"><User size={10}/> {order.user?.name || 'SISTEMA'}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col md:flex-row items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Valor do Pedido</p>
                                                        <p className="text-sm font-black text-slate-900 italic">R$ {order.total.toFixed(2)}</p>
                                                    </div>
                                                    
                                                    <div className="h-px md:h-8 w-full md:w-px bg-slate-100 mx-2" />

                                                    <div className="space-y-1.5 min-w-[140px]">
                                                        <p className="text-[8px] font-black text-orange-500 uppercase italic ml-1">Corrigir Forma:</p>
                                                        <select 
                                                            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-2 text-[9px] font-black uppercase italic outline-none focus:border-orange-500"
                                                            value={selectedMethod}
                                                            onChange={(e) => handleUpdatePayment(order.id, e.target.value)}
                                                        >
                                                            {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                                        <Filter size={48} strokeWidth={1} className="mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma venda neste método</p>
                                    </div>
                                )}
                            </div>

                            {/* Informativo no rodapé da direita */}
                            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                                <span>Total em {paymentMethods.find(m => m.id === selectedMethod)?.label}:</span>
                                <span className="text-slate-900 font-black italic text-xs">R$ {(summary?.salesByMethod?.[selectedMethod] || 0).toFixed(2)}</span>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* MODAL SANGREIA / REFORÇO */}
            <AnimatePresence>
                {showTransactionModal !== 'none' && (
                    <div className="ui-modal-overlay">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="ui-modal-content w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
                            <header className="px-10 py-8 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4"><div className={cn("p-3 rounded-2xl shadow-xl", showTransactionModal === 'INCOME' ? "bg-emerald-500 text-white" : "bg-orange-500 text-white")}>{showTransactionModal === 'INCOME' ? <Plus size={24} /> : <Minus size={24} />}</div><div><h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">{showTransactionModal === 'INCOME' ? 'Reforço' : 'Sangria'}</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Movimentação Avulsa</p></div></div>
                                <Button variant="ghost" size="icon" onClick={() => setShowTransactionModal('none')} className="rounded-full bg-slate-50"><X size={24}/></Button>
                            </header>
                            <form onSubmit={handleTransaction} className="p-10 space-y-8 bg-slate-50/30">
                                <Input label="Valor (R$)" type="number" step="0.01" required autoFocus value={transAmount} onChange={e => setTransAmount(e.target.value)} icon={DollarSign} />
                                <Input label="Motivo / Descrição" required value={transDesc} onChange={e => setTransDesc(e.target.value)} placeholder="Ex: Adição de troco..." />
                                <div className="pt-4"><Button fullWidth size="lg" className={cn("h-16 rounded-2xl font-black uppercase tracking-widest italic shadow-xl", showTransactionModal === 'INCOME' ? "bg-emerald-600 hover:bg-emerald-500" : "bg-orange-600 hover:bg-orange-500")}>REGISTRAR AGORA</Button></div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CashierManagement;