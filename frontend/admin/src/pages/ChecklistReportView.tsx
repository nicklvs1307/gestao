import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ClipboardCheck, CheckCircle2, XCircle, Clock, User,
    ArrowLeft, Download, Share2, Camera, Type, Hash,
    CheckSquare, AlertCircle, MessageSquare, Calendar,
    BarChart3, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const ChecklistReportView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [execution, setExecution] = useState<any>(null);

    const API_URL = import.meta.env.VITE_API_URL || '/api';

    useEffect(() => {
        if (id) loadExecution();
    }, [id]);

    const loadExecution = async () => {
        try {
            const response = await axios.get(`${API_URL}/checklists/report/${id}`);
            if (response.data) {
                setExecution(response.data);
            } else {
                toast.error("Execução não encontrada");
            }
        } catch (error: any) {
            console.error('Error loading report:', error);
            toast.error(error.response?.data?.message || "Erro ao carregar relatório");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
                <div className="w-8 h-8 animate-spin border-4 border-primary/30 border-t-primary rounded-full mb-4" />
                <p className="text-muted-foreground text-sm">Carregando relatório...</p>
            </div>
        );
    }

    if (!execution) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                    <AlertCircle size={28} className="text-gray-400" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Relatório não encontrado</h2>
                <p className="text-sm text-muted-foreground mb-6">Esta execução não existe ou foi removida.</p>
                <button onClick={() => navigate(-1)} className="h-10 px-5 bg-primary text-white rounded-lg text-sm font-medium flex items-center gap-2">
                    <ArrowLeft size={16} /> Voltar
                </button>
            </div>
        );
    }

    const total = execution.responses?.length || 0;
    const ok = execution.responses?.filter((r: any) => r.isOk).length || 0;
    const notOk = total - ok;
    const perc = total > 0 ? Math.round((ok / total) * 100) : 0;
    const duration = execution.durationSeconds
        ? `${Math.floor(execution.durationSeconds / 60)}m ${execution.durationSeconds % 60}s`
        : 'N/A';

    const completedDate = new Date(execution.completedAt);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <ClipboardCheck size={20} className="text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-semibold text-foreground">{execution.checklist?.title}</h1>
                                <p className="text-xs text-muted-foreground">{execution.checklist?.sector?.name}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="h-9 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                        >
                            <Download size={16} /> Imprimir
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 size={16} className="text-slate-400" />
                            <span className="text-xs text-muted-foreground font-medium">Conformidade</span>
                        </div>
                        <p className={cn(
                            "text-2xl font-bold",
                            perc >= 80 ? "text-emerald-600" : perc >= 50 ? "text-amber-600" : "text-rose-600"
                        )}>{perc}%</p>
                        <div className="mt-2 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    perc >= 80 ? "bg-emerald-500" : perc >= 50 ? "bg-amber-500" : "bg-rose-500"
                                )}
                                style={{ width: `${perc}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 size={16} className="text-emerald-500" />
                            <span className="text-xs text-muted-foreground font-medium">Conformes</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-600">{ok}</p>
                        <p className="text-xs text-muted-foreground mt-1">de {total} itens</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                            <XCircle size={16} className="text-rose-500" />
                            <span className="text-xs text-muted-foreground font-medium">Irregulares</span>
                        </div>
                        <p className="text-2xl font-bold text-rose-600">{notOk}</p>
                        <p className="text-xs text-muted-foreground mt-1">de {total} itens</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={16} className="text-slate-400" />
                            <span className="text-xs text-muted-foreground font-medium">Duração</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{duration}</p>
                        <p className="text-xs text-muted-foreground mt-1">tempo total</p>
                    </div>
                </div>

                {/* Info Section */}
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <User size={18} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Executor</p>
                                <p className="text-sm font-medium text-foreground">
                                    {execution.user?.name || execution.externalUserName || 'Executor Anônimo'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Calendar size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Data/Hora</p>
                                <p className="text-sm font-medium text-foreground">
                                    {completedDate.toLocaleString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                                <CheckSquare size={18} className="text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Modelo</p>
                                <p className="text-sm font-medium text-foreground">{execution.checklist?.title}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* General Notes */}
                {execution.notes && (
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                        <div className="flex items-start gap-3">
                            <MessageSquare size={18} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-amber-800 mb-1">Observações Gerais</p>
                                <p className="text-sm text-amber-900">{execution.notes}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Items Detail */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-foreground">Detalhamento dos Itens</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{total} itens verificados</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {execution.responses?.map((resp: any, idx: number) => {
                            const task = resp.task;
                            return (
                                <div key={resp.id} className="p-5">
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                            resp.isOk ? "bg-emerald-100" : "bg-rose-100"
                                        )}>
                                            {resp.isOk ? (
                                                <CheckCircle2 size={18} className="text-emerald-600" />
                                            ) : (
                                                <XCircle size={18} className="text-rose-600" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{task?.content || 'Item removido'}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded",
                                                            resp.isOk ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                                        )}>
                                                            {resp.isOk ? 'Conforme' : 'Irregular'}
                                                        </span>
                                                        {task?.type && (
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                {task.type === 'CHECKBOX' && <CheckSquare size={12} />}
                                                                {task.type === 'PHOTO' && <Camera size={12} />}
                                                                {task.type === 'TEXT' && <Type size={12} />}
                                                                {task.type === 'NUMBER' && <Hash size={12} />}
                                                                {task.type}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Value display */}
                                            {task?.type === 'TEXT' && resp.value && (
                                                <div className="bg-slate-50 p-3 rounded-lg">
                                                    <p className="text-sm text-slate-700">{resp.value}</p>
                                                </div>
                                            )}
                                            {task?.type === 'NUMBER' && resp.value && (
                                                <div className="bg-slate-50 p-3 rounded-lg">
                                                    <p className="text-lg font-semibold text-slate-700 tabular-nums">{resp.value}</p>
                                                </div>
                                            )}

                                            {/* Photos */}
                                            {task?.type === 'PHOTO' && resp.value && (
                                                <div className="flex flex-wrap gap-2">
                                                    {(() => {
                                                        try {
                                                            const photos = JSON.parse(resp.value);
                                                            if (Array.isArray(photos)) {
                                                                return photos.map((url: string, pIdx: number) => (
                                                                    <div key={pIdx} className="relative rounded-lg overflow-hidden border border-slate-200 w-28 h-28">
                                                                        <img
                                                                            src={`${import.meta.env.VITE_API_URL || ''}${url}`}
                                                                            className="w-full h-full object-cover cursor-zoom-in"
                                                                            alt={`Foto ${pIdx + 1}`}
                                                                            onClick={() => window.open(`${import.meta.env.VITE_API_URL || ''}${url}`, '_blank')}
                                                                        />
                                                                    </div>
                                                                ));
                                                            }
                                                        } catch (e) {
                                                            return (
                                                                <div className="relative rounded-lg overflow-hidden border border-slate-200 w-28 h-28">
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

                                            {/* Notes */}
                                            {resp.notes && (
                                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
                                                    <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                                    <p className="text-sm text-amber-900">{resp.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center py-6 text-xs text-muted-foreground">
                    <p>Relatório gerado automaticamente pelo sistema KiCardapio</p>
                    <p className="mt-1">{new Date().toLocaleString('pt-BR')}</p>
                </div>
            </main>
        </div>
    );
};

export default ChecklistReportView;
