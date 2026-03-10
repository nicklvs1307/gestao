import React, { useState, useEffect } from 'react';
import type { PaymentMethod } from '../types';
import { getPaymentMethods, deletePaymentMethod, updatePaymentMethod } from '../services/api';
import { Plus, Edit, Trash2, CreditCard, Loader2, AlertCircle, CheckCircle, XCircle, RefreshCw, Wallet, QrCode, Ticket, Building2, Truck, LayoutDashboard, Utensils } from 'lucide-react';
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
      <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Checkout...</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header Premium - Mais Compacto */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-3">
              <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200">
                <CreditCard size={20} />
              </div>
              Financeiro / Checkout
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 ml-1">
             Gestão de Meios de Recebimento e Taxas Adm
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-slate-50 border-slate-200 rounded-xl h-10 w-10 p-0" onClick={fetchMethods}>
                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </Button>
            <Button onClick={onAddClick} className="rounded-xl px-6 italic h-10 font-black text-[10px] tracking-widest">
                <Plus size={16} className="mr-2" /> NOVA FORMA
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {methods.length === 0 ? (
            <Card className="col-span-full p-20 flex flex-col items-center justify-center text-slate-300 opacity-20 border-dashed border-2 rounded-[2.5rem]">
                <CreditCard size={64} strokeWidth={1} className="mb-4" />
                <p className="font-black text-[10px] uppercase tracking-[0.3em] italic">Nenhuma forma configurada</p>
            </Card>
        ) : (
            methods.map(method => {
                const info = getMethodIcon(method.type);
                return (
                    <Card key={method.id} className={cn("p-0 overflow-hidden border-2 transition-all duration-300 group hover:shadow-xl hover:-translate-y-1 bg-white rounded-[2rem]", method.isActive ? "border-slate-100" : "border-slate-100 opacity-60")} noPadding>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110", info.color)}>
                                        <info.icon size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm text-slate-900 uppercase italic tracking-tighter leading-none">{method.name}</h3>
                                        <span className="text-[7px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 px-1 py-0.5 rounded border border-slate-200 mt-1 inline-block italic leading-none">{method.type}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50" onClick={() => onEditClick(method)}><Edit size={12}/></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-rose-50 text-rose-500" onClick={() => handleDelete(method.id)}><Trash2 size={12}/></Button>
                                </div>
                            </div>

                            {/* Canais Ativos - Mini Badges */}
                            <div className="flex gap-1.5 mb-5">
                                {method.allowDelivery && <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg" title="Delivery"><Truck size={10} /></div>}
                                {method.allowPos && <div className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg" title="Balcão"><LayoutDashboard size={10} /></div>}
                                {method.allowTable && <div className="p-1.5 bg-orange-50 text-orange-500 rounded-lg" title="Mesa"><Utensils size={10} /></div>}
                            </div>

                            {/* Status e Ação Rápida */}
                            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleToggleStatus(method)}>
                                    <div className={cn("w-8 h-4 rounded-full relative transition-all duration-300", method.isActive ? "bg-emerald-500 shadow-md shadow-emerald-100" : "bg-slate-200")}>
                                        <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm", method.isActive ? "left-4.5" : "left-0.5")} />
                                    </div>
                                    <span className={cn("text-[8px] font-black uppercase tracking-widest", method.isActive ? "text-emerald-600" : "text-slate-400")}>{method.isActive ? 'OPERANTE' : 'PAUSADO'}</span>
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
            className="p-5 border-2 border-dashed border-slate-200 bg-slate-50/30 flex flex-col items-center justify-center gap-3 group cursor-pointer hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-all duration-500 min-h-[140px] rounded-[2rem]"
        >
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-slate-900 group-hover:border-white transition-all">
                <Plus size={20} />
            </div>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] group-hover:text-white transition-colors">Nova Opção</p>
        </Card>
      </div>
    </div>
  );
};

export default PaymentMethodManagement;