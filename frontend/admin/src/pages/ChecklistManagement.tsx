import React, { useState, useEffect } from 'react';
import { 
    ClipboardCheck, Plus, Search, LayoutGrid, Trash2, 
    Edit, ChevronRight, CheckCircle2, AlertCircle, Clock,
    Camera, Type, Hash, CheckSquare, Loader2, X, QrCode, Printer,
    Filter, Settings2, Check, ArrowRight, Save, Copy, HelpCircle,
    Link as LinkIcon, Video, Image as ImageIcon, MessageCircle
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
        deadlineTime: '',
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
        if (!confirm("Excluir setor?")) return;
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

    const filteredChecklists = checklists.filter(c => 
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading && !isEditingChecklist) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
                <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">Sincronizando...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300 max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-sm">
                        <ClipboardCheck size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Gestão Operacional</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Auditoria & Treinamento Integrado</p>
                    </div>
                </div>
                <Button 
                    onClick={() => {
                        setCurrentChecklist({ title: '', description: '', frequency: 'DAILY', sectorId: '', deadlineTime: '', tasks: [] });
                        setIsEditingChecklist(true);
                    }} 
                    className="h-10 px-5 rounded-xl text-[10px] font-extrabold uppercase bg-slate-900 italic"
                >
                    <Plus size={16} /> Novo Modelo
                </Button>
            </header>

            {/* Compact Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start">
                {['checklists', 'sectors', 'executions', 'report'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                        )}
                    >
                        {tab === 'checklists' ? 'Modelos' : tab === 'sectors' ? 'Setores' : tab === 'executions' ? 'Histórico' : 'Alertas'}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex flex-col gap-4">
                {activeTab === 'checklists' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredChecklists.map(checklist => (
                            <div key={checklist.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-300 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase rounded tracking-widest">
                                        {checklist.sector?.name}
                                    </span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setSelectedChecklist(checklist); setShowQRCodeModal(true); }} className="p-1.5 text-slate-400 hover:text-slate-900 transition-all"><QrCode size={14}/></button>
                                        <button onClick={() => { setCurrentChecklist(checklist); setIsEditingChecklist(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 transition-all"><Edit size={14}/></button>
                                        <button onClick={() => { if(confirm("Excluir?")) deleteChecklist(checklist.id).then(loadData); }} className="p-1.5 text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase italic mb-1">{checklist.title}</h3>
                                {checklist.deadlineTime && (
                                    <div className="flex items-center gap-1.5 text-rose-500 mb-4">
                                        <Clock size={12} strokeWidth={3} />
                                        <span className="text-[9px] font-black uppercase tracking-tighter">Limite: {checklist.deadlineTime}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase"><Clock size={10} /> {checklist.frequency}</div>
                                        <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase pl-3 border-l border-slate-100"><HelpCircle size={10} /> {checklist.tasks?.length || 0} Itens</div>
                                    </div>
                                    <button onClick={() => { setCurrentChecklist(checklist); setIsEditingChecklist(true); }} className="text-[9px] font-black uppercase text-slate-900 flex items-center gap-1">Gestão <ArrowRight size={10}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'sectors' && (
                    <div className="max-w-2xl space-y-3">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                            <input placeholder="Novo Setor..." className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-slate-800" value={newSectorName} onChange={e => setNewSectorName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveSector()} />
                            <Button onClick={handleSaveSector} size="sm" className="bg-slate-900 italic h-9 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest">Criar Setor</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {sectors.map(sector => (
                                <div key={sector.id} className="bg-white p-3 px-5 rounded-2xl border border-slate-100 flex items-center justify-between group">
                                    <span className="text-xs font-black text-slate-800 uppercase italic tracking-tight">{sector.name}</span>
                                    <button onClick={() => handleDeleteSector(sector.id)} className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'executions' && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Modelo</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Executor</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Conclusão</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Conformidade</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {executions.map(exec => {
                                    const total = exec.responses?.length || 0;
                                    const ok = exec.responses?.filter((r: any) => r.isOk).length || 0;
                                    const perc = total > 0 ? Math.round((ok/total)*100) : 0;
                                    return (
                                        <tr key={exec.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => { setSelectedExecution(exec); setShowExecutionDetail(true); }}>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-black text-slate-900 uppercase italic tracking-tight">{exec.checklist?.title}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{exec.checklist?.sector?.name}</p>
                                            </td>
                                            <td className="px-6 py-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-tight">{exec.user?.name || exec.externalUserName || 'Executor Anônimo'}</td>
                                            <td className="px-6 py-4 text-[10px] font-bold text-slate-500">{new Date(exec.completedAt).toLocaleString('pt-BR')}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={cn("h-full rounded-full", perc > 80 ? "bg-emerald-500" : perc > 50 ? "bg-orange-500" : "bg-rose-500")} style={{ width: `${perc}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-900 tabular-nums">{perc}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300"><ChevronRight size={16} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'report' && (
                    <div className="max-w-2xl space-y-4">
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-900 text-white rounded-2xl"><Settings2 size={24} /></div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Central de Alertas</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Sincronização via WhatsApp Business</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="WhatsApp Destino (55...)" value={reportSettings.recipientPhone} onChange={e => setReportSettings({...reportSettings, recipientPhone: e.target.value})} className="h-11 font-bold" />
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Horário do Resumo Geral</label>
                                    <input type="time" className="w-full h-11 px-4 bg-slate-50 rounded-xl text-xs font-bold outline-none" value={reportSettings.sendTime} onChange={e => setReportSettings({...reportSettings, sendTime: e.target.value})} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div><p className="text-[10px] font-black uppercase italic">Habilitar Monitoramento Automático</p></div>
                                <button onClick={() => setReportSettings({...reportSettings, enabled: !reportSettings.enabled})} className={cn("w-12 h-6 rounded-full relative transition-all duration-300", reportSettings.enabled ? "bg-slate-900" : "bg-slate-300")}><div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", reportSettings.enabled ? "left-7" : "left-1")} /></button>
                            </div>
                            <Button onClick={handleSaveReportSettings} className="w-full bg-slate-900 italic h-12 uppercase text-[10px] font-black tracking-widest">Salvar Configuração de Alertas</Button>
                        </div>
                        <div className="bg-slate-900 p-6 rounded-3xl text-white flex gap-4 items-start shadow-xl">
                            <AlertCircle size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold leading-relaxed uppercase tracking-tight opacity-70">O sistema monitora cada checklist individualmente. Se o preenchimento não ocorrer até o horário limite definido no modelo, um alerta de "Operação em Atraso" será enviado automaticamente para o administrador.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* FULL SCREEN EDIT MODAL */}
            <AnimatePresence>
                {isEditingChecklist && (
                    <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed inset-0 z-[100] bg-white flex flex-col">
                        <header className="px-8 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-slate-900 text-white rounded-xl"><Plus size={20} /></div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{currentChecklist.id ? 'Refinar Matriz' : 'Nova Matriz de Operação'}</h2>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Configuração de Critérios e Procedimentos Técnicos</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" onClick={() => setIsEditingChecklist(false)} className="h-10 px-6 text-[10px] font-black uppercase italic text-slate-400">Cancelar</Button>
                                <Button onClick={handleSaveChecklist} className="h-10 px-8 rounded-xl bg-slate-900 italic text-[10px] font-black uppercase tracking-widest gap-2 shadow-xl"><Save size={16} /> Salvar Modelo</Button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto bg-slate-50/30 p-8">
                            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Configuration */}
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                        <Input label="Título Técnico" value={currentChecklist.title} onChange={e => setCurrentChecklist({...currentChecklist, title: e.target.value})} className="font-bold h-11" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Setor</label>
                                                <select className="w-full h-11 px-4 rounded-xl bg-slate-50 text-xs font-bold outline-none" value={currentChecklist.sectorId} onChange={e => setCurrentChecklist({...currentChecklist, sectorId: e.target.value})}>
                                                    <option value="">Setor...</option>
                                                    {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Frequência</label>
                                                <select className="w-full h-11 px-4 rounded-xl bg-slate-50 text-xs font-bold outline-none" value={currentChecklist.frequency} onChange={e => setCurrentChecklist({...currentChecklist, frequency: e.target.value})}>
                                                    <option value="DAILY">Diária</option>
                                                    <option value="WEEKLY">Semanal</option>
                                                    <option value="MONTHLY">Mensal</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Clock size={12} /> Horário Limite de Alerta</label>
                                            <input type="time" className="w-full h-11 px-4 bg-slate-50 rounded-xl text-xs font-bold outline-none border-2 border-transparent focus:border-rose-100 transition-all" value={currentChecklist.deadlineTime} onChange={e => setCurrentChecklist({...currentChecklist, deadlineTime: e.target.value})} />
                                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-1 px-1">Se o checklist não for preenchido até este horário, o administrador será notificado.</p>
                                        </div>
                                        <div className="space-y-1.5 pt-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Instruções</label>
                                            <textarea className="w-full h-24 p-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none resize-none" placeholder="Contexto geral..." value={currentChecklist.description} onChange={e => setCurrentChecklist({...currentChecklist, description: e.target.value})} />
                                        </div>
                                    </div>
                                </div>

                                {/* Task Builder */}
                                <div className="lg:col-span-8 space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2"><CheckSquare size={16} /> Itens & Procedimentos</h4>
                                        <Button onClick={handleAddTask} variant="outline" className="h-8 px-4 rounded-lg bg-white italic text-[10px] font-black uppercase tracking-widest gap-1.5 border-slate-200"><Plus size={14} /> Adicionar Item</Button>
                                    </div>

                                    <div className="space-y-3">
                                        {(currentChecklist.tasks || []).map((task: any, index: number) => (
                                            <div key={index} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 group hover:border-slate-300 transition-all">
                                                <div className="flex items-start gap-4">
                                                    <span className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0 mt-0.5">{index+1}</span>
                                                    <div className="flex-1 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                                            <input className="md:col-span-8 bg-transparent h-9 outline-none font-black text-slate-800 border-b border-slate-50 focus:border-slate-900 transition-all text-sm" placeholder="O que verificar?" value={task.content} onChange={e => handleTaskChange(index, 'content', e.target.value)} />
                                                            <div className="md:col-span-4 flex items-center justify-end gap-1">
                                                                {['CHECKBOX', 'PHOTO', 'TEXT', 'NUMBER'].map(t => (
                                                                    <button key={t} onClick={() => handleTaskChange(index, 'type', t)} className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", task.type === t ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-300")}>
                                                                        {t === 'CHECKBOX' ? <CheckSquare size={14}/> : t === 'PHOTO' ? <Camera size={14}/> : t === 'TEXT' ? <Type size={14}/> : <Hash size={14}/>}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Procedure Configuration */}
                                                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <HelpCircle size={14} className="text-slate-400" />
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Guia de Procedimento (Apoio ao Auditor)</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {[
                                                                    { id: 'NONE', label: 'Nenhum', icon: <X size={12}/> },
                                                                    { id: 'TEXT', label: 'Texto', icon: <Type size={12}/> },
                                                                    { id: 'IMAGE', label: 'Imagem (URL)', icon: <ImageIcon size={12}/> },
                                                                    { id: 'VIDEO', label: 'Vídeo (YouTube)', icon: <Video size={12}/> }
                                                                ].map(p => (
                                                                    <button key={p.id} onClick={() => handleTaskChange(index, 'procedureType', p.id)} className={cn("px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border transition-all", task.procedureType === p.id ? "bg-white text-slate-900 border-slate-300 shadow-sm" : "bg-transparent text-slate-400 border-transparent hover:text-slate-600")}>
                                                                        {p.icon} {p.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            {task.procedureType !== 'NONE' && (
                                                                <div className="relative">
                                                                    <div className="absolute left-3 top-3 text-slate-300"><LinkIcon size={14} /></div>
                                                                    <textarea 
                                                                        className="w-full h-20 pl-10 pr-4 py-3 bg-white rounded-xl text-[11px] font-bold outline-none border border-slate-100 focus:border-slate-300 transition-all resize-none" 
                                                                        placeholder={task.procedureType === 'TEXT' ? "Descreva o passo-a-passo detalhado..." : "Insira a URL completa..."} 
                                                                        value={task.procedureContent} 
                                                                        onChange={e => handleTaskChange(index, 'procedureContent', e.target.value)} 
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2 shrink-0">
                                                        <button onClick={() => handleRemoveTask(index)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                                                        <button onClick={() => handleTaskChange(index, 'isRequired', !task.isRequired)} className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all border", task.isRequired ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-200 border-slate-100")}><AlertCircle size={16}/></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* ... Modal QR e Detalhe mantidos com UI densa ... */}
            <AnimatePresence>
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
                                <QRCodeSVG value={`${window.location.origin}/checklist/fill/${selectedChecklist?.id}`} size={200} level="H" includeMargin={true} />
                            </div>
                            <div className="text-center mb-8">
                                <h4 className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{selectedChecklist?.title}</h4>
                                <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase rounded mt-1 inline-block tracking-widest">{selectedChecklist?.sector?.name}</span>
                            </div>
                            <Button onClick={handlePrintQR} className="w-full h-12 rounded-xl bg-slate-900 italic text-[10px] font-black uppercase tracking-widest gap-2 shadow-xl shadow-slate-100"><Printer size={16} /> Imprimir Identificador</Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {showExecutionDetail && selectedExecution && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowExecutionDetail(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-[#fcfcfc] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <header className="p-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-slate-900 text-white rounded-xl"><CheckSquare size={20} /></div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none">{selectedExecution.checklist?.title}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{new Date(selectedExecution.completedAt).toLocaleString('pt-BR')} • {selectedExecution.user?.name || selectedExecution.externalUserName || 'Executor Anônimo'}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowExecutionDetail(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all"><X size={20}/></button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conformidade</p>
                                    <p className="text-sm font-black text-emerald-600 uppercase italic">{(() => { const total = selectedExecution.responses?.length || 0; const ok = selectedExecution.responses?.filter((r: any) => r.isOk).length || 0; return total > 0 ? `${Math.round((ok/total)*100)}%` : '0%'; })()}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Duração</p>
                                    <p className="text-sm font-black text-slate-900 uppercase italic">{selectedExecution.durationSeconds ? `${Math.floor(selectedExecution.durationSeconds / 60)}m ${selectedExecution.durationSeconds % 60}s` : 'N/A'}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {selectedExecution.responses?.map((resp: any, idx: number) => {
                                    const task = resp.task || selectedExecution.checklist?.tasks?.find((t: any) => t.id === resp.taskId);
                                    return (
                                        <div key={resp.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-start gap-4">
                                            <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-[9px] font-black text-slate-300 shrink-0 mt-0.5">{idx + 1}</div>
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center justify-between gap-4">
                                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none">{task?.content || 'Critério Técnico Removido'}</p>
                                                    <div className={cn("px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest", resp.isOk ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>{resp.isOk ? 'Conforme' : 'Irregular'}</div>
                                                </div>
                                                {resp.notes && (
                                                    <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 flex items-start gap-2">
                                                        <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                                        <p className="text-[11px] text-amber-900 font-medium leading-relaxed">{resp.notes}</p>
                                                    </div>
                                                )}
                                                {task?.type === 'PHOTO' && resp.value && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {(() => {
                                                            try {
                                                                const photos = JSON.parse(resp.value);
                                                                if (Array.isArray(photos)) {
                                                                    return photos.map((url: string, pIdx: number) => (
                                                                        <div key={pIdx} className="relative rounded-xl overflow-hidden border border-slate-100 group w-32 h-32">
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
                                                                // Fallback para valor único caso não seja JSON
                                                                return (
                                                                    <div className="relative rounded-xl overflow-hidden border border-slate-100 group w-32 h-32">
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
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ChecklistManagement;
