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
    const [loading, setLoading] = useState(true);
    
    const [initialAmount, setInitialAmount] = useState('');
    const [finalAmount, setFinalAmount] = useState('');
    const [notes, setNotes] = useState('');

    const [showTransactionModal, setShowTransactionModal] = useState<'none' | 'INCOME' | 'EXPENSE'>('none');
    const [transAmount, setTransAmount] = useState('');
    const [transDesc, setTransDesc] = useState('');

    const [showConference, setShowConference] = useState(false);
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
            const [statusData, summaryData, historyData] = await Promise.all([
                getCashierStatus(),
                getCashierSummary().catch(() => null),
                getCashierHistory().catch(() => [])
            ]);
            setCashierData(statusData);
            setSummary(summaryData);
            setHistory(historyData);
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
        if(!confirm('Encerrar turno agora?')) return;
        try {
            await closeCashier(parseFloat(finalAmount), notes);
            toast.success('Caixa fechado com sucesso!');
            setFinalAmount(''); setNotes(''); fetchData();
        } catch (error) { toast.error('Erro ao fechar.'); }
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
                                <Card className="p-8 space-y-8 border-slate-200 shadow-2xl bg-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16 rounded-full" />
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-100"><Unlock size={28} /></div>
                                        <div><h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Iniciar Turno</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Provisionar saldo de troco</p></div>
                                    </div>
                                    <form onSubmit={handleOpen} className="space-y-6 relative z-10">
                                        <Input label="Valor em Fundo de Caixa (R$)" type="number" step="0.01" value={initialAmount} onChange={e => setInitialAmount(e.target.value)} required placeholder="0.00" icon={DollarSign} />
                                        <Button fullWidth size="lg" className="h-16 rounded-[2rem] font-black uppercase tracking-widest italic shadow-xl shadow-slate-200 bg-blue-600 hover:bg-blue-500">ABRIR CAIXA AGORA</Button>
                                    </form>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div key="close" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                                <Card className="p-8 space-y-8 border-rose-200 shadow-2xl bg-slate-900 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-xl shadow-rose-900/40"><Lock size={28} /></div>
                                        <div><h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Encerrar Caixa</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Conferência final de valores</p></div>
                                    </div>
                                    <form onSubmit={handleClose} className="space-y-6 relative z-10">
                                        <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1 italic">Total em Espécie (Dinheiro)</label><div className="relative"><span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-600 text-lg italic">R$</span><input type="number" step="0.01" required className="w-full h-16 bg-white/5 border-2 border-white/10 rounded-2xl pl-14 pr-6 text-xl font-black italic focus:border-rose-500 outline-none transition-all text-white" value={finalAmount} onChange={e => setFinalAmount(e.target.value)} /></div></div>
                                        <textarea className="w-full bg-white/5 border-2 border-white/10 rounded-[2rem] p-6 text-sm font-black text-white uppercase italic tracking-tight focus:border-rose-500 outline-none transition-all h-28" placeholder="NOTAS DE FECHAMENTO..." value={notes} onChange={e => setNotes(e.target.value)} />
                                        <Button fullWidth size="lg" className="h-16 rounded-[2rem] font-black uppercase tracking-widest italic bg-rose-600 hover:bg-rose-500 border-none shadow-2xl shadow-rose-900/40">FINALIZAR EXPEDIENTE</Button>
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
                            {/* Dashboard de Turno Atual */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="p-6 border-slate-100 bg-white group hover:border-orange-500/20 transition-all">
                                    <div className="flex justify-between items-start mb-6"><div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors"><Unlock size={24} /></div><span className="text-[8px] font-black uppercase bg-slate-100 px-2 py-1 rounded italic tracking-widest">Abertura</span></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fundo de Caixa</p>
                                    <h4 className="text-3xl font-black text-slate-900 italic tracking-tighter">R$ {session.initialAmount.toFixed(2).replace('.', ',')}</h4>
                                </Card>
                                <Card className="p-6 border-emerald-100 bg-emerald-50/20 group hover:bg-white transition-all">
                                    <div className="flex justify-between items-start mb-6"><div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform"><ArrowUpCircle size={24} /></div><span className="text-[8px] font-black uppercase bg-emerald-100 text-emerald-600 px-2 py-1 rounded italic tracking-widest">Vendas</span></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Entradas</p>
                                    <h4 className="text-3xl font-black text-emerald-600 italic tracking-tighter">R$ {summary?.totalSales?.toFixed(2).replace('.', ',') || '0,00'}</h4>
                                </Card>
                                <Card className="p-6 border-orange-100 bg-orange-50/20 group hover:bg-white transition-all">
                                    <div className="flex justify-between items-start mb-6"><div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-100 group-hover:scale-110 transition-transform"><CheckCircle size={24} /></div><span className="text-[8px] font-black uppercase bg-orange-100 text-orange-600 px-2 py-1 rounded italic tracking-widest">Saldo</span></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Estimado</p>
                                    <h4 className="text-3xl font-black text-orange-600 italic tracking-tighter">R$ {(session.initialAmount + (summary?.totalSales || 0)).toFixed(2).replace('.', ',')}</h4>
                                </Card>
                            </div>

                            {/* Ações Rápidas de Operação */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button fullWidth size="lg" onClick={() => setShowTransactionModal('INCOME')} className="h-20 rounded-[2.5rem] bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-emerald-900/10 italic gap-3"><Plus size={24} strokeWidth={3} /> Reforço de Caixa</Button>
                                <Button fullWidth size="lg" onClick={() => setShowTransactionModal('EXPENSE')} className="h-20 rounded-[2.5rem] bg-orange-600 hover:bg-orange-500 text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-orange-900/10 italic gap-3"><Minus size={24} strokeWidth={3} /> Sangria de Caixa</Button>
                                <Button fullWidth size="lg" onClick={() => setShowConference(!showConference)} variant={showConference ? 'primary' : 'outline'} className={cn("h-20 rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-xl italic gap-3 transition-all", showConference ? "bg-slate-900 text-white border-none" : "bg-white border-slate-200 text-slate-400")}><Receipt size={24} /> {showConference ? 'Ocultar Auditoria' : 'Auditoria Detalhada'}</Button>
                            </div>

                            {/* Auditoria Detalhada Premium */}
                            <AnimatePresence>
                                {showConference && (
                                    <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}>
                                        <Card className="p-0 overflow-hidden border-2 border-orange-500/30 shadow-2xl bg-white" noPadding>
                                            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                                <div><h3 className="font-black text-slate-900 uppercase italic text-sm tracking-widest flex items-center gap-3"><Receipt size={20} className="text-orange-500" /> Auditoria de Lançamentos</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Conferência ponto-a-ponto do faturamento</p></div>
                                            </div>
                                            <div className="p-8 space-y-12">
                                                {paymentMethods.map(method => {
                                                    const ordersInMethod = summary?.transactions?.filter((t: any) => t.paymentMethod === method.id) || [];
                                                    const total = ordersInMethod.reduce((acc: number, t: any) => acc + t.amount, 0);
                                                    return (
                                                        <div key={method.id} className="space-y-4">
                                                            <div className="flex items-center justify-between border-b-2 border-slate-50 pb-3"><div className="flex items-center gap-3"><div className="p-2 bg-slate-100 rounded-lg text-slate-400"><method.icon size={16}/></div><h4 className="font-black text-slate-900 uppercase text-xs italic tracking-tight">{method.label}</h4></div><span className="font-black text-slate-900 text-lg italic tracking-tighter">R$ {total.toFixed(2)}</span></div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {ordersInMethod.map((t: any) => (
                                                                    <div key={t.id} className="p-4 bg-slate-50 rounded-[1.5rem] border-2 border-transparent hover:border-orange-500/20 hover:bg-white transition-all flex items-center justify-between group">
                                                                        <div className="space-y-1"><p className="text-[10px] font-black text-slate-900 uppercase italic leading-none">{t.description}</p><p className="text-[8px] font-bold text-slate-400 uppercase">{format(new Date(t.createdAt), 'HH:mm')}</p></div>
                                                                        <div className="flex items-center gap-4">
                                                                            <span className="font-black text-slate-900 text-xs italic tracking-tighter">R$ {t.amount.toFixed(2)}</span>
                                                                            <div className="relative">{editingOrder === t.id ? (
                                                                                <div className="absolute right-0 top-0 mt-10 bg-white shadow-2xl rounded-2xl border border-slate-100 p-2 z-20 w-56 animate-in zoom-in-95 duration-200">
                                                                                    {paymentMethods.map(m => (
                                                                                        <button key={m.id} onClick={() => handleUpdatePayment(t.orderId, m.id)} className="w-full text-left p-3 hover:bg-orange-50 rounded-xl text-[9px] font-black uppercase flex items-center justify-between transition-colors">{m.label}{t.paymentMethod === m.id && <Check size={14} className="text-emerald-500" />}</button>
                                                                                    ))}
                                                                                    <Button fullWidth size="sm" variant="ghost" onClick={() => setEditingOrder(null)} className="mt-2 text-[8px] font-black uppercase text-slate-400">Cancelar</Button>
                                                                                </div>
                                                                            ) : (
                                                                                <Button variant="ghost" size="icon" onClick={() => setEditingOrder(t.id)} className="h-8 w-8 rounded-lg bg-white shadow-sm opacity-0 group-hover:opacity-100"><Edit2 size={14}/></Button>
                                                                            )}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Métodos de Recebimento Mini-Cards */}
                            {!showConference && (
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
                            )}

                            {/* Tabela de Histórico Diário */}
                            <Card className="p-0 overflow-hidden border-slate-200 shadow-xl bg-white" noPadding>
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 italic"><History size={14} className="text-orange-500" /> Movimentações Recentes</h3><Button variant="ghost" size="sm" className="text-[9px] font-black uppercase text-orange-600" onClick={fetchData}><RefreshCw size={12} className="mr-1"/> Sincronizar</Button></div>
                                <div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-slate-50/50"><th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Horário</th><th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Descrição / Evento</th><th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Método</th><th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Valor Líquido</th></tr></thead>
                                    <tbody className="divide-y divide-slate-50">{summary?.transactions?.length > 0 ? summary.transactions.slice(0, 10).map((t: any) => (
                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group"><td className="px-8 py-5 text-xs font-black text-slate-300 italic tracking-tighter group-hover:text-slate-900 transition-colors">{format(new Date(t.createdAt), 'HH:mm')}</td><td className="px-8 py-5"><div><p className="font-black text-slate-900 text-xs uppercase italic leading-none mb-1">{t.description}</p><p className="text-[8px] font-bold text-slate-400 uppercase">{t.type === 'INCOME' ? 'Reforço / Entrada' : 'Sangria / Saída'}</p></div></td><td className="px-8 py-5"><span className="text-[9px] font-black text-slate-500 uppercase bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 italic">{paymentMethods.find(m => m.id === t.paymentMethod)?.label || t.paymentMethod}</span></td><td className={cn("px-8 py-5 text-right font-black text-sm italic tracking-tighter", t.type === 'INCOME' ? "text-emerald-600" : "text-rose-600")}>{t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toFixed(2).replace('.', ',')}</td></tr>
                                    )) : <tr><td colSpan={4} className="px-8 py-20 text-center opacity-20"><div className="flex flex-col items-center"><History size={48} strokeWidth={1} className="mb-3"/><p className="text-[10px] font-black uppercase tracking-widest">Sem lançamentos registrados</p></div></td></tr>}</tbody>
                                </table></div>
                            </Card>
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