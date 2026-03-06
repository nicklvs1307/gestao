import React, { useState, useMemo, useEffect } from 'react';
import type { Product } from '@/types/index';
import { getProducts, updateProduct, deleteProduct, reorderProducts, reorderCategories, updateAddon } from '../services/api';
import { getCategories, updateCategory } from '../services/api/categories';
import { 
  Plus, Search, Edit, Trash2, Image as ImageIcon, Filter, Star, 
  RefreshCw, Loader2, Package, CheckCircle,
  Truck, Utensils, Globe, ChevronRight, Hash, GripVertical,
  Power, Edit2, ListTree, Tag, DollarSign
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getImageUrl } from '../utils/image';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableCategoryItemProps {
  cat: any;
  categoryFilter: string;
  categoryCount: number;
  onSelect: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
}

function SortableCategoryItem({ cat, categoryFilter, categoryCount, onSelect, onToggleStatus }: SortableCategoryItemProps) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center gap-1 group", isDragging && "z-50")}>
      <button {...attributes} {...listeners} className="p-1 cursor-grab active:cursor-grabbing text-slate-200 hover:text-orange-500 transition-colors">
        <GripVertical size={12} />
      </button>
      <div className="flex-1 flex items-center gap-1">
          <button 
              onClick={() => onSelect(cat.id)}
              className={cn(
                  "flex-1 flex items-center justify-between px-3 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-tighter italic",
                  categoryFilter === cat.id 
                      ? "bg-white border-2 border-orange-500 text-orange-600 shadow-sm translate-x-1" 
                      : "text-slate-400 border-2 border-transparent hover:bg-white hover:border-slate-100",
                  cat.isActive === false && "opacity-50 grayscale bg-slate-50/50"
              )}
          >
              <div className="flex items-center gap-2 overflow-hidden">
                  <Hash size={12} className={categoryFilter === cat.id ? "text-orange-500" : "text-slate-200 group-hover:text-slate-400"} />
                  <span className="truncate max-w-[80px]">{cat.name}</span>
              </div>
              <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-md", categoryFilter === cat.id ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-300")}>
                  {categoryCount || 0}
              </span>
          </button>
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
              <button onClick={(e) => { e.stopPropagation(); onToggleStatus(cat.id, !!cat.isActive); }} className={cn("w-6 h-6 rounded-lg flex items-center justify-center transition-all border", cat.isActive !== false ? "bg-emerald-50 text-emerald-500 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200")}>
                  <Power size={10} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); navigate(`/categories/${cat.id}`); }} className="w-6 h-6 rounded-lg flex items-center justify-center bg-white text-slate-400 border border-slate-100 hover:text-orange-500 shadow-sm">
                  <Edit2 size={10} />
              </button>
          </div>
      </div>
    </div>
  );
}

interface SortableProductRowProps {
  product: Product;
  onToggleFlag: (productId: string, field: any, currentValue: boolean) => void;
  onUpdatePrice: (productId: string, newPrice: number) => void;
  onDelete: (productId: string) => void;
  navigate: any;
  isSortable: boolean;
}

