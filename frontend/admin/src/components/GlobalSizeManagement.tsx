import React, { useState, useEffect } from 'react';
import { globalSizeService, GlobalSize } from '../services/api/globalSizes';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Maximize2, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

function GlobalSizeManagement() {
  const [sizes, setSizes] = useState<GlobalSize[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [newSize, setNewSize] = useState({ name: '', description: '' });
  const [editData, setEditData] = useState({ name: '', description: '' });

  const fetchSizes = async () => {
    try {
      setIsLoading(true);
      const data = await globalSizeService.getAll();
      setSizes(data);
    } catch (error) {
      toast.error("Erro ao carregar tamanhos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSizes();
  }, []);

  const handleCreate = async () => {
    if (!newSize.name.trim()) return;
    try {
      await globalSizeService.create(newSize);
      setNewSize({ name: '', description: '' });
      fetchSizes();
      toast.success("Tamanho cadastrado com sucesso!");
    } catch (error) {
      toast.error("Erro ao cadastrar tamanho.");
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await globalSizeService.update(id, editData);
      setIsEditing(null);
      fetchSizes();
      toast.success("Tamanho atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza? Isso pode afetar produtos vinculados.")) return;
    try {
      await globalSizeService.delete(id);
      fetchSizes();
      toast.success("Tamanho removido.");
    } catch (error) {
      toast.error("Erro ao remover.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Biblioteca de Tamanhos</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 italic">Padronização Global de Variações</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Cadastro */}
        <Card className="p-8 border-orange-100 bg-white shadow-xl h-fit">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest italic">Novo Tamanho Padrão</h3>
            </div>
            <Input 
              label="Nome do Tamanho" 
              placeholder="Ex: Grande, 2 Litros, P" 
              value={newSize.name}
              onChange={e => setNewSize({ ...newSize, name: e.target.value })}
            />
            <Input 
              label="Descrição Curta" 
              placeholder="Ex: 8 fatias, 350ml..." 
              value={newSize.description}
              onChange={e => setNewSize({ ...newSize, description: e.target.value })}
            />
            <Button onClick={handleCreate} className="w-full h-14 rounded-2xl font-black italic uppercase gap-2 shadow-lg shadow-orange-100">
              <Plus size={20} /> CADASTRAR NA BIBLIOTECA
            </Button>
          </div>
        </Card>

        {/* Lista de Tamanhos */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
              <p className="text-[10px] font-black uppercase tracking-widest">Carregando Biblioteca...</p>
            </div>
          ) : sizes.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50">
               <Maximize2 className="mx-auto text-slate-300 mb-4" size={64} strokeWidth={1} />
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nenhum tamanho padronizado encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sizes.map(size => (
                <Card 
                  key={size.id} 
                  className={cn(
                    "p-6 border-2 transition-all group",
                    isEditing === size.id ? "border-orange-500 bg-orange-50/30" : "border-slate-100 bg-white hover:border-orange-200"
                  )}
                  noPadding
                >
                  <div className="px-6 py-4">
                    {isEditing === size.id ? (
                      <div className="space-y-4">
                        <input 
                          className="w-full bg-white border-2 border-orange-200 rounded-xl px-4 py-2 font-black italic text-sm"
                          value={editData.name}
                          onChange={e => setEditData({ ...editData, name: e.target.value })}
                        />
                        <input 
                          className="w-full bg-white border-2 border-orange-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-500"
                          value={editData.description}
                          onChange={e => setEditData({ ...editData, description: e.target.value })}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdate(size.id!)} className="flex-1 rounded-xl h-10"><Save size={14}/></Button>
                          <Button size="sm" variant="ghost" onClick={() => setIsEditing(null)} className="flex-1 rounded-xl h-10 bg-slate-100"><X size={14}/></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-inner">
                            <Maximize2 size={24} />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 uppercase italic leading-none mb-1">{size.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{size.description || 'Sem descrição'}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setIsEditing(size.id!);
                              setEditData({ name: size.name, description: size.description || '' });
                            }}
                            className="h-10 w-10 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-100"
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(size.id!)}
                            className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full" />
          <div className="flex items-start gap-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-xl shadow-orange-900/40 shrink-0">
                  <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                  <h4 className="text-white font-black uppercase italic tracking-tighter text-lg">Por que usar tamanhos globais?</h4>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed max-w-2xl">
                    Ao padronizar seus tamanhos, você garante que as regras de <span className="text-orange-400 italic">Preço de Pizza</span> e <span className="text-orange-400 italic">Meio a Meio</span> funcionem perfeitamente. Se você escrever "Grande" em um produto e "G" em outro, o sistema não conseguirá calcular o valor corretamente no carrinho.
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
};

export default GlobalSizeManagement;
