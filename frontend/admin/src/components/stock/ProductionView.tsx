import React, { useState } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Hammer, Scale, 
  TrendingUp, DollarSign, ChevronRight, AlertCircle, Save, X, Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface ProductionViewProps {
  ingredients: any[];
  recipes: any[];
  onRefresh: () => void;
}

const ProductionView: React.FC<ProductionViewProps> = ({ ingredients, recipes, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedOrder] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Filtra apenas insumos que são "produzidos" (Beneficiados)
  const producedItems = ingredients.filter(i => i.isProduced && i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const calculateTotalCost = (recipeItems: any[]) => {
    return recipeItems.reduce((acc, item) => {
      const ing = ingredients.find(i => i.id === item.componentIngredientId);
      return acc + (item.quantity * (ing?.averageCost || 0));
    }, 0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-200px)]">
      {/* Coluna Esquerda: Lista de Fichas Técnicas (Densa) */}
      <Card className="lg:col-span-4 flex flex-col overflow-hidden border-slate-100 shadow-sm">
        <div className="p-3 border-b border-slate-50 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
            <input 
              className="w-full h-8 pl-8 pr-4 rounded-lg bg-white border border-slate-200 text-[10px] font-bold outline-none focus:border-orange-500" 
              placeholder="Buscar receita..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {producedItems.map(item => {
            const recipe = recipes.find(r => r.ingredientId === item.id);
            const cost = recipe ? calculateTotalCost(recipe.items || recipe.recipe || []) : 0;
            
            return (
              <div 
                key={item.id} 
                onClick={() => setSelectedOrder(item)}
                className={cn(
                  "p-3 cursor-pointer transition-all hover:bg-orange-50/30 group",
                  selectedRecipe?.id === item.id ? "bg-orange-50 border-r-4 border-r-orange-500" : ""
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight leading-none">{item.name}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Rendimento: {item.yieldAmount || 1} {item.unit}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black text-slate-400 uppercase">Custo Unit.</span>
                    <span className="text-[10px] font-black text-slate-700 italic">R$ {(cost / (item.yieldAmount || 1)).toFixed(2)}</span>
                  </div>
                  {!recipe && <span className="text-[7px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded uppercase">Sem Receita</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Coluna Direita: Editor / Visualizador (Enterprise Detail) */}
      <Card className="lg:col-span-8 overflow-hidden border-slate-100 shadow-sm flex flex-col">
        {selectedRecipe ? (
          <>
            {/* Header do Detalhe */}
            <div className="p-4 border-b border-slate-50 bg-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 text-white rounded-lg"><Hammer size={16}/></div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase italic leading-none">{selectedRecipe.name}</h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 text-emerald-600">Ficha Técnica Ativa</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest border-slate-200">
                  <Edit2 size={12} className="mr-1.5" /> Editar
                </Button>
                <Button size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest bg-orange-500">
                  <Plus size={12} className="mr-1.5" /> Produzir Lote
                </Button>
              </div>
            </div>

            {/* Conteúdo Denso */}
            <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto">
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-50 pb-2">Composição da Receita</h3>
                <div className="space-y-3">
                  {/* Mock de Itens da Receita para Visualização */}
                  {(recipes.find(r => r.ingredientId === selectedRecipe.id)?.items || []).map((ri: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase italic leading-none">{ri.ingredient?.name || 'Insumo'}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{ri.quantity} {ri.ingredient?.unit}</p>
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-slate-900 italic">R$ {(ri.quantity * (ri.ingredient?.averageCost || 0)).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b border-slate-50 pb-2">Análise de CMV e Lucratividade</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 border-slate-100 bg-slate-50/50">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1 leading-none">Custo Total Lote</p>
                    <p className="text-xl font-black italic text-slate-900 leading-none">R$ {calculateTotalCost(recipes.find(r => r.ingredientId === selectedRecipe.id)?.items || []).toFixed(2)}</p>
                  </Card>
                  <Card className="p-4 border-slate-100 bg-slate-50/50">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1 leading-none">Custo por {selectedRecipe.unit}</p>
                    <p className="text-xl font-black italic text-orange-600 leading-none">R$ {(calculateTotalCost(recipes.find(r => r.ingredientId === selectedRecipe.id)?.items || []) / (selectedRecipe.yieldAmount || 1)).toFixed(2)}</p>
                  </Card>
                </div>
                
                <div className="p-4 bg-slate-900 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-1.5 bg-emerald-500 text-white rounded-lg"><TrendingUp size={14}/></div>
                    <span className="text-[9px] font-black text-white uppercase italic">Sugestão de Preço Venda</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Markup Sugerido (3.0x)</p>
                      <p className="text-2xl font-black italic text-white leading-none">R$ {(calculateTotalCost(recipes.find(r => r.ingredientId === selectedRecipe.id)?.items || []) / (selectedRecipe.yieldAmount || 1) * 3).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Margem Alvo</p>
                      <p className="text-sm font-black italic text-emerald-400 leading-none">66.7%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20 space-y-4">
            <Hammer size={48} className="text-slate-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">Selecione uma ficha técnica para gerenciar</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ProductionView;
