import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getPaymentMethods } from '../services/api';
import { 
    ChevronLeft, Users, Clock, DollarSign, ArrowRightLeft, 
    Plus, Minus, Trash2, CreditCard, Banknote, QrCode, 
    Percent, PlusCircle, CheckCircle2, Loader2, Printer, 
    History, X, MinusCircle, ChevronDown, User, MoveHorizontal,
    ShoppingCart, Calculator, Receipt, Wallet
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
    discount: number;
    extraCharge: number;
    createdAt: string;
    items: OrderItem[];
    payments: any[];
    restaurantId: string;
}

const TableCheckout: React.FC = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [serviceTaxRate, setServiceTaxRate] = useState(10); // Default 10%
    const [useServiceTax, setUseServiceTax] = useState(true);
    
    // Estado para o carrinho de pagamento atual
    const [payingItems, setPayingItems] = useState<{itemId: string, quantity: number, price: number, name: string}[]>([]);
    const [currentPayments, setCurrentPayments] = useState<{methodId: string, methodName: string, amount: number}[]>([]);
    const [discount, setDiscount] = useState(0);
    const [surcharge, setSurcharge] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    const [splitValue, setSplitValue] = useState<number | null>(null);
    
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchOrder();
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/orders/${orderId}`);
            setOrder(res.data);
            
            // Busca configurações do restaurante para taxa de serviço
            const restRes = await api.get(`/admin/settings/restaurant`);
            setServiceTaxRate(restRes.data.serviceTaxPercentage || 10);
            
            fetchPaymentMethods(res.data.restaurantId);
        } catch (err) {
            toast.error("Erro ao carregar pedido");
            navigate('/pos?tab=tables');
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentMethods = async (restaurantId: string) => {
        try {
            const res = await getPaymentMethods(restaurantId);
            const filtered = res.filter((m: any) => m.isActive);
            setPaymentMethods(filtered);
            if (filtered.length > 0) setSelectedMethodId(filtered[0].id);
        } catch (err) {
            console.error(err);
        }
    };

    // --- LOGICA FINANCEIRA ---
    const subtotalPaying = payingItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const serviceTaxAmount = useServiceTax ? Number((subtotalPaying * (serviceTaxRate / 100)).toFixed(2)) : 0;
    const totalToPay = Number((subtotalPaying + serviceTaxAmount + surcharge - discount).toFixed(2));
    const amountPaid = currentPayments.reduce((acc, p) => acc + p.amount, 0);
    const remainingToPay = Math.max(0, totalToPay - amountPaid);
    const changeAmount = Math.max(0, amountPaid - totalToPay);

    useEffect(() => {
        if (remainingToPay > 0) setInputValue(remainingToPay.toFixed(2));
        else if (totalToPay > 0 && remainingToPay === 0) setInputValue('0.00');
    }, [payingItems, discount, surcharge, useServiceTax, totalToPay, amountPaid]);

    // --- ACOES ---
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
        setPayingItems(prev => {
            const filtered = prev.filter(i => i.itemId !== item.id);
            return [...filtered, { itemId: item.id, quantity: item.quantity, price: item.priceAtTime, name: item.product.name }];
        });
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

    const handleAddPayment = () => {
        const method = paymentMethods.find(m => m.id === selectedMethodId);
        if (!method) return toast.error("Selecione um método");

        const amount = parseFloat(inputValue.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) return toast.error("Valor inválido");

        setCurrentPayments([...currentPayments, { methodId: method.id, methodName: method.name, amount }]);
        setInputValue('');
    };

    const handleSplitBill = () => {
        const persons = prompt("Dividir em quantas pessoas?");
        if (persons && !isNaN(parseInt(persons))) {
            const num = parseInt(persons);
            const perPerson = totalToPay / num;
            setSplitValue(perPerson);
            setInputValue(perPerson.toFixed(2));
            toast.info(`Valor por pessoa: R$ ${perPerson.toFixed(2)}`);
        }
    };

    const handleConfirmPayment = async () => {
        if (currentPayments.length === 0) return toast.error("Adicione um pagamento");
        if (amountPaid < totalToPay) return toast.error("Valor insuficiente");

        try {
            const res = await api.post(`/admin/tables/partial-payment-simple`, {
                orderId: order?.id,
                itemIds: payingItems.map(i => i.itemId),
                payments: currentPayments.map(p => ({ amount: p.amount, method: p.methodName })),
                discount, 
                surcharge: surcharge + serviceTaxAmount
            });

            if (res.data.finished) {
                toast.success("Mesa finalizada com sucesso!");
                navigate('/pos?tab=tables');
                return;
            }

            toast.success("Pagamento parcial realizado!");
            setPayingItems([]);
            setCurrentPayments([]);
            setDiscount(0);
            setSurcharge(0);
            fetchOrder();
        } catch (e) { toast.error("Erro ao processar"); }
    };

    if (loading || !order) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400" size={40} /></div>;

    return (
        <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden text-slate-600 font-sans">
            
            {/* HEADER PROFISSIONAL */}
            <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-8">
                    <button onClick={() => navigate('/pos?tab=tables')} className="p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200 text-slate-400">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mesa {order.tableNumber}</h1>
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider border border-blue-100">Checkout</span>
                        </div>
                        <p className="text-xs font-medium text-slate-400 mt-0.5 flex items-center gap-1.5 uppercase tracking-wide">
                            <User size={12}/> {order.customerName || 'Consumidor Final'} • <Clock size={12}/> {format(new Date(order.createdAt), "HH:mm")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right mr-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">Consumo Total</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">R$ {order.total.toFixed(2)}</p>
                    </div>
                    <Button variant="outline" className="h-12 px-6 border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all">
                        <Printer size={16} className="mr-2 opacity-50"/> PRÉ-CONTA
                    </Button>
                </div>
            </header>

            {/* CONTEÚDO PRINCIPAL (3 COLUNAS) */}
            <div className="flex-1 flex overflow-hidden p-6 gap-6">
                
                {/* COLUNA 1: CONSUMO PENDENTE */}
                <section className="w-[380px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Receipt size={16} className="text-slate-300"/> Consumo Aberto
                        </h2>
                        <button onClick={payEverything} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wider">Selecionar Tudo</button>
                    </div>
                    
                    <Card className="flex-1 overflow-hidden flex flex-col bg-white border-slate-200 rounded-3xl shadow-sm" noPadding>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                            {order.items.filter(i => !i.isPaid).map(item => {
                                const qtyInPayment = payingItems.find(pi => pi.itemId === item.id)?.quantity || 0;
                                const remainingQty = item.quantity - qtyInPayment;

                                return (
                                    <div key={item.id} className={cn(
                                        "p-4 rounded-2xl border transition-all duration-200", 
                                        remainingQty === 0 
                                            ? "bg-slate-50 border-transparent opacity-40 scale-[0.98]" 
                                            : "bg-white border-slate-100 hover:border-blue-100 hover:shadow-md hover:shadow-blue-50/50"
                                    )}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1 min-w-0 pr-3">
                                                <p className="text-xs font-bold text-slate-800 uppercase tracking-tight truncate">{item.product.name}</p>
                                                <p className="text-[10px] font-medium text-slate-400 mt-1">{item.quantity} x R$ {item.priceAtTime.toFixed(2)}</p>
                                            </div>
                                            <span className="text-xs font-black text-slate-900 tracking-tighter shrink-0">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                                        </div>
                                        
                                        {remainingQty > 0 && (
                                            <div className="flex gap-2">
                                                <button onClick={() => addOneToPayment(item)} className="flex-1 h-9 bg-slate-50 text-slate-600 rounded-xl font-bold text-[10px] uppercase hover:bg-blue-50 hover:text-blue-600 transition-colors border border-slate-100">Add 1</button>
                                                <button onClick={() => addAllToPayment(item)} className="flex-1 h-9 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase hover:bg-blue-700 transition-shadow shadow-md shadow-blue-100">Todos</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </section>

                {/* COLUNA 2: PAGAMENTO ATUAL */}
                <section className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Wallet size={16} className="text-slate-300"/> Pagamento Atual
                        </h2>
                        <div className="flex gap-4">
                            <button onClick={handleSplitBill} className="text-[10px] font-bold text-slate-400 hover:text-blue-500 flex items-center gap-1.5 uppercase transition-colors">
                                <Calculator size={14}/> Dividir Conta
                            </button>
                        </div>
                    </div>

                    <Card className="flex-1 flex flex-col bg-white border-slate-200 rounded-3xl shadow-xl relative overflow-hidden" noPadding>
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600" />
                        
                        {/* LISTA DE ITENS SENDO PAGOS AGORA */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                            {payingItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 py-20 text-slate-400">
                                    <ShoppingCart size={48} strokeWidth={1.5} className="mb-4" />
                                    <p className="text-xs font-bold uppercase tracking-widest text-center">Selecione itens ao lado<br/>para iniciar o pagamento</p>
                                </div>
                            ) : (
                                payingItems.map(item => (
                                    <div key={item.itemId} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group animate-in slide-in-from-left-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 text-xs font-black text-slate-900">
                                                {item.quantity}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{item.name}</p>
                                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">R$ {item.price.toFixed(2)} / un</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black text-slate-900 tracking-tighter">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                            <button onClick={() => setPayingItems(prev => prev.filter(i => i.itemId !== item.itemId))} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* RESUMO FINANCEIRO (PRE-FECHAMENTO) */}
                        <div className="p-8 bg-slate-900 text-white space-y-4">
                            <div className="space-y-2 pb-4 border-b border-white/10">
                                <div className="flex justify-between text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    <span>Subtotal Itens</span>
                                    <span className="text-white">R$ {subtotalPaying.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        <span>Taxa de Serviço ({serviceTaxRate}%)</span>
                                        <button 
                                            onClick={() => setUseServiceTax(!useServiceTax)}
                                            className={cn("w-8 h-4 rounded-full transition-colors relative", useServiceTax ? "bg-emerald-500" : "bg-slate-700")}
                                        >
                                            <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", useServiceTax ? "left-4.5" : "left-0.5")} />
                                        </button>
                                    </div>
                                    <span className={cn("transition-all", useServiceTax ? "text-white" : "text-slate-600 line-through")}>
                                        R$ {serviceTaxAmount.toFixed(2)}
                                    </span>
                                </div>
                                {(discount > 0 || surcharge > 0) && (
                                    <div className="flex justify-between text-xs font-medium uppercase tracking-wider">
                                        <span className="text-slate-400">Ajustes</span>
                                        <span className={discount > 0 ? "text-rose-400" : "text-emerald-400"}>
                                            {discount > 0 ? `- R$ ${discount.toFixed(2)}` : `+ R$ ${surcharge.toFixed(2)}`}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex justify-between items-end pt-2">
                                <div>
                                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] leading-none mb-2">Total a Receber</p>
                                    <h3 className="text-4xl font-black tracking-tighter">R$ {totalToPay.toFixed(2).replace('.', ',')}</h3>
                                </div>
                                {amountPaid > 0 && (
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Pago: R$ {amountPaid.toFixed(2)}</p>
                                        <p className={cn("text-lg font-black italic", remainingToPay > 0 ? "text-orange-400" : "text-emerald-400")}>
                                            {remainingToPay > 0 ? `Falta: R$ ${remainingToPay.toFixed(2)}` : `Troco: R$ ${changeAmount.toFixed(2)}`}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </section>

                {/* COLUNA 3: PAGAMENTOS E METODOS */}
                <section className="w-[340px] flex flex-col gap-6">
                    <Card className="flex-1 flex flex-col bg-white border-slate-200 rounded-3xl shadow-sm overflow-hidden" noPadding>
                        <div className="p-5 border-b border-slate-50 bg-slate-50/50">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Escolha o Método</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {paymentMethods.map(m => (
                                    <button 
                                        key={m.id}
                                        onClick={() => setSelectedMethodId(m.id)}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                                            selectedMethodId === m.id 
                                                ? "border-blue-500 bg-blue-50 text-blue-600 shadow-md shadow-blue-50" 
                                                : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        <div className={cn("p-2 rounded-xl", selectedMethodId === m.id ? "bg-blue-600 text-white" : "bg-slate-100")}>
                                            {m.type === 'CASH' ? <Banknote size={20}/> : m.type === 'PIX' ? <QrCode size={20}/> : <CreditCard size={20}/>}
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">{m.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 p-6 space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Valor do Lançamento</label>
                                    {splitValue && <span className="text-[9px] font-black text-blue-500 px-2 py-0.5 bg-blue-50 rounded-full border border-blue-100 uppercase">Sugestão Divisão</span>}
                                </div>
                                <div className="relative group">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300 group-focus-within:text-blue-500 transition-colors">R$</span>
                                    <input 
                                        ref={inputRef}
                                        type="text" 
                                        value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                        className="w-full h-20 pl-14 pr-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-3xl font-black text-slate-900 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleAddPayment}
                                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-100 active:scale-[0.98]"
                            >
                                Registrar Pagamento
                            </button>
                        </div>

                        {/* Pagamentos na Transação Atual */}
                        {currentPayments.length > 0 && (
                            <div className="px-6 pb-6 space-y-2">
                                {currentPayments.map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 animate-in zoom-in-95">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={14} className="text-emerald-500"/>
                                            <span className="text-[10px] font-black text-slate-700 uppercase italic">{p.methodName}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-emerald-600 italic">R$ {p.amount.toFixed(2)}</span>
                                            <button onClick={() => setCurrentPayments(currentPayments.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600"><X size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Button 
                        onClick={handleConfirmPayment}
                        disabled={remainingToPay > 0 || currentPayments.length === 0}
                        className={cn(
                            "h-24 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95",
                            remainingToPay === 0 && currentPayments.length > 0 
                                ? "bg-slate-900 text-white shadow-slate-200" 
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                    >
                        Concluir e Liberar
                    </Button>
                </section>
            </div>

            {/* OVERLAY DE DESCONTOS/ACRESCIMOS (OPCIONAL - DESIGN FUTURO) */}
            <div className="fixed bottom-8 left-8 flex gap-3 z-20">
                <button onClick={() => setDiscount(prev => prev + 5)} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-rose-500 hover:bg-rose-50 transition-colors shadow-sm flex items-center gap-2">
                    <MinusCircle size={14}/> Desconto R$ 5
                </button>
                <button onClick={() => setSurcharge(prev => prev + 5)} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-emerald-500 hover:bg-emerald-50 transition-colors shadow-sm flex items-center gap-2">
                    <PlusCircle size={14}/> Acréscimo R$ 5
                </button>
                {(discount > 0 || surcharge > 0) && (
                    <button onClick={() => {setDiscount(0); setSurcharge(0)}} className="px-4 py-2 bg-slate-900 text-white rounded-full text-[10px] font-bold hover:bg-slate-800 transition-colors shadow-sm">
                        Limpar Ajustes
                    </button>
                )}
            </div>
        </div>
    );
};

export default TableCheckout;