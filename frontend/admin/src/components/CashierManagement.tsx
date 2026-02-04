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
    Calendar, Clock, User, Receipt, Plus, Minus, X, Info, Edit2, ChevronDown, Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CashierManagement: React.FC = () => {
    const [cashierData, setCashierData] = useState<any>(null);
    const [summary, setSummary] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form States
    const [initialAmount, setInitialAmount] = useState('');
    const [finalAmount, setFinalAmount] = useState('');
    const [notes, setNotes] = useState('');

    // Transaction Modal States
    const [showTransactionModal, setShowTransactionModal] = useState<'none' | 'INCOME' | 'EXPENSE'>('none');
    const [transAmount, setTransAmount] = useState('');
    const [transDesc, setTransDesc] = useState('');

    // Conference States
    const [showConference, setShowConference] = useState(false);
    const [editingOrder, setEditingOrder] = useState<string | null>(null);

    const paymentMethods = [
        { id: 'cash', label: 'Dinheiro' },
        { id: 'pix', label: 'Pix' },
        { id: 'credit_card', label: 'Cartão Crédito' },
        { id: 'debit_card', label: 'Cartão Débito' },
        { id: 'other', label: 'Outros' }
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
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpen = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await openCashier(parseFloat(initialAmount));
            toast.success('Caixa aberto com sucesso!');
            setInitialAmount('');
            fetchData();
        } catch (error) {
            toast.error('Erro ao abrir caixa.');
        }
    };

    const handleClose = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!confirm('Deseja realmente fechar o caixa agora?')) return;
        try {
            await closeCashier(parseFloat(finalAmount), notes);
            toast.success('Caixa fechado com sucesso!');
            setFinalAmount('');
            setNotes('');
            fetchData();
        } catch (error) {
            toast.error('Erro ao fechar caixa.');
        }
    };

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addCashierTransaction({
                description: transDesc,
                amount: parseFloat(transAmount),
                type: showTransactionModal as any
            });
            toast.success(showTransactionModal === 'INCOME' ? 'Reforço registrado!' : 'Sangria registrada!');
            setShowTransactionModal('none');
            setTransAmount('');
            setTransDesc('');
            fetchData();
        } catch (error) {
            toast.error('Erro ao registrar movimentação.');
        }
    };

    const handleUpdatePayment = async (orderId: string, newMethod: string) => {
        try {
            await updateOrderPaymentMethod(orderId, newMethod);
            toast.success('Forma de pagamento atualizada!');
            setEditingOrder(null);
            fetchData();
        } catch (error) {
            toast.error('Erro ao atualizar.');
        }
    };

    if (loading) return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Sincronizando Caixa...</p>
        </div>
    );

    const isOpen = cashierData?.isOpen;
    const session = cashierData?.session;

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-3">
                        <Wallet size={32} className="text-primary" /> Frente de Caixa
                    </h2>
                    <p className="text-slate-500 font-medium">Controle de turnos, sangrias e reforços de caixa.</p>
                </div>
                
                <div className={cn(
                    "flex items-center gap-3 px-6 py-3 rounded-2xl border-2 font-black uppercase text-xs tracking-widest",
                    isOpen ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-red-100 bg-red-50 text-red-600"
                )}>
                    <div className={cn("w-2 h-2 rounded-full", isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                    Status: {isOpen ? 'Caixa Aberto' : 'Caixa Fechado'}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna de Ação (Abertura/Fechamento) */}
                <div className="lg:col-span-1 space-y-6">
                    {!isOpen ? (
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 animate-in slide-in-from-left-4 duration-500">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                                <Unlock size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight mb-2">Abrir Novo Turno</h3>
                            <p className="text-slate-400 text-sm mb-8">Informe o saldo inicial para começar as operações.</p>
                            
                            <form onSubmit={handleOpen} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Saldo Inicial (Fundo)</label>
                                    <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-300">R$</span>
                                        <input 
                                            type="number" step="0.01" required
                                            className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl pl-14 pr-6 text-lg font-black focus:border-primary outline-none transition-all"
                                            placeholder="0.00"
                                            value={initialAmount}
                                            onChange={e => setInitialAmount(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3">
                                    <Unlock size={20} /> Iniciar Turno
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white animate-in slide-in-from-left-4 duration-500">
                            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                                <Lock size={32} />
                            </div>
                            <h3 className="text-xl font-black uppercase italic tracking-tight mb-2">Encerrar Turno</h3>
                            <p className="text-slate-400 text-sm mb-8">Confira os valores físicos e feche o caixa.</p>
                            
                            <form onSubmit={handleClose} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Valor Total em Espécie (Dinheiro)</label>
                                    <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-600">R$</span>
                                        <input 
                                            type="number" step="0.01" required
                                            className="w-full h-16 bg-slate-800 border-2 border-slate-700 rounded-2xl pl-14 pr-6 text-lg font-black focus:border-red-500 outline-none transition-all text-white"
                                            placeholder="0.00"
                                            value={finalAmount}
                                            onChange={e => setFinalAmount(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Notas de Fechamento</label>
                                    <textarea 
                                        className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-sm font-bold focus:border-red-500 outline-none transition-all text-white h-24 resize-none"
                                        placeholder="Alguma observação importante?"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="w-full h-16 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3">
                                    <Lock size={20} /> Finalizar Operação
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Histórico Simples */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 flex items-center gap-2">
                            <History size={14} /> Histórico de Sessões
                        </h4>
                        <div className="space-y-3">
                            {history.length > 0 ? history.map((h: any) => (
                                <div key={h.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", h.status === 'OPEN' ? "bg-emerald-500" : "bg-slate-300")} />
                                        <div>
                                            <p className="text-[10px] font-black text-slate-900 uppercase">{format(new Date(h.openedAt), 'dd/MM/yyyy')}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{h.user?.name} {h.status === 'OPEN' ? '(ATUAL)' : ''}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-900 italic">
                                            {h.status === 'OPEN' ? 'Em aberto' : `R$ ${h.finalAmount?.toFixed(2)}`}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-[10px] text-slate-400 italic text-center py-4">Nenhum registro.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Coluna de Conteúdo Principal */}
                <div className="lg:col-span-2 space-y-6">
                    {isOpen ? (
                        <>
                            {/* Cards de Resumo */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Saldo Inicial</p>
                                    <h4 className="text-2xl font-black text-slate-900 italic tracking-tighter">R$ {session.initialAmount.toFixed(2)}</h4>
                                    <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase">
                                        <Clock size={12} /> {format(new Date(session.openedAt), 'HH:mm')}
                                    </div>
                                </div>
                                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Entradas (Vendas)</p>
                                    <h4 className="text-2xl font-black text-emerald-900 italic tracking-tighter">R$ {summary?.totalSales?.toFixed(2) || '0.00'}</h4>
                                    <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase">
                                        <ArrowUpCircle size={12} /> Em operação
                                    </div>
                                </div>
                                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Saldo Estimado</p>
                                    <h4 className="text-2xl font-black text-blue-900 italic tracking-tighter">
                                        R$ {(session.initialAmount + (summary?.totalSales || 0)).toFixed(2)}
                                    </h4>
                                    <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase">
                                        <Info size={12} /> Somatória total
                                    </div>
                                </div>
                            </div>

                            {/* Ações Rápidas */}
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setShowTransactionModal('INCOME')}
                                    className="flex-1 h-20 bg-emerald-500 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
                                >
                                    <Plus size={20} /> Reforço
                                </button>
                                <button 
                                    onClick={() => setShowTransactionModal('EXPENSE')}
                                    className="flex-1 h-20 bg-orange-500 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
                                >
                                    <Minus size={20} /> Sangria
                                </button>
                                <button 
                                    onClick={() => setShowConference(!showConference)}
                                    className={cn(
                                        "flex-[2] h-20 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-lg",
                                        showConference ? "bg-primary text-white shadow-orange-200" : "bg-white text-slate-900 border-2 border-slate-100 shadow-slate-100"
                                    )}
                                >
                                    <Receipt size={20} /> {showConference ? 'Ocultar Conferência' : 'Conferência Detalhada'}
                                </button>
                            </div>

                            {/* Visão de Conferência Detalhada */}
                            {showConference && (
                                <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-primary/20 overflow-hidden animate-in slide-in-from-top-4 duration-500">
                                    <div className="p-8 border-b border-slate-50 bg-primary/5 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-black text-slate-900 uppercase italic text-sm tracking-widest flex items-center gap-2">
                                                <Receipt className="text-primary" size={20} /> Conferência de Lançamentos
                                            </h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Verifique e ajuste as formas de pagamento antes de fechar.</p>
                                        </div>
                                    </div>
                                    
                                    <div className="p-8 space-y-12">
                                        {paymentMethods.map(method => {
                                            const ordersInMethod = summary?.transactions?.filter((t: any) => t.paymentMethod === method.id) || [];
                                            const totalInMethod = ordersInMethod.reduce((acc: number, t: any) => acc + t.amount, 0);

                                            return (
                                                <div key={method.id} className="space-y-4">
                                                    <div className="flex items-center justify-between border-b-2 border-slate-50 pb-2">
                                                        <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                            {method.label}
                                                        </h4>
                                                        <span className="font-black text-primary text-sm italic">R$ {totalInMethod.toFixed(2)}</span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {ordersInMethod.length > 0 ? ordersInMethod.map((t: any) => (
                                                            <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-primary/30 transition-all">
                                                                <div className="space-y-1">
                                                                    <p className="text-[10px] font-black text-slate-900 uppercase italic leading-none">{t.description}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400">{format(new Date(t.createdAt), 'HH:mm')}</p>
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-4">
                                                                    <span className="font-black text-slate-900 text-xs italic">R$ {t.amount.toFixed(2)}</span>
                                                                    
                                                                    <div className="relative">
                                                                        {editingOrder === t.id ? (
                                                                            <div className="absolute right-0 top-0 mt-8 bg-white shadow-2xl rounded-2xl border border-slate-100 p-2 z-10 w-48 animate-in zoom-in-95 duration-200">
                                                                                {paymentMethods.map(m => (
                                                                                    <button 
                                                                                        key={m.id}
                                                                                        onClick={() => handleUpdatePayment(t.orderId, m.id)}
                                                                                        className="w-full text-left p-2 hover:bg-slate-50 rounded-lg text-[10px] font-black uppercase flex items-center justify-between"
                                                                                    >
                                                                                        {m.label}
                                                                                        {t.paymentMethod === m.id && <Check size={14} className="text-emerald-500" />}
                                                                                    </button>
                                                                                ))}
                                                                                <button onClick={() => setEditingOrder(null)} className="w-full mt-2 p-2 bg-slate-100 rounded-lg text-[9px] font-black uppercase text-center">Cancelar</button>
                                                                            </div>
                                                                        ) : (
                                                                            <button 
                                                                                onClick={() => setEditingOrder(t.id)}
                                                                                className="p-2 text-slate-300 hover:text-primary transition-colors"
                                                                            >
                                                                                <Edit2 size={16} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )) : (
                                                            <p className="text-[10px] text-slate-300 italic">Nenhum lançamento.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Resumo por Forma de Pagamento (Mini) */}
                            {!showConference && (
                                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                        <h3 className="font-black text-slate-900 uppercase italic text-[10px] tracking-[0.2em] flex items-center gap-2">
                                            <Receipt className="text-primary" size={16} /> Faturamento por Método
                                        </h3>
                                    </div>
                                    <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-6">
                                        {paymentMethods.map(m => {
                                            const val = summary?.salesByMethod?.[m.id] || 0;
                                            return (
                                                <div key={m.id} className="space-y-1">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                                                    <p className="text-lg font-black text-slate-900 italic">R$ {val.toFixed(2)}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Movimentações Recentes */}
                            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                                    <h3 className="font-black text-slate-900 uppercase italic text-[10px] tracking-[0.2em] flex items-center gap-2">
                                        <History className="text-primary" size={16} /> Últimas Movimentações
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50/50">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Hora</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Descrição</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Método</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {summary?.transactions?.length > 0 ? (
                                                summary.transactions.slice(0, 10).map((t: any) => (
                                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4 text-xs font-bold text-slate-400 tracking-tighter italic">{format(new Date(t.createdAt), 'HH:mm')}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-slate-900 text-[11px] uppercase tracking-tighter italic leading-none">{t.description}</span>
                                                                <span className="text-[8px] font-black text-slate-300 uppercase mt-1">{t.type === 'INCOME' ? 'Entrada' : 'Saída'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-100 px-2 py-1 rounded-lg">
                                                                {paymentMethods.find(m => m.id === t.paymentMethod)?.label || t.paymentMethod}
                                                            </span>
                                                        </td>
                                                        <td className={cn(
                                                            "px-6 py-4 text-right font-black text-xs italic",
                                                            t.type === 'INCOME' ? "text-emerald-600" : "text-red-600"
                                                        )}>
                                                            {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-300 font-bold uppercase text-[10px] tracking-[0.2em]">Sem movimentações no momento</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[3rem] text-center">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-slate-200 shadow-sm mb-6">
                                <Lock size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-300 uppercase tracking-tight italic">Operação Suspensa</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 max-w-xs">O caixa precisa ser aberto para registrar vendas e gerenciar o faturamento.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL DE SANGREIA / REFORÇO */}
            {showTransactionModal !== 'none' && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                            <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">
                                {showTransactionModal === 'INCOME' ? 'Reforço de Caixa' : 'Sangria de Caixa'}
                            </h3>
                            <button onClick={() => setShowTransactionModal('none')} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleTransaction} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor R$</label>
                                <input 
                                    type="number" step="0.01" required autoFocus
                                    className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-lg font-black focus:border-primary outline-none transition-all"
                                    placeholder="0.00"
                                    value={transAmount}
                                    onChange={e => setTransAmount(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Motivo / Descrição</label>
                                <input 
                                    className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 font-bold focus:border-primary outline-none transition-all"
                                    placeholder="Ex: Troco inicial, Retirada p/ Banco..."
                                    value={transDesc}
                                    onChange={e => setTransDesc(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className={cn(
                                "w-full h-16 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg active:scale-95",
                                showTransactionModal === 'INCOME' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-orange-500 hover:bg-orange-600"
                            )}>
                                Confirmar {showTransactionModal === 'INCOME' ? 'Reforço' : 'Sangria'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashierManagement;
