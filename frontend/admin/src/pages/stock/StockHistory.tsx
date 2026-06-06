import React, { useState, useEffect, useCallback } from 'react';
import { 
  History, Search, Loader2, Filter, Download, 
  ArrowUpRight, ArrowDownLeft, Hammer, AlertTriangle
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';

interface HistoryMove {
  date: string;
  type: string;
  typeName: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes: string;
  reference: string;
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  ENTRY: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: ArrowDownLeft },
  LOSS: { color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle },
  PRODUCTION: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Hammer },
  AUDIT: { color: 'text-amber-600', bg: 'bg-amber-50', icon: Filter },
};

const StockHistory: React.FC = () => {
  const [moves, setMoves] = useState<HistoryMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (filterType) params.append('type', filterType);
      params.append('page', String(page));
      params.append('limit', '30');

      const res = await api.get(`/stock/history?${params.toString()}`);
      setMoves(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterType, page]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');
  const formatCurrency = (v: number) => `R$ ${v.toFixed(2)}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="text-blue-500" size={28} />
            Histórico de Posição de Estoque
          </h1>
          <p className="text-sm text-slate-500 mt-1">Evolução do saldo dos insumos</p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Data Início</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Data Fim</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">Todos</option>
              <option value="ENTRY">Entradas</option>
              <option value="LOSS">Perdas</option>
              <option value="PRODUCTION">Produções</option>
            </select>
          </div>
          <Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); setFilterType(''); setPage(1); }}>
            Limpar
          </Button>
        </div>
      </Card>

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Data</th>
                  <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Tipo</th>
                  <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Ingrediente</th>
                  <th className="text-right py-3 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Quantidade</th>
                  <th className="text-right py-3 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Custo</th>
                  <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Notas</th>
                </tr>
              </thead>
              <tbody>
                {moves.map((move, i) => {
                  const config = TYPE_CONFIG[move.type] || TYPE_CONFIG.AUDIT;
                  const Icon = config.icon;
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-600">{formatDate(move.date)}</td>
                      <td className="py-3 px-4">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", config.bg, config.color)}>
                          <Icon size={10} />
                          {move.typeName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{move.ingredientName}</td>
                      <td className={cn("py-3 px-4 text-right font-bold", move.quantity > 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {move.quantity > 0 ? '+' : ''}{move.quantity.toFixed(2)} {move.unit}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(move.totalCost)}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{move.notes}</td>
                    </tr>
                  );
                })}
                {moves.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Nenhuma movimentação encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4 border-t border-slate-100">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Anterior
              </Button>
              <span className="py-1 px-3 text-sm text-slate-500">Página {page} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Próxima
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default StockHistory;
