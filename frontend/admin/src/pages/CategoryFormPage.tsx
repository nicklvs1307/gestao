import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  ArrowLeft, Save, Loader2, Tag, Layout, 
  Eye, EyeOff, Truck, Utensils, Globe, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { getCategoryById, createCategory, updateCategory } from '../services/api/categories';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';

interface CategoryFormData {
  name: string;
  description: string;
  isActive: boolean;
  allowDelivery: boolean;
  allowPos: boolean;
  allowOnline: boolean;
  cuisineType: string;
}

const CategoryFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = Boolean(id);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isDirty } } = useForm<CategoryFormData>({
    defaultValues: {
      isActive: true,
      allowDelivery: true,
      allowPos: true,
      allowOnline: true,
      cuisineType: ''
    }
  });

  const watchFields = watch();

  useEffect(() => {
    if (isEdit && id) {
      const loadCategory = async () => {
        try {
          setIsLoading(true);
          const data = await getCategoryById(id);
          reset({
            name: data.name || '',
            description: data.description || '',
            isActive: data.isActive !== false,
            allowDelivery: data.allowDelivery !== false,
            allowPos: data.allowPos !== false,
            allowOnline: data.allowOnline !== false,
            cuisineType: data.cuisineType || ''
          });
        } catch (error) {
          toast.error("Erro ao carregar categoria.");
          navigate('/categories');
        } finally {
          setIsLoading(false);
        }
      };
      loadCategory();
    }
  }, [id, isEdit, reset, navigate]);

  const onSubmit = async (data: CategoryFormData) => {
    try {
      setIsLoading(true);
      if (isEdit && id) {
        await updateCategory(id, data);
        toast.success("Categoria atualizada com sucesso!");
      } else {
        await createCategory(data);
        toast.success("Categoria criada com sucesso!");
      }
      navigate('/categories');
    } catch (error) {
      toast.error("Erro ao salvar categoria.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleField = (field: keyof CategoryFormData) => {
    setValue(field, !watchFields[field], { shouldDirty: true });
  };

  if (isLoading && isEdit) {
    return (
      <div className="flex flex-col h-96 items-center justify-center opacity-30 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <span className="text-[10px] font-black uppercase tracking-widest italic">Sincronizando Categoria...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header Compacto Industrial */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 sticky top-0 bg-slate-50/80 backdrop-blur-md z-30 pt-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200 shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">
              {isEdit ? 'Editar Categoria' : 'Nova Categoria'}
            </h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
              <Tag size={10} className="text-orange-500" /> Configuração de Agrupamento
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="rounded-xl px-6 italic font-black h-10 text-[10px] uppercase border-slate-200"
          >
            CANCELAR
          </Button>
          <Button 
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading || (!isDirty && isEdit)}
            className="rounded-xl px-8 italic font-black h-10 shadow-lg shadow-orange-900/10 text-[10px] uppercase gap-2"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            SALVAR ALTERAÇÕES
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 border-slate-200 shadow-sm rounded-2xl space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
              <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic">Identificação Básica</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Nome do Grupo</label>
                <input 
                  {...register('name', { required: "Nome é obrigatório" })}
                  className={cn(
                    "w-full h-12 px-4 rounded-xl bg-slate-50 border transition-all font-bold text-xs uppercase italic tracking-tight outline-none",
                    errors.name ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-orange-500"
                  )}
                  placeholder="EX: PIZZAS TRADICIONAIS, BEBIDAS, BURGERS..."
                />
                {errors.name && <span className="text-[8px] font-black text-rose-500 uppercase ml-1 italic">{errors.name.message}</span>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Descrição (Opcional)</label>
                <textarea 
                  {...register('description')}
                  rows={3}
                  className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-orange-500 transition-all font-bold text-xs uppercase italic tracking-tight outline-none resize-none"
                  placeholder="DESCREVA O QUE COMPÕE ESTE GRUPO..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Tag de Cozinha</label>
                  <div className="relative">
                    <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input 
                      {...register('cuisineType')}
                      className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-orange-500 transition-all font-bold text-[10px] uppercase italic tracking-tight outline-none"
                      placeholder="EX: ITALIANA, LANCHES..."
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Status Geral</label>
                  <button 
                    type="button"
                    onClick={() => toggleField('isActive')}
                    className={cn(
                      "w-full h-11 rounded-xl border flex items-center justify-between px-4 transition-all font-black text-[10px] uppercase italic tracking-widest",
                      watchFields.isActive 
                        ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                        : "bg-slate-100 border-slate-200 text-slate-400"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {watchFields.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                      {watchFields.isActive ? 'CATEGORIA ATIVA' : 'CATEGORIA PAUSADA'}
                    </span>
                    <div className={cn(
                      "w-6 h-3 rounded-full relative transition-all",
                      watchFields.isActive ? "bg-emerald-500" : "bg-slate-300"
                    )}>
                      <div className={cn(
                        "absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all",
                        watchFields.isActive ? "right-0.5" : "left-0.5"
                      )} />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-slate-200 shadow-sm rounded-2xl bg-orange-50/30 border-dashed">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 text-orange-600">
                <Info size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-[10px] font-black uppercase italic text-orange-950">Nota de Gestão</h4>
                <p className="text-[9px] font-medium text-orange-800/70 leading-relaxed uppercase tracking-tight">
                  CATEGORIAS PAUSADAS OCULTAM AUTOMATICAMENTE TODOS OS PRODUTOS VINCULADOS EM TODOS OS CANAIS DE VENDA ATIVOS.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          <Card className="p-6 border-slate-200 shadow-sm rounded-2xl space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
              <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic">Canais Ativos</h2>
            </div>

            <div className="space-y-3">
              <ChannelToggle 
                label="DELIVERY" 
                icon={<Truck size={16} />} 
                isActive={watchFields.allowDelivery} 
                onClick={() => toggleField('allowDelivery')}
                color="blue"
              />
              <ChannelToggle 
                label="SALÃO / PDV" 
                icon={<Utensils size={16} />} 
                isActive={watchFields.allowPos} 
                onClick={() => toggleField('allowPos')}
                color="emerald"
              />
              <ChannelToggle 
                label="PEDIDO ONLINE" 
                icon={<Globe size={16} />} 
                isActive={watchFields.allowOnline} 
                onClick={() => toggleField('allowOnline')}
                color="purple"
              />
            </div>
          </Card>

          <Card className="p-6 border-slate-200 shadow-sm rounded-2xl space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 italic">Estatísticas</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Produtos</span>
                    <span className="text-xl font-black italic tracking-tighter">--</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Vendas (Mês)</span>
                    <span className="text-xl font-black italic tracking-tighter text-emerald-600">R$ 0</span>
                </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

interface ChannelToggleProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  color: 'blue' | 'emerald' | 'purple';
}

const ChannelToggle: React.FC<ChannelToggleProps> = ({ label, icon, isActive, onClick, color }) => {
  const colorClasses = {
    blue: isActive ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-slate-50 border-slate-100 text-slate-300",
    emerald: isActive ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-slate-50 border-slate-100 text-slate-300",
    purple: isActive ? "bg-purple-50 border-purple-100 text-purple-600" : "bg-slate-50 border-slate-100 text-slate-300"
  };

  const dotClasses = {
    blue: isActive ? "bg-blue-500" : "bg-slate-300",
    emerald: isActive ? "bg-emerald-500" : "bg-slate-300",
    purple: isActive ? "bg-purple-500" : "bg-slate-300"
  };

  return (
    <button 
      type="button"
      onClick={onClick}
      className={cn(
        "w-full h-14 rounded-xl border flex items-center gap-4 px-4 transition-all group",
        colorClasses[color]
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-all group-hover:scale-110",
        isActive ? "bg-white shadow-sm" : "opacity-40"
      )}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <span className="block text-[10px] font-black uppercase italic tracking-widest leading-none">{label}</span>
        <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">
          {isActive ? 'CANAL ATIVADO' : 'CANAL DESATIVADO'}
        </span>
      </div>
      <div className={cn("w-2 h-2 rounded-full", dotClasses[color])} />
    </button>
  );
};

export default CategoryFormPage;
