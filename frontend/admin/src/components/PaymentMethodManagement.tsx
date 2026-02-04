import React, { useState, useEffect } from 'react';
import type { PaymentMethod } from '../types';
import { getPaymentMethods, deletePaymentMethod } from '../services/api';
import { Plus, Edit, Trash2, CreditCard, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface PaymentMethodManagementProps {
  onAddClick: () => void;
  onEditClick: (method: PaymentMethod) => void;
  refetchTrigger: number;
}

const PaymentMethodManagement: React.FC<PaymentMethodManagementProps> = ({ onAddClick, onEditClick, refetchTrigger }) => {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMethods = async () => {
    if (!user?.restaurantId) return;
    try {
      setIsLoading(true);
      const data = await getPaymentMethods(user.restaurantId);
      setMethods(data);
      setError(null);
    } catch (err) {
      setError('Falha ao buscar formas de pagamento.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, [refetchTrigger, user?.restaurantId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta forma de pagamento?')) return;

    try {
      await deletePaymentMethod(id);
      toast.success('Forma de pagamento excluída com sucesso!');
      fetchMethods();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Falha ao excluir.');
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'CASH': return 'Dinheiro';
      case 'CREDIT_CARD': return 'Cartão de Crédito';
      case 'DEBIT_CARD': return 'Cartão de Débito';
      case 'PIX': return 'Pix';
      case 'VOUCHER': return 'Vale Refeição';
      default: return 'Outros';
    }
  };

  if (isLoading) return (
    <div className="flex h-64 flex-col items-center justify-center gap-4 text-muted-foreground animate-pulse">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p>Carregando formas de pagamento...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 p-8 text-center rounded-lg bg-destructive/5 border border-destructive/20 text-destructive mx-auto max-w-2xl mt-8">
      <AlertCircle className="h-12 w-12" />
      <div>
        <h3 className="text-lg font-semibold">Erro ao carregar</h3>
        <p className="text-sm opacity-90">{error}</p>
      </div>
      <button 
        onClick={fetchMethods}
        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 transition-colors"
      >
        Tentar Novamente
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-lg border border-border shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Formas de Pagamento
          </h2>
          <p className="text-muted-foreground">Gerencie as formas de pagamento aceitas no seu estabelecimento.</p>
        </div>
        <button 
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 h-10 px-6 py-2 shadow-sm"
          onClick={onAddClick}
        >
          <Plus size={18} />
          Nova Forma de Pagamento
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium">Tipo</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {methods.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <CreditCard className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Nenhuma forma de pagamento cadastrada</p>
                        <p className="text-sm">Clique em "Nova Forma de Pagamento" para começar.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                methods.map((method) => (
                  <tr key={method.id} className="bg-card hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-foreground text-base">{method.name}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{getTypeName(method.type)}</td>
                    <td className="px-6 py-4">
                      {method.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          <CheckCircle size={12} /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          <XCircle size={12} /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button 
                          className="p-2 hover:bg-primary/10 hover:text-primary rounded-md transition-colors" 
                          title="Editar" 
                          onClick={() => onEditClick(method)}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors" 
                          title="Excluir" 
                          onClick={() => handleDelete(method.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodManagement;