function SortableProductRow({ product, onToggleFlag, onUpdatePrice, onDelete, navigate, isSortable }: SortableProductRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localPrice, setLocalPrice] = useState(product.price.toString());
  const [addonEdits, setAddonEdits] = useState<Record<string, {name: string, price: string, promoPrice: string}>>({});

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id, disabled: !isSortable });

  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 0, position: 'relative' as const };

  useEffect(() => { setLocalPrice(product.price.toString()); }, [product.price]);

  const handlePriceBlur = () => {
      const newPrice = parseFloat(localPrice);
      if (!isNaN(newPrice) && newPrice !== product.price) {
          onUpdatePrice(product.id, newPrice);
      }
  };

  const handleAddonBlur = async (addonId: string) => {
      const edit = addonEdits[addonId];
      if (!edit) return;
      const newPrice = parseFloat(edit.price);
      const newPromoPrice = edit.promoPrice !== "" ? parseFloat(edit.promoPrice) : null;
      
      try {
          await updateAddon(addonId, { 
              name: edit.name, 
              price: isNaN(newPrice) ? undefined : newPrice,
              promoPrice: newPromoPrice
          });
          toast.success("Adicional atualizado!");
      } catch (e) {
          toast.error("Erro ao atualizar adicional.");
      }
  };

  const lowestPrice = product.sizes && product.sizes.length > 0 
      ? Math.min(...product.sizes.map(s => s.price)) 
      : product.price;

  return (
    <>
    <tr ref={setNodeRef} style={style} className={cn("hover:bg-slate-50/50 transition-colors group", isDragging && "bg-white shadow-2xl scale-[1.01] ring-1 ring-orange-500 z-50", !product.isAvailable && "opacity-60 bg-slate-50/30 text-slate-400")}>
        <td className="px-4 py-3">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsExpanded(!isExpanded)} className={cn("p-1.5 rounded-xl transition-all hover:bg-slate-100 text-slate-400", isExpanded && "rotate-90 text-orange-500 bg-orange-50")}>
                    <ChevronRight size={18} />
                </button>
                {isSortable && (
                  <button {...attributes} {...listeners} className="p-1 cursor-grab active:cursor-grabbing text-slate-200 hover:text-orange-500 transition-colors">
                    <GripVertical size={14} />
                  </button>
                )}
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm shrink-0">
                    {product.imageUrl ? <img src={getImageUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-300" />}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-xs uppercase italic tracking-tight truncate">{product.name || 'S/ Nome'}</span>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic truncate">Ref: {product.id.slice(-6).toUpperCase()}</span>
                </div>
            </div>
        </td>
        <td className="px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1">
                {[
                    { icon: Truck, field: 'allowDelivery', color: 'blue', val: product.allowDelivery },
                    { icon: Utensils, field: 'allowPos', color: 'emerald', val: product.allowPos },
                    { icon: Globe, field: 'allowOnline', color: 'purple', val: product.allowOnline }
                ].map(c => (
                    <div key={c.field} onClick={() => onToggleFlag(product.id, c.field, !!c.val)} className={cn("w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer", c.val ? `bg-${c.color}-50 border-${c.color}-100 text-${c.color}-500 shadow-sm` : "bg-slate-50 border-slate-100 text-slate-200 opacity-40")}>
                        <c.icon size={12} />
                    </div>
                ))}
            </div>
        </td>
        <td className="px-4 py-3 text-center">
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase border", product.stock < 10 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100")}>{product.stock} un</span>
        </td>
        <td className="px-4 py-3 text-center">
            <div className="relative flex justify-center group/price">
                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300">R$</span>
                <input type="number" step="0.01" className="w-20 h-8 pl-6 bg-transparent border-b-2 border-transparent text-xs font-black italic outline-none transition-all text-center focus:border-orange-500 focus:bg-white group-hover/price:border-slate-200" value={localPrice} onChange={e => setLocalPrice(e.target.value)} onBlur={handlePriceBlur} />
            </div>
        </td>
        <td className="px-4 py-3 text-center">
            <div onClick={() => onToggleFlag(product.id, 'isAvailable', !!product.isAvailable)} className={cn("w-8 h-4 mx-auto rounded-full relative transition-all cursor-pointer shadow-inner", product.isAvailable ? "bg-emerald-500" : "bg-slate-200")}>
                <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-md", product.isAvailable ? "left-4.5" : "left-0.5")} />
            </div>
        </td>
        <td className="px-4 py-3 text-right">
            <div className="flex items-center justify-end gap-1 px-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-orange-600 border border-slate-100 shadow-sm" onClick={() => navigate(`/products/${product.id}`)}><Edit size={14}/></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 border border-slate-100 shadow-sm" onClick={() => onDelete(product.id)}><Trash2 size={14}/></Button>
            </div>
        </td>
    </tr>
    
    {/* EXPANSÃO: COMPLEMENTOS E OPÇÕES */}
    {isExpanded && (
        <tr className="bg-slate-50/80 animate-in slide-in-from-top-2 duration-300">
            <td colSpan={6} className="px-8 py-6 border-b border-slate-200">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20"><ListTree size={20} /></div>
                            <div>
                                <h3 className="text-sm font-black uppercase italic tracking-tighter text-slate-900 leading-none">Estrutura de Complementos</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gerencie os opcionais vinculados a este produto</p>
                            </div>
                        </div>
                        <Button size="sm" variant="outline" className="bg-white text-[9px] font-black h-8 rounded-lg" onClick={() => navigate(`/products/${product.id}`)}>GERENCIAR GRUPOS</Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(product.addonGroups || []).map(group => (
                            <Card key={group.id} className="p-0 overflow-hidden border-slate-200 shadow-sm bg-white rounded-2xl">
                                <div className="px-4 py-2.5 bg-slate-900 text-white flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase italic tracking-widest flex items-center gap-2">
                                        <Tag size={12} className="text-orange-400"/> {group.name}
                                    </span>
                                    <span className="text-[8px] font-bold bg-white/10 px-2 py-0.5 rounded-md uppercase tracking-widest">
                                        {group.minQuantity}-{group.maxQuantity} itens
                                    </span>
                                </div>
                                <div className="p-2 space-y-1">
                                    {group.addons.length === 0 ? (
                                        <p className="text-center py-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">Nenhum adicional neste grupo</p>
                                    ) : (
                                        group.addons.map(addon => (
                                            <div key={addon.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-xl transition-all group/addon">
                                                <div className="flex-1">
                                                    <input 
                                                        className="w-full bg-transparent border-none text-[11px] font-black uppercase italic text-slate-700 focus:ring-0 p-0 h-auto"
                                                        value={addonEdits[addon.id]?.name ?? addon.name}
                                                        onChange={e => setAddonEdits({...addonEdits, [addon.id]: { ...(addonEdits[addon.id] || {price: addon.price.toString(), promoPrice: (addon.promoPrice ?? "").toString()}), name: e.target.value }})}
                                                        onBlur={() => handleAddonBlur(addon.id)}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5 ml-1">Venda</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[8px] font-black text-slate-300">R$</span>
                                                            <input 
                                                                type="number" step="0.01"
                                                                className="w-14 bg-slate-100/50 border-none rounded-lg text-[10px] font-black text-slate-900 text-right focus:bg-white focus:ring-1 focus:ring-orange-500/20 px-1.5 py-0.5"
                                                                value={addonEdits[addon.id]?.price ?? addon.price}
                                                                onChange={e => setAddonEdits({...addonEdits, [addon.id]: { ...(addonEdits[addon.id] || {name: addon.name, promoPrice: (addon.promoPrice ?? "").toString()}), price: e.target.value }})}
                                                                onBlur={() => handleAddonBlur(addon.id)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] font-black text-amber-500 uppercase leading-none mb-0.5 ml-1">Promo</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[8px] font-black text-amber-400 italic">R$</span>
                                                            <input 
                                                                type="number" step="0.01"
                                                                className="w-14 bg-amber-50 border border-amber-100 rounded-lg text-[10px] font-black text-amber-700 text-right focus:bg-white focus:ring-1 focus:ring-amber-500/20 px-1.5 py-0.5"
                                                                placeholder="-"
                                                                value={addonEdits[addon.id]?.promoPrice ?? addon.promoPrice ?? ''}
                                                                onChange={e => setAddonEdits({...addonEdits, [addon.id]: { ...(addonEdits[addon.id] || {name: addon.name, price: addon.price.toString()}), promoPrice: e.target.value }})}
                                                                onBlur={() => handleAddonBlur(addon.id)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>
                        ))}
                        {(product.addonGroups || []).length === 0 && (
                            <div className="col-span-full p-10 bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                                <Package size={32} strokeWidth={1} className="mb-2 opacity-50"/>
                                <p className="text-[10px] font-black uppercase tracking-widest italic">Nenhum complemento vinculado</p>
                            </div>
                        )}
                    </div>
                </div>
            </td>
        </tr>
    )}
    </>
  );
}

function ProductManagement({ refetchTrigger }: { refetchTrigger: number }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [productsData, categoriesData] = await Promise.all([ getProducts(), getCategories(true) ]);
      const sortedCategories = Array.isArray(categoriesData) ? [...categoriesData].sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
      setProducts(productsData);
      setCategories(sortedCategories);
    } catch (err) { toast.error("Erro ao carregar cardápio."); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [refetchTrigger]);

  const handleToggleCategoryStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const original = [...categories];
    setCategories(prev => prev.map(c => c.id === id ? { ...c, isActive: newStatus } : c));
    try {
      await updateCategory(id, { isActive: newStatus });
      toast.success(newStatus ? "Categoria ativada!" : "Categoria pausada.");
    } catch (err) {
      toast.error("Erro ao atualizar categoria.");
      setCategories(original);
    }
  };

  const handleUpdatePrice = async (productId: string, newPrice: number) => {
      const original = [...products];
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, price: newPrice } : p));
      try {
          await updateProduct(productId, { price: newPrice });
          toast.success("Preço atualizado!");
      } catch (err) {
          toast.error("Erro ao salvar preço.");
          setProducts(original);
      }
  };

  const handleToggleFlag = async (productId: string, field: 'isAvailable' | 'allowDelivery' | 'allowPos' | 'allowOnline', currentValue: boolean) => {
    const newValue = !currentValue;
    const original = [...products];
    setProducts(prev => prev.map(p => (p.id === productId ? { ...p, [field]: newValue } : p)));
    try {
      await updateProduct(productId, { [field]: newValue });
      const fieldLabels: any = { isAvailable: newValue ? "Item ativado!" : "Item pausado.", allowDelivery: newValue ? "Delivery ativado!" : "Delivery desativado.", allowPos: newValue ? "Salão ativado!" : "Salão desativado.", allowOnline: newValue ? "Online ativado!" : "Online desativado." };
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
      .filter(p => categoryFilter === 'all' ? true : p.categories?.some(cat => cat.id === categoryFilter))
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [products, searchTerm, categoryFilter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach(p => { p.categories?.forEach(c => { counts[c.id] = (counts[c.id] || 0) + 1; }); });
    return counts;
  }, [products]);

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);
      const newOrder = arrayMove(categories, oldIndex, newIndex);
      setCategories(newOrder);
      try {
        setIsReordering(true);
        const updates = newOrder.map((cat, index) => ({ id: cat.id, order: index }));
        await reorderCategories(updates);
        toast.success("Ordem das categorias salva!");
      } catch (error) { toast.error('Erro ao salvar nova ordem.'); fetchData(); }
      finally { setIsReordering(false); }
    }
  };

  const handleProductDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);
      const newOrder = arrayMove(products, oldIndex, newIndex);
      setProducts(newOrder);
      try {
        setIsReordering(true);
        const updates = newOrder.map((prod, index) => ({ id: prod.id, order: index }));
        await reorderProducts(updates);
        toast.success("Ordem dos produtos salva!");
      } catch (error) { toast.error('Erro ao salvar nova ordem.'); fetchData(); }
      finally { setIsReordering(false); }
    }
  };

  if (isLoading && products.length === 0) return (
    <div className="flex flex-col h-64 items-center justify-center opacity-30 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Cardápio...</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 text-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">Cardápio Industrial</h1><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2"><Package size={12} className="text-orange-500" /> Gestão de Itens e Mix de Produtos</p></div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10 bg-white border-slate-200 rounded-xl" onClick={fetchData}><RefreshCw size={16} className={cn("text-slate-400", isLoading && "animate-spin")} /></Button>
            <Button onClick={() => navigate('/products/new')} className="rounded-xl px-6 italic font-black h-10 shadow-lg text-xs gap-2"><Plus size={16} /> NOVO PRODUTO</Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="w-full lg:w-64 shrink-0 space-y-2">
            <div className="flex items-center justify-between px-2 mb-2"><h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic flex items-center gap-2"><Filter size={10} className="text-orange-500" /> Navegação</h3><span className="text-[8px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded italic uppercase">{categories.length} Grupos</span></div>
            <div className="space-y-1 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                <button onClick={() => setCategoryFilter('all')} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-tighter italic", categoryFilter === 'all' ? "bg-slate-900 text-white shadow-md translate-x-1" : "text-slate-400 hover:bg-white hover:text-slate-600 ml-5")}><div className="flex items-center gap-3"><Package size={14} /><span>TODOS PRODUTOS</span></div><span className={cn("text-[9px] font-black", categoryFilter === 'all' ? "text-orange-400" : "text-slate-300")}>{categoryCounts.all}</span></button>
                <div className="h-px bg-slate-200/50 my-2 mx-2" />
                <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}><SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {categories.map((cat) => (<SortableCategoryItem key={cat.id} cat={cat} categoryFilter={categoryFilter} categoryCount={categoryCounts[cat.id]} onSelect={setCategoryFilter} onToggleStatus={handleToggleCategoryStatus} />))}
                    </SortableContext></DndContext>
                </div>
            </div>
        </aside>

        <div className="flex-1 space-y-4">
            <div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={16} /><input type="text" placeholder="Pesquisar por nome ou SKU..." className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white border border-slate-200 focus:border-orange-500 outline-none transition-all font-bold text-xs uppercase italic tracking-tight shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <Card className="p-0 overflow-hidden border border-slate-200 shadow-xl bg-white rounded-2xl">
                <div className="overflow-x-auto"><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProductDragEnd}><table className="w-full text-left border-collapse table-fixed min-w-[850px]"><thead className="bg-slate-50/80 border-b border-slate-100"><tr><th className="w-[35%] px-4 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Produto / Descrição</th><th className="w-[12%] px-4 py-3 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Canais</th><th className="w-[10%] px-4 py-3 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Estoque</th><th className="w-[12%] px-4 py-3 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Preço</th><th className="w-[10%] px-4 py-3 text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">Status</th><th className="w-[15%] px-4 py-3 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest px-6">Ações</th></tr></thead><SortableContext items={filteredProducts.map(p => p.id)} strategy={verticalListSortingStrategy}><tbody className="divide-y divide-slate-50">
                    {filteredProducts.map(product => (<SortableProductRow key={product.id} product={product} onToggleFlag={handleToggleFlag} onUpdatePrice={handleUpdatePrice} onDelete={handleDelete} navigate={navigate} isSortable={categoryFilter !== 'all'} />))}
                </tbody></SortableContext></table></DndContext></div>
                {filteredProducts.length === 0 && (<div className="p-16 text-center bg-slate-50/30"><div className="flex flex-col items-center justify-center opacity-20"><Package size={48} strokeWidth={1} className="mb-3" /><p className="font-black text-[9px] uppercase tracking-[0.2em] italic leading-none">Vazio</p></div></div>)}
            </Card>
        </div>
      </div>
      {isReordering && (<div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 duration-300 z-50 border border-white/10"><Loader2 className="h-4 w-4 animate-spin text-orange-500" /><span className="text-[9px] font-black uppercase tracking-[0.1em] italic">Sincronizando nova ordem...</span></div>)}
    </div>
  );
};

export default ProductManagement;