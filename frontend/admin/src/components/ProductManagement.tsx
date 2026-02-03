import React, { useState, useMemo, useEffect } from 'react';
import type { Product } from '@/types/index';
import { getProducts, updateProduct, deleteProduct, getCategories } from '../services/api';
import { Plus, Search, Edit, Trash2, Image as ImageIcon, Filter, Star, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Componente de Toggle Switch
const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: (checked: boolean) => void }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
      }}
      className={cn(
        "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 focus:outline-none shadow-inner",
        checked ? "bg-emerald-500" : "bg-slate-300"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md ring-0 transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
};

interface ProductManagementProps {
  onAddProductClick: () => void;
  onEditProductClick: (product: Product) => void;
  refetchTrigger: number;
}

const ProductManagement: React.FC<ProductManagementProps> = ({ refetchTrigger }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchProductsAndCategories = async () => {
    try {
      setIsLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories(true) // Fetch flat list of categories
      ]);
      setProducts(productsData);
      setCategories(['all', ...categoriesData.map((c: any) => c.name)]);
      setError(null);
    } catch (err: any) {
      setError('Falha ao buscar dados.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndCategories();
  }, [refetchTrigger]);

  const handleAvailabilityChange = async (productId: string, isAvailable: boolean) => {
    const originalProducts = [...products];
    setProducts(prevProducts =>
      prevProducts.map(p => (p.id === productId ? { ...p, isAvailable } : p))
    );

    try {
      await updateProduct(productId, { isAvailable });
      toast.success(isAvailable ? "Produto ativado!" : "Produto desativado.");
    } catch (err) {
      toast.error('Falha ao atualizar o produto.');
      setProducts(originalProducts);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await deleteProduct(productId);
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
      toast.success("Produto excluído.");
    } catch (err: any) {
        toast.error(err.response?.data?.error || 'Falha ao excluir o produto.');
    }
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter(product => 
        categoryFilter === 'all' || product.category.name === categoryFilter
      )
      .filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [products, searchTerm, categoryFilter]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
  
  if (error) return (
    <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
        Erro: {error}
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tighter italic">Gestão de Produtos</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Catálogo de itens e controle de venda.</p>
        </div>
        <button 
            onClick={() => navigate('/products/new')}
            className="ui-button-primary h-10 px-4 text-[10px] uppercase tracking-widest"
        >
          <Plus size={16} />
          Novo Produto
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
                type="text" 
                placeholder="Buscar..." 
                className="ui-input w-full pl-9 h-10 text-xs"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="relative w-full sm:w-[200px]">
             <select 
                className="ui-input w-full h-10 text-xs appearance-none cursor-pointer"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
            >
                {categories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'all' ? 'Todas Categorias' : cat}</option>
                ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead className="text-[9px] uppercase bg-muted/10 text-slate-400 border-b border-border font-black tracking-widest">
                <tr>
                <th className="px-6 py-3">Produto</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3 text-center">Estoque</th>
                <th className="px-6 py-3 text-center">Preço</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
                {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0 shadow-sm">
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon size={16} className="text-slate-400" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-xs uppercase italic tracking-tight">{product.name}</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                    {product.isFeatured && (
                                        <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-[7px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">
                                            <Star size={7} fill="currentColor" /> Destaque
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-3">
                        <span className="inline-flex items-center rounded-md bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-slate-500 border border-border">
                            {product.category.name}
                        </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                        <span className={cn(
                            "inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest border shadow-sm",
                            product.stock < 10 
                                ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20" 
                                : "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20"
                        )}>
                            {product.stock} un
                        </span>
                    </td>
                    <td className="px-6 py-3 text-center font-black text-xs italic text-foreground/80">
                        R$ {product.price.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-6 py-3">
                        <div className="flex flex-col items-center gap-1">
                            <ToggleSwitch 
                                checked={product.isAvailable} 
                                onChange={(isChecked) => handleAvailabilityChange(product.id, isChecked)} 
                            />
                            <span className={cn("text-[7px] font-black uppercase tracking-widest", product.isAvailable ? "text-emerald-600" : "text-slate-400")}>
                                {product.isAvailable ? "Ativo" : "Pausado"}
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                            <button 
                                onClick={() => navigate(`/products/${product.id}`)}
                                className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                title="Editar"
                            >
                                <Edit size={16} />
                            </button>
                            <button 
                                onClick={() => handleDelete(product.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Excluir"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        {filteredProducts.length === 0 && (
            <div className="p-16 text-center flex flex-col items-center justify-center text-slate-300">
                <Search size={40} strokeWidth={1} className="mb-2 opacity-20" />
                <p className="font-black text-[10px] uppercase tracking-widest">Nenhum produto</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ProductManagement;