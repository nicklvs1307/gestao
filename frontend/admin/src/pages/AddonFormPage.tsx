import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { addonService } from '../services/api/addonService';
import type { AddonGroup, Addon } from '../services/api/addonService';
import { 
    ArrowLeft, Save, Plus, Trash2, GripVertical, 
    Settings2, Info, Hash, List, Image as ImageIcon, 
    Upload, Loader2, CheckCircle, Package
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
import { toast } from 'sonner';
import { getImageUrl } from '../utils/image';
import { uploadProductImage } from '../services/api/products';
import { ImageCropperModal } from '../components/ui/ImageCropperModal';

interface SortableAddonRowProps {
    addon: Addon;
    index: number;
    updateAddon: (index: number, field: keyof Addon, value: any) => void;
    removeAddonRow: (index: number) => void;
}

function SortableAddonRow({ addon, index, updateAddon, removeAddonRow }: SortableAddonRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: addon.id || `temp-${index}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const [isUploading, setIsUploading] = useState(false);
    const [cropper, setCropper] = useState<{ isOpen: boolean, src: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = () => {
            setCropper({ isOpen: true, src: reader.result as string });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropComplete = async (blob: Blob) => {
        if (!cropper) return;
        
        setIsUploading(true);
        try {
            const optimizedFile = new File([blob], `addon-${Date.now()}.webp`, { type: 'image/webp' });
            const data = await uploadProductImage(optimizedFile);
            updateAddon(index, 'imageUrl', data.imageUrl);
            toast.success("Imagem otimizada e carregada!");
        } catch (error) {
            toast.error("Erro no upload da imagem.");
        } finally {
            setIsUploading(false);
            setCropper(null);
        }
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className={cn(
                "grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100 items-end group transition-all",
                isDragging && "opacity-50 scale-[0.98] z-50 bg-white shadow-xl ring-2 ring-orange-500"
            )}
        >
            {cropper && (
                <ImageCropperModal 
                    isOpen={cropper.isOpen}
                    imageSrc={cropper.src}
                    onClose={() => setCropper(null)}
                    onCropComplete={handleCropComplete}
                />
            )}
            <div className="md:col-span-1 flex items-center gap-2">
                <button 
                    {...attributes} 
                    {...listeners}
                    className="p-2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-orange-500 transition-colors"
                >
                    <GripVertical size={18} />
                </button>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-300 uppercase italic">Item</span>
                    <span className="text-xs font-black">#{index + 1}</span>
                </div>
            </div>

            <div className="md:col-span-3">
                <Input 
                    label="Nome do Item" 
                    value={addon.name} 
                    onChange={(e) => updateAddon(index, 'name', e.target.value)} 
                    className="h-9 font-bold text-xs uppercase"
                    placeholder="Ex: Bacon, Queijo..."
                />
            </div>

            <div className="md:col-span-3">
                <Input 
                    label="Descrição (Opcional)" 
                    value={addon.description || ''} 
                    onChange={(e) => updateAddon(index, 'description', e.target.value)} 
                    className="h-9 text-[10px]"
                    placeholder="Breve detalhe do item"
                />
            </div>

            <div className="md:col-span-2">
                <Input 
                    label="Preço Adicional" 
                    type="number" 
                    value={addon.price} 
                    onChange={(e) => updateAddon(index, 'price', parseFloat(e.target.value))} 
                    className="h-9 font-black"
                    prefix="R$"
                />
            </div>

            <div className="md:col-span-3 flex items-center gap-2">
                <div className="relative flex-1 group/upload">
                    <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "w-full h-9 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all",
                            addon.imageUrl ? "border-orange-500/30 text-orange-600 bg-orange-50/30" : "border-slate-200 text-slate-400 hover:border-slate-300"
                        )}
                        disabled={isUploading}
                    >
                        {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        {addon.imageUrl && !addon.imageUrl.startsWith('http') ? 'Alterar' : 'Upload'}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                <div className="flex-[2] relative">
                    <Input 
                        placeholder="Link da Foto (URL)" 
                        value={addon.imageUrl?.startsWith('http') ? addon.imageUrl : ''} 
                        onChange={(e) => updateAddon(index, 'imageUrl', e.target.value)} 
                        className="h-9 text-[9px] pl-7"
                    />
                    <ImageIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>

                {addon.imageUrl && (
                    <div className="w-9 h-9 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                        <img src={getImageUrl(addon.imageUrl)} alt="" className="w-full h-full object-cover" />
                    </div>
                )}
                <Button variant="ghost" size="icon" onClick={() => removeAddonRow(index)} className="h-9 w-9 bg-rose-50 text-rose-500 rounded-lg shrink-0 hover:bg-rose-100 transition-colors"><Trash2 size={16} /></Button>
            </div>
        </div>
    );
}

const AddonFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<AddonGroup>({
        name: '',
        type: 'multiple',
        isRequired: false,
        isFlavorGroup: false,
        priceRule: 'higher',
        minQuantity: 0,
        maxQuantity: 1,
        order: 0,
        addons: []
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const loadData = async () => {
            if (id && id !== 'new') {
                try {
                    setIsLoading(true);
                    const group = await addonService.getById(id);
                    if (group) {
                        setFormData({
                            ...group,
                            priceRule: group.priceRule || 'higher'
                        });
                    } else {
                        toast.error("Grupo não encontrado.");
                        navigate('/addons');
                    }
                } catch (error) {
                    toast.error("Erro ao carregar dados.");
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };
        loadData();
    }, [id, navigate]);

    const handleSave = async () => {
        if (!formData.name) return toast.error('O nome do grupo é obrigatório.');
        setIsSaving(true);
        try {
            if (id && id !== 'new') await addonService.update(id, formData);
            else await addonService.create(formData);
            toast.success(id ? 'Grupo atualizado!' : 'Grupo criado!');
            navigate('/addons');
        } catch (error) {
            toast.error('Erro ao salvar.');
        } finally {
            setIsSaving(false);
        }
    };

    const addAddonRow = () => {
        setFormData(prev => ({
            ...prev,
            addons: [
                ...prev.addons,
                { id: `new-${Date.now()}`, name: '', price: 0, order: prev.addons.length, saiposIntegrationCode: '' }
            ]
        }));
    };

    const removeAddonRow = (index: number) => {
        setFormData(prev => ({
            ...prev,
            addons: prev.addons.filter((_, i) => i !== index)
        }));
    };

    const updateAddon = (index: number, field: keyof Addon, value: any) => {
        setFormData(prev => ({
            ...prev,
            addons: prev.addons.map((addon, i) => i === index ? { ...addon, [field]: value } : addon)
        }));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFormData((prev) => {
                const oldIndex = prev.addons.findIndex((a) => (a.id || `temp-${prev.addons.indexOf(a)}`) === active.id);
                const newIndex = prev.addons.findIndex((a) => (a.id || `temp-${prev.addons.indexOf(a)}`) === over.id);
                const newAddons = arrayMove(prev.addons, oldIndex, newIndex).map((addon, idx) => ({ ...addon, order: idx }));
                return { ...prev, addons: newAddons };
            });
        }
    };

    if (isLoading) return <div className="flex h-64 items-center justify-center opacity-30"><Loader2 className="animate-spin text-orange-500" size={32} /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10 text-slate-900">
            {/* Header Compacto */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md z-40 py-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/addons')} className="rounded-xl bg-white h-10 w-10 border border-slate-200 shadow-sm">
                        <ArrowLeft size={20}/>
                    </Button>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">Configurar Biblioteca</h1>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1 italic">Gestão de Grupos e Opções</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Button variant="ghost" className="flex-1 lg:flex-none h-10 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400" onClick={() => navigate('/addons')}>CANCELAR</Button>
                    <Button onClick={handleSave} isLoading={isSaving} className="flex-1 lg:flex-none h-10 rounded-xl px-8 shadow-lg font-black italic uppercase tracking-widest gap-2 text-xs">
                        <Save size={18} /> SALVAR ALTERAÇÕES
                    </Button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Configurações do Grupo */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-6 border-slate-200 bg-white space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Settings2 size={16} className="text-orange-500" />
                            <h3 className="text-xs font-black uppercase italic text-slate-900">Definições do Grupo</h3>
                        </div>

                        <Input 
                            label="Nome do Grupo" 
                            value={formData.name} 
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="h-11 font-black text-sm uppercase italic"
                            placeholder="Ex: Escolha o Sabor, Bordas Recheadas..."
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Mínimo</label>
                                <Input type="number" value={formData.minQuantity} onChange={(e) => setFormData(prev => ({ ...prev, minQuantity: parseInt(e.target.value) }))} className="h-10 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Máximo</label>
                                <Input type="number" value={formData.maxQuantity} onChange={(e) => setFormData(prev => ({ ...prev, maxQuantity: parseInt(e.target.value) }))} className="h-10 font-bold" />
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                                <input type="checkbox" checked={formData.isRequired} onChange={(e) => setFormData(prev => ({ ...prev, isRequired: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                                <span className="text-[10px] font-black uppercase italic text-slate-700">Seleção Obrigatória</span>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                                <input type="checkbox" checked={formData.isFlavorGroup} onChange={(e) => setFormData(prev => ({ ...prev, isFlavorGroup: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase italic text-slate-700">Este é um Grupo de Sabores</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Ativa regra de preço por sabor (Pizza)</span>
                                </div>
                            </label>
                        </div>

                        {formData.isFlavorGroup && (
                            <div className="space-y-2 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                                <label className="text-[10px] font-black uppercase text-orange-600 tracking-widest italic block mb-2">Regra de Preço</label>
                                <select 
                                    value={formData.priceRule}
                                    onChange={(e) => setFormData(prev => ({ ...prev, priceRule: e.target.value as any }))}
                                    className="w-full h-10 bg-white border border-orange-200 rounded-lg px-3 text-[10px] font-black uppercase outline-none"
                                >
                                    <option value="higher">Pelo Maior Valor (Padrão Pizza)</option>
                                    <option value="average">Pela Média dos Valores</option>
                                    <option value="sum">Soma de todos os itens</option>
                                </select>
                            </div>
                        )}
                    </Card>

                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                        <Info size={18} className="text-blue-500 shrink-0" />
                        <p className="text-[9px] font-bold text-blue-900 leading-relaxed uppercase italic">
                            As opções cadastradas aqui podem ser vinculadas a múltiplos produtos simultaneamente no menu de gestão de produtos.
                        </p>
                    </div>
                </div>

                {/* Listagem de Itens / Adicionais */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-black uppercase italic text-slate-400 flex items-center gap-2">
                            <List size={16} className="text-orange-500" /> Itens Disponíveis no Grupo
                        </h3>
                        <Button onClick={addAddonRow} size="sm" className="h-9 px-4 rounded-xl italic font-black text-[10px] gap-2 shadow-md">
                            <Plus size={14} /> ADICIONAR OPÇÃO
                        </Button>
                    </div>

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={formData.addons.map((a, i) => a.id || `temp-${i}`)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                                {formData.addons.map((addon, index) => (
                                    <SortableAddonRow 
                                        key={addon.id || `temp-${index}`} 
                                        addon={addon} 
                                        index={index} 
                                        updateAddon={updateAddon} 
                                        removeAddonRow={removeAddonRow} 
                                    />
                                ))}
                                {formData.addons.length === 0 && (
                                    <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-white">
                                        <Package size={40} className="mx-auto text-slate-200 mb-3" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum item cadastrado neste grupo</p>
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>
        </div>
    );
};

export default AddonFormPage;
