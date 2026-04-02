import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  Save,
  X,
  Sparkles,
  MessageCircle,
  HelpCircle,
  Truck,
  Shield,
  Tag,
  Search
} from 'lucide-react';
import { cn } from '../../lib/utils';
import axios from 'axios';
import { toast } from 'sonner';

interface KnowledgeItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface KnowledgeBaseProps {
  restaurantId: string;
  getHeaders: () => any;
}

const categoryConfig = {
  faq: { label: 'FAQ / Geral', icon: HelpCircle, color: 'blue' },
  delivery: { label: 'Entrega / Taxas', icon: Truck, color: 'green' },
  policy: { label: 'Políticas', icon: Shield, color: 'purple' },
  promo: { label: 'Promoções', icon: Tag, color: 'orange' },
};

const categoryColors = {
  faq: 'bg-blue-100 text-blue-700 border-blue-200',
  delivery: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  policy: 'bg-violet-100 text-violet-700 border-violet-200',
  promo: 'bg-amber-100 text-amber-700 border-amber-200',
};

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ restaurantId, getHeaders }) => {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({ question: '', answer: '', category: 'faq' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState({ question: '', answer: '', category: 'faq' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const fetchKnowledge = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/whatsapp/knowledge`, getHeaders());
      setKnowledge(res.data);
    } catch (error) {
      toast.error('Erro ao buscar base de conhecimento');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.question || !newEntry.answer) return;

    try {
      setAdding(true);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/whatsapp/knowledge`,
        newEntry,
        getHeaders()
      );
      setKnowledge([res.data, ...knowledge]);
      setNewEntry({ question: '', answer: '', category: 'faq' });
      toast.success('Informação adicionada ao agente!');
    } catch (error) {
      toast.error('Erro ao adicionar informação');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/whatsapp/knowledge/${id}`,
        getHeaders()
      );
      setKnowledge(knowledge.filter(k => k.id !== id));
      toast.success('Informação removida.');
    } catch (error) {
      toast.error('Erro ao remover informação');
    }
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingId(item.id);
    setEditEntry({ question: item.question, answer: item.answer, category: item.category });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editEntry.question || !editEntry.answer) return;
    try {
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/whatsapp/knowledge/${id}`,
        editEntry,
        getHeaders()
      );
      setKnowledge(knowledge.map(k => k.id === id ? { ...k, ...editEntry } : k));
      setEditingId(null);
      toast.success('Informação atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar informação');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditEntry({ question: '', answer: '', category: 'faq' });
  };

  // Filter knowledge items
  const filteredKnowledge = knowledge.filter(item => {
    const matchesSearch = !searchQuery || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedKnowledge = filteredKnowledge.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, KnowledgeItem[]>);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/25">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Base de Conhecimento (RAG)</h3>
            <p className="text-sm text-gray-500">Ensine seu agente sobre regras, taxas, horários e políticas</p>
          </div>
        </div>
      </div>

      {/* Add Form */}
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Pergunta / Tópico</label>
              <input 
                type="text"
                placeholder="Ex: Qual o horário de funcionamento?"
                value={newEntry.question}
                onChange={e => setNewEntry({ ...newEntry, question: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Categoria</label>
              <select 
                value={newEntry.category}
                onChange={e => setNewEntry({ ...newEntry, category: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
              >
                <option value="faq">FAQ / Geral</option>
                <option value="delivery">Entrega / Taxas</option>
                <option value="policy">Políticas / Cancelamento</option>
                <option value="promo">Promoções</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Resposta / Informação</label>
            <textarea 
              placeholder="Ex: Funcionamos de terça a domingo, das 18h às 23h..."
              value={newEntry.answer}
              onChange={e => setNewEntry({ ...newEntry, answer: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition resize-none"
              rows={3}
              required
            />
          </div>
          <button 
            type="submit"
            disabled={adding}
            className="w-full md:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
          >
            {adding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            <span>Adicionar à Base</span>
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nas informações..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategory('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition',
              filterCategory === 'all' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Todos
          </button>
          {Object.entries(categoryConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setFilterCategory(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5',
                filterCategory === key 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <config.icon size={12} />
              {config.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge List */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredKnowledge.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-gray-100 rounded-2xl">
            <BookOpen size={48} className="mx-auto mb-4 text-gray-200" />
            <p className="text-gray-500 font-medium">Nenhuma informação cadastrada</p>
            <p className="text-sm text-gray-400 mt-1">Adicione perguntas e respostas acima</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filterCategory === 'all' ? (
              // Grouped view
              Object.entries(groupedKnowledge).map(([category, items]) => {
                const config = categoryConfig[category as keyof typeof categoryConfig];
                return (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <config.icon size={16} className={cn('opacity-60', categoryColors[category as keyof typeof categoryColors].split(' ')[1])} />
                      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                        {config?.label || category}
                      </h4>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {items.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <KnowledgeItemCard
                          key={item.id}
                          item={item}
                          isEditing={editingId === item.id}
                          editEntry={editEntry}
                          onEdit={() => handleEdit(item)}
                          onSave={() => handleSaveEdit(item.id)}
                          onCancel={handleCancelEdit}
                          onDelete={() => handleDelete(item.id)}
                          onEditEntryChange={setEditEntry}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // Flat view
              <div className="space-y-3">
                {filteredKnowledge.map((item) => (
                  <KnowledgeItemCard
                    key={item.id}
                    item={item}
                    isEditing={editingId === item.id}
                    editEntry={editEntry}
                    onEdit={() => handleEdit(item)}
                    onSave={() => handleSaveEdit(item.id)}
                    onCancel={handleCancelEdit}
                    onDelete={() => handleDelete(item.id)}
                    onEditEntryChange={setEditEntry}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Knowledge Item Card Component
interface KnowledgeItemCardProps {
  item: KnowledgeItem;
  isEditing: boolean;
  editEntry: { question: string; answer: string; category: string };
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onEditEntryChange: (entry: { question: string; answer: string; category: string }) => void;
}

const KnowledgeItemCard: React.FC<KnowledgeItemCardProps> = ({
  item,
  isEditing,
  editEntry,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onEditEntryChange,
}) => {
  const config = categoryConfig[item.category as keyof typeof categoryConfig] || categoryConfig.faq;

  if (isEditing) {
    return (
      <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={editEntry.question}
              onChange={e => onEditEntryChange({ ...editEntry, question: e.target.value })}
              className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
              placeholder="Pergunta"
            />
            <select
              value={editEntry.category}
              onChange={e => onEditEntryChange({ ...editEntry, category: e.target.value })}
              className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
            >
              <option value="faq">FAQ / Geral</option>
              <option value="delivery">Entrega / Taxas</option>
              <option value="policy">Políticas / Cancelamento</option>
              <option value="promo">Promoções</option>
            </select>
          </div>
          <textarea
            value={editEntry.answer}
            onChange={e => onEditEntryChange({ ...editEntry, answer: e.target.value })}
            className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
            rows={2}
            placeholder="Resposta"
          />
          <div className="flex gap-2 justify-end">
            <button 
              onClick={onCancel} 
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition flex items-center gap-1"
            >
              <X size={14} />
              Cancelar
            </button>
            <button 
              onClick={onSave} 
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-1 font-medium"
            >
              <Save size={14} />
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group p-4 border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border', categoryColors[item.category as keyof typeof categoryColors] || categoryColors.faq)}>
              {config?.label || item.category}
            </span>
            <h4 className="font-semibold text-gray-800 text-sm">{item.question}</h4>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{item.answer}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
