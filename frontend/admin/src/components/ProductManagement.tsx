import React, { useState, useMemo, useEffect } from 'react';
import type { Product } from '@/types/index';
import { getProducts, updateProduct, deleteProduct } from '../services/api/products';
import { getCategories } from '../services/api/categories';
import { 
  Plus, Search, Edit, Trash2, Image as ImageIcon, Filter, Star, 
  RefreshCw, Loader2, Package, Tag, ArrowUpRight, CheckCircle,
  Truck, Utensils, Globe, ChevronRight, Hash
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getImageUrl } from '../utils/image';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

function ProductManagement({ refetchTrigger }: { refetchTrigger: number }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [productsData, categoriesData] = await Promise.all([ getProducts(), getCategories(true) ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) { toast.error("Erro ao carregar cardápio."); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [refetchTrigger]);

  const handleToggleFlag = async (productId: string, field: 'isAvailable' | 'allowDelivery' | 'allowPos' | 'allowOnline', currentValue: boolean) => {
    const newValue = !currentValue;
    const original = [...products];
    
    setProducts(prev => prev.map(p => (p.id === productId ? { ...p, [field]: newValue } : p)));
    
    try {
      await updateProduct(productId, { [field]: newValue });
      const fieldLabels: any = {
        isAvailable: newValue ? "Item ativado!" : "Item pausado.",
        allowDelivery: newValue ? "Delivery ativado!" : "Delivery desativado.",
        allowPos: newValue ? "Salão ativado!" : "Salão desativado.",
        allowOnline: newValue ? "Online ativado!" : "Online desativado."
      };
      toast.success(fieldLabels[field]);
    } catch (err) {
      toast.error('Erro ao atualizar status.');
      setProducts(original);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Excluir este produto permanentemente?')) return;
    try {
      await deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success("Produto removido.");
    } catch (err: any) { toast.error('Falha na exclusão.'); }
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        if (categoryFilter === 'all') return true;
        return p.categories?.some(cat => cat.id === categoryFilter);
      })
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [products, searchTerm, categoryFilter]);

  // Contagem de produtos por categoria para a sidebar
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach(p => {
      p.categories?.forEach(c => {
        counts[c.id] = (counts[c.id] || 0) + 1;
      });
    });
    return counts;
  }, [products]);

  if (isLoading && products.length === 0) return (
    <div className="flex flex-col h-64 items-center justify-center opacity-30 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Cardápio...</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 text-slate-900">
      {/* Header Compacto */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">Cardápio Industrial</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
            <Package size={12} className="text-orange-500" /> Gestão de Itens e Mix de Produtos
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10 bg-white border-slate-200 rounded-xl" onClick={fetchData}>
                <RefreshCw size={16} className={cn("text-slate-400", isLoading && "animate-spin")} />
            </Button>
            <Button onClick={() => navigate('/products/new')} className="rounded-xl px-6 italic font-black h-10 shadow-lg shadow-orange-900/10 text-xs gap-2">
                <Plus size={16} /> NOVO PRODUTO
            </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Sidebar de Categorias Industrial */}
        <aside className="w-full lg:w-64 shrink-0 space-y-2">
            <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic flex items-center gap-2">
                    <Filter size={10} className="text-orange-500" /> Navegação
                </h3>
                <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded italic uppercase">
                    {categories.length} Grupos
                </span>
            </div>
            
            <div className="space-y-1 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                <button 
                    onClick={() => setCategoryFilter('all')}
                    className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-tighter italic",
                        categoryFilter === 'all' 
                            ? "bg-slate-900 text-white shadow-md shadow-slate-900/20 translate-x-1" 
                            : "text-slate-400 hover:bg-white hover:text-slate-600"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <Package size={14} />
                        <span>TODOS PRODUTOS</span>
                    </div>
                    <span className={cn("text-[9px] font-black", categoryFilter === 'all' ? "text-orange-400" : "text-slate-300")}>
                        {categoryCounts.all}
                    </span>
                </button>

                <div className="h-px bg-slate-200/50 my-2 mx-2" />

                <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                    {categories.map((cat) => (
                        <button 
                            key={cat.id}
                            onClick={() => setCategoryFilter(cat.id)}
                            className={cn(
                                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-tighter italic group",
                                categoryFilter === cat.id 
                                    ? "bg-white border-2 border-orange-500 text-orange-600 shadow-sm translate-x-1" 
                                    : "text-slate-400 border-2 border-transparent hover:bg-white hover:border-slate-100"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Hash size={14} className={categoryFilter === cat.id ? "text-orange-500" : "text-slate-200 group-hover:text-slate-400"} />
                                <span className="truncate">{cat.name}</span>
                            </div>
                            <span className={cn(
                                "text-[9px] font-black px-1.5 py-0.5 rounded-md", 
                                categoryFilter === cat.id ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-300 group-hover:bg-slate-200 group-hover:text-slate-500"
                            )}>
                                {categoryCounts[cat.id] || 0}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </aside>

        {/* Listagem Principal */}
        <div className="flex-1 space-y-4">
            
            {/* Barra de Pesquisa */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={16} />
                <input 
                    type="text" 
                    placeholder="Pesquisar por nome ou SKU..." 
                    className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white border border-slate-200 focus:border-orange-500 outline-none transition-all font-bold text-xs uppercase italic tracking-tight shadow-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <Card className="p-0 overflow-hidden border border-slate-200 shadow-xl bg-white rounded-2xl" noPadding>
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                    <table className="w-full text-left border-collapse table-fixed min-w-[850px]">
                    <thead className="bg-slate-50/80 border-b border-slate-100">
                        <tr>
                            <th className="w-[35%] px-4 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Produto / Descrição</th>
                            <th className="w-[12%] px-4 py-3 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Canais</th>
                            <th className="w-[10%] px-4 py-3 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Estoque</th>
                            <th className="w-[12%] px-4 py-3 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Preço</th>
                            <th className="w-[10%] px-4 py-3 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                            <th className="w-[15%] px-4 py-3 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest px-6">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredProducts.map(product => {
                            const lowestPrice = product.sizes && product.sizes.length > 0 
                                ? Math.min(...product.sizes.map(s => s.price)) 
                                : product.price;

                            return (
                                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                                                {product.imageUrl ? (
                                                    <img src={getImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon size={20} className="text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                    <span className="font-bold text-xs uppercase italic tracking-tight truncate">
                                                        {product.name || <span className="text-rose-400 italic">S/ Nome</span>}
                                                    </span>
                                                    {product.isFeatured && <Star size={10} className="fill-amber-400 text-amber-400 shrink-0"/>}
                                                </div>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic truncate">
                                                        Ref: {product.id.slice(-6).toUpperCase()}
                                                    </span>
                                                    {product.categories?.slice(0, 1).map(c => (
                                                        <span key={c.id} className="text-[7px] font-black bg-orange-50 text-orange-400 px-1 rounded italic uppercase">
                                                            {c.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <div 
                                                onClick={() => handleToggleFlag(product.id, 'allowDelivery', !!product.allowDelivery)}
                                                title="Delivery" 
                                                className={cn(
                                                    "w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer hover:scale-110 active:scale-95",
                                                    product.allowDelivery ? "bg-blue-50 border-blue-100 text-blue-500 shadow-sm" : "bg-slate-50 border-slate-100 text-slate-200 opacity-40 hover:opacity-100"
                                                )}
                                            >
                                                <Truck size={12} />
                                            </div>
                                            <div 
                                                onClick={() => handleToggleFlag(product.id, 'allowPos', !!product.allowPos)}
                                                title="Salão / PDV" 
                                                className={cn(
                                                    "w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer hover:scale-110 active:scale-95",
                                                    product.allowPos ? "bg-emerald-50 border-emerald-100 text-emerald-500 shadow-sm" : "bg-slate-50 border-slate-100 text-slate-200 opacity-40 hover:opacity-100"
                                                )}
                                            >
                                                <Utensils size={12} />
                                            </div>
                                            <div 
                                                onClick={() => handleToggleFlag(product.id, 'allowOnline', !!product.allowOnline)}
                                                title="Pedido Online" 
                                                className={cn(
                                                    "w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer hover:scale-110 active:scale-95",
                                                    product.allowOnline ? "bg-purple-50 border-purple-100 text-purple-500 shadow-sm" : "bg-slate-50 border-slate-100 text-slate-200 opacity-40 hover:opacity-100"
                                                )}
                                            >
                                                <Globe size={12} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase border",
                                            product.stock < 10 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        )}>
                                            {product.stock} un
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex flex-col items-center">
                                            {product.sizes?.length > 0 && <span className="text-[7px] font-black text-orange-500 uppercase leading-none mb-0.5 tracking-tighter">Variantes</span>}
                                            <span className="font-black text-xs italic tracking-tighter">R$ {lowestPrice.toFixed(2)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col items-center gap-1">
                                            <div 
                                                onClick={() => handleToggleFlag(product.id, 'isAvailable', !!product.isAvailable)}
                                                className={cn("w-8 h-4 rounded-full relative transition-all cursor-pointer shadow-inner", product.isAvailable ? "bg-emerald-500" : "bg-slate-200")}
                                            >
                                                <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-md", product.isAvailable ? "left-4.5" : "left-0.5")} />
                                            </div>
                                            <span className={cn("text-[7px] font-black uppercase tracking-widest leading-none", product.isAvailable ? "text-emerald-500" : "text-slate-400")}>{product.isAvailable ? 'ON' : 'OFF'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5 px-2">
                                            <Button variant="ghost" size="icon" className="h-9 w-9 bg-slate-50 text-slate-400 hover:text-orange-600 rounded-xl border border-slate-200 shadow-sm" onClick={() => navigate(`/products/${product.id}`)}><Edit size={16}/></Button>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 shadow-sm" onClick={() => handleDelete(product.id)}><Trash2 size={16}/></Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    </table>
                </div>
                {filteredProducts.length === 0 && (
                    <div className="p-16 text-center bg-slate-50/30">
                        <div className="flex flex-col items-center justify-center opacity-20">
                            <Package size={48} strokeWidth={1} className="mb-3" />
                            <p className="font-black text-[9px] uppercase tracking-[0.2em] italic leading-none">Vazio</p>
                        </div>
                    </div>
                )}
            </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductManagement;
