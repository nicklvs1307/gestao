import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
    Plus, Search, ShoppingCart, Receipt, Calendar, 
    CheckCircle, Clock, Trash2, ChevronRight, FileText, 
    DollarSign, Loader2, Package, User, X, AlertTriangle,
    ArrowUpRight, ArrowDownLeft, Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const StockPurchases: React.FC = () => {
    const [purchases, setPurchases] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [ingredients, setIngredients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    
    // FORM STATE
    const [formData, setFormData] = useState<any>({
        invoiceNumber: '',
        supplierId: '',
        receivedAt: new Date().toISOString().split('T')[0],
        items: []
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [purRes, supRes, ingRes] = await Promise.all([
                api.get('/stock/entries'),
                api.get('/financial/suppliers'),
                api.get('/ingredients')
            ]);
            setPurchases(purRes.data);
            setSuppliers(supRes.data);
            setIngredients(ingRes.data);
        } catch (error) {
            toast.error("Erro ao sincronizar dados de compras.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (id: string) => {
        if (!confirm('Confirmar entrada desta nota? O estoque será atualizado imediatamente.')) return;
        try {
            await api.put(`/stock/entries/${id}/confirm`);
            toast.success('Entrada confirmada e estoque atualizado!');
            loadData();
        } catch (e) {
            toast.error('Erro ao confirmar entrada.');
        }
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { ingredientId: '', quantity: 0, unitCost: 0 }]
        });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.items.length === 0) return toast.error("Adicione ao menos um item na nota.");
        
        try {
            await api.post('/stock/entries', formData);
            toast.success('Nota Fiscal lançada com sucesso!');
            setShowForm(false);
            setFormData({ invoiceNumber: '', supplierId: '', receivedAt: new Date().toISOString().split('T')[0], items: [] });
            loadData();
        } catch (error) {
            toast.error('Erro ao salvar nota fiscal.');
        }
    };

    const filtered = purchases.filter(p => 
        p.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalSpent = purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);

    return (
        <div className="space-y-6 animate-in slide-in-from-right-2 duration-500">
            {/* KPI CARDS - ALTA DENSIDADE */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 bg-slate-900 text-white border-none shadow-xl relative overflow-hidden group">
                    <ShoppingCart size={80} className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative z-10">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Volume de Compras (Mensal)</p>
                        <h2 className="text-3xl font-black italic tracking-tighter">
                            R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h2>
                        <div className="mt-4 flex items-center gap-2">
                            <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded uppercase tracking-widest border border-emerald-500/20">
                                <ArrowUpRight size={10} className="inline mr-1" /> Eficiência Máxima
                            </span>
                        </div>
                    </div>
                </Card>

                <Card className="p-5 bg-white border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Entradas Confirmadas</p>
                        <h4 className="text-2xl font-black text-slate-900 italic tracking-tighter">
                            {purchases.filter(p => p.status === 'CONFIRMED').length} <span className="text-xs text-slate-400">NFs</span>
                        </h4>
                    </div>
                </Card>

                <Card className="p-5 bg-white border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Pendentes de Conferência</p>
                        <h4 className="text-2xl font-black text-amber-600 italic tracking-tighter">
                            {purchases.filter(p => p.status === 'PENDING').length} <span className="text-xs text-slate-400">NFs</span>
                        </h4>
                    </div>
                </Card>

                <div className="flex items-center justify-end">
                    <Button 
                        onClick={() => { setShowForm(true); setFormData({ invoiceNumber: '', supplierId: '', receivedAt: new Date().toISOString().split('T')[0], items: [] }); }}
                        className="h-16 w-full lg:w-auto px-10 rounded-2xl shadow-xl shadow-orange-500/20 font-black italic tracking-tighter uppercase text-[11px] bg-orange-500 text-white hover:bg-orange-600 transition-all border-none"
                    >
                        <Plus size={20} className="mr-2" /> Lançar Nota Fiscal
                    </Button>
                </div>
            </div>

            {/* TABELA DE GESTÃO */}
            <Card className="overflow-hidden border-slate-200/60 shadow-xl shadow-slate-200/40">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                        <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-sm">Registro de Entradas de Mercadorias</h3>
                    </div>
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar por Nota ou Fornecedor..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="ui-input w-full pl-11 h-10 text-[11px] font-bold uppercase tracking-widest"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                            <Loader2 className="animate-spin text-orange-500" size={32} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando Compras...</span>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-100 bg-slate-50/20">
                                    <th className="px-8 py-5">Data Entrada</th>
                                    <th className="px-8 py-5">Identificação Doc.</th>
                                    <th className="px-8 py-5">Fornecedor / Parceiro</th>
                                    <th className="px-8 py-5 text-right">Valor Líquido</th>
                                    <th className="px-8 py-5 text-center">Status Fiscal</th>
                                    <th className="px-8 py-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={6} className="p-20 text-center text-slate-400 font-bold italic text-sm">Nenhum registro de compra encontrado.</td></tr>
                                ) : filtered.map((p) => (
                                    <tr key={p.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                                        <td className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-tighter italic">
                                            {format(new Date(p.receivedAt), 'dd/MM/yyyy')}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                                    <FileText size={16} />
                                                </div>
                                                <span className="text-[11px] font-black text-slate-900 uppercase italic tracking-tighter">NF: {p.invoiceNumber || 'S/N'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-700 uppercase italic">{p.supplier?.name || 'Venda Balcão / Outros'}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Homologado</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-xs italic tracking-tighter text-slate-900">
                                            R$ {p.totalAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                                p.status === 'CONFIRMED' ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-amber-100 text-amber-700 border border-amber-200"
                                            )}>
                                                {p.status === 'CONFIRMED' ? 'Confirmado' : 'Aguardando Conferência'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                {p.status === 'PENDING' && (
                                                    <Button 
                                                        variant="ghost" size="icon" 
                                                        className="w-9 h-9 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl shadow-sm transition-all"
                                                        onClick={() => handleConfirm(p.id)}
                                                        title="Confirmar Entrada"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="w-9 h-9 bg-slate-100 text-slate-400 hover:bg-orange-50 hover:text-orange-500 rounded-xl">
                                                    <ChevronRight size={18} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            {/* MODAL LANÇAMENTO DE NOTA */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowForm(false)} />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
                        >
                            <header className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                                        <Receipt size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Lançar Nota Fiscal de Entrada</h3>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Atualização de Estoque & Contas a Pagar</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowForm(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100 transition-all hover:rotate-90">
                                    <X size={20} />
                                </button>
                            </header>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                                {/* DADOS CABEÇALHO DA NOTA */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Número da Nota (NF-e)</label>
                                        <input 
                                            type="text" className="ui-input w-full h-12 text-sm font-bold uppercase" placeholder="Ex: 000.123.456"
                                            value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Fornecedor</label>
                                        <select 
                                            className="ui-input w-full h-12 text-[11px] font-bold uppercase bg-slate-50 border-none"
                                            value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})} required
                                        >
                                            <option value="">Selecione o Fornecedor...</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data de Recebimento</label>
                                        <input 
                                            type="date" className="ui-input w-full h-12 text-sm font-bold"
                                            value={formData.receivedAt} onChange={e => setFormData({...formData, receivedAt: e.target.value})} required
                                        />
                                    </div>
                                </div>

                                {/* TABELA DE ITENS DA NOTA */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                                            <Package size={14} className="text-orange-500" /> Itens Contidos na Nota
                                        </label>
                                        <button 
                                            type="button" onClick={handleAddItem}
                                            className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 tracking-widest flex items-center gap-1.5"
                                        >
                                            <Plus size={14} /> Adicionar Insumo
                                        </button>
                                    </div>

                                    <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-slate-50/30">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50">
                                                <tr className="text-[8px] font-black uppercase text-slate-400 tracking-widest">
                                                    <th className="px-6 py-4">Insumo</th>
                                                    <th className="px-6 py-4 w-32">Quantidade</th>
                                                    <th className="px-6 py-4 w-40">Custo Unitário</th>
                                                    <th className="px-6 py-4 w-32 text-right">Subtotal</th>
                                                    <th className="px-6 py-4 w-16"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {formData.items.length === 0 ? (
                                                    <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic text-[10px] font-bold">Nenhum item adicionado à nota fiscal.</td></tr>
                                                ) : formData.items.map((item: any, index: number) => (
                                                    <tr key={index}>
                                                        <td className="px-6 py-3">
                                                            <select 
                                                                className="ui-input w-full h-10 text-[10px] font-bold uppercase bg-white border-slate-200"
                                                                value={item.ingredientId} onChange={e => handleItemChange(index, 'ingredientId', e.target.value)} required
                                                            >
                                                                <option value="">Selecione o Insumo...</option>
                                                                {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <input 
                                                                type="number" step="0.001" className="ui-input w-full h-10 text-xs font-black italic bg-white border-slate-200"
                                                                value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value))} required
                                                            />
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                                                                <input 
                                                                    type="number" step="0.01" className="ui-input w-full h-10 pl-8 text-xs font-black italic bg-white border-slate-200"
                                                                    value={item.unitCost} onChange={e => handleItemChange(index, 'unitCost', parseFloat(e.target.value))} required
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            <span className="text-xs font-black italic text-slate-900">
                                                                R$ {(item.quantity * item.unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            <button 
                                                                type="button" onClick={() => handleRemoveItem(index)}
                                                                className="w-8 h-8 rounded-lg text-slate-300 hover:text-rose-500 transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* TOTALIZADOR E AVISO */}
                                <div className="flex flex-col md:flex-row items-end justify-between gap-6 pt-6">
                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex gap-3 max-w-md">
                                        <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                                        <p className="text-[9px] font-bold text-blue-800 leading-relaxed uppercase">
                                            Ao salvar, o sistema gerará uma movimentação de estoque "Pendente". Após a conferência física, confirme a nota para atualizar os saldos.
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Geral da Nota Fiscal</p>
                                        <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 leading-none">
                                            R$ {formData.items.reduce((acc: number, item: any) => acc + (item.quantity * item.unitCost), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </h2>
                                    </div>
                                </div>

                                <div className="pt-6 flex gap-4 shrink-0">
                                    <Button type="button" variant="ghost" className="flex-1 rounded-2xl h-16 uppercase text-[10px] font-black tracking-widest" onClick={() => setShowForm(false)}>Descartar Nota</Button>
                                    <Button type="submit" className="flex-[2] h-16 rounded-2xl shadow-xl shadow-orange-500/20 uppercase text-[10px] font-black tracking-widest italic bg-orange-500 text-white">
                                        Finalizar Lançamento de NF
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

export default StockPurchases;
