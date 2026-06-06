import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardList, Plus, Search, Trash2, Eye, Send, 
  CheckCircle, XCircle, Loader2, AlertTriangle, X, 
  Package, DollarSign, Calendar, ShoppingCart
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
      <AnimatePresence>
      {showForm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowForm(false)} />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
          >
            <header className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <ShoppingCart size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Nova Ordem de Compra</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pedido ao Fornecedor</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm border border-slate-200 transition-all hover:rotate-90">
                <X size={20} />
              </button>
            </header>

            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Fornecedor</label>
                  <select value={formData.supplierId} onChange={e => setFormData(prev => ({ ...prev, supplierId: e.target.value }))} className="ui-input w-full h-12 text-[11px] font-bold uppercase bg-white border-slate-200">
                    <option value="">Selecione...</option>
                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data Esperada</label>
                  <input type="date" className="ui-input w-full h-12 text-sm font-bold" value={formData.expectedDate} onChange={e => setFormData(prev => ({ ...prev, expectedDate: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Observações</label>
                <input className="ui-input w-full h-12 text-sm font-bold" value={formData.notes} onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Observações opcionais" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                    <Package size={14} className="text-slate-500" /> Itens do Pedido
                  </label>
                  <button type="button" onClick={addItem} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 tracking-widest flex items-center gap-1.5">
                    <Plus size={14} /> Adicionar
                  </button>
                </div>

                <div className="border border-slate-200 rounded-[2rem] overflow-hidden bg-slate-50/30">
                  <div className="divide-y divide-slate-100">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex gap-3 items-center p-3 px-4">
                        <select value={item.ingredientId} onChange={e => updateItem(index, 'ingredientId', e.target.value)} className="flex-1 ui-input h-10 text-[10px] font-bold uppercase bg-white border-slate-200">
                          <option value="">Ingrediente...</option>
                          {ingredients.map((ing: any) => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                        </select>
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} className="ui-input w-20 h-10 text-xs font-bold text-center bg-white border-slate-200" placeholder="Qtd" />
                        <div className="relative w-24">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                          <input type="number" min="0" step="0.01" value={item.unitCost} onChange={e => updateItem(index, 'unitCost', Number(e.target.value))} className="ui-input w-full h-10 pl-8 text-xs font-bold bg-white border-slate-200" placeholder="0,00" />
                        </div>
                        <button type="button" onClick={() => removeItem(index)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors flex items-center justify-center">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center border border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total do Pedido</span>
                <span className="text-xl font-black italic tracking-tighter text-slate-900">R$ {calcTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <Button variant="ghost" className="rounded-2xl h-12 uppercase text-[10px] font-black tracking-widest" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="rounded-2xl h-12 px-8 shadow-lg uppercase text-[10px] font-black tracking-widest italic bg-slate-900 text-white hover:bg-black">
                {saving && <Loader2 className="animate-spin mr-2" size={16} />}
                Criar Ordem
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default StockPurchaseOrders;
