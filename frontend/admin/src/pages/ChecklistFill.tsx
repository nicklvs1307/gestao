import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
    ClipboardCheck, CheckCircle2, XCircle,
    Loader2, Send, User as UserIcon, Camera, Image as ImageIcon, Type, Hash, UploadCloud
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
            
            // Inicializa respostas com valores padrão dependendo do tipo
            const initialResponses = data.tasks.map((task: any) => ({
                taskId: task.id,
                value: '',
                isOk: true, // Começa como OK por padrão
                type: task.type
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

    const handleSubmit = async () => {
        if (!userName) return toast.error("Por favor, informe seu nome");

        // Validação básica
        const pendingRequired = responses.filter(r => {
            const task = checklist.tasks.find((t: any) => t.id === r.taskId);
            if (!task?.isRequired) return false;
            if (task.type === 'CHECKBOX') return false; // Checkbox sempre tem valor bool implicito
            return !r.value;
        });

        if (pendingRequired.length > 0) {
            return toast.error(`Existem ${pendingRequired.length} tarefas obrigatórias não preenchidas.`);
        }
        
        setSubmitting(true);
        try {
            await axios.post(`${API_URL}/checklists/submit`, {
                checklistId: id,
                userName,
                notes,
                responses: responses.map(r => ({
                    taskId: r.taskId,
                    value: r.type === 'CHECKBOX' ? (r.isOk ? 'true' : 'false') : String(r.value),
                    isOk: r.isOk
                }))
            });
            setStep('success');
        } catch (error) {
            toast.error("Erro ao enviar checklist. Tente novamente.");
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const renderTaskInput = (task: any, response: any) => {
        switch (task.type) {
            case 'CHECKBOX':
                return (
                    <div className="flex gap-2 mt-3">
                        <button 
                            onClick={() => handleUpdateResponse(task.id, 'isOk', true)}
                            className={`flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                response.isOk 
                                ? 'bg-green-500 text-white shadow-lg shadow-green-100' 
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                        >
                            <CheckCircle2 size={18} /> Conforme
                        </button>
                        <button 
                            onClick={() => handleUpdateResponse(task.id, 'isOk', false)}
                            className={`flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                !response.isOk 
                                ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' 
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                        >
                            <XCircle size={18} /> Irregular
                        </button>
                    </div>
                );
            
            case 'TEXT':
                return (
                    <div className="mt-3">
                        <textarea 
                            placeholder="Digite a resposta..."
                            className="w-full p-3 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-orange-500 outline-none font-medium text-slate-700 resize-none h-24"
                            value={response.value}
                            onChange={(e) => handleUpdateResponse(task.id, 'value', e.target.value)}
                        />
                    </div>
                );

            case 'NUMBER':
                return (
                    <div className="mt-3">
                        <input 
                            type="number"
                            placeholder="0.00"
                            className="w-full p-3 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-orange-500 outline-none font-bold text-slate-700"
                            value={response.value}
                            onChange={(e) => handleUpdateResponse(task.id, 'value', e.target.value)}
                        />
                    </div>
                );

            case 'PHOTO':
                return (
                    <div className="mt-3">
                        <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            className="hidden"
                            ref={el => fileInputRefs.current[task.id] = el}
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(task.id, e.target.files[0])}
                        />
                        
                        {response.value ? (
                            <div className="relative rounded-xl overflow-hidden border-2 border-slate-100 bg-slate-50">
                                <img src={`${API_URL.replace('/api', '')}${response.value}`} alt="Preview" className="w-full h-48 object-cover" />
                                <button 
                                    onClick={() => {
                                        if (confirm("Remover foto?")) handleUpdateResponse(task.id, 'value', '');
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-full shadow-lg"
                                >
                                    <XCircle size={16} />
                                </button>
                                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white p-2 text-[10px] uppercase font-bold text-center">
                                    Foto Registrada
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => fileInputRefs.current[task.id]?.click()}
                                disabled={uploadingTask === task.id}
                                className="w-full h-32 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition-all"
                            >
                                {uploadingTask === task.id ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <>
                                        <Camera size={32} />
                                        <span className="text-xs font-black uppercase tracking-widest">Tirar Foto</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    const getIconForType = (type: string) => {
        switch(type) {
            case 'PHOTO': return <ImageIcon size={16} className="text-blue-500" />;
            case 'TEXT': return <Type size={16} className="text-purple-500" />;
            case 'NUMBER': return <Hash size={16} className="text-emerald-500" />;
            default: return <ClipboardCheck size={16} className="text-orange-500" />;
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Carregando Checklist...</p>
        </div>
    );

    if (step === 'success') return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                <CheckCircle2 size={48} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Concluído!</h1>
            <p className="text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">O checklist foi registrado com sucesso. Agradecemos sua colaboração.</p>
            <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm uppercase tracking-wider"
            >
                Novo Preenchimento
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-20 font-sans">
            <header className="bg-white p-6 border-b border-slate-200 sticky top-0 z-20 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-100">
                    <ClipboardCheck size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{checklist?.title}</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{checklist?.sector?.name}</p>
                </div>
            </header>

            <main className="p-4 flex-1 max-w-lg mx-auto w-full">
                {step === 'info' ? (
                    <div className="space-y-6 pt-4 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                            <div className="flex items-center gap-3 text-orange-500 mb-2 font-black uppercase italic tracking-tight">
                                <UserIcon size={20} />
                                <h3>Identificação</h3>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nome do Responsável</label>
                                <input 
                                    placeholder="Digite seu nome..."
                                    className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-orange-500 outline-none font-bold text-lg text-slate-800"
                                    value={userName}
                                    onChange={e => setUserName(e.target.value)}
                                />
                            </div>
                            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-orange-800 text-xs font-medium leading-relaxed">
                                💡 Verifique todos os itens com atenção antes de marcar. Fotos são obrigatórias quando solicitadas.
                            </div>
                        </div>
                        <button 
                            disabled={!userName}
                            onClick={() => setStep('tasks')}
                            className="w-full h-16 bg-orange-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest italic shadow-xl shadow-orange-100 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                        >
                            Iniciar Verificação <Send size={18} />
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6 pt-2 pb-10">
                        {checklist?.tasks.map((task: any, index: number) => {
                            const response = responses.find(r => r.taskId === task.id);
                            if (!response) return null;

                            return (
                                <div 
                                    key={task.id}
                                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-black">
                                                {index + 1}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {getIconForType(task.type)}
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{task.type === 'CHECKBOX' ? 'Verificação' : task.type}</span>
                                            </div>
                                        </div>
                                        {task.isRequired && <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-md uppercase tracking-wide">Obrigatório</span>}
                                    </div>
                                    
                                    <p className="text-lg font-bold text-slate-800 leading-tight mb-2">{task.content}</p>
                                    
                                    {renderTaskInput(task, response)}
                                </div>
                            );
                        })}

                        <div className="px-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Observações Gerais</label>
                            <textarea 
                                className="w-full h-32 p-4 mt-2 rounded-[1.5rem] bg-white border-2 border-slate-100 focus:border-orange-500 outline-none font-medium text-slate-700 resize-none"
                                placeholder="Algo mais a relatar?"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        <button 
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full h-16 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest italic shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all mt-4"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Finalizar e Enviar</>}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ChecklistFill;