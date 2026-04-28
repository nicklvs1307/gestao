import React, { useState, useEffect } from 'react';
import { getIfoodSettings, updateIfoodSettings, getIfoodConnectionStatus } from '../services/api/integrations';
import { ArrowLeft, Save, Loader2, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import ifoodLogo from '../assets/ifood-logo.png';

const IfoodSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [merchantId, setMerchantId] = useState('');
  const [env, setEnv] = useState<'production' | 'homologation'>('production');
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; status: string; message: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await getIfoodSettings();
        setMerchantId(settings.ifoodMerchantId || '');
        setEnv(settings.ifoodEnv || 'production');
        setIsActive(settings.ifoodIntegrationActive || false);
        setCredentialsConfigured(settings.ifoodCredentialsConfigured || false);
        
        if (settings.ifoodIntegrationActive) {
          const status = await getIfoodConnectionStatus();
          setConnectionStatus(status);
        }
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar configurações.');
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
      await updateIfoodSettings({ 
        ifoodMerchantId: merchantId,
        ifoodEnv: env,
        ifoodIntegrationActive: isActive 
      });
      
      if (isActive) {
        const status = await getIfoodConnectionStatus();
        setConnectionStatus(status);
        
        if (!status.connected) {
          toast.error('Token inválido. Verifique as credenciais no servidor.');
        } else {
          toast.success('Configurações iFood salvas!');
        }
      } else {
        toast.success('Configurações salvas!');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Falha ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-orange-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/integrations')}
          className="p-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 p-2">
            <img src={ifoodLogo} alt="iFood" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">iFood</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
                isActive && connectionStatus?.connected
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {isActive && connectionStatus?.connected ? 'Conectado' : 'Desativado'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Integração Centralizada</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  {isActive && connectionStatus?.connected ? (
                    <Wifi size={18} className="text-orange-600" />
                  ) : (
                    <WifiOff size={18} className="text-slate-400" />
                  )}
                </div>
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Configurações do Restaurante</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Merchant ID e ambiente de integração</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className={`p-4 rounded-xl border ${credentialsConfigured 
                ? 'bg-emerald-50 border-emerald-200' 
                : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-3">
                  {credentialsConfigured 
                    ? <CheckCircle size={18} className="text-emerald-600" />
                    : <AlertCircle size={18} className="text-red-600" />
                  }
                  <div>
                    <p className={`text-xs font-black ${credentialsConfigured ? 'text-emerald-700' : 'text-red-700'}`}>
                      {credentialsConfigured ? 'Credenciais do app centralizado configuradas' : 'Credenciais não configuradas'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Client ID e Client Secret gerenciados pelo administrador
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Merchant ID</label>
                <Input
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  placeholder="ID do seu restaurante no portal iFood"
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
                        ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-lg shadow-orange-500/10'
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
                        ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-lg shadow-orange-500/10'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    Produção
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ifoodActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                  />
                  <label htmlFor="ifoodActive" className="text-sm font-medium">
                    Ativar integração
                  </label>
                </div>
                <Button type="submit" disabled={isSaving || !credentialsConfigured}>
                  {isSaving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  Salvar
                </Button>
              </div>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <AlertCircle size={18} className="text-orange-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Sobre a Integração</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Modelo centralizado vs distribuído</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4 text-sm text-slate-600">
              <p>
                Esta integração usa o modelo <span className="font-black text-orange-600">Centralizado</span> do iFood, onde:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Client ID e Client Secret são configurados no servidor (variáveis de ambiente)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Um único token de acesso serve todas as lojas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Suporta Webhook para eventos em tempo real</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Polling é usado como fallback se webhook não funcionar</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">Status da Conexão</h3>
            </div>
            <div className="p-6">
              {connectionStatus ? (
                <div className={`p-4 rounded-xl border ${
                  connectionStatus.connected 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {connectionStatus.connected ? (
                      <CheckCircle size={24} className="text-emerald-600" />
                    ) : (
                      <AlertCircle size={24} className="text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-black">
                        {connectionStatus.connected ? 'Conectado' : 'Desconectado'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {connectionStatus.message}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={24} className="text-slate-400" />
                    <p className="text-sm text-slate-500">
                      Integração desativada
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">URL do Webhook</h3>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-3">
                Configure esta URL no Portal do Desenvolvedor iFood:
              </p>
              <div className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-xs break-all">
                {typeof window !== 'undefined' 
                  ? `${window.location.origin}/webhooks/ifood`
                  : 'https://seudominio.com/webhooks/ifood'
                }
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IfoodSettingsPage;