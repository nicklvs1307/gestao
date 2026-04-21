import React, { useState, useEffect, useMemo } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useScrollLock } from '../hooks/useScrollLock';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ClipboardCheck, Plus, Search, Trash2,
    Edit, ChevronRight, CheckCircle2, AlertCircle, Clock,
    Camera, Type, Hash, CheckSquare, Loader2, X, QrCode, Printer,
    Filter, Settings2, Check, ArrowRight, Save, Copy, HelpCircle,
    Link as LinkIcon, Video, Image as ImageIcon, MessageCircle, Send,
    ChevronLeft, ChevronDown, ChevronUp, BarChart3, Users, FileText,
    AlertTriangle, Calendar, TrendingUp, Eye, MoreVertical
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
    getChecklists, createChecklist, updateChecklist, deleteChecklist,
    getSectors, createSector, deleteSector,
    getChecklistReportSettings, updateChecklistReportSettings,
    sendManualDailyReport, sendManualIndividualReport
} from '../services/api/checklists';

const WEEK_DAYS = [
    { value: 'MONDAY', label: 'Segunda', short: 'Seg' },
    { value: 'TUESDAY', label: 'Terça', short: 'Ter' },
    { value: 'WEDNESDAY', label: 'Quarta', short: 'Qua' },
    { value: 'THURSDAY', label: 'Quinta', short: 'Qui' },
    { value: 'FRIDAY', label: 'Sexta', short: 'Sex' },
    { value: 'SATURDAY', label: 'Sábado', short: 'Sáb' },
    { value: 'SUNDAY', label: 'Domingo', short: 'Dom' }
];
import apiClient from '../services/api/client';
import { cn } from '../lib/utils';

const ITEMS_PER_PAGE = 10;

