import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Upload, FileCheck, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const FiscalManagement: React.FC = () => {
    const [config, setConfig] = useState<any>({
        emissionMode: 'MANUAL',
        environment: 'homologation'
    });
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'config' | 'invoices'>('config');
    const [certFile, setCertFile] = useState<File | null>(null);
    const [certPassword, setCertPassword] = useState('');

    useEffect(() => {
        loadData();
    }, [activeTab]);

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
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/fiscal/config', config);
            toast.success('Dados da empresa salvos!');
        } catch (error) {
            toast.error('Erro ao salvar dados.');
        }
    };

    const handleUploadCert = async () => {
        if (!certFile || !certPassword) return toast.error('Selecione o arquivo e digite a senha.');
        
        const formData = new FormData();
        formData.append('certificate', certFile);
        formData.append('password', certPassword);

        try {
            setLoading(true);
            await api.post('/fiscal/config/certificate', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Certificado A1 instalado com sucesso!');
            setCertFile(null);
            setCertPassword('');
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao enviar certificado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Gestão Fiscal SEFAZ-MG</h2>
                    <p className="text-sm text-gray-500">Emissão direta de NFC-e com Certificado A1</p>
                </div>
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('config')}
                        className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'config' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Configuração
                    </button>
                    <button 
                        onClick={() => setActiveTab('invoices')}
                        className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'invoices' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Histórico de Notas
                    </button>
                </div>
            </div>

            {activeTab === 'config' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Coluna 1 & 2: Dados da Empresa */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                                <ShieldCheck className="text-blue-600" size={20} />
                                Dados do Emitente
                            </h3>
                            <form onSubmit={handleSaveConfig} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Razão Social</label>
                                        <input className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold text-sm focus:border-blue-500 outline-none transition-all" value={config.companyName || ''} onChange={e => setConfig({...config, companyName: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">CNPJ</label>
                                        <input className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold text-sm focus:border-blue-500 outline-none transition-all" value={config.cnpj || ''} onChange={e => setConfig({...config, cnpj: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Inscrição Estadual</label>
                                        <input className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold text-sm focus:border-blue-500 outline-none transition-all" value={config.ie || ''} onChange={e => setConfig({...config, ie: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Regime Tributário</label>
                                        <select className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold text-sm focus:border-blue-500 outline-none" value={config.taxRegime || '1'} onChange={e => setConfig({...config, taxRegime: e.target.value})}>
                                            <option value="1">Simples Nacional</option>
                                            <option value="3">Regime Normal</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Ambiente SEFAZ</label>
                                        <select className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold text-sm focus:border-blue-500 outline-none" value={config.environment || 'homologation'} onChange={e => setConfig({...config, environment: e.target.value})}>
                                            <option value="homologation">Homologação (Testes)</option>
                                            <option value="production">Produção (Real)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 border-t mt-6">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest">Endereço Fiscal</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-gray-400">Logradouro (Rua/Av)</label>
                                            <input className="w-full border-2 border-gray-100 rounded-lg p-2 text-sm font-bold" value={config.street || ''} onChange={e => setConfig({...config, street: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400">Número</label>
                                            <input className="w-full border-2 border-gray-100 rounded-lg p-2 text-sm font-bold" value={config.number || ''} onChange={e => setConfig({...config, number: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400">Cidade</label>
                                            <input className="w-full border-2 border-gray-100 rounded-lg p-2 text-sm font-bold" value={config.city || ''} onChange={e => setConfig({...config, city: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400">Cód. IBGE Município</label>
                                            <input className="w-full border-2 border-gray-100 rounded-lg p-2 text-sm font-bold" value={config.ibgeCode || ''} onChange={e => setConfig({...config, ibgeCode: e.target.value})} placeholder="Ex: 3106200" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400">CEP</label>
                                            <input className="w-full border-2 border-gray-100 rounded-lg p-2 text-sm font-bold" value={config.zipCode || ''} onChange={e => setConfig({...config, zipCode: e.target.value})} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-6">
                                    <button type="submit" className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-lg">
                                        Salvar Dados Empresa
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Coluna 3: Certificado e Modo */}
                    <div className="space-y-6">
                        {/* Box Certificado A1 */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-black uppercase tracking-tighter mb-4 flex items-center gap-2">
                                <FileCheck className="text-emerald-600" size={18} />
                                Certificado Digital A1
                            </h3>
                            
                            {config.certificate ? (
                                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-4 flex items-start gap-3">
                                    <CheckCircle className="text-emerald-500 mt-0.5" size={16} />
                                    <div>
                                        <p className="text-xs font-black text-emerald-800 uppercase">Certificado Instalado</p>
                                        <p className="text-[10px] text-emerald-600 font-bold">O sistema está pronto para assinar notas.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-4 flex items-start gap-3">
                                    <AlertCircle className="text-amber-500 mt-0.5" size={16} />
                                    <div>
                                        <p className="text-xs font-black text-amber-800 uppercase">Atenção</p>
                                        <p className="text-[10px] text-amber-600 font-bold">Nenhum certificado A1 encontrado.</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Arquivo .pfx / .p12</label>
                                    <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-blue-400 transition-all">
                                        <input 
                                            type="file" 
                                            accept=".pfx,.p12"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={e => setCertFile(e.target.files?.[0] || null)}
                                        />
                                        <Upload className="mx-auto text-gray-300 mb-2" size={24} />
                                        <p className="text-[10px] font-bold text-gray-500">
                                            {certFile ? certFile.name : 'Clique para selecionar'}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Senha do Certificado</label>
                                    <input 
                                        type="password"
                                        className="w-full border-2 border-gray-100 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-500"
                                        placeholder="Digite a senha"
                                        value={certPassword}
                                        onChange={e => setCertPassword(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={handleUploadCert}
                                    disabled={loading}
                                    className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Processando...' : 'Instalar Certificado'}
                                </button>
                            </div>
                        </div>

                        {/* Box Modo de Emissão */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-black uppercase tracking-tighter mb-4 flex items-center gap-2 text-gray-700">
                                Fluxo de Emissão
                            </h3>
                            <div className="space-y-3">
                                <button 
                                    onClick={() => setConfig({...config, emissionMode: 'MANUAL'})}
                                    className={cn(
                                        "w-full p-4 rounded-xl border-2 text-left transition-all",
                                        config.emissionMode === 'MANUAL' ? "border-blue-600 bg-blue-50" : "border-gray-100 hover:border-gray-200"
                                    )}
                                >
                                    <p className="text-xs font-black uppercase text-gray-900">Manual</p>
                                    <p className="text-[9px] font-bold text-gray-500 mt-1 uppercase">Você clica em "Emitir" para cada nota finalizada.</p>
                                </button>
                                <button 
                                    onClick={() => setConfig({...config, emissionMode: 'AUTOMATIC'})}
                                    className={cn(
                                        "w-full p-4 rounded-xl border-2 text-left transition-all",
                                        config.emissionMode === 'AUTOMATIC' ? "border-blue-600 bg-blue-50" : "border-gray-100 hover:border-gray-200"
                                    )}
                                >
                                    <p className="text-xs font-black uppercase text-gray-900">Automático</p>
                                    <p className="text-[9px] font-bold text-gray-500 mt-1 uppercase">O sistema emite a nota assim que o pedido for pago.</p>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'invoices' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Data / Hora</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Número</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Chave de Acesso</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {invoices.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-bold text-sm">Nenhuma nota emitida.</td></tr>
                            ) : (
                                invoices.map((inv: any) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600">
                                            {new Date(inv.issuedAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-900">{inv.number}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={cn(
                                                "px-2.5 py-1 text-[10px] font-black uppercase rounded-full",
                                                inv.status === 'AUTHORIZED' ? 'bg-emerald-100 text-emerald-700' : 
                                                inv.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                            )}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-400">{inv.accessKey || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <div className="flex justify-end gap-2">
                                                {inv.pdfUrl && <a href={inv.pdfUrl} target="_blank" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-black text-[10px] uppercase">PDF</a>}
                                                {inv.xmlUrl && <a href={inv.xmlUrl} target="_blank" className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 font-black text-[10px] uppercase">XML</a>}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default FiscalManagement;
