import React, { useState, useEffect } from 'react';
import { 
    Users, Search, Edit2, Trash2, MapPin, 
    Phone, ChevronLeft, ChevronRight, 
    X, CheckCircle, Filter, DollarSign, Wallet, Loader2, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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
            const fullAddr = `${customerToEdit.street || ''}, ${customerToEdit.number || ''} - ${customerToEdit.neighborhood || ''}, ${customerToEdit.city || ''}/${customerToEdit.state || ''}`.trim();
            
            await api.put(`/customers/${customerToEdit.id}`, {
                ...customerToEdit,
                address: fullAddr
            });
            toast.success('Cliente atualizado!');
            setEditModalOpen(false);
            fetchCustomers();
        } catch (error) {
            toast.error('Erro ao salvar alterações');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Premium */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Clientes</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                        <Users size={14} className="text-orange-500" /> Base de Dados e Fidelização
                    </p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="Nome ou telefone..." 
                            className="ui-input w-full pl-12 h-12 text-sm bg-white"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        />
                    </div>
                    <Button variant="outline" size="icon" className="bg-white rounded-xl h-12 w-12" onClick={fetchCustomers}>
                        <RefreshCw size={18} />
                    </Button>
                </div>
            </div>

            {/* Listagem Estilo Tabela Premium */}
            <Card className="p-0 overflow-hidden border-slate-200 shadow-xl bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 bg-slate-50/30">
                                <th className="px-8 py-4">Informações do Cliente</th>
                                <th className="px-8 py-4">Contato Direto</th>
                                <th className="px-8 py-4">Localização Principal</th>
                                <th className="px-8 py-4 text-center">Pontos / Cashback</th>
                                <th className="px-8 py-4 text-right">Gerenciar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-900">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-8 py-6"><div className="h-10 bg-slate-100 rounded-2xl w-full" /></td>
                                    </tr>
                                ))
                            ) : customers.length > 0 ? (
                                customers.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-11 w-11 rounded-2xl bg-slate-900 text-orange-500 flex items-center justify-center font-black text-lg italic border-2 border-slate-800 shadow-lg group-hover:scale-110 transition-transform">
                                                    {c.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-black text-xs text-slate-900 uppercase italic tracking-tight leading-none mb-1">{c.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">REF: {c.id.slice(-6).toUpperCase()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2 text-xs font-black text-slate-600 italic">
                                                <Phone size={14} className="text-orange-500" /> {c.phone}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-start gap-2">
                                                <MapPin size={14} className="text-slate-300 mt-0.5 shrink-0" />
                                                <div className="flex flex-col">
                                                    <p className="text-[11px] font-bold text-slate-700 uppercase italic leading-tight truncate max-w-[200px]">
                                                        {c.street ? `${c.street}, ${c.number}` : 'S/ Endereço Cadastrado'}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                                        {c.city || 'Cidade'} • {c.state || 'UF'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="flex gap-1.5">
                                                    <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase border border-blue-100 shadow-sm flex items-center gap-1">
                                                        <CheckCircle size={10} /> {c.loyaltyPoints || 0} Pts
                                                    </span>
                                                    <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase border border-emerald-100 shadow-sm flex items-center gap-1">
                                                        <Wallet size={10} /> R$ {(c.cashbackBalance || 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => handleEditClick(c)}
                                                    className="h-10 w-10 bg-slate-100 hover:bg-orange-50 text-slate-400 hover:text-orange-600 rounded-xl"
                                                >
                                                    <Edit2 size={16} />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => handleDeleteClick(c.id)}
                                                    className="h-10 w-10 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-24 text-center">
                                        <Users size={64} strokeWidth={1} className="mx-auto text-slate-200 mb-4 opacity-30" />
                                        <p className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-300 italic">Nenhum cliente na base</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginação Premium */}
                {totalPages > 1 && (
                    <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                            Mostrando página {page} de {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="bg-white rounded-xl h-10 w-10 p-0"
                            >
                                <ChevronLeft size={18} />
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm"
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="bg-white rounded-xl h-10 w-10 p-0"
                            >
                                <ChevronRight size={18} />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Modal de Edição Premium */}
            <AnimatePresence>
                {isEditModalOpen && customerToEdit && (
                    <div className="ui-modal-overlay">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="ui-modal-content w-full max-w-2xl overflow-hidden flex flex-col">
                            <header className="px-10 py-8 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl shadow-slate-200">
                                        <Edit2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Editar Cliente</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Atualização Cadastral</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setEditModalOpen(false)} className="rounded-full bg-slate-50"><X size={24} /></Button>
                            </header>

                            <form onSubmit={handleSaveCustomer} id="customer-form" className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-slate-50/30 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input label="Nome do Cliente" value={customerToEdit.name} onChange={(e) => setCustomerToEdit({ ...customerToEdit, name: e.target.value })} required />
                                    <Input label="Telefone / WhatsApp" value={customerToEdit.phone} onChange={(e) => setCustomerToEdit({ ...customerToEdit, phone: e.target.value })} required />
                                </div>

                                <Card className="p-6 border-blue-100 bg-blue-50/20 space-y-6">
                                    <h4 className="text-xs font-black text-blue-900 uppercase italic flex items-center gap-2">
                                        <DollarSign size={16} className="text-blue-500" /> Gestão de Fidelidade
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <Input label="Saldo de Pontos" type="number" value={customerToEdit.loyaltyPoints} onChange={(e) => setCustomerToEdit({ ...customerToEdit, loyaltyPoints: parseInt(e.target.value) || 0 })} />
                                        <Input label="Cashback Acumulado (R$)" type="number" step="0.01" value={customerToEdit.cashbackBalance} onChange={(e) => setCustomerToEdit({ ...customerToEdit, cashbackBalance: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </Card>

                                <div className="space-y-6 pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MapPin size={14} /> Endereço Principal</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-2"><Input label="Cidade" value={customerToEdit.city || ''} onChange={(e) => setCustomerToEdit({ ...customerToEdit, city: e.target.value })} /></div>
                                        <Input label="UF" value={customerToEdit.state || ''} onChange={(e) => setCustomerToEdit({ ...customerToEdit, state: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="col-span-3"><Input label="Rua / Avenida" value={customerToEdit.street || ''} onChange={(e) => setCustomerToEdit({ ...customerToEdit, street: e.target.value })} /></div>
                                        <Input label="Nº" value={customerToEdit.number || ''} onChange={(e) => setCustomerToEdit({ ...customerToEdit, number: e.target.value })} />
                                    </div>
                                </div>
                            </form>

                            <footer className="px-10 py-6 bg-white border-t border-slate-100 flex gap-4 shrink-0">
                                <Button variant="ghost" onClick={() => setEditModalOpen(false)} className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400">Cancelar</Button>
                                <Button type="submit" form="customer-form" className="flex-[2] h-14 rounded-2xl shadow-xl shadow-slate-200 uppercase tracking-widest italic font-black">SALVAR ALTERAÇÕES</Button>
                            </footer>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomerManagement;