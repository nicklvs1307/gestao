import React, { useState, useEffect } from 'react';
// import type { Product, Size, AddonGroup, Addon, Category } from '@/types/index';
// Placeholder types to fix build
type Product = any;
type Size = any;
type AddonGroup = any;
type Addon = any;
type Category = any;
import { getCategories, createProduct, updateProduct, api } from '../services/api';
import { Pizza, Maximize2, List, Disc, Plus, Trash2, CheckCircle, Layers } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';

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
  const [tags, setTags] = useState(''); // Usar string para facilitar a edição
  const [categoryId, setCategoryId] = useState('');
  const [saiposIntegrationCode, setSaiposIntegrationCode] = useState(''); // Novo estado
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
    priceRule: 'higher', // 'higher' | 'average'
    flavorCategoryId: '', // ID da categoria que contém os sabores
    sizes: {
        'Grande': { active: true, slices: 8, maxFlavors: 2 },
        'Familia': { active: false, slices: 12, maxFlavors: 4 }
    }
  });

  const isEditing = !!productToEdit;

  useEffect(() => {
    // Popula o formulário se estiver no modo de edição
    if (isEditing && productToEdit) {
      setName(productToEdit.name);
      setDescription(productToEdit.description || '');
      setPrice(productToEdit.price);
      setImageUrl(productToEdit.imageUrl || '');
      setIsFeatured(productToEdit.isFeatured);
      setIsAvailable(productToEdit.isAvailable);
      setStock(productToEdit.stock);
      setTags(productToEdit.tags.join(', '));
      setCategoryId(productToEdit.categoryId);
      setSaiposIntegrationCode(productToEdit.saiposIntegrationCode || ''); // Popular novo campo
      setSizes(productToEdit.sizes || []);
      setAddonGroups(productToEdit.addonGroups || []);
      setProductIngredients(productToEdit.ingredients || []);
      
      // Carregar config de pizza
      if (productToEdit.pizzaConfig) {
          setIsPizza(true);
          // Garantir merge com defaults caso falte algo
          setPizzaConfig({ 
            ...pizzaConfig, 
            ...productToEdit.pizzaConfig,
            // Garantir que sizes existam se vierem nulos do banco
            sizes: productToEdit.pizzaConfig.sizes || pizzaConfig.sizes
          });
      } else {
          setIsPizza(false);
      }

    } else {
      // Limpa o formulário se estiver no modo de adição
      setName('');
      setDescription('');
      setPrice(0);
      setImageUrl('');
      setIsFeatured(false);
      setIsAvailable(true);
      setStock(0);
      setTags('');
      setCategoryId('');
      setSaiposIntegrationCode(''); // Limpar novo campo
      setSizes([]);
      setAddonGroups([]);
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

  // Funções de gerenciamento para Grupos de Adicionais
  const addAddonGroup = () => {
    setAddonGroups([
      ...addonGroups, 
      { 
        name: '', 
        type: 'multiple', 
        isRequired: false, 
        addons: [{ name: '', price: 0, saiposIntegrationCode: '' }] 
      }
    ]);
  };

  const handleAddonGroupChange = (index: number, field: string, value: any) => {
    const updatedGroups = [...addonGroups];
    updatedGroups[index] = { ...updatedGroups[index], [field]: value };
    setAddonGroups(updatedGroups);
  };

  const removeAddonGroup = (index: number) => {
    setAddonGroups(addonGroups.filter((_, i) => i !== index));
  };

  const addAddon = (groupIndex: number) => {
    const updatedGroups = [...addonGroups];
    const group = { ...updatedGroups[groupIndex] };
    group.addons = [...(group.addons || []), { name: '', price: 0, saiposIntegrationCode: '' }];
    updatedGroups[groupIndex] = group;
    setAddonGroups(updatedGroups);
  };

  const handleAddonChange = (groupIndex: number, addonIndex: number, field: string, value: any) => {
    const updatedGroups = [...addonGroups];
    const group = { ...updatedGroups[groupIndex] };
    const updatedAddons = [...(group.addons || [])];
    updatedAddons[addonIndex] = { ...updatedAddons[addonIndex], [field]: value };
    group.addons = updatedAddons;
    updatedGroups[groupIndex] = group;
    setAddonGroups(updatedGroups);
  };

  const removeAddon = (groupIndex: number, addonIndex: number) => {
    const updatedGroups = [...addonGroups];
    const group = { ...updatedGroups[groupIndex] };
    group.addons = (group.addons || []).filter((_: any, i: number) => i !== addonIndex);
    updatedGroups[groupIndex] = group;
    setAddonGroups(updatedGroups);
  };


  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        try {
          const categoriesData = await getCategories(true); // Fetch flat list
          setAllCategories(categoriesData);
          if (!isEditing && categoriesData.length > 0) {
            setCategoryId(categoriesData[0].id);
          }
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
  }, [isOpen, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!name || !categoryId || price <= 0) {
      alert('Por favor, preencha Nome, Categoria e Preço.');
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
      saiposIntegrationCode, // Adicionar ao payload
      categoryId,
      sizes: sizes.map(({ id, productId, ...rest }) => rest), // Remove campos extras
      addonGroups: addonGroups.map(g => ({
        name: g.name,
        type: g.type,
        isRequired: g.isRequired,
        order: g.order || 0,
        addons: g.addons.map(({ id, addonGroupId, ...rest }: any) => rest) 
      })),
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
      onSave(savedProduct); // onSave is called from AdminLayout, which closes the modal and refetches
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Falha ao salvar o produto. Verifique o console para mais detalhes.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-content large">
        <div className="modal-header">
          <div className="modal-title">{isEditing ? 'Editar Produto' : 'Adicionar Produto'}</div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} id="product-form" className="modal-body">
          <div className="form-row">
            <div className="form-group half-width">
              <label>Nome do Produto</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group half-width">
              <label>Categoria</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                <option value="" disabled>Selecione uma categoria</option>
                {allCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-4 mb-6 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-xl">
            <div className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                id="isAvailableTop" 
                checked={isAvailable} 
                onChange={e => setIsAvailable(e.target.checked)}
                className="w-5 h-5 accent-primary"
              />
              <label htmlFor="isAvailableTop" className="font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer select-none">
                Produto Disponível
              </label>
            </div>
            <div className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                id="isFeaturedTop" 
                checked={isFeatured} 
                onChange={e => setIsFeatured(e.target.checked)}
                className="w-5 h-5 accent-primary"
              />
              <label htmlFor="isFeaturedTop" className="font-bold text-sm text-gray-700 dark:text-gray-200 cursor-pointer select-none flex items-center gap-1">
                <FontAwesomeIcon icon={faStar} className="text-orange-500" />
                Marcar como Destaque
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 p-3 bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500 rounded-lg">
              <input 
                type="checkbox" 
                id="isPizzaToggle" 
                checked={isPizza} 
                onChange={e => setIsPizza(e.target.checked)}
                className="w-5 h-5 accent-orange-500 cursor-pointer"
              />
              <label htmlFor="isPizzaToggle" className="font-bold flex items-center gap-2 cursor-pointer select-none text-gray-800 dark:text-gray-200">
                <Pizza size={18} className="text-orange-500" /> 
                Este produto é uma Matriz de Pizza? (Permite múltiplos sabores)
              </label>
          </div>

          {isPizza ? (
             <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-orange-500 text-white p-2 rounded-lg"><Pizza size={24} /></div>
                    <div>
                        <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900">Configurador de Pizzas</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Definição de regras de sabores</p>
                    </div>
                </div>

                {/* 0. Categoria de Sabores */}
                <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4">
                    <h5 className="font-black text-slate-800 uppercase text-xs mb-4 flex items-center gap-2">
                        <Layers size={14} className="text-orange-500" /> 1. Origem dos Sabores
                    </h5>
                    <div className="form-group">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Categoria que contém os sabores:</label>
                        <select 
                            value={pizzaConfig.flavorCategoryId} 
                            onChange={e => setPizzaConfig({...pizzaConfig, flavorCategoryId: e.target.value})}
                            className="w-full mt-1 bg-white border-2 border-slate-200 rounded-lg p-2 font-bold text-sm"
                        >
                            <option value="">Selecione a categoria de sabores...</option>
                            {allCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1 italic">* O cliente escolherá os sabores desta categoria para montar a pizza.</p>
                    </div>
                </section>

                {/* 1. Tamanhos e Limites */}
                <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                    <h5 className="font-black text-slate-800 uppercase text-xs mb-4 flex items-center gap-2">
                        <Maximize2 size={14} className="text-orange-500" /> 2. Tamanhos e Limites
                    </h5>
                    
                    <div className="space-y-3">
                        {/* Config Grande */}
                        <div className={cn("p-3 border-2 rounded-xl transition-all", pizzaConfig.sizes['Grande'].active ? "border-orange-500 bg-orange-50" : "border-slate-200")}>
                            <div className="flex justify-between items-center mb-2">
                                <span className={cn("font-black text-sm italic", pizzaConfig.sizes['Grande'].active ? "text-orange-600" : "text-slate-400")}>Grande (G)</span>
                                <input 
                                    type="checkbox" 
                                    checked={pizzaConfig.sizes['Grande'].active}
                                    onChange={e => setPizzaConfig({...pizzaConfig, sizes: {...pizzaConfig.sizes, 'Grande': {...pizzaConfig.sizes['Grande'], active: e.target.checked}}})}
                                    className="accent-orange-500 h-4 w-4" 
                                />
                            </div>
                            {pizzaConfig.sizes['Grande'].active && (
                                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase text-slate-500">
                                    <div>
                                        <label>Qtd. Máx Sabores</label>
                                        <select 
                                            value={pizzaConfig.sizes['Grande'].maxFlavors}
                                            onChange={e => setPizzaConfig({...pizzaConfig, sizes: {...pizzaConfig.sizes, 'Grande': {...pizzaConfig.sizes['Grande'], maxFlavors: parseInt(e.target.value)}}})}
                                            className="w-full mt-1 bg-white border rounded p-1"
                                        >
                                            <option value="1">1 Sabor</option>
                                            <option value="2">Até 2 Sabores</option>
                                            <option value="3">Até 3 Sabores</option>
                                            <option value="4">Até 4 Sabores</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label>Fatias</label>
                                        <input 
                                            type="number" 
                                            value={pizzaConfig.sizes['Grande'].slices}
                                            onChange={e => setPizzaConfig({...pizzaConfig, sizes: {...pizzaConfig.sizes, 'Grande': {...pizzaConfig.sizes['Grande'], slices: parseInt(e.target.value)}}})}
                                            className="w-full mt-1 bg-white border rounded p-1" 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Config Familia */}
                         <div className={cn("p-3 border-2 rounded-xl transition-all", pizzaConfig.sizes['Familia'].active ? "border-orange-500 bg-orange-50" : "border-slate-200")}>
                            <div className="flex justify-between items-center mb-2">
                                <span className={cn("font-black text-sm italic", pizzaConfig.sizes['Familia'].active ? "text-orange-600" : "text-slate-400")}>Família (GG)</span>
                                <input 
                                    type="checkbox" 
                                    checked={pizzaConfig.sizes['Familia'].active}
                                    onChange={e => setPizzaConfig({...pizzaConfig, sizes: {...pizzaConfig.sizes, 'Familia': {...pizzaConfig.sizes['Familia'], active: e.target.checked}}})}
                                    className="accent-orange-500 h-4 w-4" 
                                />
                            </div>
                             {pizzaConfig.sizes['Familia'].active && (
                                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase text-slate-500">
                                    <div>
                                        <label>Qtd. Máx Sabores</label>
                                        <select 
                                            value={pizzaConfig.sizes['Familia'].maxFlavors}
                                            onChange={e => setPizzaConfig({...pizzaConfig, sizes: {...pizzaConfig.sizes, 'Familia': {...pizzaConfig.sizes['Familia'], maxFlavors: parseInt(e.target.value)}}})}
                                            className="w-full mt-1 bg-white border rounded p-1"
                                        >
                                            <option value="1">1 Sabor</option>
                                            <option value="2">Até 2 Sabores</option>
                                            <option value="3">Até 3 Sabores</option>
                                            <option value="4">Até 4 Sabores</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label>Fatias</label>
                                        <input 
                                            type="number" 
                                            value={pizzaConfig.sizes['Familia'].slices}
                                            onChange={e => setPizzaConfig({...pizzaConfig, sizes: {...pizzaConfig.sizes, 'Familia': {...pizzaConfig.sizes['Familia'], slices: parseInt(e.target.value)}}})}
                                            className="w-full mt-1 bg-white border rounded p-1" 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-slate-900 rounded-xl text-white">
                        <label className="block text-[10px] font-black uppercase text-orange-400 mb-2 leading-none">Regra de Preço Multi-Sabor</label>
                        <div className="space-y-1">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                                <input 
                                    type="radio" 
                                    name="price_rule" 
                                    checked={pizzaConfig.priceRule === 'higher'}
                                    onChange={() => setPizzaConfig({...pizzaConfig, priceRule: 'higher'})}
                                    className="accent-orange-500" 
                                />
                                <span className="text-xs">Preço do sabor mais caro</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                                <input 
                                    type="radio" 
                                    name="price_rule" 
                                    checked={pizzaConfig.priceRule === 'average'}
                                    onChange={() => setPizzaConfig({...pizzaConfig, priceRule: 'average'})}
                                    className="accent-orange-500" 
                                />
                                <span className="text-xs">Média aritmética dos valores</span>
                            </label>
                        </div>
                    </div>
                </section>
                
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm">
                    <p className="flex items-center gap-2 font-bold mb-1"><CheckCircle size={16} /> Configuração Concluída</p>
                    <p className="opacity-80 text-xs">Agora basta o cliente escolher os sabores. O sistema calculará o valor automaticamente.</p>
                </div>

             </div>
          ) : null}

          <div className="form-group">
            <label>Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group half-width">
              <label>Preço Base (R$)</label>
              <input type="number" step="0.01" value={price} onChange={e => setPrice(parseFloat(e.target.value))} required />
            </div>
            <div className="form-group half-width">
              <label>Estoque (unidades)</label>
              <input type="number" value={stock} onChange={e => setStock(parseInt(e.target.value, 10))} required />
            </div>
          </div>

          <div className="form-group">
            <label>URL da Imagem</label>
            <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          </div>

          {/* FICHA TÉCNICA (RECEITA) */}
          <div className="form-section bg-blue-50/30 border-blue-100">
            <h4 className="form-section-title flex items-center gap-2">
                <Layers size={18} className="text-blue-600" /> Ficha Técnica (Composição do Prato)
            </h4>
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-4 tracking-widest">Vincule os insumos para baixa automática de estoque</p>
            
            <div className="space-y-3">
                {productIngredients.map((pi, idx) => (
                    <div key={idx} className="flex gap-2 items-end bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">Insumo / Ingrediente</label>
                            <select 
                                className="w-full mt-1 p-2 border rounded-lg text-sm font-bold"
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
                            <label className="text-[9px] font-black uppercase text-slate-400">Qtd p/ Receita</label>
                            <input 
                                type="number" step="0.001"
                                className="w-full mt-1 p-2 border rounded-lg text-sm font-bold"
                                value={pi.quantity}
                                onChange={e => {
                                    const newItems = [...productIngredients];
                                    newItems[idx].quantity = parseFloat(e.target.value);
                                    setProductIngredients(newItems);
                                }}
                            />
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setProductIngredients(productIngredients.filter((_, i) => i !== idx))}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg mb-0.5"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
                <button 
                    type="button" 
                    onClick={() => setProductIngredients([...productIngredients, { ingredientId: '', quantity: 1 }])}
                    className="w-full py-3 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 font-bold text-xs uppercase hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={16} /> Adicionar Ingrediente à Receita
                </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half-width">
                <label>Tags (separadas por vírgula)</label>
                <input type="text" value={tags} onChange={e => setTags(e.target.value)} />
            </div>
            <div className="form-group half-width">
                <label>Código de Integração Saipos</label>
                <input type="text" value={saiposIntegrationCode} onChange={e => setSaiposIntegrationCode(e.target.value)} placeholder="Ex: 1234"/>
            </div>
          </div>

          <div className="form-section">
            <h4 className="form-section-title">Grupos de Adicionais (Bordas, Extras)</h4>
            {addonGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="addon-group-box">
                <div className="addon-group-header">
                  <div className="form-group">
                    <label>Nome do Grupo</label>
                    <input 
                      type="text" 
                      value={group.name} 
                      onChange={(e) => handleAddonGroupChange(groupIndex, 'name', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Tipo de Seleção</label>
                    <select 
                      value={group.type} 
                      onChange={(e) => handleAddonGroupChange(groupIndex, 'type', e.target.value)}
                    >
                      <option value="multiple">Múltipla Escolha</option>
                      <option value="single">Escolha Única</option>
                    </select>
                  </div>
                  <div className="form-group form-check centered">
                    <input 
                      type="checkbox" 
                      id={`isRequired-${groupIndex}`}
                      checked={group.isRequired}
                      onChange={(e) => handleAddonGroupChange(groupIndex, 'isRequired', e.target.checked)}
                    />
                    <label htmlFor={`isRequired-${groupIndex}`}>Obrigatório</label>
                  </div>
                  <button type="button" className="btn btn-danger" onClick={() => removeAddonGroup(groupIndex)}>Remover Grupo</button>
                </div>
                
                <h5>Itens do Grupo</h5>
                {group.addons.map((addon: any, addonIndex: any) => (
                  <div key={addonIndex} className="addon-item-row">
                    <div className="form-group">
                      <input 
                        type="text" 
                        placeholder="Nome do item" 
                        value={addon.name} 
                        onChange={(e) => handleAddonChange(groupIndex, addonIndex, 'name', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <input 
                        type="text" 
                        placeholder="Cód. Integração"
                        value={addon.saiposIntegrationCode}
                        onChange={(e) => handleAddonChange(groupIndex, addonIndex, 'saiposIntegrationCode', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="Preço" 
                        value={addon.price}
                        onChange={(e) => handleAddonChange(groupIndex, addonIndex, 'price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <button type="button" className="btn btn-danger-outline" onClick={() => removeAddon(groupIndex, addonIndex)}>&times;</button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary" onClick={() => addAddon(groupIndex)}>+ Adicionar Item</button>
              </div>
            ))}
            <button type="button" className="btn" onClick={addAddonGroup}>+ Adicionar Grupo de Adicionais</button>
          </div>

        </form>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" form="product-form">
            {isEditing ? 'Salvar Alterações' : 'Criar Produto'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductFormModal;
