import React, { useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Filter, AlertTriangle, 
  Package, Info, ChevronRight, Scale, Layers
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface IngredientsViewProps {
  ingredients: any[];
  groups: any[];
  onRefresh: () => void;
}

const IngredientsView: React.FC<IngredientsViewProps> = ({ ingredients, groups, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');

  const filtered = ingredients.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = filterGroup === 'all' || i.groupId === filterGroup;
    return matchesSearch && matchesGroup;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este insumo?')) return;
    try {
      await api.delete(`/ingredients/${id}`);
      toast.success('Insumo removido!');
      onRefresh();
    } catch (e) {
      toast.error('Não é possível excluir insumos com histórico ou receitas.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Mini Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-3 border-l-4 border-l-blue-500 bg-blue-50/10 flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Insumos</p>
            <p className="text-lg font-black italic text-slate-900 leading-none">{ingredients.length}</p>
          </div>
          <Package size={20} className="text-blue-500/20" />
        </Card>
        <Card className="p-3 border-l-4 border-l-amber-500 bg-amber-50/10 flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Estoque Crítico</p>
            <p className="text-lg font-black italic text-amber-600 leading-none">{ingredients.filter(i => i.stock <= (i.minStock || 0)).length}</p>
          </div>
          <AlertTriangle size={20} className="text-amber-500/20" />
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-2 justify-between items-center bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-1 gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              className="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 border-none text-[11px] font-bold outline-none focus:ring-2 ring-orange-500/20" 
              placeholder="Pesquisar insumo..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="h-9 px-4 rounded-xl bg-slate-50 border-none text-[10px] font-black uppercase italic outline-none cursor-pointer"
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
          >
            <option value="all">Todos os Grupos</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <Button size="sm" className="h-9 px-6 rounded-xl text-[10px] font-black uppercase italic tracking-widest bg-slate-900 text-white">
          <Plus size={14} className="mr-2" /> NOVO INSUMO
        </Button>
      </div>

      {/* Enterprise Table */}
      <Card className="overflow-hidden border-slate-100 shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Insumo</th>
              <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Grupo</th>
              <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Unidade</th>
              <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Estoque</th>
              <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Custo Médio</th>
              <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight">{item.name}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.id.slice(-8)}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[8px] font-black uppercase tracking-widest">
                    {item.group?.name || 'Geral'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-[10px] font-bold text-slate-500">{item.unit || 'UN'}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className={cn(
                    "inline-flex items-center gap-1.5 font-black text-[11px] italic px-2 py-0.5 rounded-lg",
                    item.stock <= (item.minStock || 0) ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    {item.stock} {item.unit}
                    {item.stock <= (item.minStock || 0) && <AlertTriangle size={10} />}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="text-[11px] font-black text-slate-900 italic">
                    R$ {(item.averageCost || item.lastUnitCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-slate-400 hover:text-blue-500 bg-white border border-slate-100 rounded-lg shadow-sm transition-all">
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 bg-white border border-slate-100 rounded-lg shadow-sm transition-all"
                    >
                      <Trash2 size={12} />
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

export default IngredientsView;
