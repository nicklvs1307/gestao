import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
    Upload, FileCheck, ShieldCheck, AlertCircle, CheckCircle, 
    RefreshCw, History, Settings, FileText, Download, Lock, Loader2, Landmark
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const FiscalManagement: React.FC = () => {
    const [config, setConfig] = useState<any>({ emissionMode: 'MANUAL', environment: 'homologation' });
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'config' | 'invoices'>('config');
    const [certFile, setCertFile] = useState<File | null>(null);
    const [certPassword, setCertPassword] = useState('');

    useEffect(() => { loadData(); }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'config') {
                const res = await api.get('/fiscal/config');
                if (res.data) setConfig(res.data);
            } else {
                const res = await api.get('/fiscal/invoices');
                setInvoices(res.data);
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
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

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Premium */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Módulo Fiscal</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                        <Landmark size={14} className="text-orange-500" /> Gestão de NFC-e e SEFAZ-MG
                    </p>
                </div>
                <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1 shadow-inner">
                    {[
                        { id: 'config', label: 'Configuração', icon: Settings },
                        { id: 'invoices', label: 'Histórico de Notas', icon: History }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2", activeTab === tab.id ? "bg-white text-slate-900 shadow-md scale-[1.02]" : "text-slate-500 hover:text-slate-700")}>
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

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
                                    <Input label="CNPJ" value={config.cnpj || ''} onChange={e => setConfig({...config, cnpj: e.target.value})} placeholder="00.000.000/0000-00" required />
                                    <Input label="Inscrição Estadual" value={config.ie || ''} onChange={e => setConfig({...config, ie: e.target.value})} placeholder="IE MG" required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Regime Tributário</label><select className="ui-input w-full h-12" value={config.taxRegime || '1'} onChange={e => setConfig({...config, taxRegime: e.target.value})}><option value="1">Simples Nacional</option><option value="3">Regime Normal</option></select></div>
                                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Ambiente SEFAZ</label><select className="ui-input w-full h-12" value={config.environment || 'homologation'} onChange={e => setConfig({...config, environment: e.target.value})}><option value="homologation">Homologação (Testes)</option><option value="production">Produção (Real)</option></select></div>
                                </div>

                                <div className="space-y-6 pt-6 border-t border-slate-50">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Endereço Fiscal</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="md:col-span-2"><Input label="Logradouro" value={config.street || ''} onChange={e => setConfig({...config, street: e.target.value})} /></div>
                                        <Input label="Nº" value={config.number || ''} onChange={e => setConfig({...config, number: e.target.value})} />
                                        <Input label="Cidade" value={config.city || ''} onChange={e => setConfig({...config, city: e.target.value})} />
                                        <Input label="Cód. IBGE" value={config.ibgeCode || ''} onChange={e => setConfig({...config, ibgeCode: e.target.value})} />
                                        <Input label="CEP" value={config.zipCode || ''} onChange={e => setConfig({...config, zipCode: e.target.value})} />
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
                                    <div><p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest leading-none mb-1">INSTALADO</p><p className="text-[9px] text-emerald-600 font-bold uppercase italic leading-tight">O sistema está apto a assinar documentos fiscais.</p></div>
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

                        {/* Box Fluxo de Emissão */}
                        <Card className="p-8 border-slate-200 shadow-xl bg-white space-y-6">
                            <h3 className="text-sm font-black uppercase text-slate-900 italic flex items-center gap-3 border-b border-slate-50 pb-4">Modo de Operação</h3>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { id: 'MANUAL', label: 'Manual', desc: 'Emissão um a um' },
                                    { id: 'AUTOMATIC', label: 'Automático', desc: 'Emite no pagamento' }
                                ].map(mode => (
                                    <button key={mode.id} onClick={() => setConfig({...config, emissionMode: mode.id})} className={cn("p-4 rounded-2xl border-2 text-left transition-all", config.emissionMode === mode.id ? "border-orange-500 bg-orange-50/30 shadow-md" : "border-slate-100 hover:border-slate-200")}>
                                        <p className={cn("text-xs font-black uppercase", config.emissionMode === mode.id ? "text-orange-600" : "text-slate-900")}>{mode.label}</p>
                                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{mode.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {activeTab === 'invoices' && (
                <Card className="p-0 overflow-hidden border-slate-200 shadow-xl bg-white" noPadding>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 bg-slate-50/30">
                                    <th className="px-8 py-4">Protocolo / Data</th>
                                    <th className="px-8 py-4">Número NFC-e</th>
                                    <th className="px-8 py-4">Status SEFAZ</th>
                                    <th className="px-8 py-4">Chave de Acesso</th>
                                    <th className="px-8 py-4 text-right">Downloads</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-slate-900">
                                {invoices.length === 0 ? (
                                    <tr><td colSpan={5} className="px-8 py-24 text-center opacity-20"><div className="flex flex-col items-center"><FileText size={64} strokeWidth={1} className="mb-4"/><p className="text-[10px] font-black uppercase tracking-widest">Nenhuma nota emitida no período</p></div></td></tr>
                                ) : (
                                    invoices.map((inv: any) => (
                                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <p className="text-[10px] font-black text-slate-900 uppercase italic leading-none mb-1">{new Date(inv.issuedAt).toLocaleDateString()}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(inv.issuedAt).toLocaleTimeString()}</p>
                                            </td>
                                            <td className="px-8 py-5 font-black text-sm text-slate-900 italic tracking-tighter">Nº {inv.number}</td>
                                            <td className="px-8 py-5">
                                                <span className={cn(
                                                    "px-3 py-1 text-[9px] font-black uppercase rounded-lg border shadow-sm",
                                                    inv.status === 'AUTHORIZED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                    inv.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                                )}>
                                                    {inv.status === 'AUTHORIZED' ? 'Autorizada' : inv.status === 'REJECTED' ? 'Rejeitada' : 'Processando'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 font-mono text-[9px] text-slate-400 group-hover:text-slate-600 transition-colors">{inv.accessKey || '---'}</td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {inv.pdfUrl && <Button variant="ghost" size="icon" className="bg-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl" onClick={() => window.open(inv.pdfUrl, '_blank')}><Download size={16} /></Button>}
                                                    {inv.xmlUrl && <Button variant="ghost" size="icon" className="bg-slate-100 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl" onClick={() => window.open(inv.xmlUrl, '_blank')}><FileText size={16} /></Button>}
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
        </div>
    );
};

export default FiscalManagement;