import React, { useState, useEffect } from 'react';
import { getIfoodSettings, updateIfoodSettings, getIfoodConnectionStatus } from '../services/api/integrations';
import { ArrowLeft, Save, Loader2, CheckCircle, AlertCircle, WifiOff } from 'lucide-react';
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
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
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
        setAutoAcceptOrders(settings.ifoodAutoAcceptOrders || false);
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
        ifoodIntegrationActive: isActive,
        ifoodAutoAcceptOrders: autoAcceptOrders
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

  const isConnected = isActive && connectionStatus?.connected;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/integrations')}
          className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 p-2">
            <img src={ifoodLogo} alt="iFood" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">iFood</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                isConnected
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20' 
                  : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}>
                {isConnected ? 'Conectado' : 'Desativado'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Integração Centralizada</p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
              {isConnected ? (
                <CheckCircle size={16} className="text-orange-600" />
              ) : (
                <WifiOff size={16} className="text-slate-400" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Configurações do Restaurante</h2>
              <p className="text-[11px] text-slate-400">Merchant ID e ambiente de integração</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${
            credentialsConfigured 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            {credentialsConfigured 
              ? <CheckCircle size={14} className="text-emerald-600 shrink-0" />
              : <AlertCircle size={14} className="text-red-600 shrink-0" />
            }
            <p className={`text-xs font-medium ${credentialsConfigured ? 'text-emerald-700' : 'text-red-700'}`}>
              {credentialsConfigured ? 'Credenciais configuradas' : 'Credenciais não configuradas'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Merchant ID</label>
            <Input
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              placeholder="ID do seu restaurante no portal iFood"
              className="h-11 bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Ambiente</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEnv('homologation')}
                className={`h-9 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${
                  env === 'homologation'
                    ? 'border-orange-500 bg-orange-50 text-orange-600'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                Homologação
              </button>
              <button
                type="button"
                onClick={() => setEnv('production')}
                className={`h-9 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${
                  env === 'production'
                    ? 'border-orange-500 bg-orange-50 text-orange-600'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                Produção
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${
                isActive ? 'bg-orange-500' : 'bg-slate-300'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${
                isActive ? 'left-[22px]' : 'left-0.5'
              }`} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700">Ativar integração</p>
              <p className="text-[11px] text-slate-400">Receber pedidos do iFood</p>
            </div>
            {isActive ? (
              <CheckCircle size={16} className="text-orange-500 shrink-0" />
            ) : (
              <WifiOff size={16} className="text-slate-300 shrink-0" />
            )}
          </div>

          {isActive && (
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <button
                type="button"
                onClick={() => setAutoAcceptOrders(!autoAcceptOrders)}
                className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${
                  autoAcceptOrders ? 'bg-orange-500' : 'bg-slate-300'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${
                  autoAcceptOrders ? 'left-[22px]' : 'left-0.5'
                }`} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-800">Aceitar automaticamente</p>
                <p className="text-[11px] text-orange-600">Pedidos aceitos sem intervenção manual</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => navigate('/integrations')} className="flex-1 h-11">
              Voltar
            </Button>
            <Button type="submit" disabled={isSaving || !credentialsConfigured} className="flex-1 h-11 bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20">
              {isSaving ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Save size={16} className="mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default IfoodSettingsPage;
