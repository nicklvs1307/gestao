import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
    ClipboardCheck, CheckCircle2, XCircle,
    Loader2, Send, User as UserIcon, Camera,
    Type, Hash, MessageSquare, AlertCircle,
    ChevronDown, ChevronUp, Check, X, HelpCircle,
    Play, Image as ImageIcon
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
                value: task.type === 'PHOTO' ? [] : '',
                isOk: null,
                type: task.type,
                itemNotes: '',
                isExpanded: false,
                showProcedure: false
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
        
        // Verificar limite de 3 fotos
        const currentResponse = responses.find(r => r.taskId === taskId);
        const currentPhotos = Array.isArray(currentResponse?.value) ? currentResponse.value : [];
        
        if (currentPhotos.length >= 3) {
            toast.error("Limite de 3 fotos atingido");
            return;
        }

        setUploadingTask(taskId);
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await axios.post(`${API_URL}/checklists/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 30000 // 30 segundos de timeout
            });
            
            const newPhotos = [...currentPhotos, response.data.url];
            handleUpdateResponse(taskId, 'value', newPhotos);
            handleUpdateResponse(taskId, 'isOk', true);
            toast.success("Foto anexada");
        } catch (error: any) {
            console.error("Upload error:", error);
            if (error.code === 'ECONNABORTED') {
                toast.error("Upload demorou muito. Verifique sua conexão.");
            } else {
                toast.error("Erro no upload. Tente novamente.");
            }
        } finally {
            setUploadingTask(null);
            // Reset input file
            if (fileInputRefs.current[taskId]) {
                fileInputRefs.current[taskId]!.value = '';
            }
        }
    };

    const removePhoto = (taskId: string, photoUrl: string) => {
        const currentResponse = responses.find(r => r.taskId === taskId);
        const currentPhotos = Array.isArray(currentResponse?.value) ? currentResponse.value : [];
        const newPhotos = currentPhotos.filter(url => url !== photoUrl);
        handleUpdateResponse(taskId, 'value', newPhotos);
        
        // Se removeu todas as fotos, reseta o isOk (para forçar o preenchimento se for obrigatório)
        if (newPhotos.length === 0) {
            handleUpdateResponse(taskId, 'isOk', null);
        }
    };

    const toggleExpand = (taskId: string) => {
        setResponses(prev => prev.map(r => 
            r.taskId === taskId ? { ...r, isExpanded: !r.isExpanded } : r
        ));
    };

    const toggleProcedure = (taskId: string) => {
        setResponses(prev => prev.map(r => 
            r.taskId === taskId ? { ...r, showProcedure: !r.showProcedure } : r
        ));
    };

    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleSubmit = async () => {
        if (!userName) return toast.error("Identifique-se");
        
        const incomplete = responses.find((r, idx) => {
            const task = checklist.tasks[idx];
            if (task.type === 'CHECKBOX' && r.isOk === null) return true;
            if (task.isRequired && task.type !== 'CHECKBOX') {
                if (task.type === 'PHOTO') return !r.value || r.value.length === 0;
                return !r.value;
            }
            if (r.isOk === false && !r.itemNotes) return true;
            return false;
        });

        if (incomplete) {
            toast.error("Itens pendentes ou irregularidades sem notas");
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
                    value: r.type === 'CHECKBOX' 
                        ? (r.isOk ? 'true' : 'false') 
                        : (r.type === 'PHOTO' ? JSON.stringify(r.value) : String(r.value)),
                    isOk: r.isOk ?? false,
                    notes: r.itemNotes
                }))
            });
            setStep('success');
        } catch (error) {
            toast.error("Erro ao enviar");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
            <Loader2 className="w-8 h-8 animate-spin text-slate-900 mb-4" />
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Iniciando...</p>
        </div>
    );

    if (step === 'success') return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mb-8">
                <Check size={48} />
            </motion.div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-10">Checklist Enviado!</h1>
            <button onClick={() => window.location.reload()} className="h-14 px-10 bg-white text-slate-900 rounded-2xl font-black uppercase italic text-xs">Novo Preenchimento</button>
        </div>
    );

    const answeredCount = responses.filter(r => r.isOk !== null || (r.value && r.type !== 'CHECKBOX')).length;
    const progress = (answeredCount / (checklist?.tasks.length || 1)) * 100;

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900 pb-24">
            {/* Minimal Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 text-white rounded-lg">
                        <ClipboardCheck size={18} />
                    </div>
                    <div>
                        <h1 className="text-xs font-black uppercase italic tracking-tighter leading-none line-clamp-1">{checklist?.title}</h1>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{checklist?.sector?.name}</p>
                    </div>
                </div>
                <div className="text-[10px] font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full tabular-nums">{Math.round(progress)}%</div>
            </header>

            <div className="h-1.5 bg-slate-100 w-full sticky top-[61px] z-40">
                <motion.div className="h-full bg-slate-900" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
            </div>

            <main className="p-4 flex-1 max-w-3xl mx-auto w-full">
                <AnimatePresence mode="wait">
                    {step === 'info' ? (
                        <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pt-8 space-y-8">
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Identificação</h2>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quem está preenchando o checklist?</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <input autoFocus placeholder="Digite seu nome..." className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-slate-900 outline-none font-black text-lg transition-all" value={userName} onChange={e => setUserName(e.target.value)} onKeyDown={e => e.key === 'Enter' && userName && setStep('filling')} />
                            </div>
                            <button disabled={!userName} onClick={() => setStep('filling')} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest italic disabled:opacity-30 shadow-xl flex items-center justify-center gap-3">Iniciar Auditoria <Check size={20} /></button>
                        </motion.div>
                    ) : (
                        <motion.div key="filling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-4">
                            {checklist?.tasks.map((task: any, idx: number) => {
                                const resp = responses[idx];
                                return (
                                    <div key={task.id} className={cn(
                                        "bg-white rounded-[2rem] border-2 transition-all duration-300 overflow-hidden shadow-sm",
                                        resp.isOk === true ? "border-emerald-500 bg-emerald-50/20" : 
                                        resp.isOk === false ? "border-rose-500 bg-rose-50/20" : "border-slate-100"
                                    )}>
                                        <div className="p-6 space-y-6">
                                            {/* Full Width Text Header */}
                                            <div className="flex items-start gap-4">
                                                <span className={cn(
                                                    "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 transition-colors shadow-sm",
                                                    resp.isOk === true ? "bg-emerald-500 text-white" : 
                                                    resp.isOk === false ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-400"
                                                )}>
                                                    {idx + 1}
                                                </span>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <h3 className="text-sm md:text-base font-black text-slate-900 uppercase italic tracking-tight leading-tight">
                                                            {task.content}
                                                        </h3>
                                                        {task.procedureType !== 'NONE' && (
                                                            <button onClick={() => toggleProcedure(task.id)} className={cn("p-2 rounded-xl transition-all shadow-sm", resp.showProcedure ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400")}>
                                                                <HelpCircle size={18} strokeWidth={3} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {task.isRequired && <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-widest">Obrigatório</span>}
                                                </div>
                                            </div>

                                            {/* Bottom Actions Bar */}
                                            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-50">
                                                {task.type === 'CHECKBOX' ? (
                                                    <div className="flex w-full sm:w-auto gap-2">
                                                        <button 
                                                            onClick={() => handleUpdateResponse(task.id, 'isOk', true)} 
                                                            className={cn(
                                                                "flex-1 sm:w-32 h-14 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md font-black uppercase tracking-widest italic text-xs",
                                                                resp.isOk === true ? "bg-emerald-500 text-white scale-[1.02]" : "bg-white text-slate-300 border-2 border-slate-50"
                                                            )}
                                                        >
                                                            <Check size={22} strokeWidth={4} /> SIM
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateResponse(task.id, 'isOk', false)} 
                                                            className={cn(
                                                                "flex-1 sm:w-32 h-14 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md font-black uppercase tracking-widest italic text-xs",
                                                                resp.isOk === false ? "bg-rose-500 text-white scale-[1.02]" : "bg-white text-slate-300 border-2 border-slate-50"
                                                            )}
                                                        >
                                                            <X size={22} strokeWidth={4} /> NÃO
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => toggleExpand(task.id)}
                                                        className={cn(
                                                            "w-full sm:w-48 h-14 rounded-2xl flex items-center justify-center gap-3 transition-all font-black uppercase italic tracking-widest text-xs shadow-md",
                                                            resp.value ? "bg-slate-900 text-white" : "bg-white text-slate-400 border-2 border-slate-50"
                                                        )}
                                                    >
                                                        {task.type === 'PHOTO' ? <><Camera size={20} /> TIRAR FOTO</> : task.type === 'NUMBER' ? <><Hash size={20} /> INSERIR VALOR</> : <><Type size={20} /> ESCREVER</>}
                                                    </button>
                                                )}

                                                <div className="flex-1" />

                                                <button 
                                                    onClick={() => toggleExpand(task.id)}
                                                    className={cn(
                                                        "h-14 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all font-black uppercase text-[10px] tracking-widest",
                                                        resp.isExpanded ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400"
                                                    )}
                                                >
                                                    DETALHES {resp.isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Procedure Section */}
                                        <AnimatePresence>
                                            {resp.showProcedure && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-slate-900 text-white">
                                                    <div className="p-6 space-y-4">
                                                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                                            <HelpCircle size={14}/> Guia de Procedimento
                                                        </div>
                                                        {task.procedureType === 'TEXT' && <p className="text-sm font-bold italic text-slate-300 bg-white/5 p-4 rounded-2xl border border-white/5">{task.procedureContent}</p>}
                                                        {task.procedureType === 'IMAGE' && <img src={task.procedureContent} className="w-full rounded-2xl border border-white/10" />}
                                                        {task.procedureType === 'VIDEO' && (
                                                            <div className="aspect-video rounded-2xl overflow-hidden border border-white/10">
                                                                <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${getYoutubeId(task.procedureContent)}`} frameBorder="0" allowFullScreen />
                                                            </div>
                                                        )}
                                                        <button onClick={() => toggleProcedure(task.id)} className="w-full py-3 bg-white/10 rounded-xl text-[10px] font-black uppercase">Fechar Guia</button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Expandable Inputs */}
                                        <AnimatePresence>
                                            {(resp.isExpanded || resp.isOk === false) && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t-2 border-slate-50 px-6 py-6 space-y-6 bg-white/40">
                                                    {task.type === 'TEXT' && <textarea placeholder="Descreva aqui..." className="w-full p-5 rounded-[1.5rem] bg-slate-50 border-none outline-none font-bold text-sm h-28 focus:bg-white focus:ring-2 ring-slate-100 transition-all" value={resp.value} onChange={(e) => handleUpdateResponse(task.id, 'value', e.target.value)} />}
                                                    {task.type === 'NUMBER' && <input type="number" placeholder="0.00" className="w-full h-16 px-6 rounded-[1.5rem] bg-slate-50 border-none outline-none font-black text-xl tabular-nums" value={resp.value} onChange={(e) => handleUpdateResponse(task.id, 'value', e.target.value)} />}
                                                    {task.type === 'PHOTO' && (
                                                        <div className="space-y-4">
                                                            <input type="file" accept="image/*" capture="environment" className="hidden" ref={el => fileInputRefs.current[task.id] = el} onChange={(e) => e.target.files?.[0] && handleFileUpload(task.id, e.target.files[0])} />
                                                            
                                                            <div className="grid grid-cols-1 gap-4">
                                                                {Array.isArray(resp.value) && resp.value.map((photoUrl: string, pIdx: number) => (
                                                                    <div key={pIdx} className="relative rounded-3xl overflow-hidden shadow-xl group">
                                                                        <img src={`${import.meta.env.VITE_API_URL || ''}${photoUrl}`} className="w-full h-60 object-cover" />
                                                                        <button 
                                                                            onClick={() => removePhoto(task.id, photoUrl)} 
                                                                            className="absolute top-4 right-4 p-3 bg-rose-500 text-white rounded-2xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <X size={20}/>
                                                                        </button>
                                                                        {/* Mobile delete button always visible */}
                                                                        <button 
                                                                            onClick={() => removePhoto(task.id, photoUrl)} 
                                                                            className="sm:hidden absolute top-4 right-4 p-3 bg-rose-500 text-white rounded-2xl shadow-lg"
                                                                        >
                                                                            <X size={20}/>
                                                                        </button>
                                                                    </div>
                                                                ))}

                                                                {(!Array.isArray(resp.value) || resp.value.length < 3) && (
                                                                    <button 
                                                                        onClick={() => fileInputRefs.current[task.id]?.click()} 
                                                                        disabled={uploadingTask === task.id} 
                                                                        className="w-full h-40 rounded-[2rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-slate-900 transition-all hover:bg-slate-50"
                                                                    >
                                                                        {uploadingTask === task.id ? (
                                                                            <div className="flex flex-col items-center gap-2">
                                                                                <Loader2 className="animate-spin w-8 h-8 text-slate-900" />
                                                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">Enviando...</span>
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                <Camera size={48} />
                                                                                <div className="text-center">
                                                                                    <span className="text-[10px] font-black uppercase tracking-widest block">Adicionar Foto</span>
                                                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                                                                        {Array.isArray(resp.value) ? resp.value.length : 0} de 3
                                                                                    </span>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                            <MessageSquare size={12}/> {resp.isOk === false ? "JUSTIFICATIVA OBRIGATÓRIA" : "OBSERVAÇÕES"}
                                                        </label>
                                                        <textarea placeholder={resp.isOk === false ? "Por que este item está irregular?" : "Algum detalhe adicional?"} className={cn("w-full p-4 rounded-2xl border-none outline-none font-bold text-xs h-24 transition-all", resp.isOk === false ? "bg-rose-50 text-rose-900 placeholder:text-rose-200" : "bg-slate-50 text-slate-700")} value={resp.itemNotes} onChange={(e) => handleUpdateResponse(task.id, 'itemNotes', e.target.value)} />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}

                            <div className="pt-10 pb-20 space-y-6">
                                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4">Notas Finais do Turno</h4>
                                    <textarea placeholder="Observações gerais sobre a operação..." className="w-full h-32 p-0 bg-transparent border-none outline-none font-bold text-sm resize-none" value={notes} onChange={e => setNotes(e.target.value)} />
                                </div>
                                <button onClick={handleSubmit} disabled={submitting} className="w-full h-20 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-4 shadow-2xl shadow-slate-200 text-lg transition-transform active:scale-95">{submitting ? <Loader2 className="animate-spin" /> : <><Send size={24} /> FINALIZAR AGORA</>}</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default ChecklistFill;
