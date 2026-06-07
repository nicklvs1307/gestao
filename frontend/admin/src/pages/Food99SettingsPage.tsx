import React, { useState, useEffect } from 'react';
import {
  getFood99Settings,
  updateFood99Settings,
  getFood99ConnectionStatus,
  getFood99AuthorizationUrl,
  setFood99ShopOnline,
  setFood99ConfirmMethod,
  getFood99ShopDetail,
  syncFood99Menu,
  getFood99MenuStatus,
  refreshFood99Token,
  unbindFood99Shop,
} from '../services/api/integrations';
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  ExternalLink,
  RefreshCw,
  Upload,
  Power,
  Trash2,
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import food99Logo from '../assets/99food-logo.png';

const Food99SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [merchantId, setMerchantId] = useState('');
  const [appShopId, setAppShopId] = useState('');
  const [env, setEnv] = useState<'production' | 'homologation'>('production');
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; status: string; message: string } | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [shopDetail, setShopDetail] = useState<any>(null);
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
  const [menuTaskStatus, setMenuTaskStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await getFood99Settings();
        setMerchantId(settings.food99MerchantId || '');
        setAppShopId(settings.food99AppShopId || '');
        setEnv(settings.food99Env || 'production');
        setIsActive(settings.food99IntegrationActive || false);
        setCredentialsConfigured(settings.food99CredentialsConfigured || false);

        if (settings.food99IntegrationActive && settings.food99AppShopId) {
          const status = await getFood99ConnectionStatus(settings.food99AppShopId);
          setConnectionStatus(status);

          try {
            const detail = await getFood99ShopDetail();
            setShopDetail(detail);
            setIsOnline(detail?.biz_status === 1);
          } catch {
            // shop detail may fail if not yet bound
          }
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
      await updateFood99Settings({
        food99MerchantId: merchantId,
        food99AppShopId: appShopId,
        food99Env: env,
        food99IntegrationActive: isActive,
      });

      if (isActive && appShopId) {
        const status = await getFood99ConnectionStatus(appShopId);
        setConnectionStatus(status);

        if (!status.connected) {
          toast.error('Token inválido. Verifique as credenciais no servidor.');
        } else {
          toast.success('Configurações 99Food salvas!');
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

  const handleAuthorize = async () => {
    try {
      const result = await getFood99AuthorizationUrl();
      if (result?.url) {
        window.open(result.url, '_blank');
        toast.info('Página de autorização aberta. Selecione sua loja e confirme.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao gerar URL de autorização.');
    }
  };

  const handleRefreshToken = async () => {
    try {
      const result = await refreshFood99Token();
      if (result.success) {
        toast.success('Token renovado com sucesso!');
        const status = await getFood99ConnectionStatus(appShopId);
        setConnectionStatus(status);
      } else {
        toast.error('Falha ao renovar token.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao renovar token.');
    }
  };

  const handleSetOnline = async (online: boolean) => {
    try {
      await setFood99ShopOnline(online);
      setIsOnline(online);
      toast.success(online ? 'Loja definida como ONLINE' : 'Loja definida como OFFLINE');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao alterar status.');
    }
  };

  const handleSetConfirmMethod = async () => {
    try {
      await setFood99ConfirmMethod(2);
      toast.success('Método de confirmação definido como OPENAPI');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao definir método.');
    }
  };

  const handleSyncMenu = async () => {
    setIsSyncing(true);
    try {
      const result = await syncFood99Menu();
      if (result?.taskId) {
        setMenuTaskId(result.taskId);
        toast.success('Sincronização iniciada! Acompanhe o progresso.');
        pollMenuStatus(result.taskId);
      } else {
        toast.success('Cardápio sincronizado!');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao sincronizar cardápio.');
    } finally {
      setIsSyncing(false);
    }
  };

  const pollMenuStatus = async (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await getFood99MenuStatus(taskId);
        const rawStatus = status?.rawStatus;
        const mapped = status?.status || 'unknown';
        setMenuTaskStatus(mapped);
        if (rawStatus === 1 || rawStatus === 2 || mapped === 'completed' || mapped === 'failed') {
          clearInterval(interval);
          toast.info(mapped === 'completed' ? 'Cardápio sincronizado com sucesso!' : 'Falha na sincronização do cardápio.');
        }
      } catch {
        clearInterval(interval);
      }
    }, 5000);

    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };

  const handleUnbind = async () => {
    if (!confirm('Tem certeza que deseja desvincular esta loja?')) return;
    try {
      await unbindFood99Shop();
      toast.success('Loja desvinculada com sucesso.');
      setIsActive(false);
      setConnectionStatus(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao desvincular loja.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-amber-500" size={24} />
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 p-2">
            <img src={food99Logo} alt="99Food" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">99Food</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
                isActive && connectionStatus?.connected
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {isActive && connectionStatus?.connected ? 'Conectado' : 'Desativado'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Integração Centralizada</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  {isActive && connectionStatus?.connected ? (
                    <Wifi size={18} className="text-amber-600" />
                  ) : (
                    <WifiOff size={18} className="text-slate-500" />
                  )}
                </div>
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Configurações do Restaurante</h2>
                  <p className="text-[10px] text-slate-500 font-medium">Merchant ID, App Shop ID e ambiente</p>
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
                      Client ID e Client Secret gerenciados pelo administrador (Docker secrets)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Merchant ID</label>
                <Input
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  placeholder="ID do merchant no portal 99Food"
                  className="h-12 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">App Shop ID</label>
                <Input
                  value={appShopId}
                  onChange={(e) => setAppShopId(e.target.value)}
                  placeholder="ID da sua loja no sistema 99Food"
                  className="h-12 bg-slate-50 border-slate-200 focus:bg-white"
                />
                <p className="text-[10px] text-slate-500">Identificador único da sua loja fornecido pela 99Food</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Ambiente</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEnv('homologation')}
                    className={`h-12 rounded-xl border-2 font-black text-sm uppercase tracking-wider transition-all ${
                      env === 'homologation'
                        ? 'border-amber-500 bg-amber-50 text-amber-600 shadow-lg shadow-amber-500/10'
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
                        ? 'border-amber-500 bg-amber-50 text-amber-600 shadow-lg shadow-amber-500/10'
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
                    id="food99Active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="food99Active" className="text-sm font-medium">
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
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Link2 size={18} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Autorização e Vinculação</h2>
                  <p className="text-[10px] text-slate-500 font-medium">Conecte sua loja ao sistema</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleAuthorize}
                  disabled={!isActive || !appShopId}
                  className="flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-amber-500 bg-amber-50 text-amber-700 font-black text-sm uppercase tracking-wider transition-all hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ExternalLink size={16} />
                  Gerar Link de Autorização
                </button>
                <button
                  onClick={handleRefreshToken}
                  disabled={!isActive || !appShopId}
                  className="flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-slate-200 bg-white text-slate-600 font-black text-sm uppercase tracking-wider transition-all hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={16} />
                  Renovar Token
                </button>
                <button
                  onClick={handleUnbind}
                  disabled={!isActive}
                  className="flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-red-200 bg-red-50 text-red-600 font-black text-sm uppercase tracking-wider transition-all hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed col-span-1 sm:col-span-2"
                >
                  <Trash2 size={16} />
                  Desvincular Loja
                </button>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Upload size={18} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Cardápio</h2>
                  <p className="text-[10px] text-slate-500 font-medium">Sincronização de produtos e categorias</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleSyncMenu}
                  disabled={!isActive || !appShopId || isSyncing}
                  className="flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-amber-500 bg-amber-50 text-amber-700 font-black text-sm uppercase tracking-wider transition-all hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar Cardápio'}
                </button>
              </div>

              {menuTaskId && menuTaskStatus && (
                <div className={`p-3 rounded-xl border ${
                  menuTaskStatus === 'completed' ? 'bg-emerald-50 border-emerald-200' :
                  menuTaskStatus === 'failed' ? 'bg-red-50 border-red-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <p className="text-xs font-bold">
                    Task: {menuTaskId} — Status: {menuTaskStatus}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} className="text-amber-600" />
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Sobre a Integração</h2>
                  <p className="text-[10px] text-slate-500 font-medium">Modelo centralizado</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4 text-sm text-slate-600">
              <p>
                Esta integração usa o modelo <span className="font-black text-amber-600">Centralizado</span> da 99Food, onde:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  <span>Client ID e Client Secret são configurados no servidor (variáveis de ambiente / Docker secrets)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  <span>Um app_shop_id identifica cada loja no sistema 99Food</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  <span>Webhook para eventos em tempo real (única fonte de pedidos)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  <span>Cardápio sincronizado via API v3 (recomendada)</span>
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
            <div className="p-6 space-y-4">
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
                    <AlertCircle size={24} className="text-slate-500" />
                    <p className="text-sm text-slate-500">Integração desativada</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-sm font-bold text-slate-700">Loja Online</span>
                <button
                  onClick={() => handleSetOnline(!isOnline)}
                  disabled={!isActive || !appShopId}
                  className={`relative w-14 h-7 rounded-full transition-colors disabled:opacity-50 ${
                    isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                    isOnline ? 'translate-x-7' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">Ações Rápidas</h3>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => handleSetConfirmMethod()}
                disabled={!isActive || !appShopId}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Power size={14} />
                Set Confirm Method (OPENAPI)
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Food99SettingsPage;
