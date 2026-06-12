import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams } from 'react-router-dom';
import {
    ClipboardCheck, Loader2, Send, Camera,
    Type, Hash, MessageSquare, AlertCircle,
    ChevronDown, ChevronUp, Check, X, HelpCircle,
    AlertTriangle, ListChecks
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1500;
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const mergeDraftWithTasks = (tasks: any[], draftResponses: any[]) => {
    if (!tasks?.length || !draftResponses?.length) return null;
    const draftMap = new Map(draftResponses.map((r: any) => [r.taskId, r]));
    return tasks.map((task: any) => {
        const saved = draftMap.get(task.id);
        if (saved) {
            return {
                taskId: task.id,
                value: task.type === 'PHOTO'
                    ? (Array.isArray(saved.value) ? saved.value : [])
                    : (saved.value ?? ''),
                isOk: saved.isOk ?? null,
                type: task.type,
                itemNotes: saved.itemNotes ?? '',
                isExpanded: false,
                showProcedure: false,
            };
        }
        return {
            taskId: task.id,
            value: task.type === 'PHOTO' ? [] : '',
            isOk: null,
            type: task.type,
            itemNotes: '',
            isExpanded: false,
            showProcedure: false,
        };
    });
};

const TaskCard = memo(({
    task, resp, idx, error, uploadingTask, isOnline,
    onUpdate, onToggleExpand, onToggleProcedure, onFileUpload, onRemovePhoto,
    fileInputRefs,
}: {
    task: any;
    resp: any;
    idx: number;
    error?: string;
    uploadingTask: string | null;
    isOnline: boolean;
    onUpdate: (taskId: string, field: string, value: any) => void;
    onToggleExpand: (taskId: string) => void;
    onToggleProcedure: (taskId: string) => void;
    onFileUpload: (taskId: string, file: File) => void;
    onRemovePhoto: (taskId: string, photoUrl: string) => void;
    fileInputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
}) => {
    if (!resp) return null;

    const hasError = !!error;
    const photos = Array.isArray(resp.value) ? resp.value : [];
    const youtubeId = task.procedureType === 'VIDEO' && task.procedureContent
        ? (() => {
            const m = task.procedureContent.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
            return (m && m[2].length === 11) ? m[2] : null;
        })()
        : null;

    return (
        <div className={cn(
            "bg-white rounded-xl border-2 transition-all duration-300 overflow-hidden shadow-sm",
            hasError ? "border-amber-400 bg-amber-50/30" :
            resp.isOk === true ? "border-emerald-500 bg-emerald-50/20" :
            resp.isOk === false ? "border-rose-500 bg-rose-50/20" : "border-slate-200"
        )}>
            <div className="p-5 space-y-4">
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
                                    onClick={() => onToggleProcedure(task.id)}
                                    className={cn(
                                        "p-2 rounded-lg transition-all",
                                        resp.showProcedure ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
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

                {hasError && (
                    <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 p-2 rounded-lg">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-100">
                    {task.type === 'CHECKBOX' ? (
                        <div className="flex w-full sm:w-auto gap-2">
                            <button
                                onClick={() => onUpdate(task.id, 'isOk', true)}
                                className={cn(
                                    "flex-1 sm:w-28 h-12 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold text-sm",
                                    resp.isOk === true
                                        ? "bg-emerald-500 text-white shadow-md"
                                        : "bg-white text-slate-500 border-2 border-slate-200"
                                )}
                            >
                                <Check size={18} strokeWidth={3} /> Sim
                            </button>
                            <button
                                onClick={() => onUpdate(task.id, 'isOk', false)}
                                className={cn(
                                    "flex-1 sm:w-28 h-12 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold text-sm",
                                    resp.isOk === false
                                        ? "bg-rose-500 text-white shadow-md"
                                        : "bg-white text-slate-500 border-2 border-slate-200"
                                )}
                            >
                                <X size={18} strokeWidth={3} /> Não
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => onToggleExpand(task.id)}
                            className={cn(
                                "w-full sm:w-44 h-12 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold text-sm shadow-sm",
                                resp.value ? "bg-primary text-white" : "bg-white text-slate-500 border-2 border-slate-200"
                            )}
                        >
                            {task.type === 'PHOTO' ? <><Camera size={18} /> Adicionar Foto</> :
                             task.type === 'NUMBER' ? <><Hash size={18} /> Inserir Valor</> :
                             <><Type size={18} /> Escrever</>}
                        </button>
                    )}

                    <div className="flex-1" />

                    <button
                        onClick={() => onToggleExpand(task.id)}
                        className={cn(
                            "h-12 px-4 rounded-lg flex items-center justify-center gap-2 transition-all font-medium text-xs",
                            resp.isExpanded ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                        )}
                    >
                        Detalhes {resp.isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

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
                            {task.procedureType === 'IMAGE' && task.procedureContent && (
                                <img src={task.procedureContent} className="w-full rounded-lg border border-white/10" alt="Procedimento" />
                            )}
                            {task.procedureType === 'VIDEO' && youtubeId && (
                                <div className="aspect-video rounded-lg overflow-hidden border border-white/10">
                                    <iframe
                                        className="w-full h-full"
                                        src={`https://www.youtube.com/embed/${youtubeId}`}
                                        frameBorder="0"
                                        allowFullScreen
                                    />
                                </div>
                            )}
                            <button
                                onClick={() => onToggleProcedure(task.id)}
                                className="w-full py-2.5 bg-white/10 rounded-lg text-xs font-semibold hover:bg-white/20 transition-all"
                            >
                                Fechar Guia
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                onChange={(e) => onUpdate(task.id, 'value', e.target.value)}
                            />
                        )}
                        {task.type === 'NUMBER' && (
                            <input
                                type="number"
                                placeholder="0.00"
                                className="w-full h-14 px-4 rounded-lg bg-white border border-slate-200 outline-none font-semibold text-lg tabular-nums focus:ring-2 ring-primary/20 focus:border-primary transition-all"
                                value={resp.value}
                                onChange={(e) => onUpdate(task.id, 'value', e.target.value)}
                            />
                        )}
                        {task.type === 'PHOTO' && (
                            <div className="space-y-4">
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    capture="environment"
                                    className="hidden"
                                    ref={el => { fileInputRefs.current[task.id] = el; }}
                                    onChange={(e) => e.target.files?.[0] && onFileUpload(task.id, e.target.files[0])}
                                />

                                {photos.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {photos.map((photoUrl: string, pIdx: number) => (
                                            <div key={pIdx} className="relative rounded-lg overflow-hidden shadow-md group aspect-square">
                                                <img
                                                    src={`${import.meta.env.VITE_API_URL || ''}${photoUrl}`}
                                                    className="w-full h-full object-cover"
                                                    alt={`Foto ${pIdx + 1}`}
                                                />
                                                <button
                                                    onClick={() => onRemovePhoto(task.id, photoUrl)}
                                                    className="absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 sm:opacity-0 transition-opacity"
                                                >
                                                    <X size={16} />
                                                </button>
                                                <button
                                                    onClick={() => onRemovePhoto(task.id, photoUrl)}
                                                    className="sm:hidden absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-lg shadow-lg"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {photos.length < 3 && (
                                    <button
                                        onClick={() => fileInputRefs.current[task.id]?.click()}
                                        disabled={uploadingTask && uploadingTask.startsWith(task.id)}
                                        className="w-full h-36 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-500 hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                                    >
                                        {uploadingTask && uploadingTask.startsWith(task.id) ? (
                                            <div className="flex flex-col items-center gap-2">
                                                {uploadingTask.includes(':') ? (
                                                    <>
                                                        <Loader2 className="animate-spin w-6 h-6 text-primary" />
                                                        <span className="text-xs font-semibold text-primary">
                                                            Processando... {uploadingTask.split(':')[1]}%
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
                                                    <span className="text-xs text-slate-500">
                                                        {photos.length} de 3 • máx 20MB
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}

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
                                onChange={(e) => onUpdate(task.id, 'itemNotes', e.target.value)}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

TaskCard.displayName = 'TaskCard';

const ChecklistFill: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [checklist, setChecklist] = useState<any>(null);
    const [responses, setResponses] = useState<any[]>([]);
    const [notes, setNotes] = useState('');
    const [userName, setUserName] = useState('');
    const [step, setStep] = useState<'info' | 'filling' | 'success'>('info');
    const [uploadingTask, setUploadingTask] = useState<string | null>(null);
    const [startedAt] = useState(new Date().toISOString());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const mountedRef = useRef(true);
    const submitControllerRef = useRef<AbortController | null>(null);
    const loadControllerRef = useRef<AbortController | null>(null);
    const draftRef = useRef<any>(null);

    const saveDraft = useCallback(() => {
        if (id && step === 'filling') {
            try {
                const draft = {
                    userName,
                    responses,
                    notes,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem(`checklist-draft-${id}`, JSON.stringify(draft));
            } catch {}
        }
    }, [id, userName, responses, notes, step]);

    useEffect(() => {
        if (!checklist) return;
        const interval = setInterval(saveDraft, 5000);
        return () => clearInterval(interval);
    }, [saveDraft, checklist]);

    useEffect(() => {
        if (id) {
            const saved = localStorage.getItem(`checklist-draft-${id}`);
            if (saved) {
                try {
                    const draft = JSON.parse(saved);
                    const hours = (Date.now() - new Date(draft.timestamp).getTime()) / (1000 * 60 * 60);
                    if (!isNaN(hours) && hours < DRAFT_TTL_MS / (1000 * 60 * 60)) {
                        draftRef.current = draft;
                        setUserName(draft.userName || '');
                        setNotes(draft.notes || '');
                    } else {
                        localStorage.removeItem(`checklist-draft-${id}`);
                    }
                } catch {
                    localStorage.removeItem(`checklist-draft-${id}`);
                }
            }
        }
    }, [id]);

    const loadChecklist = useCallback(async (retryCount = 0) => {
        if (!id) return;

        loadControllerRef.current?.abort();
        const controller = new AbortController();
        loadControllerRef.current = controller;

        try {
            setLoadError(null);
            const response = await axios.get(`${API_URL}/checklists/${id}`, {
                params: { checkDay: 'true' },
                signal: controller.signal,
                timeout: 15000,
            });

            if (!mountedRef.current) return;

            const data = response.data;
            const tasks = data?.tasks;

            if (!Array.isArray(tasks)) {
                setLoadError('Dados do checklist inválidos');
                return;
            }

            setChecklist(data);

            const draftResponses = draftRef.current?.responses;
            const merged = mergeDraftWithTasks(tasks, draftResponses);
            setResponses(merged || tasks.map((task: any) => ({
                taskId: task.id,
                value: task.type === 'PHOTO' ? [] : '',
                isOk: null,
                type: task.type,
                itemNotes: '',
                isExpanded: false,
                showProcedure: false,
            })));

            if (draftRef.current) {
                toast.info("Rascunho restaurado automaticamente");
                draftRef.current = null;
            }
        } catch (error: any) {
            if (axios.isCancel(error) || !mountedRef.current) return;

            if (retryCount < MAX_RETRIES - 1) {
                const delay = RETRY_BASE_DELAY * Math.pow(2, retryCount);
                await new Promise(r => setTimeout(r, delay));
                if (mountedRef.current) {
                    return loadChecklist(retryCount + 1);
                }
                return;
            }

            if (!mountedRef.current) return;

            const status = error.response?.status;
            if (status === 403) {
                setLoadError(error.response?.data?.message || "Checklist não disponível hoje");
            } else if (status === 404) {
                setLoadError("Checklist não encontrado. Verifique o link.");
            } else if (!error.response) {
                setLoadError("Falha de conexão. Verifique sua internet e tente novamente.");
            } else {
                setLoadError("Erro ao carregar checklist. Tente novamente.");
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [id, API_URL]);

    useEffect(() => {
        if (id) loadChecklist();
        return () => { loadControllerRef.current?.abort(); };
    }, [id, loadChecklist]);

    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            submitControllerRef.current?.abort();
            loadControllerRef.current?.abort();
        };
    }, []);

    const handleUpdateResponse = useCallback((taskId: string, field: string, value: any) => {
        setResponses(prev => prev.map(r => {
            if (r.taskId !== taskId) return r;
            const updates: any = { [field]: value };
            if (field === 'value' && value && r.type !== 'CHECKBOX' && r.type !== 'PHOTO') {
                updates.isOk = true;
            }
            return { ...r, ...updates };
        }));
        setErrors(prev => {
            if (prev[taskId]) {
                const next = { ...prev };
                delete next[taskId];
                return next;
            }
            return prev;
        });
    }, []);

    const handleFileUpload = useCallback(async (taskId: string, file: File) => {
        if (!file || !mountedRef.current) return;

        const currentResponse = responses.find(r => r.taskId === taskId);
        const currentPhotos = Array.isArray(currentResponse?.value) ? currentResponse.value : [];

        if (currentPhotos.length >= 3) {
            toast.error("Limite de 3 fotos atingido");
            return;
        }

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const MAX_SIZE_MB = 20;
        const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

        if (file.size > MAX_SIZE_BYTES) {
            toast.error(`Tamanho máx: ${MAX_SIZE_MB}MB`);
            return;
        }

        if (file.size < 1024) {
            toast.error("Arquivo muito pequeno");
            return;
        }

        if (!isOnline) {
            toast.error("Sem conexão. Conecte-se para enviar mídia.");
            return;
        }

        setUploadingTask(taskId);

        const formData = new FormData();
        formData.append('file', file);
        const typeLabel = isImage ? 'imagem' : 'vídeo';

        try {
            const response = await axios.post(`${API_URL}/checklists/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 90000,
                onUploadProgress: (progressEvent) => {
                    if (mountedRef.current && progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadingTask(`${taskId}:${percent}`);
                    }
                }
            });

            if (!mountedRef.current) return;

            const newPhotos = [...currentPhotos, response.data.url];
            handleUpdateResponse(taskId, 'value', newPhotos);
            handleUpdateResponse(taskId, 'isOk', true);
            toast.success(isVideo ? "Vídeo anexado" : "Foto anexada");
        } catch (error: any) {
            if (!mountedRef.current) return;
            const message = error.response?.data?.message || error.message;
            if (error.code === 'ECONNABORTED' || error.code === 'ERR_CANCELED') {
                toast.error("Upload cancelado. Tente novamente.");
            } else if (message?.includes('máximo') || message?.includes('inválido')) {
                toast.error(message);
            } else if (!error.response) {
                toast.error(`Falha de conexão ao enviar ${typeLabel}.`);
            } else {
                toast.error(`Erro ao enviar ${typeLabel}. Tente novamente.`);
            }
        } finally {
            if (mountedRef.current) {
                setUploadingTask(null);
                if (fileInputRefs.current[taskId]) {
                    fileInputRefs.current[taskId]!.value = '';
                }
            }
        }
    }, [responses, isOnline, API_URL, handleUpdateResponse]);

    const removePhoto = useCallback((taskId: string, photoUrl: string) => {
        const currentResponse = responses.find(r => r.taskId === taskId);
        const currentPhotos = Array.isArray(currentResponse?.value) ? currentResponse.value : [];
        const newPhotos = currentPhotos.filter((url: string) => url !== photoUrl);
        handleUpdateResponse(taskId, 'value', newPhotos);
        if (newPhotos.length === 0) {
            handleUpdateResponse(taskId, 'isOk', null);
        }
    }, [responses, handleUpdateResponse]);

    const toggleExpand = useCallback((taskId: string) => {
        setResponses(prev => prev.map(r =>
            r.taskId === taskId ? { ...r, isExpanded: !r.isExpanded } : r
        ));
    }, []);

    const toggleProcedure = useCallback((taskId: string) => {
        setResponses(prev => prev.map(r =>
            r.taskId === taskId ? { ...r, showProcedure: !r.showProcedure } : r
        ));
    }, []);

    const validateResponses = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};
        let hasError = false;
        const tasks = checklist?.tasks;

        if (!Array.isArray(tasks)) return false;

        responses.forEach((r, idx) => {
            const task = tasks[idx];
            if (!task || !r) return;

            if (task.type === 'CHECKBOX' && r.isOk === null) {
                newErrors[r.taskId] = 'Selecione Sim ou Não';
                hasError = true;
            }
            if (task.isRequired && task.type !== 'CHECKBOX') {
                if (task.type === 'PHOTO' && (!r.value || (Array.isArray(r.value) && r.value.length === 0))) {
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
    }, [checklist, responses]);

    const handleSubmit = useCallback(async () => {
        if (!userName.trim()) return toast.error("Identifique-se");
        if (!validateResponses()) return toast.error("Existem itens pendentes ou irregulares sem justificativa");
        if (uploadingTask) return toast.error("Aguarde o upload de mídia concluir antes de enviar");
        if (!isOnline) return toast.error("Você está offline. Verifique sua conexão.");

        setSubmitting(true);
        const controller = new AbortController();
        submitControllerRef.current = controller;

        const buildPayload = () => ({
            checklistId: id,
            userName: userName.trim(),
            notes,
            startedAt,
            responses: responses.map(r => ({
                taskId: r.taskId,
                value: r.type === 'CHECKBOX'
                    ? (r.isOk ? 'true' : 'false')
                    : r.type === 'PHOTO'
                        ? (typeof r.value === 'string' ? r.value : JSON.stringify(r.value || []))
                        : String(r.value ?? ''),
                isOk: r.isOk ?? (r.value ? true : false),
                notes: r.itemNotes || undefined,
            }))
        });

        const attemptSubmit = async (): Promise<void> => {
            await axios.post(`${API_URL}/checklists/submit`, buildPayload(), {
                signal: controller.signal,
                timeout: 30000,
            });
        };

        let lastError: any;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                await attemptSubmit();
                if (!mountedRef.current) return;
                try { localStorage.removeItem(`checklist-draft-${id}`); } catch {}
                setStep('success');
                return;
            } catch (error: any) {
                if (axios.isCancel(error) || !mountedRef.current) return;
                lastError = error;
                if (error.response) break;
                if (attempt === 0) {
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        }

        if (!mountedRef.current) return;

        if (lastError && !lastError.response) {
            toast.error("Falha de conexão. Seu rascunho foi salvo. Tente novamente.", { duration: 6000 });
        } else {
            const msg = lastError?.response?.data?.message || "Erro ao enviar checklist";
            toast.error(msg);
        }
    }, [userName, validateResponses, uploadingTask, isOnline, id, responses, notes, startedAt, API_URL]);

    if (loading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground font-medium text-sm">Carregando checklist...</p>
        </div>
    );

    if (loadError) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 text-2xl font-black mb-4">
                <span>!</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 uppercase italic mb-2">Algo deu errado</h2>
            <p className="text-xs text-slate-500 font-bold uppercase max-w-md text-center mb-6">{loadError}</p>
            <button
                onClick={() => { setLoading(true); setLoadError(null); loadChecklist(); }}
                className="h-10 px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
            >
                Tentar novamente
            </button>
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

    const tasks = checklist?.tasks ?? [];
    const taskCount = tasks.length || 1;
    const answeredCount = responses.filter(r => r && (r.isOk !== null || (r.value && r.type !== 'CHECKBOX'))).length;
    const progress = Math.min((answeredCount / taskCount) * 100, 100);
    const pendingTasks = tasks.length - answeredCount;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-24">
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

            {!isOnline && (
                <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    <span className="text-xs font-medium text-rose-800">
                        Sem conexão com a internet. Seus dados serão salvos localmente até a conexão voltar.
                    </span>
                </div>
            )}

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
                                    onKeyDown={e => e.key === 'Enter' && userName.trim() && setStep('filling')}
                                />
                            </div>
                            <button
                                disabled={!userName.trim()}
                                onClick={() => setStep('filling')}
                                className="w-full h-14 bg-primary text-white rounded-xl font-semibold disabled:opacity-30 shadow-lg shadow-primary/30 flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                            >
                                Iniciar Auditoria <Check size={20} />
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div key="filling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-4">
                            {tasks.map((task: any, idx: number) => {
                                const resp = responses[idx];
                                return (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        resp={resp}
                                        idx={idx}
                                        error={resp ? errors[resp.taskId] : undefined}
                                        uploadingTask={uploadingTask}
                                        isOnline={isOnline}
                                        onUpdate={handleUpdateResponse}
                                        onToggleExpand={toggleExpand}
                                        onToggleProcedure={toggleProcedure}
                                        onFileUpload={handleFileUpload}
                                        onRemovePhoto={removePhoto}
                                        fileInputRefs={fileInputRefs}
                                    />
                                );
                            })}

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
