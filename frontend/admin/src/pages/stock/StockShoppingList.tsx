import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingCart, Loader2, AlertTriangle, Package, 
  Download, ArrowRight, DollarSign
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface ShoppingItem {
  ingredientId: string;
  name: string;
  unit: string;
  group: string | null;
  currentStock: number;
  minStock: number;
  suggestedQty: number;
  estimatedCost: number;
  avgCostPerUnit: number;
  supplier: { name: string; phone: string } | null;
}

const StockShoppingList: React.FC = () => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalItems: 0, totalEstimatedCost: 0 });

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/stock/shopping-list');
      setItems(res.data.items);
      setSummary(res.data.summary);
    } catch (err) {
      console.error('Erro ao carregar lista:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const handleExportCSV = async () => {
    try {
      const res = await api.post('/stock/shopping-list/export', {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'lista-compras.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Lista exportada!');
    } catch (err) {
      toast.error('Erro ao exportar lista');
    }
  };

  const goToInvoices = () => {
    window.location.href = '/stock/invoices';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="text-blue-500" size={28} />
            Lista de Compras
          </h1>
          <p className="text-sm text-slate-500 mt-1">Itens abaixo do estoque mínimo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-2">
            <Download size={16} /> Exportar CSV
          </Button>
          <Button onClick={goToInvoices} className="flex items-center gap-2">
            <ArrowRight size={16} /> Gerar Nota de Entrada
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Package size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Itens para Comprar</p>
            <p className="text-xl font-black text-slate-900">{summary.totalItems}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Custo Estimado</p>
            <p className="text-xl font-black text-blue-600">R$ {summary.totalEstimatedCost.toFixed(2)}</p>
          </div>
        </Card>
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingCart size={48} className="mx-auto mb-4 text-slate-500" />
          <p className="font-medium text-slate-600">Todos os insumos estão acima do estoque mínimo</p>
          <p className="text-sm text-slate-500 mt-1">Nenhum item precisa ser comprado</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.ingredientId} className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900">{item.name}</h3>
                  {item.group && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
                      {item.group}
                    </span>
                  )}
                </div>
                <div className="flex gap-4 mt-1 text-xs text-slate-500">
                  <span>Estoque: <strong className="text-red-600">{item.currentStock} {item.unit}</strong></span>
                  <span>Mínimo: <strong>{item.minStock} {item.unit}</strong></span>
                  <span>Sugerido: <strong className="text-blue-600">{item.suggestedQty.toFixed(2)} {item.unit}</strong></span>
                </div>
                {item.supplier && (
                  <p className="text-xs text-slate-500 mt-1">Fornecedor: {item.supplier.name}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-blue-600">R$ {item.estimatedCost.toFixed(2)}</p>
                <p className="text-[10px] text-slate-500">R$ {item.avgCostPerUnit.toFixed(2)}/{item.unit}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockShoppingList;
