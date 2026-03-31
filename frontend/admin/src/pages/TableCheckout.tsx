import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getPaymentMethods } from '../services/api';
import { 
    ChevronLeft, Users, Clock, DollarSign, ArrowRightLeft, 
    Plus, Minus, Trash2, CreditCard, Banknote, QrCode, 
    Percent, PlusCircle, CheckCircle2, Loader2, Printer, 
    History, X, MinusCircle, ChevronDown, User, MoveHorizontal,
    ShoppingCart, Calculator, Receipt, Wallet, Save, Layers
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
    
    // Configurações
    const [serviceTaxRate, setServiceTaxRate] = useState(10);
    const [useServiceTax, setUseServiceTax] = useState(true);
    
    // Carrinho de pagamento
    const [payingItems, setPayingItems] = useState<{itemId: string, quantity: number, price: number, name: string}[]>([]);
    const [currentPayments, setCurrentPayments] = useState<{methodId: string, methodName: string, amount: number}[]>([]);
    const [discount, setDiscount] = useState(0);
    const [surcharge, setSurcharge] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchOrder();
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/orders/${orderId}`);
            setOrder(res.data);
            
            // Busca configurações para taxa de serviço
            try {
                const restRes = await api.get(`/settings`);
                const settings = restRes.data.settings || restRes.data;
                setServiceTaxRate(settings.serviceTaxPercentage || 10);
            } catch (e) { setServiceTaxRate(10); }
            
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
        } catch (err) { console.error(err); }
    };

    // --- LÓGICA FINANCEIRA ---
    const subtotalItems = payingItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const serviceTaxAmount = useServiceTax ? Number((subtotalItems * (serviceTaxRate / 100)).toFixed(2)) : 0;
    const totalToPay = Number((subtotalItems + serviceTaxAmount + surcharge - discount).toFixed(2));
    const amountPaid = currentPayments.reduce((acc, p) => acc + p.amount, 0);
    const remainingToPay = Math.max(0, totalToPay - amountPaid);
    const changeAmount = Math.max(0, amountPaid - totalToPay);

    useEffect(() => {
        if (remainingToPay > 0) setInputValue(remainingToPay.toFixed(2));
        else setInputValue('0.00');
    }, [payingItems, discount, surcharge, useServiceTax, totalToPay, amountPaid]);

    // --- AÇÕES ---
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
        setPayingItems(order.items.filter(i => !i.isPaid).map(i => ({
            itemId: i.id, quantity: i.quantity, price: i.priceAtTime, name: i.product.name
        })));
    };

    const handleAddPayment = () => {
        const method = paymentMethods.find(m => m.id === selectedMethodId);
        if (!method) return toast.error("Selecione um método");
        const amount = parseFloat(inputValue.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) return toast.error("Valor inválido");
        setCurrentPayments([...currentPayments, { methodId: method.id, methodName: method.name, amount }]);
        setInputValue('');
    };

    const handleConfirmPayment = async () => {
        if (currentPayments.length === 0) return toast.error("Adicione um pagamento");
        if (amountPaid < totalToPay) return toast.error("Valor insuficiente");
        try {
            const res = await api.post(`/admin/tables/partial-payment-simple`, {
                orderId: order?.id,
                itemIds: payingItems.map(i => i.itemId),
                payments: currentPayments.map(p => ({ amount: p.amount, method: p.methodName })),
                discount, surcharge: surcharge + serviceTaxAmount
            });
            if (res.data.finished) {
                toast.success("Mesa finalizada!");
                navigate('/pos?tab=tables');
                return;
            }
            toast.success("Pagamento parcial!");
            setPayingItems([]); setCurrentPayments([]); setDiscount(0); setSurcharge(0);
            fetchOrder();
        } catch (e) { toast.error("Erro ao processar"); }
    };

    if (loading || !order) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={40} /></div>;

    return (
        <div className="h-screen flex flex-col bg-slate-100 text-slate-700 overflow-hidden font-sans">
            
            {/* HEADER PRINCIPAL */}
            <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shrink-0 shadow-lg z-20">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/pos?tab=tables')} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tighter">Mesa {order.tableNumber}</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                            {order.customerName || 'Cliente Avulso'} • {format(new Date(order.createdAt), "HH:mm")}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right px-4 border-r border-white/10 mr-2">
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Total Consumido</p>
                        <p className="text-xl font-black">R$ {order.total.toFixed(2)}</p>
                    </div>
                    <Button variant="outline" className="h-10 bg-white/5 border-white/10 text-white hover:bg-white/20 font-bold text-[10px] uppercase">
                        <Printer size={14} className="mr-2"/> Imprimir Pré-Conta
                    </Button>
                    <Button className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase shadow-lg">
                        <Save size={14} className="mr-2"/> Salvar Alterações
                    </Button>
                    <button onClick={() => navigate('/pos?tab=tables')} className="ml-2 w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center hover:bg-rose-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </header>

            {/* CONTEÚDO EM 3 COLUNAS */}
            <main className="flex-1 flex overflow-hidden p-4 gap-4">
                
                {/* COLUNA 1: CONSUMO */}
                <section className="w-1/4 flex flex-col gap-3 min-w-[320px]">
                    <div className="flex gap-2 shrink-0">
                        <Button onClick={payEverything} className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase italic shadow-md">Pagar Tudo</Button>
                        <Button variant="outline" className="flex-1 h-12 border-slate-300 text-slate-500 text-[10px] font-black uppercase italic" onClick={() => {
                             const persons = prompt("Dividir em quantas pessoas?");
                             if(persons) {
                                 const val = (totalToPay / parseInt(persons)).toFixed(2);
                                 setInputValue(val);
                                 toast.info(`Valor sugerido: R$ ${val}`);
                             }
                        }}>Dividir Tudo</Button>
                    </div>

                    <Card className="flex-1 overflow-hidden flex flex-col border-slate-200 shadow-sm" noPadding>
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lista de Itens</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {order.items.filter(i => !i.isPaid).map(item => (
                                <div key={item.id} className={cn("p-3 rounded-xl border transition-all", payingItems.find(pi => pi.itemId === item.id)?.quantity === item.quantity ? "bg-slate-50 border-transparent opacity-50" : "bg-white border-slate-100 shadow-sm")}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 pr-2">
                                            <p className="text-[11px] font-bold text-slate-900 uppercase leading-tight truncate">{item.product.name}</p>
                                            <p className="text-[9px] font-medium text-slate-400 mt-1">{item.quantity} UN x R$ {item.priceAtTime.toFixed(2)}</p>
                                        </div>
                                        <span className="text-[11px] font-black text-slate-900">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => addOneToPayment(item)} className="flex-1 h-7 bg-slate-100 text-slate-600 rounded-lg font-bold text-[9px] uppercase hover:bg-slate-200">Add 1</button>
                                        <button onClick={() => addAllToPayment(item)} className="flex-1 h-7 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg font-bold text-[9px] uppercase hover:bg-blue-600 hover:text-white">Todos</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </section>

                {/* COLUNA 2: TERMINAL DE PAGAMENTO */}
                <section className="flex-1 flex flex-col gap-3">
                    <div className="flex gap-2 shrink-0">
                        <Button onClick={() => setDiscount(d => d + 5)} className="flex-1 h-12 bg-slate-700 hover:bg-slate-800 text-[10px] font-black uppercase">Aplicar Desconto R$ 5</Button>
                        <Button onClick={() => setSurcharge(s => s + 5)} className="flex-1 h-12 bg-slate-700 hover:bg-slate-800 text-[10px] font-black uppercase">Aplicar Acréscimo R$ 5</Button>
                    </div>

                    <Card className="flex-1 flex flex-col border-slate-200 shadow-xl overflow-hidden" noPadding>
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-end shrink-0">
                            <div>
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Total a Receber</p>
                                <h2 className="text-5xl font-black italic tracking-tighter">R$ {totalToPay.toFixed(2).replace('.', ',')}</h2>
                            </div>
                            <div className="text-right">
                                {amountPaid > 0 && <p className="text-sm font-bold text-emerald-400 uppercase">Pago: R$ {amountPaid.toFixed(2)}</p>}
                                <p className={cn("text-lg font-black italic", remainingToPay > 0 ? "text-orange-400" : "text-emerald-400")}>
                                    {remainingToPay > 0 ? `Falta: R$ ${remainingToPay.toFixed(2)}` : `Troco: R$ ${changeAmount.toFixed(2)}`}
                                </p>
                            </div>
                        </div>

                        {/* CONFIG DE TAXA E AJUSTES */}
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                             <div className="flex items-center gap-2">
                                <span>Taxa de Serviço ({serviceTaxRate}%):</span>
                                <button onClick={() => setUseServiceTax(!useServiceTax)} className={cn("w-10 h-5 rounded-full relative transition-colors", useServiceTax ? "bg-emerald-500" : "bg-slate-300")}>
                                    <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", useServiceTax ? "left-6" : "left-1")} />
                                </button>
                             </div>
                             {(discount > 0 || surcharge > 0) && (
                                 <button onClick={() => {setDiscount(0); setSurcharge(0)}} className="text-rose-500 underline underline-offset-4">Limpar Ajustes</button>
                             )}
                        </div>

                        {/* ITENS NO CARRINHO DE PAGAMENTO */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {payingItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                                    <ShoppingCart size={48} className="mb-4" />
                                    <p className="text-xs font-bold uppercase">Selecione itens para pagar</p>
                                </div>
                            ) : (
                                payingItems.map(item => (
                                    <div key={item.itemId} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-lg text-xs font-black">{item.quantity}</div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 uppercase">{item.name}</p>
                                                <p className="text-[9px] font-medium text-slate-400 uppercase">Valor: R$ {item.price.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-black text-slate-900">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                            <button onClick={() => setPayingItems(prev => prev.filter(i => i.itemId !== item.itemId))} className="text-slate-300 hover:text-rose-500 transition-colors">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* PAGAMENTOS JÁ REALIZADOS NESTA TRANSAÇÃO */}
                        {currentPayments.length > 0 && (
                            <div className="p-4 bg-slate-50 border-t border-slate-200">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Lançamentos:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {currentPayments.map((p, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 font-bold text-[10px] uppercase">
                                            {p.methodName}: R$ {p.amount.toFixed(2)}
                                            <button onClick={() => setCurrentPayments(prev => prev.filter((_, i) => i !== idx))}><X size={12}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </section>

                {/* COLUNA 3: MÉTODOS E CONCLUSÃO */}
                <section className="w-1/4 flex flex-col gap-3 min-w-[320px]">
                    <Card className="flex-1 flex flex-col border-slate-200 shadow-sm overflow-hidden" noPadding>
                        <div className="p-4 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">Forma de Recebimento</div>
                        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 custom-scrollbar">
                            {paymentMethods.map(m => (
                                <button key={m.id} onClick={() => setSelectedMethodId(m.id)} className={cn(
                                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                                    selectedMethodId === m.id ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-100 bg-white text-slate-400 hover:bg-slate-50"
                                )}>
                                    {m.type === 'CASH' ? <Banknote size={20}/> : m.type === 'PIX' ? <QrCode size={20}/> : <CreditCard size={20}/>}
                                    <span className="text-[9px] font-black uppercase text-center">{m.name}</span>
                                </button>
                            ))}
                        </div>

                        <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Valor do Pagamento</label>
                                <div className="relative mt-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300">R$</span>
                                    <input ref={inputRef} type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} className="w-full h-16 pl-12 pr-4 bg-white border-2 border-slate-200 rounded-2xl text-2xl font-black text-slate-900 focus:border-blue-500 outline-none transition-all shadow-inner" placeholder="0,00" />
                                </div>
                            </div>
                            <Button onClick={handleAddPayment} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest shadow-lg">Registrar Valor</Button>
                        </div>
                    </Card>

                    <Button onClick={handleConfirmPayment} disabled={remainingToPay > 0 || currentPayments.length === 0} className={cn("h-24 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95", remainingToPay === 0 && currentPayments.length > 0 ? "bg-slate-900 text-white" : "bg-slate-300 text-slate-500 cursor-not-allowed")}>Finalizar e Liberar</Button>
                </section>
            </main>

            {/* BARRA DE RODAPÉ (INFORMAÇÕES EXTRAS) */}
            <footer className="h-14 bg-white border-t border-slate-200 flex items-center justify-between px-6 shrink-0 z-20">
                <Button variant="ghost" className="text-slate-500 hover:text-slate-900 font-bold text-xs uppercase" onClick={() => navigate('/pos?tab=tables')}>
                    <ChevronLeft size={16} className="mr-2"/> Voltar ao Salão
                </Button>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400">
                        <History size={14}/> Pagamentos Realizados: <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">{order.payments?.length || 0}</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default TableCheckout;