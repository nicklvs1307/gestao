import React, { useState, useMemo, useEffect } from 'react';
import type { Product } from '@/types/index';
import { getProducts, updateProduct, deleteProduct } from '../services/api/products';
import { getCategories } from '../services/api/categories';
import { Plus, Search, Edit, Trash2, Image as ImageIcon, Filter, Star, RefreshCw, Loader2, Package, Tag, ArrowUpRight, CheckCircle } from 'lucide-react';
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
      setCategories(['all', ...categoriesData.map((c: any) => c.name)]);
    } catch (err) { toast.error("Erro ao carregar cardápio."); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [refetchTrigger]);

  const handleAvailabilityChange = async (productId: string, isAvailable: boolean) => {
    const original = [...products];
    setProducts(prev => prev.map(p => (p.id === productId ? { ...p, isAvailable } : p)));
    try {
      await updateProduct(productId, { isAvailable });
      toast.success(isAvailable ? "Item ativado!" : "Item pausado.");
    } catch (err) {
      toast.error('Erro ao atualizar.');
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
        return p.categories?.some(cat => cat.name === categoryFilter);
      })
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [products, searchTerm, categoryFilter]);

  if (isLoading && products.length === 0) return (
    <div className="flex flex-col h-64 items-center justify-center opacity-30 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Cardápio...</span>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Meus Produtos</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <Package size={14} className="text-orange-500" /> Gestão de Itens, Preços e Estoque
          </p>
        </div>
        <Button onClick={() => navigate('/products/new')} className="rounded-xl px-8 italic font-black h-14 shadow-xl shadow-orange-900/10">
          <Plus size={20} className="mr-2" /> NOVO PRODUTO
        </Button>
      </div>

      {/* Toolbar de Busca e Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative group flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input 
                type="text" 
                placeholder="Pesquisar por nome ou descrição..." 
                className="w-full h-16 pl-14 pr-6 rounded-2xl bg-white border-2 border-slate-100 focus:border-orange-500 outline-none transition-all font-black text-slate-900 uppercase italic tracking-tight shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="flex gap-2">
            <div className="relative">
                <select 
                    className="h-16 px-6 rounded-2xl bg-white border-2 border-slate-100 font-black text-[10px] uppercase tracking-widest outline-none focus:border-orange-500 appearance-none min-w-[220px] cursor-pointer shadow-sm"
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                >
                    <option value="all">Todas as Categorias</option>
                    {categories.filter(c => c !== 'all').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <Filter className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
            </div>
            <Button variant="outline" size="icon" className="h-16 w-16 bg-white border-slate-100 rounded-2xl" onClick={fetchData}>
                <RefreshCw size={20} className="text-slate-400" />
            </Button>
        </div>
      </div>

      {/* Listagem de Alta Fidelidade */}
      <Card className="p-0 overflow-hidden border-slate-200 shadow-xl bg-white" noPadding>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
                <tr>
                    <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Informações do Item</th>
                    <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Categoria / Mix</th>
                    <th className="px-8 py-4 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Estoque</th>
                    <th className="px-8 py-4 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Preço Base</th>
                    <th className="px-8 py-4 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Visibilidade</th>
                    <th className="px-8 py-4 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Gerenciar</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-900">
                {filteredProducts.map(product => {
                    const lowestPrice = product.sizes && product.sizes.length > 0 
                        ? Math.min(...product.sizes.map(s => s.price)) 
                        : product.price;

                    return (
                        <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-8 py-5">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-[1.25rem] bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                                        {product.imageUrl ? (
                                            <img src={getImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon size={24} className="text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-xs text-slate-900 uppercase italic tracking-tight">
                                                {product.name || <span className="text-rose-400">Nome não definido</span>}
                                            </span>
                                            {product.isFeatured && <div className="p-1 bg-orange-500 text-white rounded-md shadow-lg shadow-orange-500/20"><Star size={8} fill="currentColor"/></div>}
                                        </div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Ref: {product.id.slice(-6).toUpperCase()}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 py-5">
                                <div className="flex flex-wrap gap-1.5">
                                    {product.categories?.length > 0 ? product.categories.map(cat => (
                                        <span key={cat.id} className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border border-slate-200 shadow-sm">{cat.name}</span>
                                    )) : <span className="text-[8px] text-slate-300 italic uppercase">Sem Vínculo</span>}
                                </div>
                            </td>
                            <td className="px-8 py-5 text-center">
                                <span className={cn(
                                    "inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase border shadow-sm",
                                    product.stock < 10 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                )}>
                                    <ArrowUpRight size={10} className="mr-1"/> {product.stock} Unid.
                                </span>
                            </td>
                            <td className="px-8 py-5 text-center">
                                <div className="flex flex-col items-center">
                                    {product.sizes?.length > 0 && <span className="text-[7px] font-black text-orange-500 uppercase leading-none mb-1">A PARTIR DE</span>}
                                    <span className="font-black text-sm text-slate-900 italic tracking-tighter">R$ {lowestPrice.toFixed(2).replace('.', ',')}</span>
                                </div>
                            </td>
                            <td className="px-8 py-5">
                                <div className="flex flex-col items-center gap-2">
                                    <div 
                                        onClick={() => handleAvailabilityChange(product.id, !product.isAvailable)}
                                        className={cn("w-10 h-5 rounded-full relative transition-all cursor-pointer shadow-inner", product.isAvailable ? "bg-emerald-500" : "bg-slate-200")}
                                    >
                                        <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-md", product.isAvailable ? "left-6" : "left-1")} />
                                    </div>
                                    <span className={cn("text-[7px] font-black uppercase tracking-widest", product.isAvailable ? "text-emerald-600" : "text-slate-400")}>{product.isAvailable ? 'ATIVO' : 'PAUSADO'}</span>
                                </div>
                            </td>
                            <td className="px-8 py-5 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                    <Button variant="ghost" size="icon" className="h-10 w-10 bg-slate-100 text-slate-400 hover:text-orange-600 rounded-xl border border-slate-200" onClick={() => navigate(`/products/${product.id}`)}><Edit size={16}/></Button>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 bg-slate-100 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200" onClick={() => handleDelete(product.id)}><Trash2 size={16}/></Button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
            </table>
        </div>
        {filteredProducts.length === 0 && (
            <div className="p-24 text-center">
                <div className="flex flex-col items-center justify-center opacity-20 grayscale">
                    <Package size={64} strokeWidth={1} className="mb-4" />
                    <p className="font-black text-[10px] uppercase tracking-[0.3em] italic">Nenhum item localizado no cardápio</p>
                </div>
            </div>
        )}
      </Card>
    </div>
  );
};

export default ProductManagement;