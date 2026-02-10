import React, { useState, useEffect } from 'react';
import { 
    ClipboardCheck, Plus, Search, LayoutGrid, Trash2, 
    Edit, ChevronRight, CheckCircle2, AlertCircle, Clock,
    Camera, Type, Hash, CheckSquare, Loader2, X, QrCode, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
    getChecklists, createChecklist, updateChecklist, deleteChecklist,
    getSectors, createSector, deleteSector
} from '../services/api';

const ChecklistManagement: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'checklists' | 'sectors' | 'executions'>('checklists');
    
    const [checklists, setChecklists] = useState<any[]>([]);
    const [sectors, setSectors] = useState<any[]>([]);
    
    const [isEditingChecklist, setIsEditingChecklist] = useState(false);
    const [showQRCodeModal, setShowQRCodeModal] = useState(false);
    const [selectedChecklist, setSelectedChecklist] = useState<any>(null);
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

    const handlePrintQR = () => {
        const printContent = document.getElementById('qr-code-to-print');
        const windowUrl = 'about:blank';
        const uniqueName = new Date();
        const windowName = 'Print' + uniqueName.getTime();
        const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

        if (printWindow && printContent) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Imprimir QR Code - ${selectedChecklist?.title}</title>
                        <style>
                            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                            .container { border: 2px solid #000; padding: 40px; border-radius: 20px; text-align: center; }
                            h1 { margin-top: 20px; font-size: 24px; text-transform: uppercase; }
                            p { color: #666; margin-top: 5px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            ${printContent.innerHTML}
                            <h1>${selectedChecklist?.title}</h1>
                            <p>Setor: ${selectedChecklist?.sector?.name}</p>
                            <p style="font-size: 10px; margin-top: 20px;">Escaneie para iniciar o checklist</p>
                        </div>
                        <script>
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 500);
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [checklistsData, sectorsData] = await Promise.all([
                getChecklists(),
                getSectors()
            ]);
            setChecklists(checklistsData);
            setSectors(sectorsData);
        } catch (error) {
            toast.error("Erro ao carregar dados do Checklist");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSector = async () => {
        if (!newSectorName) return;
        try {
            await createSector({ name: newSectorName });
            toast.success("Setor criado com sucesso!");
            setNewSectorName('');
            setIsEditingSector(false);
            loadData();
        } catch (error) {
            toast.error("Erro ao criar setor");
        }
    };

    const handleDeleteSector = async (id: string) => {
        if (!confirm("Deseja realmente excluir este setor?")) return;
        try {
            await deleteSector(id);
            toast.success("Setor excluído!");
            loadData();
        } catch (error) {
            toast.error("Erro ao excluir setor");
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
            return toast.error("Preencha o título e selecione um setor");
        }
        if (currentChecklist.tasks.length === 0) {
            return toast.error("Adicione pelo menos uma tarefa");
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
            toast.error("Erro ao salvar checklist");
        }
    };

    if (loading && !isEditingChecklist) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Carregando Operações...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[80px] -mr-32 -mt-32 rounded-full" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-100">
                            <ClipboardCheck size={24} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Checklist & Rotinas</h1>
                    </div>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] ml-1">Gestão de Processos e Auditoria Operacional</p>
                </div>
                
                <div className="flex gap-2 relative z-10">
                    <Button onClick={() => {
                        setCurrentChecklist({ title: '', description: '', frequency: 'DAILY', sectorId: '', tasks: [] });
                        setIsEditingChecklist(true);
                    }} className="h-12 px-6 rounded-2xl italic uppercase text-[10px] font-black tracking-widest gap-2">
                        <Plus size={18} /> Novo Checklist
                    </Button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full max-w-md mx-auto shadow-inner">
                <button onClick={() => setActiveTab('checklists')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'checklists' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Modelos</button>
                <button onClick={() => setActiveTab('sectors')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'sectors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Setores</button>
                <button onClick={() => setActiveTab('executions')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'executions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Histórico</button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 gap-6">
                {activeTab === 'checklists' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {checklists.map(checklist => (
                            <Card key={checklist.id} className="p-6 border-slate-100 hover:border-orange-500 transition-all group overflow-hidden relative">
                                <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                                    <ClipboardCheck size={80} />
                                </div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded-lg tracking-widest">
                                        {checklist.sector?.name}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setSelectedChecklist(checklist); setShowQRCodeModal(true); }} className="p-2 bg-slate-50 text-slate-400 hover:text-orange-500 rounded-lg transition-colors"><QrCode size={16}/></button>
                                        <button onClick={() => { setCurrentChecklist(checklist); setIsEditingChecklist(true); }} className="p-2 bg-slate-50 text-slate-400 hover:text-blue-500 rounded-lg transition-colors"><Edit size={16}/></button>
                                        <button onClick={() => { if(confirm("Excluir modelo?")) deleteChecklist(checklist.id).then(loadData); }} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter mb-1 leading-tight">{checklist.title}</h3>
                                <p className="text-xs text-slate-400 font-medium mb-6 line-clamp-2">{checklist.description || 'Sem descrição'}</p>
                                
                                <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
                                    <div className="flex items-center gap-2">
                                        <Clock size={12} className="text-slate-300" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase">{checklist.frequency}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-orange-600 uppercase italic">{checklist._count?.tasks || checklist.tasks?.length || 0} Tarefas</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {activeTab === 'sectors' && (
                    <div className="max-w-2xl mx-auto w-full space-y-4">
                        <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center gap-4 group hover:border-orange-500 transition-all">
                            <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-orange-50 group-hover:text-orange-500 transition-all">
                                <LayoutGrid size={24} />
                            </div>
                            <input 
                                placeholder="Nome do Novo Setor (ex: Cozinha, Bar...)" 
                                className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 placeholder:text-slate-300"
                                value={newSectorName}
                                onChange={e => setNewSectorName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveSector()}
                            />
                            <Button onClick={handleSaveSector} size="sm" className="rounded-xl italic">Criar Setor</Button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {sectors.map(sector => (
                                <Card key={sector.id} className="p-4 flex items-center justify-between border-slate-100 hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black">
                                            {sector.name.substring(0, 1).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800 uppercase italic leading-none">{sector.name}</h4>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Setor Ativo</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteSector(sector.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'executions' && (
                    <div className="space-y-4 max-w-4xl mx-auto w-full">
                        <Card className="p-12 border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-6 bg-slate-50 text-slate-200 rounded-full">
                                <Clock size={48} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Histórico em Breve</h3>
                                <p className="text-sm text-slate-400 max-w-xs mx-auto">Estamos processando os dados de auditoria. Em breve você poderá visualizar todas as execuções de checklist aqui.</p>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {/* Modal de Edição de Checklist */}
            <AnimatePresence>
                {isEditingChecklist && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditingChecklist(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-4xl bg-[#f8fafc] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <header className="p-8 bg-white border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black uppercase italic text-slate-900 tracking-tighter leading-none">Configurar Modelo</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Defina as tarefas e periodicidade</p>
                                </div>
                                <button onClick={() => setIsEditingChecklist(false)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"><X size={24}/></button>
                            </header>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <Input label="Título do Checklist" placeholder="Ex: Abertura de Cozinha" value={currentChecklist.title} onChange={e => setCurrentChecklist({...currentChecklist, title: e.target.value})} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Setor Responsável</label>
                                                <select 
                                                    className="w-full h-12 px-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-700 font-bold outline-none focus:border-orange-500 transition-all appearance-none"
                                                    value={currentChecklist.sectorId}
                                                    onChange={e => setCurrentChecklist({...currentChecklist, sectorId: e.target.value})}
                                                >
                                                    <option value="">Selecionar Setor...</option>
                                                    {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Frequência</label>
                                                <select 
                                                    className="w-full h-12 px-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-700 font-bold outline-none focus:border-orange-500 transition-all appearance-none"
                                                    value={currentChecklist.frequency}
                                                    onChange={e => setCurrentChecklist({...currentChecklist, frequency: e.target.value})}
                                                >
                                                    <option value="DAILY">Diário</option>
                                                    <option value="WEEKLY">Semanal</option>
                                                    <option value="MONTHLY">Mensal</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Instruções Adicionais</label>
                                        <textarea 
                                            className="w-full h-[108px] p-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-700 font-bold outline-none focus:border-orange-500 transition-all resize-none"
                                            placeholder="Descreva o objetivo deste checklist..."
                                            value={currentChecklist.description}
                                            onChange={e => setCurrentChecklist({...currentChecklist, description: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
                                            <CheckSquare size={16} className="text-orange-500" /> Itens do Checklist ({currentChecklist.tasks.length})
                                        </h4>
                                        <Button onClick={handleAddTask} variant="outline" size="sm" className="h-9 rounded-xl gap-2 border-orange-200 text-orange-600 hover:bg-orange-50">
                                            <Plus size={14} /> Adicionar Item
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {currentChecklist.tasks.map((task: any, index: number) => (
                                            <Card key={index} className="p-4 border-slate-100 shadow-sm flex flex-col gap-3 animate-in slide-in-from-right-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0 mt-1">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 space-y-3">
                                                        <input 
                                                            className="w-full bg-slate-50 h-10 px-4 rounded-xl border border-transparent focus:border-orange-300 focus:bg-white outline-none font-bold text-sm transition-all"
                                                            placeholder="O que deve ser verificado?"
                                                            value={task.content}
                                                            onChange={e => handleTaskChange(index, 'content', e.target.value)}
                                                        />
                                                        
                                                        <div className="flex flex-wrap gap-2">
                                                            {[
                                                                { type: 'CHECKBOX', label: 'Sim/Não', icon: <CheckSquare size={14}/> },
                                                                { type: 'TEXT', label: 'Texto', icon: <Type size={14}/> },
                                                                { type: 'NUMBER', label: 'Número', icon: <Hash size={14}/> },
                                                                { type: 'PHOTO', label: 'Foto', icon: <Camera size={14}/> }
                                                            ].map(typeOpt => (
                                                                <button
                                                                    key={typeOpt.type}
                                                                    onClick={() => handleTaskChange(index, 'type', typeOpt.type)}
                                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 border transition-all ${
                                                                        task.type === typeOpt.type 
                                                                        ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-100' 
                                                                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                                                    }`}
                                                                >
                                                                    {typeOpt.icon} {typeOpt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2 shrink-0">
                                                        <button 
                                                            onClick={() => handleRemoveTask(index)}
                                                            className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors"
                                                            title="Remover Tarefa"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleTaskChange(index, 'isRequired', !task.isRequired)}
                                                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                                                                task.isRequired ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-300'
                                                            }`}
                                                            title="Obrigatório?"
                                                        >
                                                            <AlertCircle size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <footer className="p-8 bg-white border-t border-slate-100 flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => setIsEditingChecklist(false)} className="px-8 rounded-2xl italic">Cancelar</Button>
                                <Button onClick={handleSaveChecklist} className="px-10 rounded-2xl italic uppercase text-[10px] font-black tracking-widest shadow-lg shadow-orange-100">Salvar Modelo</Button>
                            </footer>
                        </motion.div>
                    </div>
                )}

                {showQRCodeModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQRCodeModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center">
                            <header className="w-full flex justify-between items-center mb-6">
                                <div className="text-left">
                                    <h3 className="text-xl font-black uppercase italic text-slate-900 tracking-tighter leading-none">QR Code de Acesso</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Imprima para o setor</p>
                                </div>
                                <button onClick={() => setShowQRCodeModal(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"><X size={20}/></button>
                            </header>

                            <div className="bg-slate-50 p-8 rounded-[2rem] mb-6" id="qr-code-to-print">
                                <QRCodeSVG 
                                    value={`${window.location.origin}/checklist/fill/${selectedChecklist?.id}`}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>

                            <div className="mb-8">
                                <h4 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter">{selectedChecklist?.title}</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{selectedChecklist?.sector?.name}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 w-full">
                                <Button variant="outline" onClick={() => setShowQRCodeModal(false)} className="rounded-2xl italic h-12">Fechar</Button>
                                <Button onClick={handlePrintQR} className="rounded-2xl italic h-12 gap-2 uppercase text-[10px] font-black tracking-widest shadow-lg shadow-orange-100">
                                    <Printer size={16} /> Imprimir
                                </Button>
                            </div>
                            
                            <p className="text-[9px] text-slate-300 font-bold uppercase mt-6 tracking-tight">O link aponta para: {window.location.origin}/checklist/fill/{selectedChecklist?.id}</p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChecklistManagement;
