import React, { useState, useEffect } from 'react';
import { 
    Users, Search, Edit2, Trash2, MapPin, 
    Phone, ShoppingBag, ChevronLeft, ChevronRight, 
    X, CheckCircle2, History, Filter, UserPlus
} from 'lucide-react';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const CustomerManagement: React.FC = () => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<any>(null);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/customers?search=${searchTerm}&page=${page}`);
            setCustomers(res.data.customers);
            setTotalPages(res.data.pages);
        } catch (error) {
            toast.error('Erro ao carregar clientes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchCustomers, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, page]);

    const handleEditClick = (customer: any) => {
        setCustomerToEdit({ ...customer });
        setEditModalOpen(true);
    };

    const handleDeleteClick = async (id: string) => {
        if (!confirm('Deseja realmente excluir este cliente?')) return;
        try {
            await api.delete(`/customers/${id}`);
            toast.success('Cliente excluído!');
            fetchCustomers();
        } catch (error) {
            toast.error('Erro ao excluir cliente');
        }
    };

    const handleSaveCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Recalcula o campo address string para compatibilidade
            const fullAddr = `${customerToEdit.street || ''}, ${customerToEdit.number || ''} - ${customerToEdit.neighborhood || ''}, ${customerToEdit.city || ''}/${customerToEdit.state || ''}`.trim();
            
            await api.put(`/customers/${customerToEdit.id}`, {
                ...customerToEdit,
                address: fullAddr
            });
            toast.success('Dados atualizados com sucesso!');
            setEditModalOpen(false);
            fetchCustomers();
        } catch (error) {
            toast.error('Erro ao salvar alterações');
        }
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-500 max-w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 ui-card p-4">
                <div>
                    <h2 className="text-xl font-black text-foreground uppercase tracking-tighter italic flex items-center gap-2">
                        <Users size={24} className="text-primary" /> Clientes
                    </h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Base de dados e histórico.</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="relative group w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            className="ui-input w-full pl-10 h-10 text-xs"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        />
                    </div>
                    <button className="ui-button-secondary h-10 px-3">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            {/* Tabela */}
            <div className="ui-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[9px] uppercase bg-muted/10 text-slate-400 border-b border-border font-black tracking-widest">
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">Contato</th>
                                <th className="px-6 py-3">Localização</th>
                                <th className="px-6 py-3 text-center">Fidelidade</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-foreground">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4"><div className="h-8 bg-muted rounded-lg" /></td>
                                    </tr>
                                ))
                            ) : customers.length > 0 ? (
                                customers.map((c) => (
                                    <tr key={c.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm border border-primary/20">
                                                    {c.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-xs uppercase italic tracking-tight">{c.name}</p>
                                                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">ID: {c.id.slice(-6).toUpperCase()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                                                <Phone size={12} className="text-primary" /> {c.phone}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex flex-col">
                                                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                                                    {c.street ? `${c.street}, ${c.number}` : 'S/ Endereço'}
                                                </p>
                                                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">
                                                    {c.city} - {c.state}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border border-blue-100 dark:border-blue-900/30">
                                                    {c.loyaltyPoints || 0} Pts
                                                </div>
                                                <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border border-orange-100 dark:border-orange-900/30">
                                                    R$ {(c.cashbackBalance || 0).toFixed(2)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button 
                                                    onClick={() => handleEditClick(c)}
                                                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(c.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <Users size={40} className="mx-auto opacity-20 mb-2" />
                                        <p className="font-black text-[10px] uppercase tracking-widest">Nenhum cliente</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-border flex items-center justify-between bg-muted/10">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Pág. {page} / {totalPages}
                        </p>
                        <div className="flex gap-1.5">
                            <button 
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="p-2 ui-button-secondary h-8 w-8 disabled:opacity-30"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button 
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="p-2 ui-button-secondary h-8 w-8 disabled:opacity-30"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Edição */}
            {isEditModalOpen && customerToEdit && (
                <div className="ui-modal-overlay">
                    <div className="ui-modal-content w-full max-w-xl">
                        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-foreground uppercase italic tracking-tight flex items-center gap-2">
                                    <Edit2 size={20} className="text-primary" /> Editar Cliente
                                </h3>
                            </div>
                            <button onClick={() => setEditModalOpen(false)} className="p-2 hover:bg-muted rounded-full text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCustomer} className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome Completo</label>
                                    <input 
                                        type="text" 
                                        className="ui-input w-full"
                                        value={customerToEdit.name}
                                        onChange={(e) => setCustomerToEdit({ ...customerToEdit, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Telefone</label>
                                    <input 
                                        type="text" 
                                        className="ui-input w-full"
                                        value={customerToEdit.phone}
                                        onChange={(e) => setCustomerToEdit({ ...customerToEdit, phone: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="bg-muted/20 p-4 rounded-xl border border-border space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-foreground italic flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-primary" /> Fidelidade
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Pontos</label>
                                        <input 
                                            type="number" 
                                            className="ui-input w-full h-10 text-xs"
                                            value={customerToEdit.loyaltyPoints}
                                            onChange={(e) => setCustomerToEdit({ ...customerToEdit, loyaltyPoints: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Cashback (R$)</label>
                                        <input 
                                            type="number" step="0.01"
                                            className="ui-input w-full h-10 text-xs"
                                            value={customerToEdit.cashbackBalance}
                                            onChange={(e) => setCustomerToEdit({ ...customerToEdit, cashbackBalance: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Cidade</label>
                                    <input className="ui-input w-full" value={customerToEdit.city || ''} onChange={(e) => setCustomerToEdit({ ...customerToEdit, city: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Estado</label>
                                    <input className="ui-input w-full" value={customerToEdit.state || ''} onChange={(e) => setCustomerToEdit({ ...customerToEdit, state: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Número</label>
                                    <input className="ui-input w-full" value={customerToEdit.number || ''} onChange={(e) => setCustomerToEdit({ ...customerToEdit, number: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Rua / Logradouro</label>
                                <input className="ui-input w-full" value={customerToEdit.street || ''} onChange={(e) => setCustomerToEdit({ ...customerToEdit, street: e.target.value })} />
                            </div>
                        </form>

                        <div className="px-6 py-4 bg-muted/10 border-t border-border flex justify-end gap-3">
                            <button type="button" onClick={() => setEditModalOpen(false)} className="ui-button-secondary flex-1">Cancelar</button>
                            <button onClick={handleSaveCustomer} className="ui-button-primary flex-[2] uppercase text-xs">
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManagement;
