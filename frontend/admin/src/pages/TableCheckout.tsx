import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
    ChevronLeft, 
    Users, 
    Clock, 
    DollarSign, 
    ArrowRightLeft, 
    Plus, 
    Minus, 
    MinusCircle,
    Ticket,
    Trash2, 
    CreditCard, 
    Banknote, 
    QrCode, 
    Percent, 
    PlusCircle,
    CheckCircle2,
    Loader2,
    Printer,
    History
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

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
    
    // Estado para o carrinho de pagamento parcial
    const [selectedItems, setSelectedItems] = useState<{itemId: string, quantity: number, price: number, name: string}[]>([]);
    const [currentPayments, setCurrentPayments] = useState<{method: string, amount: number}[]>([]);
    const [discount, setDiscount] = useState(0);
    const [surcharge, setSurcharge] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

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
            navigate('/tables');
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentMethods = async () => {
        try {
            const res = await api.get('/admin/payment-methods');
            setPaymentMethods(res.data.filter((m: any) => m.isActive));
        } catch (err) {
            console.error(err);
        }
    };

    const addToSelected = (item: OrderItem, qty: number) => {
        const existing = selectedItems.find(i => i.itemId === item.id);
        const availableQty = item.quantity - (existing?.quantity || 0);

        if (qty > availableQty) qty = availableQty;
        if (qty <= 0) return;

        if (existing) {
            setSelectedItems(selectedItems.map(i => 
                i.itemId === item.id ? { ...i, quantity: i.quantity + qty } : i
            ));
        } else {
            setSelectedItems([...selectedItems, { 
                itemId: item.id, 
                quantity: qty, 
                price: item.priceAtTime, 
                name: item.product.name 
            }]);
        }
    };

    const removeFromSelected = (itemId: string, qty: number) => {
        const existing = selectedItems.find(i => i.itemId === itemId);
        if (!existing) return;

        if (existing.quantity <= qty) {
            setSelectedItems(selectedItems.filter(i => i.itemId !== itemId));
        } else {
            setSelectedItems(selectedItems.map(i => 
                i.itemId === itemId ? { ...i, quantity: i.quantity - qty } : i
            ));
        }
    };

    const handleAddPayment = () => {
        if (!selectedMethod || !inputValue) {
            toast.error("Selecione um método e informe o valor");
            return;
        }

        const amount = parseFloat(inputValue.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) return;

        setCurrentPayments([...currentPayments, { method: selectedMethod, amount }]);
        setInputValue('');
        setSelectedMethod(null);
    };

    const subtotalSelected = selectedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const totalSelected = subtotalSelected + surcharge - discount;
    const amountPaid = currentPayments.reduce((acc, p) => acc + p.amount, 0);
    const remainingToPay = Math.max(0, totalSelected - amountPaid);

    const handleFinalizePartial = async () => {
        if (currentPayments.length === 0) {
            toast.error("Adicione ao menos um pagamento");
            return;
        }

        if (amountPaid < totalSelected) {
            toast.error("O valor pago é menor que o total selecionado");
            return;
        }

        try {
            const tableRes = await api.get('/admin/tables');
            const table = tableRes.data.find((t: any) => t.number === order.tableNumber);
            
            await api.post(`/admin/tables/${table.id}/partial-payment`, {
                itemIds: selectedItems.map(i => i.itemId),
                payments: currentPayments,
                discount,
                surcharge
            });

            toast.success("Pagamento parcial realizado!");
            setSelectedItems([]);
            setCurrentPayments([]);
            setDiscount(0);
            setSurcharge(0);
            fetchOrder();
        } catch (err) {
            toast.error("Erro ao processar pagamento parcial");
        }
    };

    const handleCloseTable = async () => {
        if (!order) return;
        try {
            const tableRes = await api.get('/admin/tables');
            const table = tableRes.data.find((t: any) => t.number === order.tableNumber);

            await api.post(`/admin/tables/${table.id}/checkout`, {
                orderIds: [order.id],
                payments: currentPayments
            });
            toast.success("Mesa fechada com sucesso!");
            navigate('/tables');
        } catch (err) {
            toast.error("Erro ao fechar mesa");
        }
    };

    if (loading || !order) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-orange-500" size={40} /></div>;

    const timeOpen = () => {
        const diff = new Date().getTime() - new Date(order.createdAt).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h ${mins % 60}m`;
        if (hours > 0) return `${hours}h ${mins % 60}m`;
        return `${mins}min`;
    };

    return (
        <div className="h-screen flex flex-col bg-[#f4f7f6] overflow-hidden font-sans">
            {/* Header POS */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/tables')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ChevronLeft size={24} className="text-slate-600" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-900 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                            {order.tableNumber}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Mesa {order.tableNumber}</h1>
                                <button className="p-1 hover:text-orange-500 transition-colors"><ArrowRightLeft size={16}/></button>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                                <span className="flex items-center gap-1"><Users size={12}/> {order.customerName || 'Cliente Geral'}</span>
                                <span className="flex items-center gap-1"><Clock size={12}/> {timeOpen()}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right mr-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total da Mesa</p>
                        <p className="text-2xl font-black text-slate-900 italic tracking-tighter">R$ {order.total.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <Button variant="outline" className="rounded-xl border-slate-200 h-12 px-6 font-black uppercase tracking-widest text-[10px]"><Printer className="mr-2" size={16}/> Prévia</Button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex overflow-hidden p-6 gap-6">
                
                {/* Column 1: Items in Account */}
                <section className="w-1/3 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><History size={14}/> Itens em Aberto</h2>
                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-blue-600" onClick={() => order.items.filter(i => !i.isPaid).forEach(i => addToSelected(i, i.quantity))}>PAGAR TUDO</Button>
                    </div>
                    <Card className="flex-1 overflow-y-auto p-0 border-slate-200 bg-white shadow-sm" noPadding>
                        <div className="divide-y divide-slate-50">
                            {order.items.filter(i => !i.isPaid).map((item) => {
                                const inCart = selectedItems.find(si => si.itemId === item.id)?.quantity || 0;
                                const available = item.quantity - inCart;

                                return (
                                    <div key={item.id} className={cn("p-4 group transition-colors", available === 0 ? "opacity-40 bg-slate-50" : "hover:bg-slate-50/50")}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <h4 className="text-xs font-black text-slate-900 uppercase italic leading-tight">{item.product.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{item.quantity} un x R$ {item.priceAtTime.toFixed(2)}</p>
                                            </div>
                                            <span className="text-sm font-black text-slate-900 italic">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                                        </div>
                                        {available > 0 && (
                                            <div className="flex gap-2 mt-3">
                                                <Button 
                                                    variant="outline" 
                                                    className="h-8 flex-1 rounded-lg text-[9px] font-black uppercase border-slate-200 hover:border-blue-500 hover:text-blue-600"
                                                    onClick={() => addToSelected(item, 1)}
                                                >
                                                    <PlusCircle size={12} className="mr-1"/> Adicionar 1
                                                </Button>
                                                <Button 
                                                    variant="outline"
                                                    className="h-8 flex-1 rounded-lg text-[9px] font-black uppercase border-slate-200 hover:border-blue-500 hover:text-blue-600"
                                                    onClick={() => addToSelected(item, item.quantity)}
                                                >
                                                    Todos
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </section>

                {/* Column 2: Selection & Partial Total */}
                <section className="w-1/3 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500"/> Selecionados para Pagar</h2>
                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-rose-500" onClick={() => setSelectedItems([])}>LIMPAR</Button>
                    </div>
                    
                    <Card className="flex-1 overflow-y-auto p-0 border-slate-200 bg-white shadow-md ring-4 ring-slate-100" noPadding>
                        {selectedItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-10 text-center opacity-20">
                                <DollarSign size={48} strokeWidth={1} className="mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum item selecionado para pagamento parcial</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {selectedItems.map((item) => (
                                    <div key={item.itemId} className="p-4 bg-emerald-50/30">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-center">
                                                    <button onClick={() => removeFromSelected(item.itemId, 1)} className="p-1 hover:bg-white rounded-md text-rose-500"><Minus size={14}/></button>
                                                    <span className="text-xs font-black text-slate-900">{item.quantity}</span>
                                                    <button onClick={() => addToSelected(order.items.find(i => i.id === item.itemId)!, 1)} className="p-1 hover:bg-white rounded-md text-emerald-500"><Plus size={14}/></button>
                                                </div>
                                                <div>
                                                    <h4 className="text-[10px] font-black text-slate-800 uppercase italic leading-tight">{item.name}</h4>
                                                    <p className="text-[9px] font-bold text-slate-400">R$ {item.price.toFixed(2)} un</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-slate-900 italic">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                                <button onClick={() => removeFromSelected(item.itemId, item.quantity)} className="text-rose-400 hover:text-rose-600"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Fees & Discounts Area */}
                    <Card className="p-4 border-slate-200 bg-white space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setDiscount(prev => prev + 5)} className="h-10 border border-rose-100 bg-rose-50 rounded-xl text-rose-600 text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-rose-100">
                                <MinusCircle size={14}/> Desconto R$ 5
                            </button>
                            <button onClick={() => setSurcharge(prev => prev + 5)} className="h-10 border border-emerald-100 bg-emerald-50 rounded-xl text-emerald-600 text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-emerald-100">
                                <PlusCircle size={14}/> Acréscimo R$ 5
                            </button>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-slate-50">
                            <span className="text-[10px] font-black uppercase text-slate-400">Subtotal Selecionado</span>
                            <span className="text-sm font-bold text-slate-600 italic">R$ {subtotalSelected.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between items-center text-rose-600">
                                <span className="text-[10px] font-black uppercase">Desconto Total</span>
                                <span className="text-sm font-bold italic">- R$ {discount.toFixed(2)}</span>
                            </div>
                        )}
                        {surcharge > 0 && (
                            <div className="flex justify-between items-center text-emerald-600">
                                <span className="text-[10px] font-black uppercase">Acréscimo Total</span>
                                <span className="text-sm font-bold italic">+ R$ {surcharge.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-900/10">
                            <span className="text-xs font-black uppercase text-slate-900">Total a Pagar</span>
                            <span className="text-xl font-black text-slate-900 italic">R$ {totalSelected.toFixed(2).replace('.', ',')}</span>
                        </div>
                    </Card>
                </section>

                {/* Column 3: Payment Methods & Finalization */}
                <section className="w-1/3 flex flex-col gap-4">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 px-2 flex items-center gap-2"><CreditCard size={14}/> Métodos de Pagamento</h2>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {paymentMethods.map((m) => (
                            <button 
                                key={m.id}
                                onClick={() => setSelectedMethod(m.name)}
                                className={cn(
                                    "h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                                    selectedMethod === m.name 
                                        ? "border-orange-500 bg-orange-50 text-orange-600 shadow-lg shadow-orange-100" 
                                        : "border-white bg-white text-slate-400 hover:border-slate-200 shadow-sm"
                                )}
                            >
                                {m.type === 'CASH' && <Banknote size={20}/>}
                                {m.type === 'PIX' && <QrCode size={20}/>}
                                {(m.type === 'CREDIT_CARD' || m.type === 'DEBIT_CARD') && <CreditCard size={20}/>}
                                {m.type === 'VOUCHER' && <Percent size={20}/>}
                                <span className="text-[9px] font-black uppercase tracking-widest">{m.name}</span>
                            </button>
                        ))}
                    </div>

                    <Card className="p-6 border-slate-200 bg-white space-y-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Valor a Adicionar</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">R$</span>
                                <input 
                                    type="text" 
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={remainingToPay.toFixed(2)}
                                    className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black text-slate-900 focus:border-orange-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {[10, 20, 50].map(val => (
                                <button key={val} onClick={() => setInputValue(val.toFixed(2))} className="h-10 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black text-slate-600">R$ {val}</button>
                            ))}
                        </div>

                        <Button 
                            fullWidth 
                            className="h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-100 italic"
                            onClick={handleAddPayment}
                        >
                            ADICIONAR PAGAMENTO
                        </Button>
                    </Card>

                    <Card className="flex-1 overflow-y-auto p-4 border-slate-200 bg-white/50" noPadding>
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Pagamentos Adicionados</h4>
                        <div className="space-y-2">
                            {currentPayments.map((p, i) => (
                                <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-900 uppercase italic">{p.method}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black text-emerald-600 italic">R$ {p.amount.toFixed(2)}</span>
                                        <button onClick={() => setCurrentPayments(currentPayments.filter((_, idx) => idx !== i))} className="text-rose-400 hover:text-rose-600"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                            {currentPayments.length === 0 && (
                                <p className="text-center py-10 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Nenhum pagamento</p>
                            )}
                        </div>
                    </Card>

                    {/* Final Action Buttons */}
                    <div className="grid grid-cols-2 gap-4 mt-auto">
                        <Button 
                            variant="outline" 
                            className="h-16 rounded-2xl border-slate-200 text-slate-500 bg-white flex flex-col items-center justify-center gap-1 group"
                            onClick={() => navigate('/tables')}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-rose-500">Voltar</span>
                        </Button>
                        <Button 
                            className={cn(
                                "h-16 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-1 italic",
                                remainingToPay === 0 && amountPaid > 0 ? "bg-slate-900 text-white" : "bg-orange-500 text-white"
                            )}
                            onClick={remainingToPay === 0 ? handleFinalizePartial : undefined}
                            disabled={remainingToPay > 0}
                        >
                            <span className="text-xs font-black uppercase tracking-widest">Confirmar Pagamento</span>
                            <span className="text-[9px] opacity-80 font-bold tracking-widest">R$ {amountPaid.toFixed(2)}</span>
                        </Button>
                    </div>

                    {order.items.every(i => i.isPaid) && (
                        <Button 
                            fullWidth 
                            variant="outline"
                            className="h-14 rounded-2xl border-emerald-500 text-emerald-600 bg-emerald-50 mt-2 font-black uppercase italic"
                            onClick={handleCloseTable}
                        >
                            <CheckCircle2 size={18} className="mr-2"/> FINALIZAR E LIBERAR MESA
                        </Button>
                    )}
                </section>
            </main>
        </div>
    );
};

export default TableCheckout;