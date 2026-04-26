import React, { useState, useEffect } from 'react';
import { getIfoodSettings, updateIfoodSettings, getIfoodConnectionStatus, initiateIfoodLink, completeIfoodLink, disconnectIfood } from '../services/api/integrations';
import { ArrowLeft, Save, Loader2, CheckCircle, ExternalLink, Key, Link, Link2Off, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import ifoodLogo from '../assets/ifood-logo.png';

const IfoodSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [restaurantId, setRestaurantId] = useState('');
  const [env, setEnv] = useState<'production' | 'homologation'>('production');
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [credentialsConfigured, setCredentialsConfigured] = useState(false);
  
  const [linkStep, setLinkStep] = useState<'idle' | 'initiating' | 'waiting' | 'complete' | 'connected'>('idle');
  const [userCode, setUserCode] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [authorizationCode, setAuthorizationCode] = useState('');
  const [expiryTime, setExpiryTime] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; status: string; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Countdown timer para o código de vinculação
  useEffect(() => {
    if (linkStep !== 'waiting' || expiryTime <= 0) return;

    const timer = setInterval(() => {
      setExpiryTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setLinkStep('idle');
          toast.error('Código expirado. Tente novamente.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [linkStep]);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await getIfoodSettings();
        setRestaurantId(settings.ifoodRestaurantId || '');
        setEnv(settings.ifoodEnv || 'production');
        setIsActive(settings.ifoodIntegrationActive || false);
        setCredentialsConfigured(settings.ifoodCredentialsConfigured || false);
        
        if (settings.ifoodIntegrationActive) {
          const status = await getIfoodConnectionStatus();
          setConnectionStatus(status);
          if (status.connected) {
            setLinkStep('connected');
          }
        }
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
      await updateIfoodSettings({ 
        ifoodRestaurantId: restaurantId,
        ifoodEnv: env,
        ifoodIntegrationActive: isActive 
      });
      toast.success('Configurações iFood salvas!');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Falha ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInitiateLink = async () => {
    if (!credentialsConfigured) {
      toast.error('Credenciais da plataforma não configuradas. Contate o suporte.');
      return;
    }
    
    setLinkStep('initiating');
    try {
      const result = await initiateIfoodLink();
      setUserCode(result.userCode);
      setVerificationUrl(result.verificationUrlComplete);
      setExpiryTime(result.expiresIn);
      setLinkStep('waiting');
    } catch (error: any) {
      setLinkStep('idle');
      toast.error(error?.response?.data?.error || 'Falha ao iniciar vinculação.');
    }
  };

  const handleCompleteLink = async () => {
    if (!authorizationCode) {
      toast.error('Código de autorização é obrigatório.');
      return;
    }
    
    try {
      await completeIfoodLink(authorizationCode);
      setLinkStep('connected');
      toast.success('iFood conectado com sucesso!');
      
      const status = await getIfoodConnectionStatus();
      setConnectionStatus(status);
      setIsActive(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Falha ao completar vinculação.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectIfood();
      setLinkStep('idle');
      setUserCode('');
      setAuthorizationCode('');
      setConnectionStatus(null);
      setIsActive(false);
      toast.success('iFood desconectado.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Falha ao desconectar.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(userCode);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                isActive 
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {isActive ? 'Conectado' : 'Desativado'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Integração OAuth Distribuído</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Key size={18} className="text-orange-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Configurações do Restaurante</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Restaurant ID e ambiente de integração</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Status das credenciais da plataforma */}
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
                      {credentialsConfigured ? 'Credenciais da plataforma configuradas' : 'Credenciais da plataforma não configuradas'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Client ID e Client Secret são gerenciados pelo administrador do sistema
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Restaurant ID</label>
                <Input
                  value={restaurantId}
                  onChange={(e) => setRestaurantId(e.target.value)}
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

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => navigate('/integrations')} className="flex-1 h-12">
                  Voltar
                </Button>
                <Button type="submit" disabled={isSaving} className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20">
                  {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save size={14} className="mr-2" />}
                  Salvar Configurações
                </Button>
              </div>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Link size={18} className="text-orange-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Vincular Conta iFood</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Conecte sua conta para receber pedidos automaticamente</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {linkStep === 'idle' && (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-600 mb-4">
                    Clique no botão abaixo para gerar um código de vinculação e vincule sua conta iFood.
                  </p>
                  <Button 
                    onClick={handleInitiateLink} 
                    disabled={!credentialsConfigured}
                    className="h-12 bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                  >
                    <Link size={16} className="mr-2" />
                    Iniciar Vinculação
                  </Button>
                </div>
              )}

              {linkStep === 'initiating' && (
                <div className="text-center py-4">
                  <Loader2 className="animate-spin text-orange-500 mx-auto mb-4" size={32} />
                  <p className="text-sm text-slate-600">Gerando código de vinculação...</p>
                </div>
              )}

              {linkStep === 'waiting' && (
                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <p className="text-xs text-orange-600 font-medium mb-2">Código de Vinculação</p>
                    <div className="flex items-center gap-2">
                      <code className="text-2xl font-black text-orange-600 tracking-widest">{userCode}</code>
                      <button onClick={copyToClipboard} className="p-2 hover:bg-orange-100 rounded-lg transition-colors">
                        {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-orange-600" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500">
                    <p className="mb-2">Tempo restante: <span className="font-black text-slate-700">{formatTime(expiryTime)}</span></p>
                    <p>Copie este código e insira no Portal do Parceiro iFood:</p>
                    <a 
                      href={verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-orange-600 hover:underline"
                    >
                      portal.ifood.com.br/apps/code <ExternalLink size={12} />
                    </a>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Código de Autorização</label>
                    <Input
                      value={authorizationCode}
                      onChange={(e) => setAuthorizationCode(e.target.value)}
                      placeholder="Cole o código recebido do portal iFood"
                      className="h-12 bg-slate-50 border-slate-200 focus:bg-white"
                    />
                  </div>

                  <Button 
                    onClick={handleCompleteLink} 
                    disabled={!authorizationCode}
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Conectar
                  </Button>
                </div>
              )}

              {linkStep === 'connected' && connectionStatus && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-3">
                      <CheckCircle size={24} className="text-emerald-600" />
                      <div>
                        <p className="font-black text-emerald-700">Conectado</p>
                        <p className="text-xs text-emerald-600">{connectionStatus.message}</p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleDisconnect}
                    variant="outline"
                    className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Link2Off size={16} className="mr-2" />
                    Desconectar
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-emerald-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Recebimento de Pedidos</h3>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-xs text-emerald-700 font-bold">Polling Ativo (a cada 30s)</p>
                <p className="text-[10px] text-emerald-600 mt-1">
                  O sistema busca automaticamente novos pedidos do iFood via polling. Nenhuma configuracao adicional e necessaria.
                </p>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Eventos processados: <span className="font-black text-slate-700">PLACED</span>, <span className="font-black text-slate-700">CONFIRMED</span>, <span className="font-black text-slate-700">CANCELLED</span>, <span className="font-black text-slate-700">DISPATCHED</span>, <span className="font-black text-slate-700">CONCLUDED</span>
              </p>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-blue-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Como Vincular</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-black text-slate-500">1</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Preencha o <span className="font-black text-slate-700">Restaurant ID</span> do seu restaurante no iFood e salve
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-black text-slate-500">2</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Clique em <span className="font-black text-slate-700">Iniciar Vinculação</span> para gerar um código
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-black text-slate-500">3</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Copie o código e insira no <span className="font-black text-slate-700">Portal do Parceiro</span> iFood
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-black text-slate-500">4</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cole aqui o <span className="font-black text-slate-700">código de autorização</span> que o iFood fornecer
                </p>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Atenção</h3>
              </div>
            </div>
            <div className="p-5 space-y-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                O <span className="font-black text-slate-700">token de acesso</span> expira em 3 horas. O sistema renova automaticamente.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                O <span className="font-black text-slate-700">refresh token</span> permite renovação sem intervenção manual.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IfoodSettingsPage;