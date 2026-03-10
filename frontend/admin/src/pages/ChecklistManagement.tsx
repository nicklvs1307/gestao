import React, { useState, useEffect } from 'react';
import { 
    ClipboardCheck, Plus, Search, LayoutGrid, Trash2, 
    Edit, ChevronRight, CheckCircle2, AlertCircle, Clock,
    Camera, Type, Hash, CheckSquare, Loader2, X, QrCode, Printer,
    Filter, MoreHorizontal, Calendar, User as UserIcon, Settings2,
    Check, ArrowRight, Save, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
    getChecklists, createChecklist, updateChecklist, deleteChecklist,
    getSectors, createSector, deleteSector,
    getChecklistReportSettings, updateChecklistReportSettings
} from '../services/api/checklists';
import apiClient from '../services/api/client';
import { cn } from '../lib/utils';

const ChecklistManagement: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'checklists' | 'sectors' | 'executions' | 'report'>('checklists');
    
    const [checklists, setChecklists] = useState<any[]>([]);
    const [sectors, setSectors] = useState<any[]>([]);
    const [executions, setExecutions] = useState<any[]>([]);
    const [reportSettings, setReportSettings] = useState<any>({
        enabled: false,
        recipientPhone: '',
        sendTime: '22:00'
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
        tasks: []
    });

    const [isEditingSector, setIsEditingSector] = useState(false);
    const [newSectorName, setNewSectorName] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeTab === 'executions') {
            loadExecutions();
        }
    }, [activeTab, filters]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [checklistsData, sectorsData, reportData] = await Promise.all([
                getChecklists(),
                getSectors(),
                getChecklistReportSettings().catch(() => ({ enabled: false, recipientPhone: '', sendTime: '22:00' }))
            ]);
            setChecklists(checklistsData);
            setSectors(sectorsData);
            setReportSettings(reportData);
        } catch (error) {
            toast.error("Erro ao carregar dados do Checklist");
        } finally {
            setLoading(false);
        }
    };

    const loadExecutions = async () => {
        try {
            const data = await apiClient.get('/checklists/history', { params: filters });
            setExecutions(data.data);
        } catch (error) {
            toast.error("Erro ao carregar histórico");
        }
    };

    const handleSaveReportSettings = async () => {
        try {
            await updateChecklistReportSettings(reportSettings);
            toast.success("Configurações de relatório salvas!");
        } catch (error) {
            toast.error("Erro ao salvar configurações");
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
            toast.error("Erro ao criar setor");
        }
    };

    const handleDeleteSector = async (id: string) => {
        if (!confirm("Excluir setor e desvincular checklists?")) return;
        try {
            await deleteSector(id);
            toast.success("Setor removido");
            loadData();
        } catch (error) {
            toast.error("Erro ao excluir");
        }
    };

    const handleAddTask = () => {
        setCurrentChecklist({
            ...currentChecklist,
            tasks: [
                ...currentChecklist.tasks,
                { content: '', type: 'CHECKBOX', isRequired: true, order: currentChecklist.tasks.length }
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
            return toast.error("Título e Setor são obrigatórios");
        }
        if (!currentChecklist.tasks?.length) {
            return toast.error("Adicione pelo menos uma tarefa");
        }

        try {
            if (currentChecklist.id) {
                await updateChecklist(currentChecklist.id, currentChecklist);
                toast.success("Checklist atualizado com sucesso");
            } else {
                await createChecklist(currentChecklist);
                toast.success("Checklist criado com sucesso");
            }
            setIsEditingChecklist(false);
            loadData();
        } catch (error) {
            toast.error("Falha ao salvar checklist");
        }
    };

    const handlePrintQR = () => {
        const printContent = document.getElementById('qr-code-to-print');
        if (!printContent) return;

        const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
        if (!windowPrint) return;

        windowPrint.document.write(`
            <html>
                <head>
                    <title>Imprimir QR - ${selectedChecklist?.title}</title>
                    <style>
                        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; color: #1e293b; }
                        .card { border: 1px solid #e2e8f0; padding: 40px; border-radius: 24px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                        h1 { margin-top: 24px; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase; }
                        p { color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 30px; }
                        .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        ${printContent.innerHTML}
                        <h1>${selectedChecklist?.title}</h1>
                        <p>${selectedChecklist?.sector?.name}</p>
                        <div class="footer">Digitalize para iniciar a auditoria</div>
                    </div>
                    <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
                </body>
            </html>
        `);
        windowPrint.document.close();
    };

    const filteredChecklists = checklists.filter(c => 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.sector?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && !isEditingChecklist) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Sincronizando Auditorias...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300 max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
            {/* Minimal Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-sm">
                        <ClipboardCheck size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Gestão de Checklists</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Auditoria & Conformidade Operacional</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button 
                        onClick={() => {
                            setCurrentChecklist({ title: '', description: '', frequency: 'DAILY', sectorId: '', tasks: [] });
                            setIsEditingChecklist(true);
                        }} 
                        className="h-10 px-5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest gap-2 bg-slate-900 hover:bg-slate-800 shadow-sm"
                    >
                        <Plus size={16} /> Novo Modelo
                    </Button>
                </div>
            </header>

            {/* Dense Dashboard Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Modelos Ativos</p>
                        <p className="text-lg font-black text-slate-900">{checklists.length}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Settings2 size={16} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Auditorias Realizadas</p>
                        <p className="text-lg font-black text-slate-900">{executions.length}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <CheckSquare size={16} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Conformidade Global</p>
                        <p className="text-lg font-black text-emerald-600">88.4%</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Check size={16} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ações Requeridas</p>
                        <p className="text-lg font-black text-rose-600">12</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                        <AlertCircle size={16} />
                    </div>
                </div>
            </div>

            {/* Compact Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start">
                {[
                    { id: 'checklists', label: 'Modelos de Checklist', icon: <ClipboardCheck size={14} /> },
                    { id: 'sectors', label: 'Setores', icon: <LayoutGrid size={14} /> },
                    { id: 'executions', label: 'Histórico', icon: <Clock size={14} /> },
                    { id: 'report', label: 'Config. Relatórios', icon: <Settings2 size={14} /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col gap-4">
                {activeTab === 'checklists' && (
                    <div className="space-y-4">
                        {/* Search and Sort Header */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="relative w-full sm:w-96 group">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} />
                                <input 
                                    placeholder="Pesquisar por título ou setor..." 
                                    className="w-full h-10 pl-10 pr-4 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-slate-200 focus:bg-white transition-all"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <Filter size={14} /> {filteredChecklists.length} Modelos Encontrados
                            </div>
                        </div>

                        {/* Dense Grid/Table */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredChecklists.map(checklist => (
                                <div key={checklist.id} className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-300 hover:shadow-md transition-all relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase rounded tracking-[0.15em] w-fit">
                                                {checklist.sector?.name}
                                            </span>
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight line-clamp-1">{checklist.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => { setSelectedChecklist(checklist); setShowQRCodeModal(true); }}
                                                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                                                title="Gerar QR Code"
                                            >
                                                <QrCode size={14} />
                                            </button>
                                            <button 
                                                onClick={() => { setCurrentChecklist(checklist); setIsEditingChecklist(true); }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button 
                                                onClick={() => { if(confirm("Excluir modelo?")) deleteChecklist(checklist.id).then(loadData); }}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <p className="text-[11px] text-slate-500 font-medium mb-5 line-clamp-2 h-8 leading-relaxed">
                                        {checklist.description || 'Nenhuma instrução adicional configurada.'}
                                    </p>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <Clock size={12} />
                                                <span className="text-[9px] font-black uppercase">{checklist.frequency}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-400 border-l border-slate-100 pl-3">
                                                <LayoutGrid size={12} />
                                                <span className="text-[9px] font-black uppercase tracking-tighter">{checklist._count?.tasks || checklist.tasks?.length || 0} Itens</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => { setCurrentChecklist(checklist); setIsEditingChecklist(true); }}
                                            className="text-[9px] font-black uppercase text-slate-900 flex items-center gap-1 hover:gap-2 transition-all"
                                        >
                                            Gerenciar <ArrowRight size={10} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'sectors' && (
                    <div className="max-w-3xl space-y-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl">
                                <LayoutGrid size={20} />
                            </div>
                            <input 
                                placeholder="Novo Setor (Cozinha, Bar, Salão...)" 
                                className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-slate-800 placeholder:text-slate-300"
                                value={newSectorName}
                                onChange={e => setNewSectorName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveSector()}
                            />
                            <Button onClick={handleSaveSector} size="sm" className="h-9 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest italic">Criar Setor</Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {sectors.map(sector => (
                                <div key={sector.id} className="bg-white p-3.5 pl-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                                        <div>
                                            <h4 className="text-xs font-black text-slate-900 uppercase italic tracking-tight">{sector.name}</h4>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Setor Ativo</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteSector(sector.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'executions' && (
                    <div className="space-y-4">
                        {/* Filters Bar */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
                            <select 
                                className="h-10 px-4 rounded-xl bg-slate-50 text-[10px] font-black uppercase outline-none focus:bg-white focus:border-slate-200 border border-transparent transition-all"
                                value={filters.checklistId}
                                onChange={e => setFilters({...filters, checklistId: e.target.value})}
                            >
                                <option value="">Todos os Modelos</option>
                                {checklists.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                            <input type="date" className="h-10 px-4 rounded-xl bg-slate-50 text-[10px] font-black uppercase outline-none border border-transparent focus:border-slate-200 transition-all" 
                                value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
                            <input type="date" className="h-10 px-4 rounded-xl bg-slate-50 text-[10px] font-black uppercase outline-none border border-transparent focus:border-slate-200 transition-all" 
                                value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
                            <Button variant="ghost" className="h-10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900" onClick={() => setFilters({checklistId: '', startDate: '', endDate: ''})}>Limpar Filtros</Button>
                        </div>

                        {/* History Table */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Checklist</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Responsável</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Data/Hora</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Conformidade</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {executions.map(exec => {
                                        const total = exec.responses?.length || 0;
                                        const okCount = exec.responses?.filter((r: any) => r.isOk).length || 0;
                                        const perc = total > 0 ? Math.round((okCount / total) * 100) : 0;
                                        
                                        return (
                                            <tr key={exec.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => { setSelectedExecution(exec); setShowExecutionDetail(true); }}>
                                                <td className="px-6 py-4">
                                                    <p className="text-xs font-black text-slate-900 uppercase italic tracking-tight leading-none">{exec.checklist?.title}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{exec.checklist?.sector?.name || 'Setor N/A'}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400">
                                                            {exec.user?.name?.[0] || exec.externalUserName?.[0] || 'A'}
                                                        </div>
                                                        <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-tight">
                                                            {exec.user?.name || exec.externalUserName || 'Anônimo'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-bold text-slate-500">{new Date(exec.completedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${exec.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                                        {exec.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className={cn("h-full rounded-full transition-all", perc > 80 ? "bg-emerald-500" : perc > 50 ? "bg-orange-500" : "bg-rose-500")} style={{ width: `${perc}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-900">{perc}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'report' && (
                    <div className="max-w-2xl space-y-6">
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-slate-900 opacity-[0.02] rounded-full -mr-20 -mt-20" />
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-slate-900 text-white rounded-2xl">
                                    <Settings2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Configuração de Alertas</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Relatórios automáticos via WhatsApp</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div>
                                        <p className="text-[11px] font-black text-slate-900 uppercase italic">Envio Diário Habilitado</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Consolidação automática às 22:00</p>
                                    </div>
                                    <button 
                                        onClick={() => setReportSettings({...reportSettings, enabled: !reportSettings.enabled})}
                                        className={cn(
                                            "w-12 h-6 rounded-full relative transition-all duration-300",
                                            reportSettings.enabled ? "bg-slate-900" : "bg-slate-300"
                                        )}
                                    >
                                        <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", reportSettings.enabled ? "left-7" : "left-1")} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp de Destino</label>
                                        <Input placeholder="Ex: 5511999999999" value={reportSettings.recipientPhone} onChange={e => setReportSettings({...reportSettings, recipientPhone: e.target.value})} className="h-11 rounded-xl text-xs font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Horário de Corte</label>
                                        <input type="time" className="w-full h-11 px-4 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-slate-200 transition-all" value={reportSettings.sendTime} onChange={e => setReportSettings({...reportSettings, sendTime: e.target.value})} />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button onClick={handleSaveReportSettings} className="h-11 px-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest italic shadow-lg shadow-slate-100">Salvar Alterações</Button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex gap-4">
                            <AlertCircle className="text-slate-400 shrink-0" size={20} />
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-tight">
                                Nota: O relatório consolidado enviará a taxa de conformidade por setor e listará todas as não-conformidades críticas registradas no período. Certifique-se de que a instância do WhatsApp está conectada nas configurações globais.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* FULL SCREEN EDIT MODAL */}
            <AnimatePresence>
                {isEditingChecklist && (
                    <motion.div 
                        initial={{ opacity: 0, y: 100 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: 100 }} 
                        className="fixed inset-0 z-[100] bg-white flex flex-col"
                    >
                        <header className="px-8 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                            <div className="flex items-center gap-5">
                                <div className="p-2.5 bg-slate-900 text-white rounded-xl">
                                    {currentChecklist.id ? <Edit size={22} /> : <Plus size={22} />}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                                        {currentChecklist.id ? 'Refinar Modelo de Checklist' : 'Configurar Nova Matriz de Auditoria'}
                                    </h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                        {currentChecklist.id ? `ID Técnico: ${currentChecklist.id}` : 'Definição de parâmetros e critérios técnicos'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" onClick={() => setIsEditingChecklist(false)} className="h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest italic text-slate-400 hover:text-rose-600">Cancelar</Button>
                                <Button onClick={handleSaveChecklist} className="h-11 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest italic gap-2">
                                    <Save size={16} /> Finalizar & Salvar
                                </Button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
                            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                {/* Configuration Sidebar */}
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Settings2 size={16} className="text-slate-900" />
                                            <h4 className="text-[11px] font-black text-slate-900 uppercase italic tracking-tighter">Configurações Gerais</h4>
                                        </div>
                                        
                                        <Input 
                                            label="Nome Técnico do Checklist" 
                                            placeholder="Ex: Abertura Padrão - Cozinha" 
                                            value={currentChecklist.title} 
                                            onChange={e => setCurrentChecklist({...currentChecklist, title: e.target.value})} 
                                            className="h-11 font-bold text-sm"
                                        />

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Setor Alocado</label>
                                                <select 
                                                    className="w-full h-11 px-4 rounded-xl bg-slate-50 text-xs font-bold outline-none border border-transparent focus:border-slate-200 transition-all appearance-none"
                                                    value={currentChecklist.sectorId}
                                                    onChange={e => setCurrentChecklist({...currentChecklist, sectorId: e.target.value})}
                                                >
                                                    <option value="">Setor...</option>
                                                    {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Recorrência</label>
                                                <select 
                                                    className="w-full h-11 px-4 rounded-xl bg-slate-50 text-xs font-bold outline-none border border-transparent focus:border-slate-200 transition-all appearance-none"
                                                    value={currentChecklist.frequency}
                                                    onChange={e => setCurrentChecklist({...currentChecklist, frequency: e.target.value})}
                                                >
                                                    <option value="DAILY">Diária</option>
                                                    <option value="WEEKLY">Semanal</option>
                                                    <option value="MONTHLY">Mensal</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações de Contexto</label>
                                            <textarea 
                                                className="w-full h-32 p-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none border border-transparent focus:border-slate-200 transition-all resize-none"
                                                placeholder="Descreva o objetivo técnico desta auditoria..."
                                                value={currentChecklist.description}
                                                onChange={e => setCurrentChecklist({...currentChecklist, description: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/10 rounded-lg"><ClipboardCheck size={20} /></div>
                                            <h4 className="text-xs font-black uppercase italic tracking-tighter">Conselho Técnico</h4>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-tight">
                                            Mantenha as tarefas curtas e objetivas. Utilize o tipo <b>FOTO</b> para evidências críticas de segurança alimentar ou manutenção preventiva.
                                        </p>
                                    </div>
                                </div>

                                {/* Task Matrix Area */}
                                <div className="lg:col-span-8 space-y-6">
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
                                                <CheckSquare size={18} /> Matriz de Critérios Técnicos
                                            </h4>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total de {currentChecklist.tasks?.length || 0} pontos de verificação</p>
                                        </div>
                                        <Button onClick={handleAddTask} className="h-9 px-6 rounded-xl bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest italic gap-2 shadow-sm">
                                            <Plus size={14} /> Novo Critério
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {(currentChecklist.tasks || []).map((task: any, index: number) => (
                                            <div key={index} className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 hover:border-slate-300 transition-all">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0 mt-1">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                                                    <div className="md:col-span-7">
                                                        <input 
                                                            className="w-full bg-transparent h-10 px-0 outline-none font-black text-slate-800 placeholder:text-slate-200 border-b-2 border-slate-50 focus:border-slate-900 transition-all"
                                                            placeholder="Descreva a verificação técnica..."
                                                            value={task.content}
                                                            onChange={e => handleTaskChange(index, 'content', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="md:col-span-3 flex items-center gap-1">
                                                        {[
                                                            { type: 'CHECKBOX', icon: <CheckSquare size={14} /> },
                                                            { type: 'TEXT', icon: <Type size={14} /> },
                                                            { type: 'NUMBER', icon: <Hash size={14} /> },
                                                            { type: 'PHOTO', icon: <Camera size={14} /> }
                                                        ].map(opt => (
                                                            <button
                                                                key={opt.type}
                                                                onClick={() => handleTaskChange(index, 'type', opt.type)}
                                                                className={cn(
                                                                    "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                                                                    task.type === opt.type ? "bg-slate-900 text-white shadow-md shadow-slate-100" : "bg-slate-50 text-slate-300 hover:text-slate-500"
                                                                )}
                                                                title={opt.type}
                                                            >
                                                                {opt.icon}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="md:col-span-2 flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleTaskChange(index, 'isRequired', !task.isRequired)}
                                                            className={cn(
                                                                "h-9 px-3 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border",
                                                                task.isRequired ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-300 border-slate-100"
                                                            )}
                                                        >
                                                            Obrigatório
                                                        </button>
                                                        <button onClick={() => handleRemoveTask(index)} className="w-9 h-9 rounded-lg text-slate-200 hover:text-rose-600 hover:bg-rose-50 transition-all">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {(!currentChecklist.tasks || currentChecklist.tasks.length === 0) && (
                                            <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-300 gap-4">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center"><ClipboardCheck size={32} /></div>
                                                <p className="text-[11px] font-black uppercase tracking-widest">Inicie adicionando o primeiro critério operacional</p>
                                                <Button onClick={handleAddTask} variant="outline" className="h-10 rounded-xl px-8 italic text-[10px] font-black uppercase tracking-widest">Criar Primeiro Item</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* MODAL QR CODE */}
                {showQRCodeModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQRCodeModal(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden p-8 flex flex-col items-center">
                            <div className="w-full flex justify-end absolute top-6 right-6">
                                <button onClick={() => setShowQRCodeModal(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"><X size={16}/></button>
                            </div>

                            <header className="mb-8 text-center">
                                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Ponto de Acesso</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Identificação para o setor</p>
                            </header>

                            <div className="bg-slate-50 p-6 rounded-[2rem] mb-6 border border-slate-100" id="qr-code-to-print">
                                <QRCodeSVG 
                                    value={`${window.location.origin}/checklist/fill/${selectedChecklist?.id}`}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>

                            <div className="text-center mb-8">
                                <h4 className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{selectedChecklist?.title}</h4>
                                <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase rounded mt-1 inline-block tracking-widest">{selectedChecklist?.sector?.name}</span>
                            </div>

                            <div className="grid grid-cols-1 gap-2 w-full">
                                <Button onClick={handlePrintQR} className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest italic gap-2 shadow-lg shadow-slate-100">
                                    <Printer size={16} /> Imprimir Identificador
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/checklist/fill/${selectedChecklist?.id}`);
                                        toast.success("Link copiado para a área de transferência");
                                    }} 
                                    className="h-10 text-[9px] font-black uppercase tracking-widest text-slate-400 gap-1.5"
                                >
                                    <Copy size={12} /> Copiar URL Direta
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* EXECUTION DETAIL MODAL */}
                {showExecutionDetail && selectedExecution && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowExecutionDetail(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-[#fcfcfc] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <header className="p-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-slate-900 text-white rounded-xl">
                                        <CheckSquare size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none">{selectedExecution.checklist?.title}</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                            {new Date(selectedExecution.completedAt).toLocaleString('pt-BR')} • {selectedExecution.user?.name || selectedExecution.externalUserName || 'Executor Anônimo'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setShowExecutionDetail(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all"><X size={20}/></button>
                            </header>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {/* Technical Header Info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Duração</p>
                                        <p className="text-sm font-black text-slate-900 uppercase italic">{selectedExecution.durationSeconds ? `${Math.floor(selectedExecution.durationSeconds / 60)}m ${selectedExecution.durationSeconds % 60}s` : 'N/A'}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conformidade</p>
                                        <p className="text-sm font-black text-emerald-600 uppercase italic">
                                            {(() => {
                                                const total = selectedExecution.responses?.length || 0;
                                                const ok = selectedExecution.responses?.filter((r: any) => r.isOk).length || 0;
                                                return total > 0 ? `${Math.round((ok/total)*100)}%` : '0%';
                                            })()}
                                        </p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status Final</p>
                                        <p className="text-sm font-black text-slate-900 uppercase italic">{selectedExecution.status}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Setor</p>
                                        <p className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">{selectedExecution.checklist?.sector?.name || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Matrix Analysis */}
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1 mb-3">Auditoria Detalhada de Itens</h4>
                                    {selectedExecution.responses?.map((resp: any, idx: number) => {
                                        const task = resp.task || selectedExecution.checklist?.tasks?.find((t: any) => t.id === resp.taskId);
                                        return (
                                            <div key={resp.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-start gap-4 hover:border-slate-200 transition-all">
                                                <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-[9px] font-black text-slate-300 shrink-0 mt-0.5">{idx + 1}</div>
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none">{task?.content || 'Critério Técnico Removido'}</p>
                                                        <div className={cn(
                                                            "px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest shrink-0",
                                                            resp.isOk ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                                        )}>
                                                            {resp.isOk ? 'Conforme' : 'Irregular'}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-4">
                                                        {task?.type !== 'CHECKBOX' && (
                                                            <div className="max-w-xs w-full">
                                                                {task?.type === 'PHOTO' ? (
                                                                    <div className="relative rounded-xl overflow-hidden border border-slate-100 group">
                                                                        <img 
                                                                            src={`${import.meta.env.VITE_API_URL || ''}${resp.value}`} 
                                                                            className="w-full h-32 object-cover cursor-zoom-in" 
                                                                            alt="Evidência Técnica" 
                                                                            onClick={() => window.open(`${import.meta.env.VITE_API_URL || ''}${resp.value}`, '_blank')}
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                            <Search size={20} className="text-white" />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                                                        <p className="text-[11px] font-black text-slate-700">{resp.value}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        
                                                        {resp.notes && (
                                                            <div className="flex-1 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 flex items-start gap-2">
                                                                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest leading-none mb-1">Observação do Auditor</p>
                                                                    <p className="text-[11px] text-amber-900 font-medium leading-relaxed">{resp.notes}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {selectedExecution.notes && (
                                <footer className="p-6 bg-slate-50 border-t border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Notas Gerais da Execução</h4>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                        <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                                            "{selectedExecution.notes.replace(/\[Executado por:.*?\]/, '').trim()}"
                                        </p>
                                    </div>
                                </footer>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChecklistManagement;
