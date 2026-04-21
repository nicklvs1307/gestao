import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ClipboardCheck, ArrowLeft, Plus, Trash2, GripVertical,
    CheckCircle2, XCircle, Camera, Type, Hash, Clock, Calendar,
    HelpCircle, Image as ImageIcon, Video, FileText, Save, Loader2,
    ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { getChecklistDetail, createChecklist, updateChecklist, getSectors } from '../services/api/checklists';
import { cn } from '../lib/utils';

const WEEK_DAYS = [
    { value: 'MONDAY', label: 'Seg' },
    { value: 'TUESDAY', label: 'Ter' },
    { value: 'WEDNESDAY', label: 'Qua' },
    { value: 'THURSDAY', label: 'Qui' },
    { value: 'FRIDAY', label: 'Sex' },
    { value: 'SATURDAY', label: 'Sáb' },
    { value: 'SUNDAY', label: 'Dom' }
];

const TASK_TYPES = [
    { value: 'CHECKBOX', label: 'Checkbox', icon: CheckCircle2, description: 'Sim/Não' },
    { value: 'PHOTO', label: 'Foto', icon: Camera, description: 'Upload de imagem' },
    { value: 'TEXT', label: 'Texto', icon: Type, description: 'Campo de texto' },
    { value: 'NUMBER', label: 'Número', icon: Hash, description: 'Valor numérico' }
];

const PROCEDURE_TYPES = [
    { value: 'NONE', label: 'Nenhum' },
    { value: 'TEXT', label: 'Texto', icon: FileText },
    { value: 'IMAGE', label: 'Imagem', icon: ImageIcon },
    { value: 'VIDEO', label: 'Vídeo', icon: Video }
];

const ChecklistFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [sectors, setSectors] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        frequency: 'DAILY',
        sectorId: '',
        deadlineTime: '',
        days: [] as string[],
        isActive: true,
        tasks: [] as any[]
    });

    useEffect(() => {
        loadInitialData();
    }, [id]);

    const loadInitialData = async () => {
        try {
            const [sectorsData] = await Promise.all([
                getSectors()
            ]);
            setSectors(sectorsData || []);

            if (id) {
                const checklistData = await getChecklistDetail(id);
                setFormData({
                    title: checklistData.title || '',
                    description: checklistData.description || '',
                    frequency: checklistData.frequency || 'DAILY',
                    sectorId: checklistData.sectorId || '',
                    deadlineTime: checklistData.deadlineTime || '',
                    days: checklistData.days || [],
                    isActive: checklistData.isActive ?? true,
                    tasks: checklistData.tasks || []
                });
            }
        } catch (error: any) {
            toast.error("Erro ao carregar dados");
            navigate('/checklists');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.title || !formData.sectorId) {
            return toast.error("Preencha o título e setor");
        }
        if (!formData.tasks.length) {
            return toast.error("Adicione pelo menos uma tarefa");
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                tasks: formData.tasks.map((t, idx) => ({
                    ...t,
                    order: idx,
                    id: t.id || undefined
                }))
            };

            if (isEditing && id) {
                await updateChecklist(id, payload);
                toast.success("Checklist atualizado!");
            } else {
                await createChecklist(payload);
                toast.success("Checklist criado!");
            }
            navigate('/checklists');
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Erro ao salvar");
        } finally {
            setSaving(false);
        }
    };

    const addTask = () => {
        setFormData({
            ...formData,
            tasks: [
                ...formData.tasks,
                {
                    content: '',
                    type: 'CHECKBOX',
                    isRequired: true,
                    procedureType: 'NONE',
                    procedureContent: '',
                    days: []
                }
            ]
        });
    };

    const removeTask = (index: number) => {
        const newTasks = [...formData.tasks];
        newTasks.splice(index, 1);
        setFormData({ ...formData, tasks: newTasks });
    };

    const updateTask = (index: number, field: string, value: any) => {
        const newTasks = [...formData.tasks];
        newTasks[index] = { ...newTasks[index], [field]: value };
        setFormData({ ...formData, tasks: newTasks });
    };

    const toggleDay = (day: string) => {
        const newDays = formData.days.includes(day)
            ? formData.days.filter(d => d !== day)
            : [...formData.days, day];
        setFormData({ ...formData, days: newDays });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header */}
            <header className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/checklists')}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-foreground">
                        {isEditing ? 'Editar Checklist' : 'Novo Checklist'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {isEditing ? 'Atualize o modelo de checklist' : 'Crie um novo modelo de checklist'}
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-10 px-5"
                >
                    {saving ? (
                        <Loader2 size={16} className="animate-spin mr-2" />
                    ) : (
                        <Save size={16} className="mr-2" />
                    )}
                    Salvar
                </Button>
            </header>

            {/* Basic Info */}
            <Card className="p-6 space-y-6 mb-6">
                <h2 className="text-lg font-semibold text-foreground">Informações Básicas</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-foreground mb-2 block">Título *</label>
                        <input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ex: Abertura de Cozinha"
                            className="w-full h-11 px-4 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-foreground mb-2 block">Descrição</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Descrição opcional..."
                            className="w-full h-20 px-4 py-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Setor *</label>
                        <select
                            value={formData.sectorId}
                            onChange={(e) => setFormData({ ...formData, sectorId: e.target.value })}
                            className="w-full h-11 px-4 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            <option value="">Selecione um setor</option>
                            {sectors.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Frequência</label>
                        <select
                            value={formData.frequency}
                            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                            className="w-full h-11 px-4 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            <option value="DAILY">Diária</option>
                            <option value="WEEKLY">Semanal</option>
                            <option value="MONTHLY">Mensal</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Horário Limite</label>
                        <input
                            type="time"
                            value={formData.deadlineTime}
                            onChange={(e) => setFormData({ ...formData, deadlineTime: e.target.value })}
                            className="w-full h-11 px-4 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Dias da Semana</label>
                        <div className="flex flex-wrap gap-2">
                            {WEEK_DAYS.map(day => (
                                <button
                                    key={day.value}
                                    onClick={() => toggleDay(day.value)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                        formData.days.includes(day.value)
                                            ? "bg-primary text-white"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    )}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Tasks */}
            <Card className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">Tarefas</h2>
                    <Button onClick={addTask} variant="outline" className="h-9">
                        <Plus size={16} className="mr-2" /> Adicionar Tarefa
                    </Button>
                </div>

                {formData.tasks.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <ClipboardCheck size={32} className="mx-auto mb-3 opacity-50" />
                        <p>Nenhuma tarefa adicionada</p>
                        <p className="text-sm">Clique em "Adicionar Tarefa" para começar</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {formData.tasks.map((task, index) => (
                            <div
                                key={index}
                                className="border border-border rounded-xl p-4 space-y-4"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-muted rounded-lg cursor-move">
                                        <GripVertical size={16} className="text-muted-foreground" />
                                    </div>
                                    
                                    <div className="flex-1 space-y-4">
                                        <input
                                            value={task.content}
                                            onChange={(e) => updateTask(index, 'content', e.target.value)}
                                            placeholder="Descrição da tarefa..."
                                            className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {TASK_TYPES.map(type => (
                                                <button
                                                    key={type.value}
                                                    onClick={() => updateTask(index, 'type', type.value)}
                                                    className={cn(
                                                        "p-3 rounded-lg border text-center transition-all",
                                                        task.type === type.value
                                                            ? "border-primary bg-primary/10 text-primary"
                                                            : "border-border hover:border-muted-foreground"
                                                    )}
                                                >
                                                    <type.icon size={20} className="mx-auto mb-1" />
                                                    <span className="text-xs font-medium block">{type.label}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={task.isRequired}
                                                    onChange={(e) => updateTask(index, 'isRequired', e.target.checked)}
                                                    className="w-4 h-4 rounded border-border"
                                                />
                                                <span className="text-sm text-foreground">Obrigatório</span>
                                            </label>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-foreground mb-2 block">Dias da Semana (opcional)</label>
                                            <p className="text-xs text-muted-foreground mb-2">Se nenhum dia for selecionado, aparece em todos os dias</p>
                                            <div className="flex flex-wrap gap-2">
                                                {WEEK_DAYS.map(day => (
                                                    <button
                                                        key={day.value}
                                                        type="button"
                                                        onClick={() => {
                                                            const currentDays = task.days || [];
                                                            const newDays = currentDays.includes(day.value)
                                                                ? currentDays.filter(d => d !== day.value)
                                                                : [...currentDays, day.value];
                                                            updateTask(index, 'days', newDays);
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                                            (task.days || []).includes(day.value)
                                                                ? "bg-primary text-white"
                                                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                        )}
                                                    >
                                                        {day.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-foreground mb-2 block">Procedimento de Apoio</label>
                                            <select
                                                value={task.procedureType || 'NONE'}
                                                onChange={(e) => updateTask(index, 'procedureType', e.target.value)}
                                                className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm"
                                            >
                                                {PROCEDURE_TYPES.map(p => (
                                                    <option key={p.value} value={p.value}>{p.label}</option>
                                                ))}
                                            </select>
                                            {task.procedureType && task.procedureType !== 'NONE' && (
                                                <textarea
                                                    value={task.procedureContent || ''}
                                                    onChange={(e) => updateTask(index, 'procedureContent', e.target.value)}
                                                    placeholder={task.procedureType === 'IMAGE' ? 'URL da imagem...' : task.procedureType === 'VIDEO' ? 'URL do YouTube...' : 'Instruções...'}
                                                    className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-white text-sm mt-2"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => removeTask(index)}
                                        className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ChecklistFormPage;