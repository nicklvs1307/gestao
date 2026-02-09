import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ClipboardCheck, CheckCircle2, AlertCircle, 
    ArrowLeft, Loader2, Send, Camera, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getChecklistById, submitChecklistExecution } from '../services/api';

const ChecklistFill: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [checklist, setChecklist] = useState<any>(null);
    const [responses, setResponses] = useState<any[]>([]);
    const [notes, setNotes] = useState('');
    const [userName, setUserName] = useState('');
    const [step, setStep] = useState<'info' | 'tasks' | 'success'>('info');

    useEffect(() => {
        if (id) loadChecklist();
    }, [id]);

    const loadChecklist = async () => {
        try {
            const data = await getChecklistById(id!);
            setChecklist(data);
            // Inicializa respostas
            const initialResponses = data.tasks.map((task: any) => ({
                taskId: task.id,
                value: 'false',
                isOk: false,
                content: task.content // apenas para exibição se necessário
            }));
            setResponses(initialResponses);
        } catch (error) {
            toast.error("Checklist não encontrado");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleTask = (taskId: string) => {
        setResponses(prev => prev.map(r => 
            r.taskId === taskId ? { ...r, value: r.value === 'true' ? 'false' : 'true', isOk: r.value !== 'true' } : r
        ));
    };

    const handleSubmit = async () => {
        if (!userName) return toast.error("Por favor, informe seu nome");
        
        const pendingTasks = responses.filter(r => r.value === 'false');
        if (pendingTasks.length > 0) {
            if (!confirm(`Existem ${pendingTasks.length} itens não marcados. Deseja enviar assim mesmo?`)) return;
        }

        setSubmitting(true);
        try {
            await submitChecklistExecution({
                checklistId: id,
                userName, // Backend vai precisar lidar com isso ou associar a um user default
                notes,
                responses: responses.map(r => ({
                    taskId: r.taskId,
                    value: r.value,
                    isOk: r.isOk
                }))
            });
            setStep('success');
            toast.success("Checklist enviado com sucesso!");
        } catch (error) {
            toast.error("Erro ao enviar checklist");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Carregando Checklist...</p>
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={48} />
                </motion.div>
                <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Concluído com Sucesso!</h1>
                <p className="text-slate-500 mb-8">Obrigado! O checklist foi registrado no sistema e o gerente já pode visualizar.</p>
                <button 
                    onClick={() => window.close()} 
                    className="w-full max-w-xs h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest italic"
                >
                    Fechar Janela
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
            {/* Header */}
            <header className="bg-white p-6 border-b border-slate-200 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-100">
                        <ClipboardCheck size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{checklist?.title}</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{checklist?.sector?.name}</p>
                    </div>
                </div>
            </header>

            <main className="p-4 flex-1 max-w-lg mx-auto w-full">
                {step === 'info' ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-4">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                            <div className="flex items-center gap-3 text-orange-500 mb-2">
                                <User size={20} />
                                <h3 className="font-black uppercase italic tracking-tight">Quem está executando?</h3>
                            </div>
                            <input 
                                type="text"
                                placeholder="Digite seu nome completo"
                                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-orange-500 focus:bg-white outline-none font-bold text-slate-700 transition-all"
                                value={userName}
                                onChange={e => setUserName(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed px-2">
                                Informe seu nome para que possamos registrar quem realizou as verificações deste setor.
                            </p>
                        </div>

                        <button 
                            disabled={!userName}
                            onClick={() => setStep('tasks')}
                            className="w-full h-16 bg-orange-500 disabled:bg-slate-200 text-white rounded-[1.5rem] font-black uppercase tracking-widest italic shadow-lg shadow-orange-100 transition-all flex items-center justify-center gap-2"
                        >
                            Iniciar Checklist <Send size={18} />
                        </button>
                    </motion.div>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-2">
                        <div className="flex items-center justify-between px-2 mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso: {responses.filter(r => r.value === 'true').length}/{responses.length}</span>
                            <button onClick={() => setStep('info')} className="text-[10px] font-black text-orange-600 uppercase italic">Alterar Nome</button>
                        </div>

                        <div className="space-y-3">
                            {checklist?.tasks.map((task: any) => {
                                const isChecked = responses.find(r => r.taskId === task.id)?.value === 'true';
                                return (
                                    <div 
                                        key={task.id}
                                        onClick={() => handleToggleTask(task.id)}
                                        className={`p-5 rounded-[2rem] border-2 transition-all flex items-center gap-4 active:scale-[0.98] ${
                                            isChecked 
                                            ? 'bg-orange-50 border-orange-200 shadow-sm shadow-orange-100' 
                                            : 'bg-white border-slate-100'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                            isChecked ? 'bg-orange-500 text-white' : 'bg-slate-100 text-transparent'
                                        }`}>
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-bold text-sm leading-tight ${isChecked ? 'text-orange-900' : 'text-slate-700'}`}>
                                                {task.content}
                                            </p>
                                            {task.type !== 'CHECKBOX' && (
                                                <span className="text-[9px] font-black text-slate-400 uppercase mt-1 block">Requere: {task.type}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="px-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações (Opcional)</label>
                                <textarea 
                                    className="w-full h-32 p-4 mt-1.5 rounded-[1.5rem] bg-white border-2 border-slate-100 focus:border-orange-500 outline-none font-bold text-slate-700 resize-none transition-all"
                                    placeholder="Alguma anormalidade encontrada?"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>

                            <button 
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full h-16 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest italic shadow-xl flex items-center justify-center gap-3"
                            >
                                {submitting ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Finalizar e Enviar</>}
                            </button>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
};

export default ChecklistFill;
