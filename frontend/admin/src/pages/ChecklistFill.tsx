import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
    ClipboardCheck, CheckCircle2, XCircle,
    Loader2, Send, User as UserIcon, Camera, Image as ImageIcon, 
    Type, Hash, ChevronLeft, ChevronRight, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';

const ChecklistFill: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [checklist, setChecklist] = useState<any>(null);
    const [responses, setResponses] = useState<any[]>([]);
    const [notes, setNotes] = useState('');
    const [userName, setUserName] = useState('');
    const [step, setStep] = useState<'info' | 'tasks' | 'success'>('info');
    const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
    const [uploadingTask, setUploadingTask] = useState<string | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    useEffect(() => {
        if (id) loadChecklist();
    }, [id]);

    const loadChecklist = async () => {
        try {
            const response = await axios.get(`${API_URL}/checklists/${id}`);
            const data = response.data;
            setChecklist(data);
            
            const initialResponses = data.tasks.map((task: any) => ({
                taskId: task.id,
                value: '',
                isOk: null, // Alterado para null: força o usuário a escolher
                type: task.type,
                itemNotes: '' // Nova observação por item
            }));
            setResponses(initialResponses);
        } catch (error) {
            toast.error("Checklist não encontrado");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateResponse = (taskId: string, field: string, value: any) => {
        setResponses(prev => prev.map(r => 
            r.taskId === taskId ? { ...r, [field]: value } : r
        ));
    };

    const handleFileUpload = async (taskId: string, file: File) => {
        if (!file) return;
        setUploadingTask(taskId);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await axios.post(`${API_URL}/checklists/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            handleUpdateResponse(taskId, 'value', response.data.url);
            handleUpdateResponse(taskId, 'isOk', true);
            toast.success("Foto enviada!");
        } catch (error) {
            toast.error("Erro ao enviar foto");
        } finally {
            setUploadingTask(null);
        }
    };

    const validateCurrentTask = () => {
        const task = checklist.tasks[currentTaskIndex];
        const resp = responses[currentTaskIndex];
        
        if (task.type === 'CHECKBOX' && resp.isOk === null) {
            toast.error("Selecione se o item está Conforme ou Irregular");
            return false;
        }
        if (task.isRequired && !resp.value && task.type !== 'CHECKBOX') {
            toast.error("Este item é obrigatório");
            return false;
        }
        return true;
    };

    const nextTask = () => {
        if (validateCurrentTask()) {
            if (currentTaskIndex < checklist.tasks.length - 1) {
                setCurrentTaskIndex(prev => prev + 1);
            }
        }
    };

    const prevTask = () => {
        if (currentTaskIndex > 0) {
            setCurrentTaskIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        if (!validateCurrentTask()) return;
        if (!userName) return toast.error("Informe seu nome");

        setSubmitting(true);
        try {
            await axios.post(`${API_URL}/checklists/submit`, {
                checklistId: id,
                userName,
                notes,
                responses: responses.map(r => ({
                    taskId: r.taskId,
                    value: r.type === 'CHECKBOX' ? (r.isOk ? 'true' : 'false') : String(r.value),
                    isOk: r.isOk ?? false,
                    notes: r.itemNotes // Envia observação do item
                }))
            });
            setStep('success');
        } catch (error) {
            toast.error("Erro ao salvar o checklist");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Carregando...</p>
        </div>
    );

    if (step === 'success') return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={48} />
            </motion.div>
            <h1 className="text-2xl font-black text-slate-900 uppercase italic mb-2 tracking-tighter">Checklist Enviado!</h1>
            <p className="text-slate-500 mb-8">Tudo pronto! Seu registro foi salvo.</p>
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest italic">Novo Preenchimento</button>
        </div>
    );

    const currentTask = checklist?.tasks[currentTaskIndex];
    const currentResponse = responses[currentTaskIndex];
    const progress = ((currentTaskIndex + 1) / checklist?.tasks.length) * 100;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white p-5 border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-500 text-white rounded-xl shadow-lg">
                        <ClipboardCheck size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter leading-none line-clamp-1">{checklist?.title}</h1>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{checklist?.sector?.name}</p>
                    </div>
                </div>
                <div className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full tracking-tighter">
                    {currentTaskIndex + 1} / {checklist?.tasks.length}
                </div>
            </header>

            <div className="h-1 bg-slate-100 w-full">
                <motion.div className="h-full bg-orange-500" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
            </div>

            <main className="p-4 flex-1 max-w-lg mx-auto w-full flex flex-col">
                <AnimatePresence mode="wait">
                    {step === 'info' ? (
                        <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pt-6 flex-1 flex flex-col">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex-1">
                                <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6">
                                    <UserIcon size={32} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2 leading-none">Identificação</h2>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-8 tracking-widest">Quem está realizando a auditoria?</p>
                                <input 
                                    placeholder="Seu nome completo..."
                                    className="w-full h-16 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-orange-500 outline-none font-bold text-lg transition-all"
                                    value={userName}
                                    onChange={e => setUserName(e.target.value)}
                                />
                            </div>
                            <button 
                                disabled={!userName}
                                onClick={() => setStep('tasks')}
                                className="w-full h-18 bg-orange-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest italic shadow-xl shadow-orange-100 disabled:opacity-50 text-lg flex items-center justify-center gap-3"
                            >
                                Começar Agora <ChevronRight size={24} />
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div key={currentTask?.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="pt-6 space-y-6 flex-1 flex flex-col">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-lg tracking-widest">
                                        Tarefa {currentTaskIndex + 1}
                                    </span>
                                    {currentTask?.isRequired && <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-md uppercase">Obrigatório</span>}
                                </div>

                                <h3 className="text-2xl font-black text-slate-900 leading-tight mb-8">
                                    {currentTask?.content}
                                </h3>

                                <div className="flex-1 space-y-6">
                                    {currentTask?.type === 'CHECKBOX' && (
                                        <div className="grid grid-cols-1 gap-4">
                                            <button 
                                                onClick={() => handleUpdateResponse(currentTask.id, 'isOk', true)}
                                                className={`h-20 rounded-2xl font-black uppercase italic tracking-widest flex items-center px-6 gap-4 border-2 transition-all ${
                                                    currentResponse.isOk === true 
                                                    ? 'bg-green-500 border-green-500 text-white shadow-xl shadow-green-100' 
                                                    : 'bg-white border-slate-100 text-slate-400'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentResponse.isOk === true ? 'bg-white text-green-500' : 'bg-slate-50'}`}>
                                                    <CheckCircle2 size={20} />
                                                </div>
                                                Conforme
                                            </button>
                                            <button 
                                                onClick={() => handleUpdateResponse(currentTask.id, 'isOk', false)}
                                                className={`h-20 rounded-2xl font-black uppercase italic tracking-widest flex items-center px-6 gap-4 border-2 transition-all ${
                                                    currentResponse.isOk === false 
                                                    ? 'bg-rose-500 border-rose-500 text-white shadow-xl shadow-rose-100' 
                                                    : 'bg-white border-slate-100 text-slate-400'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentResponse.isOk === false ? 'bg-white text-rose-500' : 'bg-slate-50'}`}>
                                                    <XCircle size={20} />
                                                </div>
                                                Irregular
                                            </button>
                                        </div>
                                    )}

                                    {currentTask?.type === 'TEXT' && (
                                        <textarea 
                                            placeholder="Digite sua resposta..."
                                            className="w-full p-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-orange-500 outline-none font-bold text-lg h-40"
                                            value={currentResponse.value}
                                            onChange={(e) => handleUpdateResponse(currentTask.id, 'value', e.target.value)}
                                        />
                                    )}

                                    {currentTask?.type === 'NUMBER' && (
                                        <input 
                                            type="number"
                                            placeholder="0.00"
                                            className="w-full h-20 px-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-orange-500 outline-none font-black text-2xl"
                                            value={currentResponse.value}
                                            onChange={(e) => handleUpdateResponse(currentTask.id, 'value', e.target.value)}
                                        />
                                    )}

                                    {currentTask?.type === 'PHOTO' && (
                                        <div className="space-y-4">
                                            <input type="file" accept="image/*" capture="environment" className="hidden" ref={el => fileInputRefs.current[currentTask.id] = el}
                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(currentTask.id, e.target.files[0])} />
                                            {currentResponse.value ? (
                                                <div className="relative rounded-2xl overflow-hidden shadow-lg group">
                                                    <img src={`${API_URL.replace('/api', '')}${currentResponse.value}`} className="w-full h-56 object-cover" />
                                                    <button onClick={() => handleUpdateResponse(currentTask.id, 'value', '')} className="absolute top-4 right-4 p-3 bg-rose-500 text-white rounded-full shadow-xl">
                                                        <XCircle size={20} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => fileInputRefs.current[currentTask.id]?.click()} disabled={uploadingTask === currentTask.id}
                                                    className="w-full h-56 rounded-[2rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4 text-slate-300 hover:border-orange-500 hover:text-orange-500 transition-all">
                                                    {uploadingTask === currentTask.id ? <Loader2 className="animate-spin w-10 h-10" /> : <><Camera size={64} /><span className="text-sm font-black uppercase italic tracking-widest">Abrir Câmera</span></>}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-8 pt-6 border-t border-slate-50">
                                        <div className="flex items-center gap-2 text-slate-400 mb-3 px-1">
                                            <MessageSquare size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Observação do Item (Opcional)</span>
                                        </div>
                                        <textarea 
                                            placeholder="Algum detalhe específico sobre este item?"
                                            className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-medium text-sm h-24"
                                            value={currentResponse.itemNotes}
                                            onChange={(e) => handleUpdateResponse(currentTask.id, 'itemNotes', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pb-10">
                                <button onClick={prevTask} disabled={currentTaskIndex === 0} className="w-18 h-18 bg-white border-2 border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center disabled:opacity-20 shadow-sm">
                                    <ChevronLeft size={32} />
                                </button>
                                
                                {currentTaskIndex === checklist.tasks.length - 1 ? (
                                    <button onClick={handleSubmit} disabled={submitting} className="flex-1 h-18 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest italic flex items-center justify-center gap-3 shadow-xl">
                                        {submitting ? <Loader2 className="animate-spin" /> : <><Send size={20} /> Finalizar</>}
                                    </button>
                                ) : (
                                    <button onClick={nextTask} className="flex-1 h-18 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest italic flex items-center justify-center gap-3 shadow-lg shadow-orange-100">
                                        Próximo <ChevronRight size={20} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default ChecklistFill;
