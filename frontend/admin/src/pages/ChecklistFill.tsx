import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
    ClipboardCheck, CheckCircle2, XCircle,
    Loader2, Send, User as UserIcon, Camera,
    Type, Hash, MessageSquare, AlertCircle,
    ChevronDown, ChevronUp, Check, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const ChecklistFill: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [checklist, setChecklist] = useState<any>(null);
    const [responses, setResponses] = useState<any[]>([]);
    const [notes, setNotes] = useState('');
    const [userName, setUserName] = useState('');
    const [step, setStep] = useState<'info' | 'filling' | 'success'>('info');
    const [uploadingTask, setUploadingTask] = useState<string | null>(null);
    const [startedAt] = useState(new Date().toISOString());

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
                isOk: null,
                type: task.type,
                itemNotes: '',
                isExpanded: false
            }));
            setResponses(initialResponses);
        } catch (error) {
            toast.error("Link de checklist inválido ou expirado");
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
            toast.success("Foto anexada com sucesso");
        } catch (error) {
            toast.error("Falha no upload da imagem");
        } finally {
            setUploadingTask(null);
        }
    };

    const toggleExpand = (taskId: string) => {
        setResponses(prev => prev.map(r => 
            r.taskId === taskId ? { ...r, isExpanded: !r.isExpanded } : r
        ));
    };

    const handleSubmit = async () => {
        if (!userName) return toast.error("Por favor, identifique-se antes de enviar");
        
        // Validação de itens obrigatórios
        const incomplete = responses.find((r, idx) => {
            const task = checklist.tasks[idx];
            if (task.type === 'CHECKBOX' && r.isOk === null) return true;
            if (task.isRequired && !r.value && task.type !== 'CHECKBOX') return true;
            if (r.isOk === false && !r.itemNotes) return true;
            return false;
        });

        if (incomplete) {
            toast.error("Existem itens pendentes ou irregularidades sem justificativa");
            return;
        }

        setSubmitting(true);
        try {
            await axios.post(`${API_URL}/checklists/submit`, {
                checklistId: id,
                userName,
                notes,
                startedAt,
                responses: responses.map(r => ({
                    taskId: r.taskId,
                    value: r.type === 'CHECKBOX' ? (r.isOk ? 'true' : 'false') : String(r.value),
                    isOk: r.isOk ?? false,
                    notes: r.itemNotes
                }))
            });
            setStep('success');
        } catch (error) {
            toast.error("Erro técnico ao processar o envio");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
            <Loader2 className="w-8 h-8 animate-spin text-slate-900 mb-4" />
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Iniciando Protocolo...</p>
        </div>
    );

    if (step === 'success') return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/20">
                <Check size={48} />
            </motion.div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-3 leading-none">Auditoria Finalizada</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-10 max-w-xs">Os dados foram sincronizados com o servidor central.</p>
            <button onClick={() => window.location.reload()} className="h-14 px-10 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest italic text-xs shadow-xl">Novo Registro</button>
        </div>
    );

    const answeredCount = responses.filter(r => r.isOk !== null || (r.value && r.type !== 'CHECKBOX')).length;
    const progress = (answeredCount / (checklist?.tasks.length || 1)) * 100;

    return (
        <div className="min-h-screen bg-[#fcfcfc] flex flex-col font-sans text-slate-900 pb-20">
            {/* Ultra Dense Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-5 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 text-white rounded-lg">
                        <ClipboardCheck size={18} />
                    </div>
                    <div>
                        <h1 className="text-xs font-black uppercase italic tracking-tighter leading-none line-clamp-1">{checklist?.title}</h1>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mt-1">{checklist?.sector?.name}</p>
                    </div>
                </div>
                <div className="text-[10px] font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full tabular-nums">
                    {Math.round(progress)}%
                </div>
            </header>

            <div className="h-1 bg-slate-100 w-full sticky top-[61px] z-40">
                <motion.div className="h-full bg-slate-900" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
            </div>

            <main className="p-4 flex-1 max-w-2xl mx-auto w-full">
                <AnimatePresence mode="wait">
                    {step === 'info' ? (
                        <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pt-8 space-y-8">
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Identificação do Auditor</h2>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Obrigatório para rastreabilidade técnica</p>
                            </div>
                            
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nome Completo</label>
                                <input 
                                    autoFocus
                                    placeholder="Digite seu nome..."
                                    className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-slate-900 outline-none font-black text-lg transition-all"
                                    value={userName}
                                    onChange={e => setUserName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && userName && setStep('filling')}
                                />
                            </div>

                            <button 
                                disabled={!userName}
                                onClick={() => setStep('filling')}
                                className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest italic disabled:opacity-30 shadow-xl shadow-slate-200 flex items-center justify-center gap-3 transition-all"
                            >
                                Iniciar Auditoria <Check size={20} />
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div key="filling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-4">
                            {/* All Tasks in a Single Dense List */}
                            {checklist?.tasks.map((task: any, idx: number) => {
                                const resp = responses[idx];
                                return (
                                    <div key={task.id} className={cn(
                                        "bg-white rounded-2xl border transition-all duration-300 overflow-hidden",
                                        resp.isOk === true ? "border-emerald-100 bg-emerald-50/10" : 
                                        resp.isOk === false ? "border-rose-100 bg-rose-50/10" : "border-slate-100 shadow-sm"
                                    )}>
                                        <div className="p-4 flex items-center justify-between gap-4">
                                            <div className="flex items-start gap-3 flex-1">
                                                <span className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-[9px] font-black text-slate-400 shrink-0 mt-0.5">{idx + 1}</span>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-slate-800 leading-tight">{task.content}</p>
                                                    {task.isRequired && <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest">Obrigatório</span>}
                                                </div>
                                            </div>

                                            {/* Action Buttons based on Type */}
                                            <div className="flex items-center gap-1.5">
                                                {task.type === 'CHECKBOX' ? (
                                                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                                        <button 
                                                            onClick={() => handleUpdateResponse(task.id, 'isOk', true)}
                                                            className={cn(
                                                                "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                                                                resp.isOk === true ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                                                            )}
                                                        >
                                                            <Check size={18} strokeWidth={3} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateResponse(task.id, 'isOk', false)}
                                                            className={cn(
                                                                "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                                                                resp.isOk === false ? "bg-rose-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                                                            )}
                                                        >
                                                            <X size={18} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => toggleExpand(task.id)}
                                                        className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                            resp.value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"
                                                        )}
                                                    >
                                                        {task.type === 'PHOTO' ? <Camera size={18} /> : task.type === 'NUMBER' ? <Hash size={18} /> : <Type size={18} />}
                                                    </button>
                                                )}
                                                
                                                {/* Detail Toggle */}
                                                <button 
                                                    onClick={() => toggleExpand(task.id)}
                                                    className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                                        resp.isExpanded ? "bg-slate-900 text-white" : "text-slate-300"
                                                    )}
                                                >
                                                    {resp.isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expandable Technical Inputs */}
                                        <AnimatePresence>
                                            {(resp.isExpanded || resp.isOk === false) && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }} 
                                                    animate={{ height: 'auto', opacity: 1 }} 
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-slate-100 px-4 py-4 space-y-4 bg-white/50"
                                                >
                                                    {task.type === 'TEXT' && (
                                                        <textarea 
                                                            placeholder="Resposta por extenso..."
                                                            className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-bold text-xs h-24 transition-all focus:bg-white focus:ring-1 ring-slate-100"
                                                            value={resp.value}
                                                            onChange={(e) => handleUpdateResponse(task.id, 'value', e.target.value)}
                                                        />
                                                    )}

                                                    {task.type === 'NUMBER' && (
                                                        <input 
                                                            type="number"
                                                            placeholder="0.00"
                                                            className="w-full h-12 px-4 rounded-xl bg-slate-50 border-none outline-none font-black text-sm tabular-nums"
                                                            value={resp.value}
                                                            onChange={(e) => handleUpdateResponse(task.id, 'value', e.target.value)}
                                                        />
                                                    )}

                                                    {task.type === 'PHOTO' && (
                                                        <div className="space-y-3">
                                                            <input type="file" accept="image/*" capture="environment" className="hidden" ref={el => fileInputRefs.current[task.id] = el}
                                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(task.id, e.target.files[0])} />
                                                            {resp.value ? (
                                                                <div className="relative rounded-2xl overflow-hidden border border-slate-100 group">
                                                                    <img src={`${import.meta.env.VITE_API_URL || ''}${resp.value}`} className="w-full h-40 object-cover" />
                                                                    <button onClick={() => handleUpdateResponse(task.id, 'value', '')} className="absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-lg shadow-lg">
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => fileInputRefs.current[task.id]?.click()} disabled={uploadingTask === task.id}
                                                                    className="w-full h-24 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-300 hover:border-slate-900 hover:text-slate-900 transition-all">
                                                                    {uploadingTask === task.id ? <Loader2 className="animate-spin w-6 h-6" /> : <><Camera size={24} /><span className="text-[8px] font-black uppercase tracking-widest">Abrir Câmera</span></>}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Row-specific Observation */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                                            <MessageSquare size={10} /> Observação {resp.isOk === false ? '(Justificativa Obrigatória)' : '(Opcional)'}
                                                        </label>
                                                        <textarea 
                                                            placeholder={resp.isOk === false ? "Explique a irregularidade encontrada..." : "Algum detalhe técnico adicional?"}
                                                            className={cn(
                                                                "w-full p-3 rounded-xl border-none outline-none font-bold text-[11px] h-20 transition-all",
                                                                resp.isOk === false ? "bg-rose-50 text-rose-900 placeholder:text-rose-300" : "bg-slate-50 text-slate-800"
                                                            )}
                                                            value={resp.itemNotes}
                                                            onChange={(e) => handleUpdateResponse(task.id, 'itemNotes', e.target.value)}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}

                            {/* Global Notes */}
                            <div className="mt-6 space-y-3">
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Notas Finais</h4>
                                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                                    <textarea 
                                        placeholder="Alguma observação geral sobre o setor ou turno?"
                                        className="w-full h-24 p-0 bg-transparent border-none outline-none font-bold text-xs resize-none placeholder:text-slate-200"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Dense Submit Button Area */}
                            <div className="pt-8 pb-10">
                                <button 
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest italic flex items-center justify-center gap-3 shadow-2xl shadow-slate-200"
                                >
                                    {submitting ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Finalizar Auditoria</>}
                                </button>
                                <p className="text-[8px] font-black text-slate-300 text-center mt-4 uppercase tracking-[0.2em]">O envio é irreversível e gera protocolo automático</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default ChecklistFill;
