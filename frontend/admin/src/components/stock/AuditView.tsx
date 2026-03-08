import React, { useState } from 'react';
import { 
  ClipboardList, Search, AlertTriangle, CheckCircle, 
  RefreshCw, Scale, Save, ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface AuditViewProps {
  ingredients: any[];
  onRefresh: () => void;
}

const AuditView: React.FC<AuditViewProps> = ({ ingredients, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [physicalStock, setPhysicalStock] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAudit = async () => {
    const itemsToAdjust = Object.entries(physicalStock)
      .filter(([_, val]) => val !== '')
      .map(([id, val]) => ({
        ingredientId: id,
        physicalStock: parseFloat(val)
      }));

    if (itemsToAdjust.length === 0) return toast.error('Nenhum ajuste preenchido.');

    if (!confirm(`Deseja aplicar o balanço físico para ${itemsToAdjust.length} itens?`)) return;

    setIsSaving(true);
    try {
      await api.post('/stock/audit', { items: itemsToAdjust });
      toast.success('Estoque ajustado com sucesso!');
      setPhysicalStock({});
      onRefresh();
    } catch (e) {
      toast.error('Erro ao processar auditoria.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 h-[calc(100vh-200px)] flex flex-col">
      {/* Header Denso */}
      <Card className="p-4 border-slate-100 bg-slate-50/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg"><ClipboardList size={18}/></div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase italic leading-none">Balanço de Inventário</h2>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ajuste o estoque físico para correções de CMV</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
              <input className="w-full h-9 pl-8 pr-4 rounded-xl bg-white border border-slate-200 text-[10px] font-bold outline-none" placeholder="Localizar item..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Button onClick={handleAudit} disabled={isSaving} className="h-9 px-6 bg-slate-900 text-white italic font-black text-[10px] uppercase tracking-widest">
              <Save size={14} className="mr-2" /> APLICAR BALANÇO
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabela de Auditoria (Scroll Interno) */}
      <Card className="flex-1 overflow-hidden border-slate-100 shadow-sm flex flex-col">
        <div className="overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Insumo</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Estoque Sistema</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-32">Físico (Real)</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right w-32">Divergência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(item => {
                const systemStock = item.stock || 0;
                const realStock = physicalStock[item.id] === '' || physicalStock[item.id] === undefined ? systemStock : parseFloat(physicalStock[item.id]);
                const diff = realStock - systemStock;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="text-[10px] font-black text-slate-900 uppercase italic tracking-tight">{item.name}</p>
                      <p className="text-[7px] font-bold text-slate-400 uppercase">{item.unit}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-[11px] text-slate-500">
                      {systemStock} {item.unit}
                    </td>
                    <td className="px-4 py-2.5">
                      <input 
                        type="number" 
                        className="w-full h-8 bg-white border border-slate-200 rounded-lg text-center text-[11px] font-black outline-none focus:border-orange-500" 
                        placeholder={systemStock.toString()}
                        value={physicalStock[item.id] || ''}
                        onChange={e => setPhysicalStock({...physicalStock, [item.id]: e.target.value})}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {diff !== 0 && (
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-black italic",
                          diff > 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                          {diff < 0 ? <AlertTriangle size={10} /> : <CheckCircle size={10} />}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AuditView;
