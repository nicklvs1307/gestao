import React, { useState, useEffect } from 'react';
import type { PaymentMethod } from '../types';
import { getPaymentMethods, deletePaymentMethod, updatePaymentMethod } from '../services/api';
import { Plus, Edit, Trash2, CreditCard, Loader2, AlertCircle, CheckCircle, XCircle, RefreshCw, Wallet, QrCode, Ticket, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface PaymentMethodManagementProps {
  onAddClick: () => void;
  onEditClick: (method: PaymentMethod) => void;
  refetchTrigger: number;
}

const PaymentMethodManagement: React.FC<PaymentMethodManagementProps> = ({ onAddClick, onEditClick, refetchTrigger }) => {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMethods = async () => {
    if (!user?.restaurantId) return;
    try {
      setIsLoading(true);
      const data = await getPaymentMethods(user.restaurantId);
      setMethods(data);
    } catch (err) {
      toast.error('Erro ao carregar pagamentos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMethods(); }, [refetchTrigger, user?.restaurantId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta forma de pagamento?')) return;
    try {
      await deletePaymentMethod(id);
      toast.success('Removido com sucesso!');
      fetchMethods();
    } catch (err: any) { toast.error('Falha ao excluir.'); }
  };

  const handleToggleStatus = async (method: PaymentMethod) => {
    try {
        const newStatus = !method.isActive;
        await updatePaymentMethod(method.id, { ...method, isActive: newStatus });
        setMethods(prev => prev.map(m => m.id === method.id ? { ...m, isActive: newStatus } : m));
        toast.success(newStatus ? 'Pagamento ativado!' : 'Pagamento pausado.');
    } catch (e) { toast.error('Erro ao alterar status.'); }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'PIX': return { icon: QrCode, color: 'text-emerald-500 bg-emerald-50' };
      case 'CASH': return { icon: Wallet, color: 'text-orange-500 bg-orange-50' };
      case 'CREDIT_CARD': 
      case 'DEBIT_CARD': return { icon: CreditCard, color: 'text-blue-500 bg-blue-50' };
      case 'VOUCHER': return { icon: Ticket, color: 'text-purple-500 bg-purple-50' };
      default: return { icon: Building2, color: 'text-slate-500 bg-slate-50' };
    }
  };

  if (isLoading && methods.length === 0) return (
    <div className="flex flex-col h-64 items-center justify-center opacity-30 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      <span className="text-[10px] font-black uppercase tracking-widest">Configurando Checkout...</span>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Pagamentos</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <CreditCard size={14} className="text-orange-500" /> Métodos de Recebimento Ativos
          </p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" size="sm" className="bg-white rounded-xl" onClick={fetchMethods}>
                <RefreshCw size={16} />
            </Button>
            <Button onClick={onAddClick} className="rounded-xl px-6 italic">
                <Plus size={18} /> NOVA FORMA
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {methods.length === 0 ? (
            <Card className="col-span-full p-20 flex flex-col items-center justify-center text-slate-300 opacity-20 border-dashed border-2">
                <CreditCard size={64} strokeWidth={1} className="mb-4" />
                <p className="font-black text-[10px] uppercase tracking-[0.3em] italic">Nenhuma forma configurada</p>
            </Card>
        ) : (
            methods.map(method => {
                const info = getMethodIcon(method.type);
                return (
                    <Card key={method.id} className={cn("p-0 overflow-hidden border-2 transition-all duration-300 group hover:shadow-2xl hover:-translate-y-1 bg-white", method.isActive ? "border-slate-100" : "border-slate-100 opacity-60")} noPadding>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", info.color)}>
                                        <info.icon size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-slate-900 uppercase italic tracking-tighter leading-none">{method.name}</h3>
                                        <span className="text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 mt-2 inline-block italic">{method.type}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-slate-50" onClick={() => onEditClick(method)}><Edit size={14}/></Button>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-rose-50 text-rose-500" onClick={() => handleDelete(method.id)}><Trash2 size={14}/></Button>
                                </div>
                            </div>

                            {/* Status e Ação Rápida */}
                            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => handleToggleStatus(method)}>
                                    <div className={cn("w-10 h-5 rounded-full relative transition-all duration-300", method.isActive ? "bg-emerald-500 shadow-lg shadow-emerald-100" : "bg-slate-200")}>
                                        <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm", method.isActive ? "left-6" : "left-1")} />
                                    </div>
                                    <span className={cn("text-[9px] font-black uppercase tracking-widest", method.isActive ? "text-emerald-600" : "text-slate-400")}>{method.isActive ? 'OPERANTE' : 'PAUSADO'}</span>
                                </div>
                                {method.isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            </div>
                        </div>
                    </Card>
                );
            })
        )}
        
        {/* Card de Adicionar Rápido */}
        <Card 
            onClick={onAddClick}
            className="p-6 border-2 border-dashed border-slate-200 bg-slate-50/30 flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-orange-500/50 hover:bg-orange-50/30 transition-all duration-300 min-h-[180px]"
        >
            <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:border-orange-500 transition-all">
                <Plus size={24} />
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] group-hover:text-orange-600 transition-colors">Nova Opção</p>
        </Card>
      </div>
    </div>
  );
};

export default PaymentMethodManagement;