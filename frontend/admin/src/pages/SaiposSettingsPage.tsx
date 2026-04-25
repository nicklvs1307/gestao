import React, { useState, useEffect } from 'react';
import { getSaiposSettings, updateSaiposSettings, importSaiposMenu } from '../services/api';
import { ArrowLeft, Save, Loader2, ShieldCheck, RefreshCw, DownloadCloud, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

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
        setSecret(settings.saiposSecret || '');
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
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/integrations')}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase">Saipos</h1>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Gestão de Restaurante</p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Toggle Ativo */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
            <input
              type="checkbox"
              id="saiposActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 text-emerald-500 rounded"
            />
            <label htmlFor="saiposActive" className="text-sm font-medium">
              Ativar Integração Saipos
            </label>
          </div>

          {/* Credenciais */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Credenciais</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Partner ID</label>
              <Input
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                placeholder="ID do Parceiro"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Secret</label>
              <Input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Código da Loja</label>
              <Input
                value={codStore}
                onChange={(e) => setCodStore(e.target.value)}
                placeholder="Código da Loja"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Ambiente</label>
              <select
                value={env}
                onChange={(e) => setEnv(e.target.value as any)}
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm"
              >
                <option value="homologation">Homologação (Teste)</option>
                <option value="production">Produção</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/integrations')} className="flex-1">
              Voltar
            </Button>
            <Button type="submit" disabled={isSaving} className="flex-1 bg-emerald-500 hover:bg-emerald-600">
              {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save size={14} className="mr-2" />}
              Salvar
            </Button>
          </div>
        </form>
      </Card>

      {/* Importação de Cardápio */}
      <Card className="p-6">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Importar Cardápio</h3>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
            <FileSpreadsheet size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs text-slate-500 mb-3">Selecione um arquivo .xlsx com o cardápio</p>
            <input
              id="file-input"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-input">
              <span className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium transition-colors">
                <RefreshCw size={14} />
                Selecionar Arquivo
              </span>
            </label>
            {selectedFile && (
              <p className="text-xs text-emerald-600 mt-2">{selectedFile.name}</p>
            )}
          </div>

          <Button 
            onClick={handleImport} 
            disabled={!selectedFile || isImporting}
            className="w-full bg-emerald-500 hover:bg-emerald-600"
          >
            {isImporting ? (
              <Loader2 className="animate-spin mr-2" size={14} />
            ) : (
              <DownloadCloud size={14} className="mr-2" />
            )}
            Importar Cardápio
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SaiposSettingsPage;