const ChecklistManagement: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'checklists' | 'sectors' | 'executions' | 'report'>('checklists');

    const [checklists, setChecklists] = useState<any[]>([]);
    const [sectors, setSectors] = useState<any[]>([]);
    const [executions, setExecutions] = useState<any[]>([]);
    const [reportSettings, setReportSettings] = useState<any>({
        enabled: false,
        recipientPhone: '',
        sendTime: '22:00',
        reportFormat: 'PDF'
    });

    const [isEditingChecklist, setIsEditingChecklist] = useState(false);
    const [showQRCodeModal, setShowQRCodeModal] = useState(false);
    const [showExecutionDetail, setShowExecutionDetail] = useState(false);
    const [selectedExecution, setSelectedExecution] = useState<any>(null);
    const [selectedChecklist, setSelectedChecklist] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        checklistId: '',
        startDate: '',
        endDate: ''
    });

    const [currentChecklist, setCurrentChecklist] = useState<any>({
        title: '',
        description: '',
        frequency: 'DAILY',
        sectorId: '',
        deadlineTime: '',
        days: [],
        tasks: []
    });

    const [isEditingSector, setIsEditingSector] = useState(false);
    const [newSectorName, setNewSectorName] = useState('');
    const [sectorSearch, setSectorSearch] = useState('');
    const [sendingReport, setSendingReport] = useState<string | null>(null);
    const [confirmData, setConfirmData] = useState<{ open: boolean, title: string, message: string, onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => { } });

    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState<string>('completedAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const [skeletonVisible, setSkeletonVisible] = useState(true);

    const handleSendManualDailyReport = async () => {
        setSendingReport('daily');
        try {
            await sendManualDailyReport();
            toast.success("Resumo geral enviado para o WhatsApp!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Erro ao enviar relatório geral");
        } finally {
            setSendingReport(null);
        }
    };

    const handleSendManualIndividualReport = async (id: string) => {
        setSendingReport(id);
        try {
            await sendManualIndividualReport(id);
            toast.success("Relatório detalhado enviado para o WhatsApp!");
        } catch (error: any) {
            const msg = error.response?.data?.message || "Nenhuma execução encontrada para este checklist";
            toast.error(msg);
        } finally {
            setSendingReport(null);
        }
    };

    // Lock body scroll when modals are open
    useScrollLock(isEditingChecklist || showQRCodeModal || showExecutionDetail);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeTab === 'executions') {
            loadExecutions();
        }
    }, [activeTab, filters]);

    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => setSkeletonVisible(false), 800);
            return () => clearTimeout(timer);
        }
        setSkeletonVisible(false);
    }, [loading]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [checklistsData, sectorsData, reportData] = await Promise.all([
                getChecklists(),
                getSectors(),
                getChecklistReportSettings().catch(() => ({ enabled: false, recipientPhone: '', sendTime: '22:00' }))
            ]);
            
            // Ensure we always have arrays
            const safeChecklists = Array.isArray(checklistsData) ? checklistsData : [];
            const safeSectors = Array.isArray(sectorsData) ? sectorsData : [];
            
            setChecklists(safeChecklists);
            setSectors(safeSectors);
            setReportSettings(reportData || { enabled: false, recipientPhone: '', sendTime: '22:00', reportFormat: 'PDF' });
        } catch (error) {
            console.error('Error loading checklist data:', error);
            toast.error("Erro ao carregar dados do Checklist");
            setChecklists([]);
            setSectors([]);
        } finally {
            setLoading(false);
        }
    };

    const loadExecutions = async () => {
        try {
            const response = await apiClient.get('/checklists/history', { params: filters });
            // response.data is the axios response body
            // Backend returns { data: [...], total: N, page: X, ... }
            const executionsData = response.data?.data || response.data;
            setExecutions(Array.isArray(executionsData) ? executionsData : []);
            setCurrentPage(1);
        } catch (error) {
            toast.error("Erro ao carregar histórico");
            setExecutions([]);
        }
    };

    const handleSaveReportSettings = async () => {
        try {
            await updateChecklistReportSettings(reportSettings);
            toast.success("Configurações salvas!");
        } catch (error) {
            toast.error("Erro ao salvar");
        }
    };

    const handleSaveSector = async () => {
        if (!newSectorName) return;
        try {
            await createSector({ name: newSectorName });
            toast.success("Setor criado!");
            setNewSectorName('');
            loadData();
        } catch (error) {
            toast.error("Erro ao criar");
        }
    };

    const handleDeleteSector = async (id: string) => {
        setConfirmData({ open: true, title: 'Confirmar', message: 'Excluir setor?', onConfirm: async () => {
            try {
                await deleteSector(id);
                toast.success("Setor removido");
                loadData();
            } catch (error) {
                toast.error("Erro ao excluir");
            }
        }});
    };

    const handleAddTask = () => {
        setCurrentChecklist({
            ...currentChecklist,
            tasks: [
                ...currentChecklist.tasks,
                {
                    content: '',
                    type: 'CHECKBOX',
                    isRequired: true,
                    order: currentChecklist.tasks.length,
                    procedureType: 'NONE',
                    procedureContent: ''
                }
            ]
        });
    };

    const handleRemoveTask = (index: number) => {
        const newTasks = [...currentChecklist.tasks];
        newTasks.splice(index, 1);
        setCurrentChecklist({ ...currentChecklist, tasks: newTasks });
    };

    const handleTaskChange = (index: number, field: string, value: any) => {
        const newTasks = [...currentChecklist.tasks];
        newTasks[index] = { ...newTasks[index], [field]: value };
        setCurrentChecklist({ ...currentChecklist, tasks: newTasks });
    };

    const handleSaveChecklist = async () => {
        if (!currentChecklist.title || !currentChecklist.sectorId) {
            return toast.error("Preencha o título e setor");
        }
        if (!currentChecklist.tasks?.length) {
            return toast.error("Adicione tarefas");
        }

        try {
            if (currentChecklist.id) {
                await updateChecklist(currentChecklist.id, currentChecklist);
                toast.success("Checklist atualizado!");
            } else {
                await createChecklist(currentChecklist);
                toast.success("Checklist criado!");
            }
            setIsEditingChecklist(false);
            loadData();
        } catch (error) {
            toast.error("Falha ao salvar");
        }
    };

    const handlePrintQR = () => {
        const printContent = document.getElementById('qr-code-to-print');
        if (!printContent) return;
        const windowPrint = window.open('', '', 'width=800,height=900');
        if (!windowPrint) return;
        windowPrint.document.write(`<html><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;">${printContent.innerHTML}<h1>${selectedChecklist?.title}</h1><p>${selectedChecklist?.sector?.name}</p></body></html>`);
        windowPrint.document.close();
        setTimeout(() => { windowPrint.print(); windowPrint.close(); }, 500);
    };

    const handleDuplicateChecklist = async (checklist: any) => {
        try {
            const duplicatedData = {
                title: `${checklist.title} (Cópia)`,
                description: checklist.description,
                frequency: checklist.frequency,
                sectorId: checklist.sectorId,
                deadlineTime: checklist.deadlineTime,
                days: checklist.days,
                tasks: checklist.tasks?.map((t: any) => ({
                    content: t.content,
                    isRequired: t.isRequired,
                    type: t.type,
                    procedureType: t.procedureType,
                    procedureContent: t.procedureContent
                })) || []
            };
            await createChecklist(duplicatedData);
            toast.success("Checklist duplicado!");
            loadData();
        } catch (error) {
            toast.error("Falha ao duplicar");
        }
    };

    const findDuplicateTasks = (checklist: any) => {
        const allTasks = checklists.flatMap((c: any) => c.tasks?.map((t: any) => ({ task: t.content, checklistId: c.id, checklistTitle: c.title })) || []);
        const duplicates: { task: string; checklistTitle: string }[] = [];
        const taskMap = new Map<string, string>();
        
        allTasks.forEach(({ task, checklistId, checklistTitle }: { task: string; checklistId: string; checklistTitle: string }) => {
            if (checklistId === checklist.id) return;
            const normalized = task.toLowerCase().trim();
            if (taskMap.has(normalized)) {
                const existing = taskMap.get(normalized)!;
                duplicates.push({ task, checklistTitle: existing });
            } else {
                taskMap.set(normalized, checklistTitle);
            }
        });
        
        return duplicates.slice(0, 5);
    };

    const filteredChecklists = useMemo(() => {
        if (!Array.isArray(checklists)) return [];
        return checklists.filter(c =>
            c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.sector?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [checklists, searchQuery]);

    const filteredSectors = useMemo(() => {
        if (!Array.isArray(sectors)) return [];
        return sectors.filter(s =>
            s.name?.toLowerCase().includes(sectorSearch.toLowerCase())
        );
    }, [sectors, sectorSearch]);

    const totalExecutionPages = Math.ceil((executions?.length || 0) / ITEMS_PER_PAGE);
    const paginatedExecutions = useMemo(() => {
        if (!Array.isArray(executions)) return [];
        let sorted = [...executions].sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (sortField === 'completedAt') {
                return sortDirection === 'desc'
                    ? new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
                    : new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
            }
            if (sortDirection === 'desc') {
                return String(bVal || '').localeCompare(String(aVal || ''));
            }
            return String(aVal || '').localeCompare(String(bVal || ''));
        });
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return sorted.slice(start, start + ITEMS_PER_PAGE);
    }, [executions, currentPage, sortField, sortDirection]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const stats = useMemo(() => {
        const safeChecklists = Array.isArray(checklists) ? checklists : [];
        const safeExecutions = Array.isArray(executions) ? executions : [];
        
        const totalChecklists = safeChecklists.length;
        const totalExecutions = safeExecutions.length;
        const avgConformity = safeExecutions.length > 0
            ? Math.round(safeExecutions.reduce((acc, exec) => {
                const total = exec.responses?.length || 0;
                const ok = exec.responses?.filter((r: any) => r.isOk).length || 0;
                return acc + (total > 0 ? (ok / total) * 100 : 0);
            }, 0) / safeExecutions.length)
            : 0;
        const todayExecutions = safeExecutions.filter(e => {
            const today = new Date();
            const execDate = new Date(e.completedAt);
            return execDate.toDateString() === today.toDateString();
        }).length;

        return { totalChecklists, totalExecutions, avgConformity, todayExecutions };
    }, [checklists, executions]);

    const getFrequencyLabel = (freq: string) => {
        const labels: Record<string, string> = { DAILY: 'Diária', WEEKLY: 'Semanal', MONTHLY: 'Mensal' };
        return labels[freq] || freq;
    };

    const getFrequencyColor = (freq: string) => {
        const colors: Record<string, string> = {
            DAILY: 'bg-blue-50 text-blue-700 border-blue-200',
            WEEKLY: 'bg-purple-50 text-purple-700 border-purple-200',
            MONTHLY: 'bg-amber-50 text-amber-700 border-amber-200'
        };
        return colors[freq] || 'bg-gray-50 text-gray-700';
    };

    const SkeletonCard = () => (
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm animate-pulse">
            <div className="flex justify-between items-start mb-3">
                <div className="h-5 w-20 bg-gray-200 rounded" />
                <div className="flex gap-2">
                    <div className="h-8 w-8 bg-gray-200 rounded-lg" />
                    <div className="h-8 w-8 bg-gray-200 rounded-lg" />
                </div>
            </div>
            <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-1/2 bg-gray-100 rounded mb-4" />
            <div className="flex justify-between pt-4 border-t border-border/50">
                <div className="h-4 w-24 bg-gray-100 rounded" />
                <div className="h-4 w-20 bg-gray-100 rounded" />
            </div>
        </div>
    );

    const SkeletonRow = () => (
        <tr className="animate-pulse">
            <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 rounded mb-2" /><div className="h-3 w-20 bg-gray-100 rounded" /></td>
            <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded" /></td>
            <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-200 rounded" /></td>
            <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 rounded mx-auto" /></td>
            <td className="px-6 py-4"><div className="h-4 w-4 bg-gray-200 rounded ml-auto" /></td>
        </tr>
    );

    const EmptyState = ({ icon: Icon, title, description, action }: { icon: any, title: string, description: string, action?: { label: string, onClick: () => void } }) => (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <Icon size={28} className="text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">{description}</p>
            {action && (
                <Button onClick={action.onClick} className="h-10 px-5">
                    <Plus size={16} className="mr-2" />
                    {action.label}
                </Button>
            )}
        </div>
    );

    if (loading && !isEditingChecklist) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Carregando checklists...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                        <ClipboardCheck size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Checklists & Rotinas</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Gerencie modelos, acompanhe execuções e configure alertas</p>
                    </div>
                </div>
                <Button
                    onClick={() => {
                        setCurrentChecklist({ title: '', description: '', frequency: 'DAILY', sectorId: '', deadlineTime: '', days: [], tasks: [] });
                        setIsEditingChecklist(true);
                    }}
                    className="h-10 px-5"
                >
                    <Plus size={16} className="mr-2" /> Novo Modelo
                </Button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <FileText size={18} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.totalChecklists}</p>
                            <p className="text-xs text-muted-foreground">Modelos Ativos</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CheckCircle2 size={18} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.todayExecutions}</p>
                            <p className="text-xs text-muted-foreground">Execuções Hoje</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <BarChart3 size={18} className="text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.avgConformity}%</p>
                            <p className="text-xs text-muted-foreground">Conformidade Média</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <Users size={18} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{sectors.length}</p>
                            <p className="text-xs text-muted-foreground">Setores</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg self-start">
                {(['checklists', 'sectors', 'executions', 'report'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all",
                            activeTab === tab ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab === 'checklists' ? 'Modelos' : tab === 'sectors' ? 'Setores' : tab === 'executions' ? 'Histórico' : 'Alertas'}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex flex-col gap-4">
                {activeTab === 'checklists' && (
                    <>
                        {/* Search Bar */}
                        <div className="relative max-w-sm">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar modelos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>

                        {skeletonVisible ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                            </div>
                        ) : filteredChecklists.length === 0 ? (
                            <EmptyState
                                icon={FileText}
                                title={searchQuery ? "Nenhum modelo encontrado" : "Nenhum modelo criado"}
                                description={searchQuery ? "Tente buscar com outros termos" : "Crie seu primeiro modelo de checklist para começar a auditoria operacional"}
                                action={!searchQuery ? { label: "Criar Modelo", onClick: () => setIsEditingChecklist(true) } : undefined}
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <AnimatePresence mode="wait">
                                    {filteredChecklists.map(checklist => (
                                        <motion.div
                                            key={checklist.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-all group"
                                        >
                                            <div className="p-5">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md">
                                                        {checklist.sector?.name}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleSendManualIndividualReport(checklist.id); }}
                                                            disabled={sendingReport === checklist.id}
                                                            className={cn(
                                                                "p-2 rounded-lg transition-all",
                                                                sendingReport === checklist.id
                                                                    ? "text-blue-500 animate-pulse"
                                                                    : "text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                                                            )}
                                                            title="Enviar Relatório via WhatsApp"
                                                        >
                                                            {sendingReport === checklist.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedChecklist(checklist); setShowQRCodeModal(true); }}
                                                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-all"
                                                            title="Gerar QR Code"
                                                        >
                                                            <QrCode size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDuplicateChecklist(checklist)}
                                                            className="p-2 rounded-lg text-muted-foreground hover:text-purple-600 hover:bg-purple-50 transition-all"
                                                            title="Duplicar"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setCurrentChecklist(checklist); setIsEditingChecklist(true); }}
                                                            className="p-2 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-all"
                                                            title="Editar"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setConfirmData({ open: true, title: 'Confirmar exclusão', message: `Tem certeza que deseja excluir "${checklist.title}"?`, onConfirm: async () => { await deleteChecklist(checklist.id); toast.success("Checklist excluído"); loadData(); } }); }}
                                                            className="p-2 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-all"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <h3 className="text-base font-semibold text-foreground mb-1">{checklist.title}</h3>
                                                {checklist.description && (
                                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{checklist.description}</p>
                                                )}

                                                {checklist.deadlineTime && (
                                                    <div className="flex items-center gap-1.5 text-rose-600 mb-3">
                                                        <Clock size={14} />
                                                        <span className="text-xs font-medium">Limite: {checklist.deadlineTime}</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "px-2 py-0.5 text-xs font-medium rounded border",
                                                            getFrequencyColor(checklist.frequency)
                                                        )}>
                                                            {getFrequencyLabel(checklist.frequency)}
                                                        </span>
                                                        {checklist.days && Array.isArray(checklist.days) && checklist.days.length > 0 && (
                                                            <span className="px-2 py-0.5 text-xs font-medium rounded border bg-purple-50 border-purple-200 text-purple-700 flex items-center gap-1">
                                                                <Calendar size={12} />
                                                                {checklist.days.map((d: string) => WEEK_DAYS.find(wd => wd.value === d)?.short || d).join(', ')}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <CheckSquare size={14} />
                                                            {checklist.tasks?.length || 0} itens
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => { setCurrentChecklist(checklist); setIsEditingChecklist(true); }}
                                                        className="text-sm font-medium text-primary flex items-center gap-1 hover:underline"
                                                    >
                                                        Editar <ArrowRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'sectors' && (
                    <div className="max-w-2xl space-y-4">
                        <Card className="p-4">
                            <div className="flex items-center gap-3">
                                <input
                                    placeholder="Nome do novo setor..."
                                    className="flex-1 h-10 px-4 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={newSectorName}
                                    onChange={e => setNewSectorName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveSector()}
                                />
                                <Button onClick={handleSaveSector} disabled={!newSectorName} className="h-10 px-5">
                                    <Plus size={16} className="mr-2" /> Criar
                                </Button>
                            </div>
                        </Card>

                        {sectors.length === 0 ? (
                            <EmptyState
                                icon={Users}
                                title="Nenhum setor criado"
                                description="Crie setores para organizar seus checklists por área de atuação (ex: Cozinha, Salão, Bar)"
                            />
                        ) : (
                            <>
                                {/* Sector Search */}
                                <div className="relative max-w-sm">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Buscar setores..."
                                        value={sectorSearch}
                                        onChange={e => setSectorSearch(e.target.value)}
                                        className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <AnimatePresence>
                                        {filteredSectors.map(sector => (
                                            <motion.div
                                                key={sector.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="bg-white p-3 px-4 rounded-lg border border-border flex items-center justify-between group hover:border-primary/30 transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                                        <Users size={16} className="text-primary" />
                                                    </div>
                                                    <span className="text-sm font-medium text-foreground">{sector.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteSector(sector.id)}
                                                    className="p-2 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'executions' && (
                    <div className="space-y-4">
                        {/* Filters */}
                        <div className="flex flex-wrap gap-3">
                            <select
                                value={filters.checklistId}
                                onChange={e => setFilters({ ...filters, checklistId: e.target.value })}
                                className="h-10 px-4 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                                <option value="">Todos os modelos</option>
                                {checklists.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                                className="h-10 px-4 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                placeholder="Data início"
                            />
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                                className="h-10 px-4 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                placeholder="Data fim"
                            />
                            {(filters.checklistId || filters.startDate || filters.endDate) && (
                                <Button
                                    variant="ghost"
                                    onClick={() => setFilters({ checklistId: '', startDate: '', endDate: '' })}
                                    className="h-10 px-4"
                                >
                                    <X size={16} className="mr-2" /> Limpar filtros
                                </Button>
                            )}
                        </div>

                        <Card noPadding>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-muted/50 border-b border-border">
                                        <tr>
                                            <th
                                                className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                                                onClick={() => handleSort('checklist')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Modelo
                                                    {sortField === 'checklist' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                                </div>
                                            </th>
                                            <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Executor</th>
                                            <th
                                                className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
                                                onClick={() => handleSort('completedAt')}
                                            >
                                                <div className="flex items-center gap-1">
                                                    Data/Hora
                                                    {sortField === 'completedAt' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                                </div>
                                            </th>
                                            <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Conformidade</th>
                                            <th className="px-6 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {skeletonVisible ? (
                                            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                        ) : paginatedExecutions.length === 0 ? (
                                            <tr>
                                                <td colSpan={5}>
                                                    <EmptyState
                                                        icon={BarChart3}
                                                        title="Nenhuma execução encontrada"
                                                        description="As execuções de checklists aparecerão aqui quando forem preenchidas"
                                                    />
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedExecutions.map(exec => {
                                                const total = exec.responses?.length || 0;
                                                const ok = exec.responses?.filter((r: any) => r.isOk).length || 0;
                                                const perc = total > 0 ? Math.round((ok / total) * 100) : 0;
                                                return (
                                                    <tr
                                                        key={exec.id}
                                                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                                                        onClick={() => { setSelectedExecution(exec); setShowExecutionDetail(true); }}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-medium text-foreground">{exec.checklist?.title}</p>
                                                            <p className="text-xs text-muted-foreground">{exec.checklist?.sector?.name}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
                                                                    <span className="text-xs font-medium text-primary">
                                                                        {(exec.user?.name || exec.externalUserName || 'A').charAt(0).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <span className="text-sm text-foreground">{exec.user?.name || exec.externalUserName || 'Executor Anônimo'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                                            {new Date(exec.completedAt).toLocaleString('pt-BR', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                                                    <div
                                                                        className={cn(
                                                                            "h-full rounded-full transition-all",
                                                                            perc >= 80 ? "bg-emerald-500" : perc >= 50 ? "bg-amber-500" : "bg-rose-500"
                                                                        )}
                                                                        style={{ width: `${perc}%` }}
                                                                    />
                                                                </div>
                                                                <span className={cn(
                                                                    "text-sm font-semibold tabular-nums",
                                                                    perc >= 80 ? "text-emerald-600" : perc >= 50 ? "text-amber-600" : "text-rose-600"
                                                                )}>{perc}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-muted-foreground">
                                                            <ChevronRight size={18} />
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalExecutionPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/30">
                                    <p className="text-sm text-muted-foreground">
                                        Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, executions.length)} de {executions.length}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-lg border border-border hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        {Array.from({ length: totalExecutionPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={cn(
                                                    "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                                                    currentPage === page
                                                        ? "bg-primary text-white"
                                                        : "hover:bg-white border border-transparent"
                                                )}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalExecutionPages, p + 1))}
                                            disabled={currentPage === totalExecutionPages}
                                            className="p-2 rounded-lg border border-border hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {activeTab === 'report' && (
                    <div className="max-w-2xl space-y-4">
                        <Card className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-xl">
                                    <Settings2 size={24} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">Central de Alertas</h3>
                                    <p className="text-sm text-muted-foreground">Configuração de relatórios automáticos via WhatsApp</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="WhatsApp Destino"
                                    placeholder="5511999999999"
                                    value={reportSettings.recipientPhone}
                                    onChange={e => setReportSettings({ ...reportSettings, recipientPhone: e.target.value })}
                                />
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-semibold text-foreground mb-1.5 uppercase tracking-wide">
                                        Horário do Resumo Geral
                                    </label>
                                    <input
                                        type="time"
                                        className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                                        value={reportSettings.sendTime}
                                        onChange={e => setReportSettings({ ...reportSettings, sendTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-semibold text-foreground mb-1.5 uppercase tracking-wide">
                                        Início do Turno (Abertura)
                                    </label>
                                    <input
                                        type="time"
                                        className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                                        value={reportSettings.turnStartHour || '06:00'}
                                        onChange={e => setReportSettings({ ...reportSettings, turnStartHour: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Relatório pegará checklists desde este horário
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-foreground uppercase tracking-wide">
                                    Formato do Relatório
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'PDF', label: 'PDF Detalhado', desc: 'Arquivo formal anexado' },
                                        { id: 'TEXT', label: 'Texto Detalhado', desc: 'Lista na mensagem' },
                                        { id: 'BOTH', label: 'Ambos', desc: 'Texto + PDF completo' },
                                        { id: 'LINK', label: 'Resumo + Link', desc: 'Link para relatório web' }
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setReportSettings({ ...reportSettings, reportFormat: f.id })}
                                            className={cn(
                                                "p-4 rounded-xl border-2 transition-all text-left",
                                                reportSettings.reportFormat === f.id
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/30"
                                            )}
                                        >
                                            <p className={cn(
                                                "text-sm font-semibold mb-1",
                                                reportSettings.reportFormat === f.id ? "text-foreground" : "text-muted-foreground"
                                            )}>{f.label}</p>
                                            <p className="text-xs text-muted-foreground">{f.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Monitoramento Automático</p>
                                    <p className="text-xs text-muted-foreground">Enviar relatórios no horário configurado</p>
                                </div>
                                <button
                                    onClick={() => setReportSettings({ ...reportSettings, enabled: !reportSettings.enabled })}
                                    className={cn(
                                        "w-12 h-6 rounded-full relative transition-all duration-300",
                                        reportSettings.enabled ? "bg-primary" : "bg-gray-300"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all",
                                        reportSettings.enabled ? "left-7" : "left-1"
                                    )} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button onClick={handleSaveReportSettings} className="h-12">
                                    <Save size={16} className="mr-2" /> Salvar Configuração
                                </Button>
                                <Button
                                    onClick={handleSendManualDailyReport}
                                    disabled={sendingReport === 'daily'}
                                    variant="success"
                                    className="h-12"
                                >
                                    {sendingReport === 'daily' ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
                                    Enviar Resumo Agora
                                </Button>
                            </div>
                        </Card>

                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 flex gap-4 items-start">
                            <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-blue-900 mb-1">Monitoramento Individual</p>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    O sistema monitora cada checklist individualmente. Se o preenchimento não ocorrer até o horário limite definido no modelo, um alerta de "Operação em Atraso" será enviado automaticamente.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* EDIT MODAL */}
            <AnimatePresence>
                {isEditingChecklist && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.98 }}
                            className="bg-white w-full max-w-5xl mx-4 my-8 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <header className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-xl">
                                        <CheckSquare size={20} className="text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-foreground">
                                            {currentChecklist.id ? 'Editar Modelo' : 'Novo Modelo'}
                                        </h2>
                                        <p className="text-xs text-muted-foreground">Configure os critérios e procedimentos</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" onClick={() => setIsEditingChecklist(false)} className="h-9 px-4">
                                        Cancelar
                                    </Button>
                                    <Button onClick={handleSaveChecklist} className="h-9 px-6">
                                        <Save size={16} className="mr-2" /> Salvar
                                    </Button>
                                </div>
                            </header>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Configuration Panel */}
                                    <div className="lg:col-span-1 space-y-4">
                                        <Card className="p-5 space-y-4">
                                            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Configurações</h4>
                                            <Input
                                                label="Título"
                                                value={currentChecklist.title}
                                                onChange={e => setCurrentChecklist({ ...currentChecklist, title: e.target.value })}
                                                placeholder="Ex: Checklist de Abertura"
                                            />

                                            <div className="space-y-1.5">
                                                <label className="block text-sm font-semibold text-foreground mb-1.5 uppercase tracking-wide">
                                                    Setor
                                                </label>
                                                <select
                                                    className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                                                    value={currentChecklist.sectorId}
                                                    onChange={e => setCurrentChecklist({ ...currentChecklist, sectorId: e.target.value })}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="block text-sm font-semibold text-foreground mb-1.5 uppercase tracking-wide">
                                                    Frequência
                                                </label>
                                                <select
                                                    className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                                                    value={currentChecklist.frequency}
                                                    onChange={e => setCurrentChecklist({ ...currentChecklist, frequency: e.target.value })}
                                                >
                                                    <option value="DAILY">Diária</option>
                                                    <option value="WEEKLY">Semanal</option>
                                                    <option value="MONTHLY">Mensal</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5 text-rose-600">
                                                    <Clock size={14} /> Horário Limite
                                                </label>
                                                <input
                                                    type="time"
                                                    className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                                                    value={currentChecklist.deadlineTime}
                                                    onChange={e => setCurrentChecklist({ ...currentChecklist, deadlineTime: e.target.value })}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Alerta será enviado se não preenchido até este horário
                                                </p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                                                    <Calendar size={14} /> Dias Específicos
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {WEEK_DAYS.map((day) => {
                                                        const isSelected = (currentChecklist.days || []).includes(day.value);
                                                        return (
                                                            <button
                                                                key={day.value}
                                                                type="button"
                                                                onClick={() => {
                                                                    const newDays = isSelected
                                                                        ? (currentChecklist.days || []).filter((d: string) => d !== day.value)
                                                                        : [...(currentChecklist.days || []), day.value];
                                                                    setCurrentChecklist({ ...currentChecklist, days: newDays });
                                                                }}
                                                                className={cn(
                                                                    "h-9 px-3 rounded-lg text-sm font-medium transition-all border",
                                                                    isSelected
                                                                        ? "bg-primary text-primary-foreground border-primary"
                                                                        : "bg-card text-muted-foreground border-input hover:border-primary/50"
                                                                )}
                                                            >
                                                                {day.short}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {currentChecklist.days?.length > 0
                                                        ? "Checklist disponível apenas nos dias selecionados"
                                                        : "Disponível em todos os dias"}
                                                </p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="block text-sm font-semibold text-foreground mb-1.5 uppercase tracking-wide">
                                                    Instruções
                                                </label>
                                                <textarea
                                                    className="w-full h-24 p-3 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all resize-none"
                                                    placeholder="Contexto geral do checklist..."
                                                    value={currentChecklist.description}
                                                    onChange={e => setCurrentChecklist({ ...currentChecklist, description: e.target.value })}
                                                />
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Task Builder */}
                                    <div className="lg:col-span-2 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                                                <CheckSquare size={18} />
                                                Itens de Verificação ({currentChecklist.tasks?.length || 0})
                                            </h4>
                                            <Button onClick={handleAddTask} variant="outline" size="sm">
                                                <Plus size={14} className="mr-1" /> Adicionar Item
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            <AnimatePresence>
                                                {(currentChecklist.tasks || []).map((task: any, index: number) => (
                                                    <motion.div
                                                        key={index}
                                                        layout
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="bg-white p-5 rounded-xl border border-border shadow-sm space-y-4"
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <span className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0 mt-0.5">
                                                                {index + 1}
                                                            </span>
                                                            <div className="flex-1 space-y-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                    <div className="md:col-span-2">
                                                                        <input
                                                                            className="w-full h-10 px-3 rounded-lg border border-border bg-transparent text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                                            placeholder="O que verificar?"
                                                                            value={task.content}
                                                                            onChange={e => handleTaskChange(index, 'content', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {[
                                                                            { type: 'CHECKBOX', icon: <CheckSquare size={16} /> },
                                                                            { type: 'PHOTO', icon: <Camera size={16} /> },
                                                                            { type: 'TEXT', icon: <Type size={16} /> },
                                                                            { type: 'NUMBER', icon: <Hash size={16} /> }
                                                                        ].map(t => (
                                                                            <button
                                                                                key={t.type}
                                                                                onClick={() => handleTaskChange(index, 'type', t.type)}
                                                                                className={cn(
                                                                                    "p-2 rounded-lg transition-all",
                                                                                    task.type === t.type
                                                                                        ? "bg-primary text-white"
                                                                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                                                )}
                                                                                title={t.type}
                                                                            >
                                                                                {t.icon}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Procedure Configuration */}
                                                                <div className="bg-muted/50 p-4 rounded-xl space-y-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <HelpCircle size={14} className="text-muted-foreground" />
                                                                        <span className="text-xs font-medium text-muted-foreground">Guia de Procedimento</span>
                                                                    </div>
                                                                    <div className="flex gap-2 flex-wrap">
                                                                        {[
                                                                            { id: 'NONE', label: 'Nenhum' },
                                                                            { id: 'TEXT', label: 'Texto' },
                                                                            { id: 'IMAGE', label: 'Imagem URL' },
                                                                            { id: 'VIDEO', label: 'YouTube' }
                                                                        ].map(p => (
                                                                            <button
                                                                                key={p.id}
                                                                                onClick={() => handleTaskChange(index, 'procedureType', p.id)}
                                                                                className={cn(
                                                                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                                                                    task.procedureType === p.id
                                                                                        ? "bg-white text-foreground border-primary/30 shadow-sm"
                                                                                        : "bg-transparent text-muted-foreground border-transparent hover:text-foreground"
                                                                                )}
                                                                            >
                                                                                {p.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    {task.procedureType !== 'NONE' && (
                                                                        <textarea
                                                                            className="w-full h-20 p-3 bg-white rounded-lg text-xs font-medium outline-none border border-border focus:border-primary/30 transition-all resize-none"
                                                                            placeholder={task.procedureType === 'TEXT' ? "Descreva o passo-a-passo..." : "Insira a URL..."}
                                                                            value={task.procedureContent}
                                                                            onChange={e => handleTaskChange(index, 'procedureContent', e.target.value)}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-2 shrink-0">
                                                                <button
                                                                    onClick={() => handleTaskChange(index, 'isRequired', !task.isRequired)}
                                                                    className={cn(
                                                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all border",
                                                                        task.isRequired
                                                                            ? "bg-primary text-white border-primary"
                                                                            : "bg-white text-muted-foreground border-border hover:border-primary/30"
                                                                    )}
                                                                    title={task.isRequired ? "Obrigatório" : "Opcional"}
                                                                >
                                                                    <AlertCircle size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRemoveTask(index)}
                                                                    className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                                                                    title="Remover item"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>

                                            {(!currentChecklist.tasks || currentChecklist.tasks.length === 0) && (
                                                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                                                    <CheckSquare size={32} className="mx-auto text-muted-foreground mb-3" />
                                                    <p className="text-sm font-medium text-muted-foreground mb-1">Nenhum item adicionado</p>
                                                    <p className="text-xs text-muted-foreground mb-4">Adicione itens de verificação ao checklist</p>
                                                    <Button onClick={handleAddTask} variant="outline" size="sm">
                                                        <Plus size={14} className="mr-1" /> Adicionar Primeiro Item
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* QR Code Modal */}
            {showQRCodeModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowQRCodeModal(false)} />
                    <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col items-center">
                        <button onClick={() => setShowQRCodeModal(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
                            <X size={16} />
                        </button>
                        <h3 className="text-lg font-bold text-foreground mb-1">QR Code de Acesso</h3>
                        <p className="text-sm text-muted-foreground mb-6">Escaneie para acessar o checklist</p>
                        <div className="bg-white p-6 rounded-xl border border-border mb-6" id="qr-code-to-print">
                            <QRCodeSVG value={`${window.location.origin}/checklist/fill/${selectedChecklist?.id}`} size={200} level="H" includeMargin={true} />
                        </div>
                        <div className="text-center mb-6">
                            <h4 className="text-base font-semibold text-foreground">{selectedChecklist?.title}</h4>
                            <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md mt-1 inline-block">
                                {selectedChecklist?.sector?.name}
                            </span>
                        </div>
                        <Button onClick={handlePrintQR} className="w-full h-11">
                            <Printer size={16} className="mr-2" /> Imprimir QR Code
                        </Button>
                    </div>
                </div>
            )}

            {/* Execution Detail Modal */}
            {showExecutionDetail && selectedExecution && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowExecutionDetail(false)} />
                    <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <header className="p-6 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <CheckSquare size={20} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">{selectedExecution.checklist?.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(selectedExecution.completedAt).toLocaleString('pt-BR')} • {selectedExecution.user?.name || selectedExecution.externalUserName || 'Executor Anônimo'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={`/checklist/report/${selectedExecution.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-all"
                                >
                                    <Eye size={16} /> Relatório
                                </a>
                                <button onClick={() => setShowExecutionDetail(false)} className="w-10 h-10 bg-muted text-muted-foreground rounded-lg flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </header>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <Card className="p-4 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Conformidade</p>
                                    <p className={cn(
                                        "text-xl font-bold",
                                        (() => {
                                            const total = selectedExecution.responses?.length || 0;
                                            const ok = selectedExecution.responses?.filter((r: any) => r.isOk).length || 0;
                                            const perc = total > 0 ? Math.round((ok / total) * 100) : 0;
                                            return perc >= 80 ? "text-emerald-600" : perc >= 50 ? "text-amber-600" : "text-rose-600";
                                        })()
                                    )}>
                                        {(() => {
                                            const total = selectedExecution.responses?.length || 0;
                                            const ok = selectedExecution.responses?.filter((r: any) => r.isOk).length || 0;
                                            const perc = total > 0 ? Math.round((ok / total) * 100) : 0;
                                            return perc;
                                        })()}%
                                    </p>
                                </Card>
                                <Card className="p-4 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Duração</p>
                                    <p className="text-xl font-bold text-foreground">
                                        {selectedExecution.durationSeconds ? `${Math.floor(selectedExecution.durationSeconds / 60)}m ${selectedExecution.durationSeconds % 60}s` : 'N/A'}
                                    </p>
                                </Card>
                                <Card className="p-4 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Itens</p>
                                    <p className="text-xl font-bold text-foreground">{selectedExecution.responses?.length || 0}</p>
                                </Card>
                                <Card className="p-4 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Irregulares</p>
                                    <p className="text-xl font-bold text-rose-600">
                                        {selectedExecution.responses?.filter((r: any) => !r.isOk).length || 0}
                                    </p>
                                </Card>
                            </div>
                            <div className="space-y-3">
                                {selectedExecution.responses?.map((resp: any, idx: number) => {
                                    const task = resp.task || selectedExecution.checklist?.tasks?.find((t: any) => t.id === resp.taskId);
                                    return (
                                        <div key={resp.id} className="bg-white p-4 rounded-xl border border-border flex items-start gap-4">
                                            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0 mt-0.5">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center justify-between gap-4">
                                                    <p className="text-sm font-medium text-foreground">{task?.content || 'Item removido'}</p>
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded text-xs font-medium",
                                                        resp.isOk ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                                    )}>
                                                        {resp.isOk ? 'Conforme' : 'Irregular'}
                                                    </span>
                                                </div>
                                                {resp.notes && (
                                                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
                                                        <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                                        <p className="text-sm text-amber-900">{resp.notes}</p>
                                                    </div>
                                                )}
                                                {task?.type === 'PHOTO' && resp.value && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {(() => {
                                                            try {
                                                                const photos = JSON.parse(resp.value);
                                                                if (Array.isArray(photos)) {
                                                                    return photos.map((url: string, pIdx: number) => (
                                                                        <div key={pIdx} className="relative rounded-lg overflow-hidden border border-border w-24 h-24">
                                                                            <img
                                                                                src={`${import.meta.env.VITE_API_URL || ''}${url}`}
                                                                                className="w-full h-full object-cover cursor-zoom-in"
                                                                                alt="Evidência"
                                                                                onClick={() => window.open(`${import.meta.env.VITE_API_URL || ''}${url}`, '_blank')}
                                                                            />
                                                                        </div>
                                                                    ));
                                                                }
                                                            } catch (e) {
                                                                return (
                                                                    <div className="relative rounded-lg overflow-hidden border border-border w-24 h-24">
                                                                        <img
                                                                            src={`${import.meta.env.VITE_API_URL || ''}${resp.value}`}
                                                                            className="w-full h-full object-cover cursor-zoom-in"
                                                                            alt="Evidência"
                                                                            onClick={() => window.open(`${import.meta.env.VITE_API_URL || ''}${resp.value}`, '_blank')}
                                                                        />
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmDialog isOpen={confirmData.open} onClose={() => setConfirmData(prev => ({ ...prev, open: false }))} onConfirm={() => { confirmData.onConfirm(); setConfirmData(prev => ({ ...prev, open: false })); }} title={confirmData.title} message={confirmData.message} />
        </div>
    );
};

export default ChecklistManagement;
