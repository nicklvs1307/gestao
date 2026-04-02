import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { 
    Upload, FileCheck, ShieldCheck, AlertCircle, CheckCircle, 
    RefreshCw, History, Settings, FileText, Download, Lock, Loader2, Building2,
    Calendar, FileArchive, Search, Filter, X, TrendingUp, TrendingDown,
    DollarSign, FileDigit, Clock, Wifi, WifiOff, AlertTriangle, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useScrollLock } from '../hooks/useScrollLock';
import { ptBR } from 'date-fns/locale';

const FiscalManagement: React.FC = () => {
    const [config, setConfig] = useState<any>({ emissionMode: 'MANUAL', environment: 'homologation' });
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'config' | 'invoices'>('config');
    const [certFile, setCertFile] = useState<File | null>(null);
    const [certPassword, setCertPassword] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'AUTHORIZED' | 'REJECTED' | 'PENDING' | 'CANCELED'>('ALL');
    const [certStatus, setCertStatus] = useState<any>(null);
    const [cnpjValidating, setCnpjValidating] = useState(false);
    const [cnpjValid, setCnpjValid] = useState<any>(null);
    const [monthlyReport, setMonthlyReport] = useState<any>(null);
    const [showReport, setShowReport] = useState(false);
    const [cancelData, setCancelData] = useState<{open: boolean, invoice: any, reason: string, loading: boolean}>({open: false, invoice: null, reason: '', loading: false});
    const [confirmData, setConfirmData] = useState<{open: boolean, title: string, message: string, onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});
    
    const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
    const [exportYear, setExportYear] = useState(new Date().getFullYear());
    const [exporting, setExporting] = useState(false);

    useScrollLock(cancelData.open || showReport);

    const filteredInvoices = useMemo(() => {
        let filtered = invoices;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(inv => 
                inv.number?.toString().includes(query) ||
                inv.accessKey?.toLowerCase().includes(query) ||
                inv.orderId?.toLowerCase().includes(query)
            );
        }
        if (filterStatus !== 'ALL') {
            filtered = filtered.filter(inv => inv.status === filterStatus);
        }
        return filtered;
    }, [invoices, searchQuery, filterStatus]);

    const totals = useMemo(() => {
        const authorized = invoices.filter(inv => inv.status === 'AUTHORIZED');
        const rejected = invoices.filter(inv => inv.status === 'REJECTED');
        const pending = invoices.filter(inv => inv.status === 'PENDING');
        const canceled = invoices.filter(inv => inv.status === 'CANCELED');
        return {
            total: invoices.length,
            authorized: authorized.length,
            rejected: rejected.length,
            pending: pending.length,
            canceled: canceled.length,
            authorizedAmount: authorized.length
        };
    }, [invoices]);

    useEffect(() => { loadData(); }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'config') {
                const [configRes, certStatusRes] = await Promise.all([
                    api.get('/fiscal/config'),
                    api.get('/fiscal/config/status')
                ]);
                if (configRes.data) setConfig(configRes.data);
                setCertStatus(certStatusRes.data);
            } else {
                const res = await api.get('/fiscal/invoices');
                setInvoices(res.data);
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const validateCnpj = async (cnpj: string) => {
        const cleanCnpj = cnpj.replace(/\D/g, '');
        if (cleanCnpj.length !== 14) return;
        
        setCnpjValidating(true);
        try {
            const res = await api.get(`/fiscal/validate-cnpj/${cleanCnpj}`);
            setCnpjValid(res.data);
            if (res.data.valid && res.data.checked) {
                toast.success('CNPJ válido na Receita Federal!');
            }
        } catch (error) {
            setCnpjValid({ valid: false, error: 'Erro ao validar' });
        } finally {
            setCnpjValidating(false);
        }
    };

    const searchCep = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;
        
        try {
            const res = await api.get(`/fiscal/search-cep/${cleanCep}`);
            if (res.data) {
                setConfig({
                    ...config,
                    street: res.data.logradouro || config.street,
                    neighborhood: res.data.bairro || config.neighborhood,
                    city: res.data.cidade || config.city,
                    state: res.data.estado || config.state,
                    zipCode: res.data.cep || config.zipCode,
                    ibgeCode: res.data.ibgeCode || config.ibgeCode
                });
                toast.success('Endereço preenchido automaticamente!');
            }
        } catch (error) {
            toast.error('CEP não encontrado.');
        }
    };

    const handleCancelInvoice = async () => {
        if (!cancelData.invoice || !cancelData.reason.trim()) {
            return toast.error('Motivo do cancelamento é obrigatório.');
        }
        
        setCancelData(prev => ({ ...prev, loading: true }));
        try {
            await api.post('/fiscal/cancel', {
                invoiceId: cancelData.invoice.id,
                reason: cancelData.reason
            });
            toast.success('NFC-e cancelada com sucesso!');
            setCancelData({ open: false, invoice: null, reason: '', loading: false });
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao cancelar nota.');
            setCancelData(prev => ({ ...prev, loading: false }));
        }
    };

    const loadMonthlyReport = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/fiscal/report-monthly?month=${exportMonth}&year=${exportYear}`);
            setMonthlyReport(res.data);
            setShowReport(true);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao gerar relatório.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/fiscal/config', config);
            toast.success('Configurações fiscais salvas!');
        } catch (error) { toast.error('Erro ao salvar dados.'); }
    };

    const handleUploadCert = async () => {
        if (!certFile || !certPassword) return toast.error('Arquivo e senha são obrigatórios.');
        const formData = new FormData();
        formData.append('certificate', certFile);
        formData.append('password', certPassword);
        try {
            setLoading(true);
            await api.post('/fiscal/config/certificate', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Certificado A1 instalado!');
            setCertFile(null); setCertPassword('');
            loadData();
        } catch (error: any) { toast.error(error.response?.data?.error || 'Erro no envio.'); }
        finally { setLoading(false); }
    };

    const handleExportXmls = async () => {
        setExporting(true);
        try {
            const response = await api.get(`/fiscal/export-monthly?month=${exportMonth}&year=${exportYear}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `XMLs_${exportMonth}_${exportYear}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Exportação concluída!');
        } catch (error) {
            toast.error('Erro ao exportar XMLs. Verifique se existem notas no período.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header Premium */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-2">
                            Módulo <span className="text-primary">Fiscal</span>
                        </h1>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                            Gestão de NFC-e e SEFAZ
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                        {[
                            { id: 'config', label: 'Configuração', icon: Settings },
                            { id: 'invoices', label: 'Notas Fiscais', icon: History }
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2", activeTab === tab.id ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700")}>
                                <tab.icon size={12} /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPIs - apenas na aba histórico */}
            {activeTab === 'invoices' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none">
                        <div className="flex items-center justify-between mb-2">
                            <FileCheck size={14} className="text-emerald-200" />
                            <span className="text-[7px] font-black text-emerald-200 uppercase tracking-widest">Autorizadas</span>
                        </div>
                        <p className="text-2xl font-black italic tracking-tighter">{totals.authorized}</p>
                        <p className="text-[7px] font-bold text-emerald-200 mt-1">Notas aprovadas pela SEFAZ</p>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-rose-500 to-rose-600 text-white border-none">
                        <div className="flex items-center justify-between mb-2">
                            <AlertCircle size={14} className="text-rose-200" />
                            <span className="text-[7px] font-black text-rose-200 uppercase tracking-widest">Rejeitadas</span>
                        </div>
                        <p className="text-2xl font-black italic tracking-tighter">{totals.rejected}</p>
                        <p className="text-[7px] font-bold text-rose-200 mt-1">Notas rejeitadas</p>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none">
                        <div className="flex items-center justify-between mb-2">
                            <Clock size={14} className="text-amber-200" />
                            <span className="text-[7px] font-black text-amber-200 uppercase tracking-widest">Processando</span>
                        </div>
                        <p className="text-2xl font-black italic tracking-tighter">{totals.pending}</p>
                        <p className="text-[7px] font-bold text-amber-200 mt-1">Aguardando resposta</p>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
                        <div className="flex items-center justify-between mb-2">
                            {config.environment === 'production' ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-amber-400" />}
                            <span className="text-[7px] font-black text-white/60 uppercase tracking-widest">Ambiente</span>
                        </div>
                        <p className="text-lg font-black italic tracking-tighter">{config.environment === 'production' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}</p>
                        <p className="text-[7px] font-bold text-white/60 mt-1">{config.environment === 'production' ? 'NFC-e oficial' : 'Ambiente de testes'}</p>
                    </Card>
                </div>
            )}

            {activeTab === 'config' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Coluna Dados Emitente */}
                    <div className="lg:col-span-8 space-y-8">
                        <Card className="p-8 space-y-8 border-slate-200 shadow-xl bg-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 blur-3xl -mr-16 -mt-16 rounded-full" />
                            <h3 className="text-sm font-black uppercase text-slate-900 italic flex items-center gap-3 border-b border-slate-50 pb-4">
                                <div className="p-2 bg-slate-900 text-white rounded-lg"><ShieldCheck size={18} /></div>
                                Dados do Emitente (Empresa)
                            </h3>
                            <form onSubmit={handleSaveConfig} className="space-y-6 relative z-10">
                                <Input label="Razão Social" value={config.companyName || ''} onChange={e => setConfig({...config, companyName: e.target.value})} placeholder="Nome Completo da Empresa" required />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="relative">
                                        <Input 
                                            label="CNPJ" 
                                            value={config.cnpj || ''} 
                                            onChange={e => {
                                                setConfig({...config, cnpj: e.target.value});
                                                setCnpjValid(null);
                                            }} 
                                            onBlur={(e) => validateCnpj(e.target.value)}
                                            placeholder="00.000.000/0000-00" 
                                            required 
                                        />
                                        {cnpjValidating && <Loader2 className="absolute right-3 top-9 animate-spin text-primary" size={16} />}
                                        {cnpjValid?.valid && (
                                            <CheckCircle className="absolute right-3 top-9 text-emerald-500" size={16} />
                                        )}
                                        {cnpjValid?.valid === false && (
                                            <AlertCircle className="absolute right-3 top-9 text-rose-500" size={16} />
                                        )}
                                    </div>
                                    <Input label="Inscrição Estadual" value={config.ie || ''} onChange={e => setConfig({...config, ie: e.target.value})} placeholder="Inscrição Estadual" required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Modo de Emissão</label><select className="ui-input w-full h-12" value={config.emissionMode || 'MANUAL'} onChange={e => setConfig({...config, emissionMode: e.target.value})}><option value="MANUAL">Manual (Botão no Pedido)</option><option value="AUTOMATIC">Automática (Ao Finalizar)</option></select></div>
                                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Provedor API</label><select className="ui-input w-full h-12" value={config.provider || 'focus'} onChange={e => setConfig({...config, provider: e.target.value})}><option value="focus">Focus NFe</option><option value="webmania">Webmania</option></select></div>
                                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Ambiente SEFAZ</label><select className="ui-input w-full h-12" value={config.environment || 'homologation'} onChange={e => setConfig({...config, environment: e.target.value})}><option value="homologation">Homologação (Testes)</option><option value="production">Produção (Real)</option></select></div>
                                </div>

                                <div className="space-y-6 pt-6 border-t border-slate-50">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Configurações NFC-e (QR-Code)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input label="ID do Token (CSC)" value={config.cscId || ''} onChange={e => setConfig({...config, cscId: e.target.value})} placeholder="Ex: 000001" />
                                        <Input label="Código do Token (CSC)" value={config.cscToken || ''} onChange={e => setConfig({...config, cscToken: e.target.value})} placeholder="Ex: AAAA-BBBB-CCCC-DDDD" />
                                    </div>
                                </div>

                                <div className="space-y-6 pt-6 border-t border-slate-50">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Endereço Fiscal</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div className="md:col-span-2"><Input label="Logradouro" value={config.street || ''} onChange={e => setConfig({...config, street: e.target.value})} /></div>
                                        <Input label="Nº" value={config.number || ''} onChange={e => setConfig({...config, number: e.target.value})} />
                                        <Input label="Bairro" value={config.neighborhood || ''} onChange={e => setConfig({...config, neighborhood: e.target.value})} />
                                        <div className="md:col-span-2"><Input label="Cidade" value={config.city || ''} onChange={e => setConfig({...config, city: e.target.value})} /></div>
                                        <Input label="Cód. IBGE" value={config.ibgeCode || ''} onChange={e => setConfig({...config, ibgeCode: e.target.value})} />
                                        <div className="relative">
                                            <Input 
                                                label="CEP" 
                                                value={config.zipCode || ''} 
                                                onChange={e => setConfig({...config, zipCode: e.target.value})}
                                                onBlur={(e) => searchCep(e.target.value)}
                                                placeholder="00000-000" 
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => searchCep(config.zipCode)}
                                                className="absolute right-3 top-9 text-primary hover:text-primary/80"
                                                title="Buscar CEP"
                                            >
                                                <Search size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button type="submit" className="px-10 h-14 rounded-2xl shadow-xl shadow-slate-200 italic font-black uppercase tracking-widest">SALVAR DADOS FISCAIS</Button>
                                </div>
                            </form>
                        </Card>
                    </div>

                    {/* Coluna Certificado e Fluxo */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Box Certificado Premium */}
                        <Card className="p-8 border-slate-200 shadow-xl bg-white space-y-6">
                            <h3 className="text-sm font-black uppercase text-slate-900 italic flex items-center gap-3 border-b border-slate-50 pb-4">
                                <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-100"><FileCheck size={18} /></div>
                                Certificado Digital A1
                            </h3>
                            
                            {config.certificate ? (
                                <div className="bg-emerald-50 border-2 border-emerald-100 p-5 rounded-[1.5rem] flex items-start gap-4">
                                    <CheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={20} />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest leading-none mb-1">INSTALADO</p>
                                        <p className="text-[9px] text-emerald-600 font-bold uppercase italic leading-tight">O sistema está apto a assinar documentos fiscais.</p>
                                        {certStatus?.daysUntilExpiry !== undefined && (
                                            <div className={cn("mt-2 px-2 py-1 rounded text-[8px] font-black uppercase", 
                                                certStatus.daysUntilExpiry < 0 ? "bg-rose-500 text-white" :
                                                certStatus.daysUntilExpiry <= 30 ? "bg-amber-500 text-white" : 
                                                "bg-emerald-100 text-emerald-700")}>
                                                {certStatus.daysUntilExpiry < 0 
                                                    ? `EXPIRADO há ${Math.abs(certStatus.daysUntilExpiry)} dias` 
                                                    : certStatus.daysUntilExpiry <= 30 
                                                        ? `Expira em ${certStatus.daysUntilExpiry} dias - RENOVE!` 
                                                        : `Válido até ${format(new Date(certStatus.validNotAfter), 'dd/MM/yyyy')}`}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-rose-50 border-2 border-rose-100 p-5 rounded-[1.5rem] flex items-start gap-4">
                                    <AlertCircle className="text-rose-500 mt-0.5 shrink-0" size={20} />
                                    <div><p className="text-[10px] font-black text-rose-800 uppercase tracking-widest leading-none mb-1">PENDENTE</p><p className="text-[9px] text-rose-600 font-bold uppercase italic leading-tight">Envie o arquivo .pfx para ativar a emissão.</p></div>
                                </div>
                            )}

                            <div className="space-y-6 pt-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Arquivo (.pfx / .p12)</label>
                                    <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-orange-500 transition-all group cursor-pointer bg-slate-50/50">
                                        <input type="file" accept=".pfx,.p12" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setCertFile(e.target.files?.[0] || null)} />
                                        <Upload className="mx-auto text-slate-300 mb-3 group-hover:text-orange-500 group-hover:scale-110 transition-all" size={32} />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{certFile ? certFile.name : 'SELECIONAR ARQUIVO'}</p>
                                    </div>
                                </div>
                                <Input label="Senha do Certificado" type="password" value={certPassword} onChange={e => setCertPassword(e.target.value)} icon={Lock} placeholder="••••••••" />
                                <Button fullWidth onClick={handleUploadCert} disabled={loading} isLoading={loading} className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] italic bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-900/10">ATUALIZAR CERTIFICADO</Button>
                            </div>
                        </Card>

                        {/* Box Fechamento Mensal */}
                        <Card className="p-8 border-slate-200 shadow-xl bg-white space-y-6">
                            <h3 className="text-sm font-black uppercase text-slate-900 italic flex items-center gap-3 border-b border-slate-50 pb-4">
                                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-100"><FileArchive size={18} /></div>
                                Fechamento Mensal
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <Button fullWidth onClick={handleExportXmls} isLoading={exporting} variant="secondary" className="h-12 rounded-xl font-black uppercase text-[9px] tracking-widest italic">
                                    <Download size={14} className="mr-2" /> Exportar XMLs
                                </Button>
                                <Button fullWidth onClick={loadMonthlyReport} isLoading={loading} variant="outline" className="h-12 rounded-xl font-black uppercase text-[9px] tracking-widest italic">
                                    <FileText size={14} className="mr-2" /> Ver Relatório
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Mês</label>
                                    <select className="ui-input w-full" value={exportMonth} onChange={e => setExportMonth(parseInt(e.target.value))}>
                                        {Array.from({length: 12}).map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', {month: 'long'})}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Ano</label>
                                    <select className="ui-input w-full" value={exportYear} onChange={e => setExportYear(parseInt(e.target.value))}>
                                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                            <Button fullWidth onClick={handleExportXmls} isLoading={exporting} className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] italic bg-slate-900 hover:bg-slate-800 shadow-xl">EXPORTAR XMLS (ZIP)</Button>
                        </Card>
                    </div>
                </div>
            )}

            {activeTab === 'invoices' && (
                <Card className="overflow-hidden border-slate-200 shadow-xl bg-white" noPadding>
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 bg-primary rounded-full" />
                            <div>
                                <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-sm">Livro de Notas Fiscais</h3>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{filteredInvoices.length} nota(s) encontrada(s)</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
                                {(['ALL', 'AUTHORIZED', 'REJECTED', 'PENDING', 'CANCELED'] as const).map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
                                            filterStatus === status 
                                                ? status === 'AUTHORIZED' ? "bg-emerald-100 text-emerald-700" 
                                                : status === 'REJECTED' ? "bg-rose-100 text-rose-700"
                                                : status === 'PENDING' ? "bg-amber-100 text-amber-700"
                                                : status === 'CANCELED' ? "bg-slate-400 text-white"
                                                : "bg-slate-800 text-white"
                                                : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        {status === 'ALL' ? 'Todos' : status === 'AUTHORIZED' ? 'Ok' : status === 'REJECTED' ? 'Erro' : status === 'CANCELED' ? 'Cancel' : 'Pendente'}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="relative w-48">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar nota..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-4 py-3">Data / Hora</th>
                                    <th className="px-4 py-3">Número NFC-e</th>
                                    <th className="px-4 py-3">Status SEFAZ</th>
                                    <th className="px-4 py-3">Chave de Acesso</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3 text-slate-400">
                                                <Loader2 className="animate-spin text-primary" size={32} />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando notas...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center text-slate-400">
                                                <FileText size={40} className="mb-3 opacity-20" />
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Nenhuma nota fiscal encontrada</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInvoices.map((inv: any) => (
                                        <tr key={inv.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black",
                                                        inv.status === 'AUTHORIZED' ? "bg-emerald-500" : 
                                                        inv.status === 'REJECTED' ? "bg-rose-500" : "bg-amber-500"
                                                    )}>
                                                        {inv.status === 'AUTHORIZED' ? <CheckCircle size={14} /> : 
                                                         inv.status === 'REJECTED' ? <AlertCircle size={14} /> : 
                                                         <Clock size={14} />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-600 uppercase italic">
                                                            {inv.issuedAt ? format(new Date(inv.issuedAt), 'dd/MM/yyyy') : '-'}
                                                        </span>
                                                        <span className="text-[7px] font-bold text-slate-400 uppercase">
                                                            {inv.issuedAt ? format(new Date(inv.issuedAt), 'HH:mm:ss') : '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-black text-sm text-slate-900 italic tracking-tighter">
                                                NFC-e {inv.number?.toString().padStart(6, '0')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "px-3 py-1 text-[9px] font-black uppercase rounded-lg border shadow-sm",
                                                    inv.status === 'AUTHORIZED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                    inv.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                                    inv.status === 'CANCELED' ? 'bg-slate-200 text-slate-500 border-slate-300' : 'bg-amber-50 text-amber-600 border-amber-100'
                                                )}>
                                                    {inv.status === 'AUTHORIZED' ? 'Autorizada' : inv.status === 'REJECTED' ? 'Rejeitada' : inv.status === 'CANCELED' ? 'Cancelada' : 'Processando'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-[8px] text-slate-400 group-hover:text-slate-600 transition-colors max-w-[200px] truncate">
                                                {inv.accessKey || '---'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    {inv.pdfUrl && (
                                                        <button 
                                                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center"
                                                            onClick={() => window.open(inv.pdfUrl, '_blank')}
                                                            title="Baixar PDF"
                                                        >
                                                            <Download size={12} />
                                                        </button>
                                                    )}
                                                    {inv.xmlUrl && (
                                                        <button 
                                                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all flex items-center justify-center"
                                                            onClick={() => window.open(inv.xmlUrl, '_blank')}
                                                            title="Baixar XML"
                                                        >
                                                            <FileText size={12} />
                                                        </button>
                                                    )}
                                                    {inv.status === 'AUTHORIZED' && (
                                                        <button 
                                                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center"
                                                            onClick={() => setCancelData({ open: true, invoice: inv, reason: '', loading: false })}
                                                            title="Cancelar NFC-e"
                                                        >
                                                            <Ban size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Modal Cancelamento */}
            <AnimatePresence>
                {cancelData.open && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setCancelData({ open: false, invoice: null, reason: '', loading: false })} />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200"
                        >
                            <header className="px-6 py-5 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter leading-none">Cancelar NFC-e</h3>
                                        <p className="text-[8px] font-bold text-rose-500 uppercase tracking-widest mt-1">Nota #{cancelData.invoice?.number}</p>
                                    </div>
                                </div>
                                <button onClick={() => setCancelData({ open: false, invoice: null, reason: '', loading: false })} className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm border border-slate-200">
                                    <X size={20} />
                                </button>
                            </header>

                            <div className="p-6 space-y-4">
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                                    <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest">
                                        ⚠️ Esta ação é IRREVERSÍVEL. A nota será inutilizada junto à SEFAZ.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Motivo do Cancelamento</label>
                                    <textarea 
                                        className="ui-input w-full h-24 text-sm font-bold resize-none"
                                        placeholder="Ex: Erro na digitação dos dados do cliente..."
                                        value={cancelData.reason}
                                        onChange={(e) => setCancelData({ ...cancelData, reason: e.target.value })}
                                        maxLength={255}
                                    />
                                    <p className="text-[7px] text-slate-400 text-right">{cancelData.reason.length}/255</p>
                                </div>

                                <Button 
                                    fullWidth 
                                    onClick={handleCancelInvoice} 
                                    disabled={cancelData.loading || !cancelData.reason.trim()}
                                    isLoading={cancelData.loading}
                                    className="h-12 rounded-xl font-black uppercase text-[10px] tracking-widest bg-rose-500 hover:bg-rose-600"
                                >
                                    <Ban size={14} className="mr-2" /> Confirmar Cancelamento
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Relatório Mensal */}
            <AnimatePresence>
                {showReport && monthlyReport && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowReport(false)} />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 max-h-[80vh] flex flex-col"
                        >
                            <header className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                                        <FileArchive size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter leading-none">Relatório Mensal</h3>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            {new Date(monthlyReport.period.year, monthlyReport.period.month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setShowReport(false)} className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm border border-slate-200">
                                    <X size={20} />
                                </button>
                            </header>

                            <div className="p-6 overflow-y-auto">
                                <div className="grid grid-cols-4 gap-3 mb-6">
                                    <Card className="p-4 bg-emerald-50 border-emerald-200">
                                        <p className="text-[8px] font-black text-emerald-600 uppercase">Autorizadas</p>
                                        <p className="text-2xl font-black text-emerald-700">{monthlyReport.summary.authorized}</p>
                                    </Card>
                                    <Card className="p-4 bg-rose-50 border-rose-200">
                                        <p className="text-[8px] font-black text-rose-600 uppercase">Rejeitadas</p>
                                        <p className="text-2xl font-black text-rose-700">{monthlyReport.summary.rejected}</p>
                                    </Card>
                                    <Card className="p-4 bg-slate-100 border-slate-200">
                                        <p className="text-[8px] font-black text-slate-600 uppercase">Canceladas</p>
                                        <p className="text-2xl font-black text-slate-700">{monthlyReport.summary.canceled}</p>
                                    </Card>
                                    <Card className="p-4 bg-blue-50 border-blue-200">
                                        <p className="text-[8px] font-black text-blue-600 uppercase">Taxa Aprovação</p>
                                        <p className="text-2xl font-black text-blue-700">{monthlyReport.summary.successRate}%</p>
                                    </Card>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-[9px] font-black uppercase text-slate-400 border-b border-slate-100">
                                                <th className="px-3 py-2">Nº</th>
                                                <th className="px-3 py-2">Status</th>
                                                <th className="px-3 py-2">Data</th>
                                                <th className="px-3 py-2">Chave</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {monthlyReport.invoices.map((inv: any) => (
                                                <tr key={inv.id} className="text-[9px]">
                                                    <td className="px-3 py-2 font-black">{inv.number}</td>
                                                    <td className="px-3 py-2">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded text-[7px] font-black uppercase",
                                                            inv.status === 'AUTHORIZED' ? "bg-emerald-100 text-emerald-700" :
                                                            inv.status === 'REJECTED' ? "bg-rose-100 text-rose-700" :
                                                            inv.status === 'CANCELED' ? "bg-slate-200 text-slate-500" : "bg-amber-100 text-amber-700"
                                                        )}>
                                                            {inv.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-500">{inv.issuedAt ? format(new Date(inv.issuedAt), 'dd/MM/yyyy HH:mm') : '-'}</td>
                                                    <td className="px-3 py-2 font-mono text-slate-400 truncate max-w-[150px]">{inv.accessKey || '---'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmDialog 
                isOpen={confirmData.open} 
                onClose={() => setConfirmData(prev => ({...prev, open: false}))} 
                onConfirm={() => { confirmData.onConfirm(); setConfirmData(prev => ({...prev, open: false})); }} 
                title={confirmData.title} 
                message={confirmData.message} 
            />
        </div>
    );
};

export default FiscalManagement;
