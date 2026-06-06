import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardList, Plus, Search, Trash2, Eye, Send, 
  CheckCircle, XCircle, Loader2, AlertTriangle, X, 
  Package, DollarSign, Calendar
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Rascunho', color: 'text-slate-600', bg: 'bg-slate-100' },
  SENT: { label: 'Enviada', color: 'text-blue-600', bg: 'bg-blue-50' },
  PARTIAL: { label: 'Parcial', color: 'text-amber-600', bg: 'bg-amber-50' },
  RECEIVED: { label: 'Recebida', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  CANCELED: { label: 'Cancelada', color: 'text-red-600', bg: 'bg-red-50' },
};

const StockPurchaseOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const [formData, setFormData] = useState({
    supplierId: '',
    expectedDate: '',
    notes: '',
    items: [{ ingredientId: '', quantity: 1, unitCost: 0 }]
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const [ordersRes, suppliersRes, ingredientsRes] = await Promise.all([
        api.get(`/stock/purchase-orders${params}`),
        api.get('/financial/suppliers'),
        api.get('/ingredients')
      ]);
      setOrders(ordersRes.data.data);
      setSuppliers(suppliersRes.data);
      setIngredients(ingredientsRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    const validItems = formData.items.filter(i => i.ingredientId && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Adicione pelo menos 1 item válido');
      return;
    }
    try {
      setSaving(true);
      await api.post('/stock/purchase-orders', { ...formData, items: validItems });
      toast.success('Ordem de compra criada!');
      setShowForm(false);
      setFormData({ supplierId: '', expectedDate: '', notes: '', items: [{ ingredientId: '', quantity: 1, unitCost: 0 }] });
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar ordem');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (id: string) => {
    try {
      await api.put(`/stock/purchase-orders/${id}/send`);
      toast.success('Ordem enviada!');
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao enviar');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancelar esta ordem de compra?')) return;
    try {
      await api.put(`/stock/purchase-orders/${id}/cancel`);
      toast.success('Ordem cancelada!');
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao cancelar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deletar esta ordem de compra?')) return;
    try {
      await api.delete(`/stock/purchase-orders/${id}`);
      toast.success('Ordem deletada!');
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao deletar');
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ingredientId: '', quantity: 1, unitCost: 0 }]
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calcTotal = () => {
    return formData.items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
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
            <ClipboardList className="text-blue-500" size={28} />
            Ordens de Compra
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie pedidos aos fornecedores</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus size={16} /> Nova Ordem
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
              filterStatus === key
                ? `${config.bg} ${config.color} ring-2 ring-offset-1 ring-current/20`
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Lista de Ordens */}
      <div className="space-y-3">
        {orders.map((order) => {
          const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.DRAFT;
          return (
            <Card key={order.id} className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">#{order.orderNumber}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", status.bg, status.color)}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Fornecedor: <strong>{order.supplier?.name || '-'}</strong>
                    {order.expectedDate && (
                      <span className="ml-3">
                        <Calendar size={12} className="inline mr-1" />
                        {new Date(order.expectedDate).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {order.items?.length || 0} itens · R$ {(order.totalAmount || 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-1">
                  {order.status === 'DRAFT' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleSend(order.id)}>
                        <Send size={12} className="mr-1" /> Enviar
                      </Button>
                      <button onClick={() => handleDelete(order.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </>
                  )}
                  {['SENT', 'PARTIAL'].includes(order.status) && (
                    <Button size="sm" variant="outline" onClick={() => handleCancel(order.id)}>
                      <XCircle size={12} className="mr-1" /> Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {orders.length === 0 && (
          <Card className="p-12 text-center">
            <ClipboardList size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="font-medium text-slate-600">Nenhuma ordem de compra encontrada</p>
          </Card>
        )}
      </div>

      {/* Modal Criar */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Nova Ordem de Compra</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fornecedor</label>
                    <select
                      value={formData.supplierId}
                      onChange={e => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="">Selecione...</option>
                      {suppliers.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data Esperada</label>
                    <Input
                      type="date"
                      value={formData.expectedDate}
                      onChange={e => setFormData(prev => ({ ...prev, expectedDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                  <Input
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observações opcionais"
                  />
                </div>

                {/* Itens */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">Itens</label>
                    <Button onClick={addItem} size="sm" variant="outline"><Plus size={14} /> Adicionar</Button>
                  </div>
                  <div className="space-y-2">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select
                          value={item.ingredientId}
                          onChange={e => updateItem(index, 'ingredientId', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="">Ingrediente...</option>
                          {ingredients.map((ing: any) => (
                            <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                          className="w-20"
                          placeholder="Qtd"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost}
                          onChange={e => updateItem(index, 'unitCost', Number(e.target.value))}
                          className="w-24"
                          placeholder="Custo"
                        />
                        <button onClick={() => removeItem(index)} className="p-2 hover:bg-red-50 rounded-lg">
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 flex justify-between">
                  <span className="text-sm font-medium text-slate-600">Total:</span>
                  <span className="text-sm font-bold text-blue-600">R$ {calcTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="animate-spin mr-2" size={16} />}
                  Criar Ordem
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPurchaseOrders;
