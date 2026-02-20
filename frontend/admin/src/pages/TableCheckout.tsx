import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getPaymentMethods } from '../services/api';
import { 
    ChevronLeft, Users, Clock, DollarSign, ArrowRightLeft, 
    Plus, Minus, Trash2, CreditCard, Banknote, QrCode, 
    Percent, PlusCircle, CheckCircle2, Loader2, Printer, 
    History, X, MinusCircle, ChevronDown, User, MoveHorizontal
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface OrderItem {
    id: string;
    quantity: number;
    priceAtTime: number;
    isPaid: boolean;
    product: {
        name: string;
    };
    sizeJson?: string;
    addonsJson?: string;
}

interface Order {
    id: string;
    tableNumber: number;
    customerName: string;
    total: number;
    createdAt: string;
    items: OrderItem[];
    payments: any[];
}

const TableCheckout: React.FC = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    
    // Estado para o carrinho de pagamento atual (Coluna 2)
    const [payingItems, setPayingItems] = useState<{itemId: string, quantity: number, price: number, name: string}[]>([]);
    const [currentPayments, setCurrentPayments] = useState<{method: string, amount: number}[]>([]);
    const [discount, setDiscount] = useState(0);
    const [surcharge, setSurcharge] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchOrder();
        fetchPaymentMethods();
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/orders/${orderId}`);
            setOrder(res.data);
        } catch (err) {
            toast.error("Erro ao carregar pedido");
            navigate('/pos?tab=tables');
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentMethods = async () => {
        try {
            const res = await getPaymentMethods(order?.restaurantId || '');
            const filtered = res.filter((m: any) => m.isActive);
            setPaymentMethods(filtered);
            if (filtered.length > 0) setSelectedMethodId(filtered[0].id);
        } catch (err) {
            console.error(err);
        }
    };

    // --- LOGICA COLUNA 1 (CONSUMO -> PAGAMENTO) ---
    const addOneToPayment = (item: OrderItem) => {
        const existing = payingItems.find(i => i.itemId === item.id);
        const alreadyInPayment = existing?.quantity || 0;
        
        if (alreadyInPayment < item.quantity) {
            if (existing) {
                setPayingItems(payingItems.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i));
            } else {
                setPayingItems([...payingItems, { itemId: item.id, quantity: 1, price: item.priceAtTime, name: item.product.name }]);
            }
        }
    };

    const addAllToPayment = (item: OrderItem) => {
        const existing = payingItems.find(i => i.itemId === item.id);
        if (existing) {
            setPayingItems(payingItems.map(i => i.itemId === item.id ? { ...i, quantity: item.quantity } : i));
        } else {
            setPayingItems([...payingItems, { itemId: item.id, quantity: item.quantity, price: item.priceAtTime, name: item.product.name }]);
        }
    };

    const payEverything = () => {
        if (!order) return;
        const allItems = order.items.filter(i => !i.isPaid).map(i => ({
            itemId: i.id,
            quantity: i.quantity,
            price: i.priceAtTime,
            name: i.product.name
        }));
        setPayingItems(allItems);
    };

    // --- LOGICA COLUNA 2 (REMOVER DO PAGAMENTO) ---
    const removeOneFromPayment = (itemId: string) => {
        const existing = payingItems.find(i => i.itemId === itemId);
        if (!existing) return;
        if (existing.quantity > 1) {
            setPayingItems(payingItems.map(i => i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i));
        } else {
            setPayingItems(payingItems.filter(i => i.itemId !== itemId));
        }
    };

    const removeAllFromPayment = (itemId: string) => {
        setPayingItems(payingItems.filter(i => i.itemId !== itemId));
    };

    // --- LOGICA FINANCEIRA E PAGAMENTOS ---
    const handleAddPayment = () => {
        const method = paymentMethods.find(m => m.id === selectedMethodId);
        if (!method) {
            toast.error("Selecione um método de pagamento");
            return;
        }

        const amount = parseFloat(inputValue.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
            toast.error("Informe um valor válido");
            return;
        }

        setCurrentPayments([...currentPayments, { method: method.name, amount }]);
        setInputValue('');
        if (inputRef.current) inputRef.current.focus();
    };

    const subtotalPaying = payingItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const totalWithFees = subtotalPaying + surcharge - discount;
    const amountPaid = currentPayments.reduce((acc, p) => acc + p.amount, 0);
    const remainingToPay = Math.max(0, totalWithFees - amountPaid);

    useEffect(() => {
        if (remainingToPay > 0) setInputValue(remainingToPay.toFixed(2));
    }, [payingItems, discount, surcharge]);

    const handleConfirmPayment = async () => {
        if (currentPayments.length === 0) return toast.error("Adicione ao menos um pagamento");
        if (amountPaid < totalWithFees) return toast.error("O valor pago é insuficiente");

        try {
            await api.post(`/admin/tables/partial-payment-simple`, {
                orderId: order?.id,
                itemIds: payingItems.map(i => i.itemId),
                payments: currentPayments,
                discount, surcharge
            });

            toast.success("Pagamento processado!");
            setPayingItems([]);
            setCurrentPayments([]);
            setDiscount(0);
            setSurcharge(0);
            fetchOrder();
        } catch (e) { toast.error("Erro ao processar pagamento"); }
    };

    if (loading || !order) return <div className="flex h-screen items-center justify-center bg-slate-100"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

    return (
        <div className="h-screen flex flex-col bg-slate-200 overflow-hidden select-none">
            
            {/* TOP HEADER */}
            <header className="h-16 bg-white border-b border-slate-300 flex items-center justify-between px-6 shrink-0 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Mesa: {order.tableNumber}</h1>
                        <button className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all shadow-sm"><ArrowRightLeft size={16} className="text-slate-600"/></button>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase leading-none">Cliente</span>
                        <span className="text-xs font-bold text-slate-700 uppercase italic mt-1">{order.customerName || 'Não Informado'}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase leading-none">Tempo</span>
                        <span className="text-xs font-bold text-slate-700 mt-1 uppercase italic">{format(new Date(order.createdAt), "HH:mm")}</span>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Consumido</p>
                        <p className="text-2xl font-black text-slate-900 italic tracking-tighter">R$ {order.total.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className="h-10 bg-slate-100 border-slate-300 font-black text-[9px] uppercase"><Printer size={14} className="mr-2"/> IMPRIMIR CAIXA</Button>
                        <Button className="h-10 bg-blue-600 hover:bg-blue-700 font-black text-[9px] uppercase shadow-lg shadow-blue-100">SALVAR</Button>
                        <button onClick={() => navigate('/pos?tab=tables')} className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center hover:bg-rose-600 transition-all shadow-md active:scale-95"><X size={20} /></button>
                    </div>
                </div>
            </header>

            {/* MAIN THREE-COLUMN GRID */}
            <div className="flex-1 flex overflow-hidden p-3 gap-3">
                
                {/* COLUNA 1: CONSUMO (ESQUERDA) */}
                <section className="w-[350px] flex flex-col gap-3">
                    <div className="flex gap-2">
                        <button onClick={payEverything} className="flex-1 h-12 bg-blue-400 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase italic transition-all shadow-md">PAGAR TUDO</button>
                        <button className="flex-1 h-12 bg-blue-400 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase italic transition-all shadow-md">DIVIDIR TUDO</button>
                    </div>
                    
                    <Card className="flex-1 overflow-hidden flex flex-col bg-white border-slate-300 rounded-[1.5rem] shadow-sm" noPadding>
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Qtd. Item</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {order.items.filter(i => !i.isPaid).map(item => {
                                const qtyInPayment = payingItems.find(pi => pi.itemId === item.id)?.quantity || 0;
                                const remainingQty = item.quantity - qtyInPayment;

                                return (
                                    <div key={item.id} className={cn("p-3 rounded-2xl border transition-all", remainingQty === 0 ? "bg-slate-100 border-transparent opacity-50" : "bg-white border-slate-100 shadow-sm")}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <p className="text-[11px] font-black text-slate-900 uppercase italic truncate">{item.product.name}</p>
                                                <p className="text-[8px] font-bold text-slate-400 mt-0.5">{item.quantity.toFixed(3)} UN x R$ {item.priceAtTime.toFixed(2)}</p>
                                            </div>
                                            <span className="text-xs font-black text-slate-900 italic shrink-0">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                                        </div>
                                        
                                        {remainingQty > 0 && (
                                            <div className="flex gap-1">
                                                <button onClick={() => addOneToPayment(item)} className="flex-1 h-8 bg-blue-100 text-blue-600 rounded-lg font-black text-[8px] uppercase hover:bg-blue-600 hover:text-white transition-all">ADICIONAR 1</button>
                                                <button onClick={() => addAllToPayment(item)} className="flex-1 h-8 bg-blue-600 text-white rounded-lg font-black text-[8px] uppercase hover:bg-blue-700 transition-all">ADICIONAR TODOS</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </section>

                {/* COLUNA 2: PAGAMENTO ATUAL (MEIO) */}
                <section className="flex-1 flex flex-col gap-3">
                    <div className="flex gap-3 h-12">
                        <button onClick={() => setDiscount(prev => prev + 5)} className="flex-1 bg-slate-500 hover:bg-slate-600 text-white rounded-xl font-black text-[10px] uppercase italic transition-all shadow-md">DESCONTO</button>
                        <button onClick={() => setSurcharge(prev => prev + 5)} className="flex-1 bg-slate-500 hover:bg-slate-600 text-white rounded-xl font-black text-[10px] uppercase italic transition-all shadow-md">ACRÉSCIMO</button>
                    </div>

                    <Card className="flex-1 flex flex-col bg-white border-slate-300 rounded-[1.5rem] shadow-lg relative overflow-hidden" noPadding>
                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
                        <div className="p-6 text-center bg-slate-50/50 border-b border-slate-100">
                            <p className="text-3xl font-black text-slate-900 italic tracking-tighter">R$ {totalWithFees.toFixed(2).replace('.', ',')}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Valor do Pagamento Atual</p>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                            <div className="flex justify-between items-center px-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">
                                <span>Qtd. Item</span>
                                <span>Valor</span>
                            </div>
                            
                            {payingItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale py-20">
                                    <ShoppingCart size={48} className="mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest italic text-center">Selecione itens da esquerda<br/>para iniciar o pagamento</p>
                                </div>
                            ) : (
                                payingItems.map(item => (
                                    <div key={item.itemId} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between group animate-in slide-in-from-left-2">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-center bg-white rounded-xl p-1 shadow-sm border border-blue-100">
                                                <span className="text-[11px] font-black text-slate-900">{item.quantity}</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 uppercase italic">{item.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 italic">Preço Unit: R$ {item.price.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black text-slate-900 italic">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => removeOneFromPayment(item.itemId)} className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"><Minus size={14} /></button>
                                                <button onClick={() => removeAllFromPayment(item.itemId)} className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagamentos já registrados nesta transação */}
                        <div className="p-4 bg-slate-100 border-t border-slate-200">
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Pagamentos inseridos</h4>
                            <div className="space-y-2">
                                {currentPayments.map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm animate-in zoom-in-95">
                                        <span className="text-[10px] font-black text-slate-900 uppercase italic">{p.method}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-emerald-600 italic">R$ {p.amount.toFixed(2)}</span>
                                            <button onClick={() => setCurrentPayments(currentPayments.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600"><X size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                                {currentPayments.length === 0 && <p className="text-center py-4 text-[9px] font-bold text-slate-300 uppercase">Nenhum pagamento adicionado</p>}
                            </div>
                        </div>
                    </Card>
                </section>

                {/* COLUNA 3: METODOS E VALORES (DIREITA) */}
                <section className="w-[320px] flex flex-col gap-3">
                    <Card className="flex-1 flex flex-col bg-white border-slate-300 rounded-[1.5rem] shadow-sm overflow-hidden" noPadding>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            {paymentMethods.map(m => (
                                <button 
                                    key={m.id}
                                    onClick={() => setSelectedMethodId(m.id)}
                                    className={cn(
                                        "w-full h-14 rounded-2xl border-2 flex items-center gap-4 px-4 transition-all group",
                                        selectedMethodId === m.id 
                                            ? "border-blue-500 bg-blue-50 text-blue-600 shadow-md shadow-blue-50" 
                                            : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                                    )}
                                >
                                    <div className={cn("p-2 rounded-xl group-hover:scale-110 transition-transform", selectedMethodId === m.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}>
                                        {m.type === 'CASH' ? <Banknote size={18}/> : m.type === 'PIX' ? <QrCode size={18}/> : <CreditCard size={18}/>}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{m.name}</span>
                                </button>
                            ))}
                            <button className="w-full h-10 bg-white border border-slate-200 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50">EXIBIR MAIS</button>
                        </div>

                        <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-4">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 leading-none block mb-2">Valor a pagar</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">R$</span>
                                    <input 
                                        ref={inputRef}
                                        type="text" 
                                        value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                        className="w-full h-16 pl-12 pr-4 bg-white border-2 border-slate-200 rounded-2xl text-2xl font-black text-slate-900 focus:border-blue-500 outline-none transition-all shadow-inner"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleAddPayment}
                                className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase italic tracking-widest transition-all shadow-lg shadow-emerald-100 active:scale-95"
                            >
                                ADICIONAR PAGAMENTO
                            </button>
                        </div>
                    </Card>

                    <Button 
                        onClick={handleConfirmPayment}
                        disabled={remainingToPay > 0 || currentPayments.length === 0}
                        className={cn(
                            "h-20 rounded-[1.5rem] font-black text-sm uppercase italic tracking-widest shadow-xl transition-all active:scale-95",
                            remainingToPay === 0 && currentPayments.length > 0 ? "bg-slate-900 text-white" : "bg-slate-400 text-white opacity-50"
                        )}
                    >
                        CONFIRMAR RECEBIMENTO
                    </Button>
                </section>
            </div>

            {/* BARRA DE RODAPÉ (ACOES GERAIS) */}
            <footer className="h-16 bg-white border-t border-slate-300 flex items-center justify-between px-6 shrink-0">
                <Button variant="outline" className="h-11 px-8 rounded-xl border-slate-300 bg-slate-50 font-black text-[10px] uppercase italic text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all" onClick={() => navigate('/pos?tab=tables')}>
                    VOLTAR
                </Button>
                <div className="flex gap-3">
                    <Button className="h-11 px-8 rounded-xl bg-blue-500 hover:bg-blue-600 font-black text-[10px] uppercase italic tracking-widest shadow-lg">PAGAMENTOS REALIZADOS ({order.payments?.length || 0})</Button>
                </div>
            </footer>
        </div>
    );
};

export default TableCheckout;