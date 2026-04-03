import React, { useState } from 'react';
import { 
  Plus, Search, ShoppingCart, Receipt, Calendar, 
  CheckCircle, Clock, Trash2, ChevronRight, FileText, DollarSign
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { formatSP } from '@/lib/timezone';

interface PurchasesViewProps {
  purchases: any[];
  onRefresh: () => void;
}

const PurchasesView: React.FC<PurchasesViewProps> = ({ purchases, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = purchases.filter(p => 
    p.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirm = async (id: string) => {
    try {
      await api.put(`/stock/entries/${id}/confirm`);
      toast.success('Entrada confirmada e estoque atualizado!');
      onRefresh();
    } catch (e) {
      toast.error('Erro ao confirmar entrada.');
    }
  };

  const totalSpent = purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Dashboard de Compras */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900 text-white flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 blur-2xl" />
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total em Compras (Mês)</p>
          <h2 className="text-2xl font-black italic tracking-tighter mt-2">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </Card>
        <Card className="p-4 border-slate-100 flex items-center gap-4">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><CheckCircle size={20}/></div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Confirmadas</p>
            <p className="text-lg font-black text-slate-900">{purchases.filter(p => p.status === 'CONFIRMED').length}</p>
          </div>
        </Card>
        <Card className="p-4 border-slate-100 flex items-center gap-4">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><Clock size={20}/></div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pendentes</p>
            <p className="text-lg font-black text-slate-900">{purchases.filter(p => p.status === 'PENDING').length}</p>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 max-w-md ml-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 border-none text-[11px] font-bold outline-none" 
            placeholder="Buscar por Nota ou Fornecedor..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button size="sm" className="h-9 px-6 rounded-xl text-[10px] font-black uppercase italic tracking-widest bg-orange-500 text-white">
          <Plus size={14} className="mr-2" /> LANÇAR NOTA FISCAL
        </Button>
      </div>

      {/* Tabela Enterprise de Compras */}
      <Card className="overflow-hidden border-slate-100 shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data</th>
              <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
              <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</th>
              <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Total</th>
              <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(purchase => (
              <tr key={purchase.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-4 py-3 text-[10px] font-bold text-slate-500">
                  {formatSP(purchase.receivedAt, 'dd/MM/yyyy')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText size={12} className="text-slate-400" />
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">NF: {purchase.invoiceNumber || 'S/N'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[11px] font-bold text-slate-700 uppercase">
                  {purchase.supplier?.name || 'Não Informado'}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-[11px] font-black text-slate-900 italic">
                    R$ {purchase.totalAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                    purchase.status === 'CONFIRMED' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {purchase.status === 'CONFIRMED' ? 'Confirmado' : 'Pendente'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {purchase.status === 'PENDING' && (
                      <button 
                        onClick={() => handleConfirm(purchase.id)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Confirmar Entrada"
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}
                    <button className="p-1.5 text-slate-400 hover:text-orange-500 rounded-lg">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default PurchasesView;
