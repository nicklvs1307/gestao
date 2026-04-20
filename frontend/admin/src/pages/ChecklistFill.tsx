import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
    ClipboardCheck, CheckCircle2, XCircle,
    Loader2, Send, User as UserIcon, Camera,
    Type, Hash, MessageSquare, AlertCircle,
    ChevronDown, ChevronUp, Check, X, HelpCircle,
    Play, Image as ImageIcon, AlertTriangle, ListChecks
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
    const [errors, setErrors] = useState<Record<string, string>>({});

    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    // Autosave draft
    const saveDraft = useCallback(() => {
        if (id && step === 'filling') {
            const draft = {
                userName,
                responses,
                notes,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(`checklist-draft-${id}`, JSON.stringify(draft));
        }
    }, [id, userName, responses, notes, step]);

    useEffect(() => {
        const interval = setInterval(saveDraft, 5000);
        return () => clearInterval(interval);
    }, [saveDraft]);

    // Load draft on mount
    useEffect(() => {
        if (id) {
            const savedDraft = localStorage.getItem(`checklist-draft-${id}`);
            if (savedDraft) {
                try {
                    const draft = JSON.parse(savedDraft);
                    const hoursSinceSave = (Date.now() - new Date(draft.timestamp).getTime()) / (1000 * 60 * 60);
                    if (hoursSinceSave < 24) {
                        setUserName(draft.userName || '');
                        setResponses(draft.responses || []);
                        setNotes(draft.notes || '');
                        toast.info("Rascunho restaurado automaticamente");
                    } else {
                        localStorage.removeItem(`checklist-draft-${id}`);
                    }
                } catch (e) {
                    localStorage.removeItem(`checklist-draft-${id}`);
                }
            }
        }
    }, [id]);

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
        // Clear error when user starts filling
        if (errors[taskId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[taskId];
                return newErrors;
            });
        }
    };

    const handleFileUpload = async (taskId: string, file: File) => {
        if (!file) return;

        const currentResponse = responses.find(r => r.taskId === taskId);
        const currentPhotos = Array.isArray(currentResponse?.value) ? currentResponse.value : [];

        if (currentPhotos.length >= 3) {
            toast.error("Limite de 3 fotos atingido");
            return;
        }

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const MAX_SIZE_MB = isImage ? 10 : 20;
        const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

        if (file.size > MAX_SIZE_BYTES) {
            toast.error(`Tamanho máx: ${MAX_SIZE_MB}MB`);
            return;
        }

        if (file.size < 1024) {
            toast.error("Arquivo muito pequeno");
            return;
        }

        setUploadingTask(taskId);
        
        const formData = new FormData();
        formData.append('file', file);

        const typeLabel = isImage ? 'imagem' : 'vídeo';

        try {
            const response = await axios.post(`${API_URL}/checklists/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 60000,
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadingTask(`${taskId}-${percent}`);
                    }
                }
            });

            const newPhotos = [...currentPhotos, response.data.url];
            handleUpdateResponse(taskId, 'value', newPhotos);
            handleUpdateResponse(taskId, 'isOk', true);
            toast.success(isVideo ? "Vídeo anexado" : "Foto anexada");
        } catch (error: any) {
            console.error("Upload error:", error);
            const message = error.response?.data?.message || error.message;
            if (error.code === 'ECONNABORTED' || error.code === 'ERR_CANCELED') {
                toast.error("Upload cancelado. Tente novamente.");
            } else if (message?.includes('máximo')) {
                toast.error(message);
            } else {
                toast.error(`Erro ao enviar ${typeLabel}. Tente novamente.`);
            }
        } finally {
            setUploadingTask(null);
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

    // Real-time validation
    const validateResponses = (): boolean => {
        const newErrors: Record<string, string> = {};
        let hasError = false;

        responses.forEach((r, idx) => {
            const task = checklist.tasks[idx];
            if (task.type === 'CHECKBOX' && r.isOk === null) {
                newErrors[r.taskId] = 'Selecione Sim ou Não';
                hasError = true;
            }
            if (task.isRequired && task.type !== 'CHECKBOX') {
                if (task.type === 'PHOTO' && (!r.value || r.value.length === 0)) {
                    newErrors[r.taskId] = 'Adicione pelo menos uma foto';
                    hasError = true;
                }
                if (task.type !== 'PHOTO' && !r.value) {
                    newErrors[r.taskId] = 'Preencha este campo';
                    hasError = true;
                }
            }
            if (r.isOk === false && !r.itemNotes) {
                newErrors[r.taskId] = 'Justificativa obrigatória para itens irregulares';
                hasError = true;
            }
        });

        setErrors(newErrors);
        return !hasError;
    };

    const handleSubmit = async () => {
        if (!userName) return toast.error("Identifique-se");

        if (!validateResponses()) {
            toast.error("Existem itens pendentes ou irregulares sem justificativa");
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

            // Clear draft on success
            localStorage.removeItem(`checklist-draft-${id}`);
            setStep('success');
        } catch (error) {
            toast.error("Erro ao enviar");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground font-medium text-sm">Carregando checklist...</p>
        </div>
    );

    if (step === 'success') return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center p-8 text-center">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-24 h-24 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-200"
            >
                <Check size={48} />
            </motion.div>
            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-foreground mb-2"
            >
                Checklist Enviado!
            </motion.h1>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground mb-8 max-w-sm"
            >
                Suas respostas foram registradas com sucesso. O administrador receberá o relatório.
            </motion.p>
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={() => window.location.reload()}
                className="h-14 px-10 bg-primary text-white rounded-xl font-semibold text-sm hover:brightness-110 transition-all shadow-lg shadow-primary/30"
            >
                Novo Preenchimento
            </motion.button>
        </div>
    );

    const answeredCount = responses.filter(r => r.isOk !== null || (r.value && r.type !== 'CHECKBOX')).length;
    const progress = (answeredCount / (checklist?.tasks.length || 1)) * 100;
    const totalTasks = checklist?.tasks.length || 0;
    const pendingTasks = totalTasks - answeredCount;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-24">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <ClipboardCheck size={18} />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-foreground line-clamp-1">{checklist?.title}</h1>
                        <p className="text-xs text-muted-foreground">{checklist?.sector?.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground tabular-nums">{Math.round(progress)}%</span>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="h-1.5 bg-slate-100 w-full sticky top-[57px] z-40">
                <motion.div
                    className={cn(
                        "h-full transition-all duration-500",
                        progress === 100 ? "bg-emerald-500" : "bg-primary"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                />
            </div>

            {/* Pending Items Indicator */}
            {step === 'filling' && pendingTasks > 0 && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
                    <ListChecks size={16} className="text-amber-600" />
                    <span className="text-xs font-medium text-amber-800">
                        {pendingTasks} {pendingTasks === 1 ? 'item pendente' : 'itens pendentes'}
                    </span>
                </div>
            )}

            <main className="p-4 flex-1 max-w-3xl mx-auto w-full">
                <AnimatePresence mode="wait">
                    {step === 'info' ? (
                        <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pt-8 space-y-8">
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold text-foreground">Identificação</h2>
                                <p className="text-sm text-muted-foreground">Quem está preenchendo o checklist?</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <input
                                    autoFocus
                                    placeholder="Digite seu nome..."
                                    className="w-full h-14 px-4 rounded-lg bg-slate-50 border-2 border-transparent focus:border-primary outline-none font-medium text-base transition-all"
                                    value={userName}
                                    onChange={e => setUserName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && userName && setStep('filling')}
                                />
                            </div>
                            <button
                                disabled={!userName}
                                onClick={() => setStep('filling')}
                                className="w-full h-14 bg-primary text-white rounded-xl font-semibold disabled:opacity-30 shadow-lg shadow-primary/30 flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                            >
                                Iniciar Auditoria <Check size={20} />
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div key="filling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-4">
                            {checklist?.tasks.map((task: any, idx: number) => {
                                const resp = responses[idx];
                                const hasError = errors[resp.taskId];
                                return (
                                    <div key={task.id} className={cn(
                                        "bg-white rounded-xl border-2 transition-all duration-300 overflow-hidden shadow-sm",
                                        hasError ? "border-amber-400 bg-amber-50/30" :
                                        resp.isOk === true ? "border-emerald-500 bg-emerald-50/20" :
                                        resp.isOk === false ? "border-rose-500 bg-rose-50/20" : "border-slate-200"
                                    )}>
                                        <div className="p-5 space-y-4">
                                            {/* Header */}
                                            <div className="flex items-start gap-3">
                                                <span className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 transition-colors",
                                                    hasError ? "bg-amber-100 text-amber-700" :
                                                    resp.isOk === true ? "bg-emerald-500 text-white" :
                                                    resp.isOk === false ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"
                                                )}>
                                                    {hasError ? <AlertTriangle size={16} /> : idx + 1}
                                                </span>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                                                            {task.content}
                                                        </h3>
                                                        {task.procedureType !== 'NONE' && (
                                                            <button
                                                                onClick={() => toggleProcedure(task.id)}
                                                                className={cn(
                                                                    "p-2 rounded-lg transition-all",
                                                                    resp.showProcedure ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                                                                )}
                                                            >
                                                                <HelpCircle size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {task.isRequired && (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                                                            Obrigatório
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Error Message */}
                                            {hasError && (
                                                <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 p-2 rounded-lg">
                                                    <AlertCircle size={14} />
                                                    {hasError}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-100">
                                                {task.type === 'CHECKBOX' ? (
                                                    <div className="flex w-full sm:w-auto gap-2">
                                                        <button
                                                            onClick={() => handleUpdateResponse(task.id, 'isOk', true)}
                                                            className={cn(
                                                                "flex-1 sm:w-28 h-12 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold text-sm",
                                                                resp.isOk === true
                                                                    ? "bg-emerald-500 text-white shadow-md"
                                                                    : "bg-white text-slate-400 border-2 border-slate-200"
                                                            )}
                                                        >
                                                            <Check size={18} strokeWidth={3} /> Sim
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateResponse(task.id, 'isOk', false)}
                                                            className={cn(
                                                                "flex-1 sm:w-28 h-12 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold text-sm",
                                                                resp.isOk === false
                                                                    ? "bg-rose-500 text-white shadow-md"
                                                                    : "bg-white text-slate-400 border-2 border-slate-200"
                                                            )}
                                                        >
                                                            <X size={18} strokeWidth={3} /> Não
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => toggleExpand(task.id)}
                                                        className={cn(
                                                            "w-full sm:w-44 h-12 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold text-sm shadow-sm",
                                                            resp.value ? "bg-primary text-white" : "bg-white text-slate-400 border-2 border-slate-200"
                                                        )}
                                                    >
                                                        {task.type === 'PHOTO' ? <><Camera size={18} /> Adicionar Foto</> :
                                                         task.type === 'NUMBER' ? <><Hash size={18} /> Inserir Valor</> :
                                                         <><Type size={18} /> Escrever</>}
                                                    </button>
                                                )}

                                                <div className="flex-1" />

                                                <button
                                                    onClick={() => toggleExpand(task.id)}
                                                    className={cn(
                                                        "h-12 px-4 rounded-lg flex items-center justify-center gap-2 transition-all font-medium text-xs",
                                                        resp.isExpanded ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                                                    )}
                                                >
                                                    Detalhes {resp.isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Procedure Section */}
                                        <AnimatePresence>
                                            {resp.showProcedure && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: 'auto' }}
                                                    exit={{ height: 0 }}
                                                    className="bg-slate-900 text-white overflow-hidden"
                                                >
                                                    <div className="p-5 space-y-4">
                                                        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide">
                                                            <HelpCircle size={14} /> Guia de Procedimento
                                                        </div>
                                                        {task.procedureType === 'TEXT' && (
                                                            <p className="text-sm text-slate-300 bg-white/5 p-4 rounded-lg border border-white/10">
                                                                {task.procedureContent}
                                                            </p>
                                                        )}
                                                        {task.procedureType === 'IMAGE' && (
                                                            <img src={task.procedureContent} className="w-full rounded-lg border border-white/10" alt="Procedimento" />
                                                        )}
                                                        {task.procedureType === 'VIDEO' && (
                                                            <div className="aspect-video rounded-lg overflow-hidden border border-white/10">
                                                                <iframe
                                                                    className="w-full h-full"
                                                                    src={`https://www.youtube.com/embed/${getYoutubeId(task.procedureContent)}`}
                                                                    frameBorder="0"
                                                                    allowFullScreen
                                                                />
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => toggleProcedure(task.id)}
                                                            className="w-full py-2.5 bg-white/10 rounded-lg text-xs font-semibold hover:bg-white/20 transition-all"
                                                        >
                                                            Fechar Guia
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Expandable Inputs */}
                                        <AnimatePresence>
                                            {(resp.isExpanded || resp.isOk === false) && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: 'auto' }}
                                                    exit={{ height: 0 }}
                                                    className="border-t-2 border-slate-100 px-5 py-5 space-y-4 bg-slate-50/50"
                                                >
                                                    {task.type === 'TEXT' && (
                                                        <textarea
                                                            placeholder="Descreva aqui..."
                                                            className="w-full p-4 rounded-lg bg-white border border-slate-200 outline-none font-medium text-sm h-28 focus:ring-2 ring-primary/20 focus:border-primary transition-all"
                                                            value={resp.value}
                                                            onChange={(e) => handleUpdateResponse(task.id, 'value', e.target.value)}
                                                        />
                                                    )}
                                                    {task.type === 'NUMBER' && (
                                                        <input
                                                            type="number"
                                                            placeholder="0.00"
                                                            className="w-full h-14 px-4 rounded-lg bg-white border border-slate-200 outline-none font-semibold text-lg tabular-nums focus:ring-2 ring-primary/20 focus:border-primary transition-all"
                                                            value={resp.value}
                                                            onChange={(e) => handleUpdateResponse(task.id, 'value', e.target.value)}
                                                        />
                                                    )}
                                                    {task.type === 'PHOTO' && (
                                                        <div className="space-y-4">
                                                            <input
                                                                type="file"
                                                                accept="image/*,video/*"
                                                                capture="environment"
                                                                className="hidden"
                                                                ref={el => fileInputRefs.current[task.id] = el}
                                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(task.id, e.target.files[0])}
                                                            />

                                                            {/* Photo Grid */}
                                                            {Array.isArray(resp.value) && resp.value.length > 0 && (
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    {resp.value.map((photoUrl: string, pIdx: number) => (
                                                                        <div key={pIdx} className="relative rounded-lg overflow-hidden shadow-md group aspect-square">
                                                                            <img
                                                                                src={`${import.meta.env.VITE_API_URL || ''}${photoUrl}`}
                                                                                className="w-full h-full object-cover"
                                                                                alt={`Foto ${pIdx + 1}`}
                                                                            />
                                                                            <button
                                                                                onClick={() => removePhoto(task.id, photoUrl)}
                                                                                className="absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            >
                                                                                <X size={16} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => removePhoto(task.id, photoUrl)}
                                                                                className="sm:hidden absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-lg shadow-lg"
                                                                            >
                                                                                <X size={16} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Add Photo/Video Button */}
                                                            {(!Array.isArray(resp.value) || resp.value.length < 3) && (
                                                                <button
                                                                    onClick={() => fileInputRefs.current[task.id]?.click()}
                                                                    disabled={uploadingTask && uploadingTask.startsWith(task.id)}
                                                                    className="w-full h-36 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                                                                >
                                                                    {uploadingTask && uploadingTask.startsWith(task.id) ? (
                                                                        <div className="flex flex-col items-center gap-2">
                                                                            {uploadingTask.includes('-') ? (
                                                                                <>
                                                                                    <Loader2 className="animate-spin w-6 h-6 text-primary" />
                                                                                    <span className="text-xs font-semibold text-primary">
                                                                                        Processando... {uploadingTask.split('-')[1]}%
                                                                                    </span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Loader2 className="animate-spin w-6 h-6 text-primary" />
                                                                                    <span className="text-xs font-semibold text-primary">Enviando...</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <Camera size={32} />
                                                                            <div className="text-center">
                                                                                <span className="text-xs font-semibold block">Adicionar Mídia</span>
                                                                                <span className="text-xs text-slate-400">
                                                                                    {Array.isArray(resp.value) ? resp.value.length : 0} de 3 • máx 10MB
                                                                                </span>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Notes Field */}
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                                                            <MessageSquare size={14} />
                                                            {resp.isOk === false ? "Justificativa Obrigatória" : "Observações"}
                                                        </label>
                                                        <textarea
                                                            placeholder={resp.isOk === false ? "Por que este item está irregular?" : "Algum detalhe adicional?"}
                                                            className={cn(
                                                                "w-full p-4 rounded-lg border-none outline-none font-medium text-sm h-24 transition-all",
                                                                resp.isOk === false
                                                                    ? "bg-rose-50 text-rose-900 placeholder:text-rose-300"
                                                                    : "bg-white text-slate-700 border border-slate-200"
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

                            {/* Final Notes & Submit */}
                            <div className="pt-8 pb-20 space-y-6">
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">Notas Finais</h4>
                                    <textarea
                                        placeholder="Observações gerais sobre a operação..."
                                        className="w-full h-28 p-0 bg-transparent border-none outline-none font-medium text-sm resize-none"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="w-full h-16 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-3 shadow-lg shadow-primary/30 hover:brightness-110 transition-all active:scale-[0.98]"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} /> Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={20} /> Finalizar Checklist
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default ChecklistFill;
