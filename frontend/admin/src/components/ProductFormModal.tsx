import React, { useState, useEffect } from 'react';
import type { Product, Size, AddonGroup, Addon, Category } from '@/types/index';
import { getCategories, createProduct, updateProduct, api } from '../services/api';
import { Pizza, Maximize2, List, Disc, Plus, Trash2, CheckCircle, Layers, X } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  productToEdit?: Product | null;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSave, productToEdit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [stock, setStock] = useState(0);
  const [tags, setTags] = useState(''); 
  const [categoryIds, setCategoryIds] = useState<string[]>([]); // Alterado para Array
  const [saiposIntegrationCode, setSaiposIntegrationCode] = useState(''); 
  const [sizes, setSizes] = useState<Partial<Size>[]>([]);
  const [addonGroups, setAddonGroups] = useState<Partial<AddonGroup & { addons: Partial<Addon>[] }>[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allIngredients, setAllIngredients] = useState<any[]>([]);
  const [productIngredients, setProductIngredients] = useState<{ ingredientId: string, quantity: number }[]>([]);

  // Estados Pizza
  const [isPizza, setIsPizza] = useState(false);
  const [pizzaConfig, setPizzaConfig] = useState({
    maxFlavors: 2,
    sliceCount: 8,
    priceRule: 'higher', 
    flavorCategoryId: '', 
    sizes: {
        'Grande': { active: true, slices: 8, maxFlavors: 2 },
        'Familia': { active: false, slices: 12, maxFlavors: 4 }
    }
  });

  const isEditing = !!productToEdit;

  useEffect(() => {
    if (isEditing && productToEdit) {
      setName(productToEdit.name);
      setDescription(productToEdit.description || '');
      setPrice(productToEdit.price);
      setImageUrl(productToEdit.imageUrl || '');
      setIsFeatured(productToEdit.isFeatured);
      setIsAvailable(productToEdit.isAvailable);
      setStock(productToEdit.stock);
      setTags(productToEdit.tags?.join(', ') || '');
      
      // Carregar categorias (suporta legado e novo array)
      const initialCats = productToEdit.categoryIds || (productToEdit.categories?.map((c: any) => c.id)) || (productToEdit.categoryId ? [productToEdit.categoryId] : []);
      setCategoryIds(initialCats);

      setSaiposIntegrationCode(productToEdit.saiposIntegrationCode || ''); 
      setSizes(productToEdit.sizes || []);
      setAddonGroups(productToEdit.addonGroups || []);
      setProductIngredients(productToEdit.ingredients || []);
      
      if (productToEdit.pizzaConfig) {
          setIsPizza(true);
          setPizzaConfig({ 
            ...pizzaConfig, 
            ...productToEdit.pizzaConfig,
            sizes: productToEdit.pizzaConfig.sizes || pizzaConfig.sizes
          });
      } else {
          setIsPizza(false);
      }
    } else {
      setName('');
      setDescription('');
      setPrice(0);
      setImageUrl('');
      setIsFeatured(false);
      setIsAvailable(true);
      setStock(0);
      setTags('');
      setCategoryIds([]);
      setSaiposIntegrationCode(''); 
      setSizes([]);
      setAddonGroups([]);
      setProductIngredients([]);
      setIsPizza(false);
      setPizzaConfig({
        maxFlavors: 2,
        sliceCount: 8,
        priceRule: 'higher',
        flavorCategoryId: '',
        sizes: {
            'Grande': { active: true, slices: 8, maxFlavors: 2 },
            'Familia': { active: false, slices: 12, maxFlavors: 4 }
        }
      });
    }
  }, [productToEdit, isEditing]);

  const toggleCategory = (id: string) => {
    setCategoryIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        try {
          const categoriesData = await getCategories(true);
          setAllCategories(categoriesData);
        } catch (error) {
          console.error("Failed to fetch categories", error);
        }
      };
      fetchCategories();

      const fetchIngredients = async () => {
          try {
              const res = await api.get('/ingredients');
              setAllIngredients(res.data);
          } catch (e) {}
      };
      fetchIngredients();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || categoryIds.length === 0 || price <= 0) {
      alert('Por favor, preencha Nome, pelo menos uma Categoria e Preço.');
      return;
    }

    const productData = {
      name,
      description,
      price,
      imageUrl,
      isFeatured,
      isAvailable,
      stock,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      saiposIntegrationCode,
      categoryIds, // Enviando como array conforme backend
      sizes: sizes.filter(s => s.name).map(({ id, productId, ...rest }: any) => rest),
      addonGroups: addonGroups.filter(g => g.id).map(g => ({ id: g.id })), // O backend espera apenas IDs no connect/set
      ingredients: productIngredients.filter(pi => pi.ingredientId && pi.quantity > 0),
      pizzaConfig: isPizza ? pizzaConfig : null,
    };

    try {
      let savedProduct;
      if (isEditing && productToEdit) {
        savedProduct = await updateProduct(productToEdit.id, productData);
      } else {
        savedProduct = await createProduct(productData);
      }
      onSave(savedProduct);
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Falha ao salvar o produto.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay overflow-y-auto py-10">
      <div className="ui-modal-content w-full max-w-4xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">
                {isEditing ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Preencha os detalhes do item abaixo</p>
          </div>
          <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors" onClick={onClose}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} id="product-form" className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Nome do Produto</label>
              <input type="text" className="ui-input w-full" value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Pizza de Calabresa" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Categorias (Selecione uma ou mais)</label>
              <div className="flex flex-wrap gap-2 p-3 bg-white border border-slate-200 rounded-xl min-h-[46px]">
                  {allCategories.map(cat => {
                      const isSelected = categoryIds.includes(cat.id);
                      return (
                          <button 
                            key={cat.id} 
                            type="button"
                            onClick={() => toggleCategory(cat.id)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2",
                                isSelected ? "bg-orange-600 text-white shadow-md" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                              {isSelected && <CheckCircle size={12} />}
                              {cat.name}
                          </button>
                      );
                  })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-2xl cursor-pointer hover:bg-orange-100/50 transition-colors">
              <input 
                type="checkbox" 
                id="isAvailableTop" 
                checked={isAvailable} 
                onChange={e => setIsAvailable(e.target.checked)}
                className="w-5 h-5 accent-orange-600 rounded"
              />
              <label htmlFor="isAvailableTop" className="font-bold text-sm text-orange-900 cursor-pointer select-none">
                Produto Disponível para Venda
              </label>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/50 transition-colors">
              <input 
                type="checkbox" 
                id="isFeaturedTop" 
                checked={isFeatured} 
                onChange={e => setIsFeatured(e.target.checked)}
                className="w-5 h-5 accent-slate-900 rounded"
              />
              <label htmlFor="isFeaturedTop" className="font-bold text-sm text-slate-900 cursor-pointer select-none flex items-center gap-2">
                <FontAwesomeIcon icon={faStar} className="text-yellow-500" />
                Marcar como Destaque
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-orange-600 text-white rounded-2xl shadow-lg shadow-orange-600/20">
              <input 
                type="checkbox" 
                id="isPizzaToggle" 
                checked={isPizza} 
                onChange={e => setIsPizza(e.target.checked)}
                className="w-5 h-5 accent-white cursor-pointer"
              />
              <label htmlFor="isPizzaToggle" className="font-bold text-sm flex items-center gap-2 cursor-pointer select-none">
                <Pizza size={20} /> 
                Configurador de Pizza (Habilita regras de pizza para este produto)
              </label>
          </div>

          {isPizza && (
              <div className="p-6 bg-orange-50 border border-orange-200 rounded-2xl space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-orange-900">Quantidade Padrão de Fatias</label>
                        <input 
                            type="number" 
                            className="ui-input w-full border-orange-200 focus:border-orange-500" 
                            value={pizzaConfig.sliceCount} 
                            onChange={e => setPizzaConfig({...pizzaConfig, sliceCount: parseInt(e.target.value)})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-orange-900">Regra de Preço (Sabores)</label>
                        <select 
                            className="ui-input w-full border-orange-200 focus:border-orange-500"
                            value={pizzaConfig.priceRule}
                            onChange={e => setPizzaConfig({...pizzaConfig, priceRule: e.target.value})}
                        >
                            <option value="higher">Maior Valor</option>
                            <option value="average">Média dos Valores</option>
                        </select>
                      </div>
                  </div>
              </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Descrição do Item</label>
            <textarea 
                className="ui-input w-full h-24 py-3 resize-none" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Ex: Molho de tomate artesanal, muçarela, calabresa fatiada..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Preço Base (R$)</label>
              <input type="number" step="0.01" className="ui-input w-full" value={price} onChange={e => setPrice(parseFloat(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Estoque Atual</label>
              <input type="number" className="ui-input w-full" value={stock} onChange={e => setStock(parseInt(e.target.value, 10))} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Cód. Integração</label>
              <input type="text" className="ui-input w-full" value={saiposIntegrationCode} onChange={e => setSaiposIntegrationCode(e.target.value)} placeholder="Ex: 1234"/>
            </div>
          </div>

          {/* FICHA TÉCNICA (RECEITA) */}
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
                <Layers size={20} className="text-orange-600" />
                <h4 className="font-black text-slate-900 uppercase text-xs">Ficha Técnica / Receita</h4>
            </div>
            
            <div className="space-y-3">
                {productIngredients.map((pi, idx) => (
                    <div key={idx} className="flex gap-2 items-end bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">Insumo</label>
                            <select 
                                className="ui-input w-full mt-1"
                                value={pi.ingredientId}
                                onChange={e => {
                                    const newItems = [...productIngredients];
                                    newItems[idx].ingredientId = e.target.value;
                                    setProductIngredients(newItems);
                                }}
                            >
                                <option value="">Selecione...</option>
                                {allIngredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                            </select>
                        </div>
                        <div className="w-32">
                            <label className="text-[9px] font-black uppercase text-slate-400">Qtd</label>
                            <input 
                                type="number" step="0.001"
                                className="ui-input w-full mt-1"
                                value={pi.quantity}
                                onChange={e => {
                                    const newItems = [...productIngredients];
                                    newItems[idx].quantity = parseFloat(e.target.value);
                                    setProductIngredients(newItems);
                                }}
                            />
                        </div>
                        <button type="button" onClick={() => setProductIngredients(productIngredients.filter((_, i) => i !== idx))} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100">
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
                <button 
                    type="button" 
                    onClick={() => setProductIngredients([...productIngredients, { ingredientId: '', quantity: 1 }])}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold text-[10px] uppercase hover:bg-white hover:border-orange-200 hover:text-orange-600 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={16} /> Adicionar Ingrediente à Receita
                </button>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-slate-50/50">
          <button type="button" className="px-6 py-2.5 text-xs font-black uppercase text-slate-500 hover:text-slate-900 transition-all" onClick={onClose}>Cancelar</button>
          <button type="submit" className="ui-button-primary" form="product-form">
            {isEditing ? 'Atualizar Produto' : 'Cadastrar Produto'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductFormModal;
