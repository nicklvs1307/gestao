import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    ClipboardCheck, CheckCircle2, 
    Loader2, Send, User as UserIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
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

    const API_URL = import.meta.env.VITE_API_URL || '/api';

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
                value: 'false',
                isOk: false
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
        
        setSubmitting(true);
        try {
            await axios.post(`${API_URL}/checklists/submit`, {
                checklistId: id,
                userName,
                notes,
                responses: responses.map(r => ({
                    taskId: r.taskId,
                    value: r.value,
                    isOk: r.isOk
                }))
            });
            setStep('success');
        } catch (error) {
            toast.error("Erro ao enviar checklist");
        } finally {
            setSubmitting(false);
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
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={48} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Concluído!</h1>
            <p className="text-slate-500 mb-8">O checklist foi registrado com sucesso.</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-20 font-sans">
            <header className="bg-white p-6 border-b border-slate-200 sticky top-0 z-10 flex items-center gap-4">
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
                    <div className="space-y-6 pt-4">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                            <div className="flex items-center gap-3 text-orange-500 mb-2 font-black uppercase italic tracking-tight">
                                <UserIcon size={20} />
                                <h3>Quem está executando?</h3>
                            </div>
                            <input 
                                placeholder="Seu nome"
                                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-orange-500 outline-none font-bold"
                                value={userName}
                                onChange={e => setUserName(e.target.value)}
                            />
                        </div>
                        <button 
                            disabled={!userName}
                            onClick={() => setStep('tasks')}
                            className="w-full h-16 bg-orange-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest italic shadow-lg shadow-orange-100 disabled:opacity-50"
                        >
                            Iniciar
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 pt-2">
                        {checklist?.tasks.map((task: any) => {
                            const isChecked = responses.find(r => r.taskId === task.id)?.value === 'true';
                            return (
                                <div 
                                    key={task.id}
                                    onClick={() => handleToggleTask(task.id)}
                                    className={`p-5 rounded-[2rem] border-2 transition-all flex items-center gap-4 ${isChecked ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isChecked ? 'bg-orange-500 text-white' : 'bg-slate-100 text-transparent'}`}>
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <p className={`font-bold text-sm ${isChecked ? 'text-orange-900' : 'text-slate-700'}`}>{task.content}</p>
                                </div>
                            );
                        })}
                        <textarea 
                            className="w-full h-32 p-4 mt-6 rounded-[1.5rem] bg-white border-2 border-slate-100 focus:border-orange-500 outline-none font-bold"
                            placeholder="Observações..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                        <button 
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full h-16 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest italic shadow-xl flex items-center justify-center gap-3"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Enviar</>}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ChecklistFill;
