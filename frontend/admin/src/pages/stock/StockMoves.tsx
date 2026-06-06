import React, { useState, useEffect, useCallback } from 'react';
import { 
  MoveHorizontal, Loader2, Filter, 
  ArrowDownLeft, AlertTriangle, Hammer
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';

interface StockMove {
  date: string;
  type: string;
  typeName: string;
  ingredientName: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  description: string;
  party: string;
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  ENTRY: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: ArrowDownLeft },
  LOSS: { color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle },
  PRODUCTION: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Hammer },
};

const StockMoves: React.FC = () => {
  const [moves, setMoves] = useState<StockMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState('');
  const [summary, setSummary] = useState({ totalEntries: 0, totalLosses: 0, totalProductions: 0, netVariation: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadMoves = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (filterType) params.append('type', filterType);
      params.append('page', String(page));
      params.append('limit', '30');

      const res = await api.get(`/stock/moves?${params.toString()}`);
      setMoves(res.data.moves);
      setSummary(res.data.summary);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Erro ao carregar movimentações:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterType, page]);

  useEffect(() => { loadMoves(); }, [loadMoves]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MoveHorizontal className="text-blue-500" size={28} />
            Movimentações de Estoque
          </h1>
          <p className="text-sm text-slate-500 mt-1">Log consolidado de todas as movimentações</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase">Entradas</p>
          <p className="text-lg font-black text-emerald-600">R$ {summary.totalEntries.toFixed(2)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase">Perdas</p>
          <p className="text-lg font-black text-red-600">R$ {summary.totalLosses.toFixed(2)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase">Produções</p>
          <p className="text-lg font-black text-blue-600">{summary.totalProductions}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase">Variação</p>
          <p className={cn("text-lg font-black", summary.netVariation >= 0 ? 'text-emerald-600' : 'text-red-600')}>
            R$ {summary.netVariation.toFixed(2)}
          </p>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Início</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Fim</label>
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
                  <th className="text-right py-3 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Qtd</th>
                  <th className="text-right py-3 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Custo Total</th>
                  <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Descrição</th>
                  <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Responsável</th>
                </tr>
              </thead>
              <tbody>
                {moves.map((move, i) => {
                  const config = TYPE_CONFIG[move.type] || TYPE_CONFIG.ENTRY;
                  const Icon = config.icon;
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {new Date(move.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", config.bg, config.color)}>
                          <Icon size={10} />
                          {move.typeName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{move.ingredientName}</td>
                      <td className={cn("py-3 px-4 text-right font-bold text-xs", move.quantity > 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {move.quantity > 0 ? '+' : ''}{move.quantity.toFixed(2)} {move.unit}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 text-xs">
                        R$ {move.totalCost.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{move.description}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{move.party}</td>
                    </tr>
                  );
                })}
                {moves.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Nenhuma movimentação encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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

export default StockMoves;
