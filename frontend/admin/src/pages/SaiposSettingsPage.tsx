import React, { useState, useEffect } from 'react';
import { getSaiposSettings, updateSaiposSettings, importSaiposMenu } from '../services/api';
import { ArrowLeft, Save, Loader2, ShieldCheck, RefreshCw, DownloadCloud, FileSpreadsheet, CheckCircle, XCircle, Key, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import saiposLogo from '../assets/saipos-logo.png';

const SaiposSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [partnerId, setPartnerId] = useState('');
  const [secret, setSecret] = useState('');
  const [codStore, setCodStore] = useState('');
  const [env, setEnv] = useState<'production' | 'homologation'>('homologation');
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await getSaiposSettings();
        setPartnerId(settings.saiposPartnerId || '');
        setSecret(settings.saiposSecret === '********' ? '' : settings.saiposSecret || '');
        setCodStore(settings.saiposCodStore || '');
        setEnv(settings.saiposEnv || 'homologation');
        setIsActive(settings.saiposIntegrationActive || false);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar credenciais.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSaiposSettings({ 
        saiposPartnerId: partnerId,
        saiposSecret: secret,
        saiposCodStore: codStore,
        saiposEnv: env,
        saiposIntegrationActive: isActive 
      });
      toast.success('Configurações Saipos salvas!');
    } catch (error) {
      toast.error('Falha ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      toast.error('Por favor, selecione um arquivo .xlsx');
      return;
    }

    setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    try {
      const result = await importSaiposMenu(selectedFile);
      toast.success(result.message || 'Cardápio importado com sucesso!');
      setSelectedFile(null);
      if (document.getElementById('file-input')) {
        (document.getElementById('file-input') as HTMLInputElement).value = '';
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.error || 'Erro ao importar cardápio.');
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-emerald-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/integrations')}
          className="p-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-lg p-2">
            <img src={saiposLogo} alt="Saipos" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Saipos</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
                isActive 
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {isActive ? 'Conectado' : 'Desativado'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Restaurante</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card de Credenciais */}
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Key size={18} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Credenciais da API</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Partner ID, Secret e Código da Loja</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Partner ID</label>
                  <Input
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    placeholder="ID do Parceiro Saipos"
                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Secret</label>
                  <Input
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="••••••••••••••••••••••"
                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Código da Loja</label>
                <Input
                  value={codStore}
                  onChange={(e) => setCodStore(e.target.value)}
                  placeholder="Código da Loja no Saipos"
                  className="h-12 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Ambiente</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEnv('homologation')}
                    className={`h-12 rounded-xl border-2 font-black text-sm uppercase tracking-wider transition-all ${
                      env === 'homologation'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-lg shadow-emerald-500/10'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    Homologação
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnv('production')}
                    className={`h-12 rounded-xl border-2 font-black text-sm uppercase tracking-wider transition-all ${
                      env === 'production'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-lg shadow-emerald-500/10'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    Produção
                  </button>
                </div>
              </div>

              {/* Toggle Ativo */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative w-14 h-8 rounded-full transition-all ${
                    isActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                    isActive ? 'left-7' : 'left-1'
                  }`} />
                </button>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">Ativar Integração Saipos</p>
                  <p className="text-[10px] text-slate-400">Sincronizar pedidos e estoque</p>
                </div>
                {isActive ? (
                  <CheckCircle size={20} className="text-emerald-500" />
                ) : (
                  <XCircle size={20} className="text-slate-400" />
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => navigate('/integrations')} className="flex-1 h-12">
                  Voltar
                </Button>
                <Button type="submit" disabled={isSaving} className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20">
                  {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save size={14} className="mr-2" />}
                  Salvar Configurações
                </Button>
              </div>
            </form>
          </Card>

          {/* Card de Importação */}
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Upload size={18} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Importar Cardápio</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Upload de arquivo .xlsx</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Selecione um arquivo <span className="font-black">.xlsx</span> com o cardápio do Saipos. 
                    O arquivo deve seguir o formato esperado pelo sistema.
                  </p>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                <FileSpreadsheet size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500 mb-4 font-medium">
                  {selectedFile ? selectedFile.name : 'Arraste o arquivo aqui ou clique para selecionar'}
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-input">
                  <span className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-600 rounded-xl text-sm font-bold transition-all shadow-sm">
                    <RefreshCw size={16} />
                    Selecionar Arquivo
                  </span>
                </label>
              </div>

              <Button 
                onClick={handleImport} 
                disabled={!selectedFile || isImporting}
                className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-xl shadow-emerald-500/30 text-lg font-black uppercase tracking-wider"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="animate-spin mr-3" size={18} />
                    Importando...
                  </>
                ) : (
                  <>
                    <DownloadCloud size={18} className="mr-3" />
                    Importar Cardápio
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Coluna Lateral - Info */}
        <div className="space-y-6">
          {/* Info */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Sobre o Saipos</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                O <span className="font-black">Saipos</span> é um sistema completo de gestão para restaurantes, 
                bares e similares que oferece:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span className="text-xs text-slate-600">Gestão de pedidos em tempo real</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span className="text-xs text-slate-600">Controle de estoque</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span className="text-xs text-slate-600">Comandas digitais</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span className="text-xs text-slate-600">Gestão de funcionários</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Status */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-slate-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Status</h3>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Partner ID</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  partnerId ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {partnerId ? 'Configurado' : 'Pendente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Secret</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  secret ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {secret ? 'Configurado' : 'Pendente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Loja</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  codStore ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {codStore || 'Pendente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Integração</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {isActive ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SaiposSettingsPage;