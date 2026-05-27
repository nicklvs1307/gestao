import React, { useState, useEffect } from 'react';
import { 
  getUairangoSettings, 
  updateUairangoSettings, 
  importUairangoMenu, 
  getUairangoConnectionStatus, 
  updateUairangoMerchantStatus,
  initiateUairangoAuthorization,
  completeUairangoAuthorization,
  getUairangoAuthStatus
} from '../services/api';
import { ArrowLeft, Save, Loader2, Info, ShoppingBag, Database, Download, CheckCircle, XCircle, Key, Link as LinkIcon, AlertTriangle, Wifi, WifiOff, Store, Power, Search, Globe, PhoneOff, RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import uairangoLogo from '../assets/uairango-logo.png';

function maskValue(val: string, showFull = false) {
  if (!val) return '';
  if (showFull) return val;
  if (val.length <= 8) return '•'.repeat(val.length);
  return val.substring(0, 4) + '•'.repeat(8) + val.substring(val.length - 4);
}

const UairangoSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [token, setToken] = useState('');
  const [establishmentId, setEstablishmentId] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [env, setEnv] = useState('production');
  const [autoAccept, setAutoAccept] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastImport, setLastImport] = useState<Date | null>(null);

  // Authorization Flow States
  const [authStatus, setAuthStatus] = useState<'PENDING' | 'AUTHORIZED' | 'EXPIRED' | 'REVOKED' | 'FAILED'>('PENDING');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [verificationUrlComplete, setVerificationUrlComplete] = useState<string | null>(null);
  const [authExpiresIn, setAuthExpiresIn] = useState<number | null>(null);
  const [authCountdown, setAuthCountdown] = useState<number | null>(null);
  const [authCountdownInterval, setAuthCountdownInterval] = useState<NodeJS.Timeout | null>(null);

  const [showToken, setShowToken] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; merchant?: any; operations?: any[]; tokenExpiresAt?: string; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [isMerchantOnline, setIsMerchantOnline] = useState(false);
  const [isTogglingMerchant, setIsTogglingMerchant] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await getUairangoSettings();
        setClientId(settings.uairangoClientId || '');
        setClientSecret(settings.uairangoClientSecret || '');
        setToken(settings.uairangoToken || '');
        setEstablishmentId(settings.uairangoEstablishmentId || '');
        setIsActive(settings.uairangoActive || false);
        setEnv(settings.uairangoEnv || 'production');
        setAutoAccept(settings.uairangoAutoAcceptOrders || false);
        setAuthStatus(settings.uairangoAuthStatus || 'PENDING');
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar configurações do UaiRango.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
    
    // Also check auth status on mount
    checkAuthStatus();
  }, []);

  useEffect(() => {
    return () => {
      if (authCountdownInterval) {
        clearInterval(authCountdownInterval);
      }
    };
  }, [authCountdownInterval]);

  const checkAuthStatus = async () => {
    try {
      const statusData = await getUairangoAuthStatus();
      setAuthStatus(statusData.authStatus as 'PENDING' | 'AUTHORIZED' | 'EXPIRED' | 'REVOKED' | 'FAILED');
    } catch (error) {
      console.error('Failed to check auth status:', error);
    }
  };

  const startAuthCountdown = (seconds: number) => {
    setAuthCountdown(seconds);
    if (authCountdownInterval) {
      clearInterval(authCountdownInterval);
    }
    
    const interval = setInterval(() => {
      setAuthCountdown(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    
    setAuthCountdownInterval(interval);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUairangoSettings({ 
        uairangoToken: token,
        uairangoEstablishmentId: establishmentId,
        uairangoActive: isActive,
        uairangoEnv: env,
        uairangoAutoAcceptOrders: autoAccept,
      });
      toast.success('Configurações UaiRango salvas!');
    } catch (error) {
      toast.error('Falha ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    // For connection test, we just need to be active and have establishment ID
    if (!isActive || !establishmentId) {
      toast.error('Ative a integração e configure o ID do Estabelecimento antes de testar.');
      return;
    }
    setIsTesting(true);
    setConnectionStatus(null);
    try {
      const status = await getUairangoConnectionStatus();
      setConnectionStatus(status);
      if (status.connected) {
        setMerchantName(status.merchant?.name || 'Loja');
        const deliveryOp = Array.isArray(status.operations) ? status.operations.find((op: any) => op.operation === 'DELIVERY') : null;
        setIsMerchantOnline(deliveryOp?.available || false);
        toast.success('Conexão com UaiRango estabelecida!');
      } else {
        toast.error(status.error || 'Falha na conexão.');
      }
    } catch (error) {
      toast.error('Erro ao testar conexão.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleInitiateAuthorization = async () => {
    setIsAuthorizing(true);
    try {
      const authData = await initiateUairangoAuthorization();
      setUserCode(authData.userCode);
      setVerificationUrl(authData.verificationUrl);
      setVerificationUrlComplete(authData.verificationUrlComplete);
      setAuthExpiresIn(authData.expiresIn);
      startAuthCountdown(authData.expiresIn);
      setAuthStatus('PENDING');
      toast.success('Código de autorização gerado! Siga as instruções para completar a autorização.');
    } catch (error) {
      console.error(error);
      toast.error('Falha ao gerar código de autorização.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleCompleteAuthorization = async () => {
    setIsAuthorizing(true);
    try {
      await completeUairangoAuthorization();
      setAuthStatus('AUTHORIZED');
      // Clear the auth codes as they're no longer needed
      setUserCode(null);
      setVerificationUrl(null);
      setVerificationUrlComplete(null);
      setAuthExpiresIn(null);
      setAuthCountdown(null);
      if (authCountdownInterval) {
        clearInterval(authCountdownInterval);
        setAuthCountdownInterval(null);
      }
      toast.success('Autorização concluída com sucesso!');
      // Refresh settings to get latest data
      const settings = await getUairangoSettings();
      setToken(settings.uairangoToken || '');
      setEstablishmentId(settings.uairangoEstablishmentId || '');
    } catch (error) {
      console.error(error);
      setAuthStatus('FAILED');
      toast.error('Falha ao completar autorização. Verifique se o código foi inserido corretamente no prazo.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleCheckAuthorization = async () => {
    setIsAuthorizing(true);
    try {
      await checkAuthStatus();
      toast.success('Status de autorização verificado!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao verificar status de autorização.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleToggleMerchantStatus = async () => {
    setIsTogglingMerchant(true);
    try {
      const newStatus = isMerchantOnline ? 'UNAVAILABLE' : 'AVAILABLE';
      const operations = [
        { name: 'DELIVERY', status: newStatus, estimatedTime: 20 },
        { name: 'TAKEOUT', status: newStatus, estimatedTime: 15 }
      ];
      await updateUairangoMerchantStatus(newStatus, operations);
      setIsMerchantOnline(!isMerchantOnline);
      toast.success(`Loja ${isMerchantOnline ? 'fechada' : 'aberta'} no UaiRango!`);
    } catch (error) {
      toast.error('Erro ao alterar status da loja.');
    } finally {
      setIsTogglingMerchant(false);
    }
  };

  const handleImportMenu = async () => {
    if ((!clientId || !clientSecret) && !token) {
      toast.error('Configure o Client ID e Client Secret (OAuth 2.0) ou Token legado antes de importar.');
      return;
    }
    if (!establishmentId) {
      toast.error('Configure o ID do Estabelecimento antes de importar.');
      return;
    }

    setIsImporting(true);
    try {
      const result = await importUairangoMenu();
      toast.success(`Importação concluída: ${result.importedCount} itens importados!`);
      setLastImport(new Date());
    } catch (error) {
      console.error(error);
      toast.error('Erro ao importar cardápio do UaiRango.');
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-orange-500" size={24} />
      </div>
    );
  }

  const credentialsOk = clientId && clientSecret;

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
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-lg p-2">
            <img src={uairangoLogo} alt="UaiRango" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">UaiRango</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${
                isActive 
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {isActive ? 'Conectado' : 'Desativado'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Integração de Cardápio e Pedidos</p>
          </div>
        </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <LinkIcon size={18} className="text-orange-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Configuração da API</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Credenciais de acesso OAuth 2.0 (Nível de Aplicação)</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-tight mb-3">OAuth 2.0 (Recomendado)</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Status da Autorização</label>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        authStatus === 'AUTHORIZED' 
                          ? 'bg-emerald-100 text-emerald-600'
                          : authStatus === 'PENDING'
                            ? 'bg-slate-100 text-slate-500'
                            : authStatus === 'EXPIRED' || authStatus === 'REVOKED'
                              ? 'bg-rose-100 text-rose-600'
                              : authStatus === 'FAILED'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-amber-100 text-amber-600'
                      }`}>
                        {authStatus === 'AUTHORIZED' ? (
                          <CheckCircle size={14} />
                        ) : authStatus === 'PENDING' ? (
                          <LinkIcon size={14} />
                        ) : authStatus === 'EXPIRED' || authStatus === 'REVOKED' ? (
                          <AlertTriangle size={14} />
                        ) : authStatus === 'FAILED' ? (
                          <XCircle size={14} />
                        ) : (
                          <Loader2 className="animate-spin" size={14} />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{ 
                          authStatus === 'AUTHORIZED' ? 'Autorizado' 
                          : authStatus === 'PENDING' ? 'Pendente' 
                          : authStatus === 'EXPIRED' ? 'Expirado' 
                          : authStatus === 'REVOKED' ? 'Revogado' 
                          : authStatus === 'FAILED' ? 'Falha' 
                          : 'Verificando...'
                        }</p>
                        {authStatus === 'AUTHORIZED' && (
                          <p className="text-[10px] text-slate-400">
                            Autorizado em: {new Date().toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {authStatus === 'PENDING' && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Código de Usuário</label>
                        <div className="relative">
                          <Input 
                            value={userCode || ''} 
                            onChange={e => setUserCode(e.target.value)} 
                            placeholder="Código gerado automaticamente" 
                            className="h-12 bg-white border-blue-200 focus:bg-white font-mono text-sm"
                            readOnly
                          />
                          {userCode && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(userCode);
                                toast.success('Código copiado para área de transferência!');
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-bold uppercase hover:text-blue-800"
                            >
                              Copiar
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">URL de Verificação</label>
                        <div className="relative">
                          <Input 
                            value={verificationUrl || ''} 
                            onChange={e => setVerificationUrl(e.target.value)} 
                            placeholder="URL para autorização" 
                            className="h-12 bg-white border-blue-200 focus:bg-white font-mono text-sm"
                            readOnly
                          />
                          {verificationUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(verificationUrl);
                                toast.success('URL copiada para área de transferência!');
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-bold uppercase hover:text-blue-800"
                            >
                              Copiar
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">URL Completa</label>
                        <div className="relative">
                          <Input 
                            value={verificationUrlComplete || ''} 
                            onChange={e => setVerificationUrlComplete(e.target.value)} 
                            placeholder="URL completa com código" 
                            className="h-12 bg-white border-blue-200 focus:bg-white font-mono text-sm"
                            readOnly
                          />
                          {verificationUrlComplete && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(verificationUrlComplete);
                                toast.success('URL completa copiada para área de transferência!');
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-bold uppercase hover:text-blue-800"
                            >
                              Copiar
                            </button>
                          )}
                        </div>
                      </div>
                      {authCountdown !== null && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Tempo Restante</label>
                          <p className="text-xs font-mono text-slate-600">{authCountdown}s</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          onClick={handleInitiateAuthorization}
                          disabled={isAuthorizing}
                          className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
                        >
                          {isAuthorizing ? (
                            <>
                              <Loader2 className="animate-spin mr-2" size={14} />
                              Gerando...
                            </>
                          ) : (
                            <>
                              <LinkIcon size={14} className="mr-2" />
                              Gerar Código de Autorização
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCompleteAuthorization}
                          disabled={!userCode || isAuthorizing}
                          className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                        >
                          {isAuthorizing ? (
                            <>
                              <Loader2 className="animate-spin mr-2" size={14} />
                              Completando...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} className="mr-2" />
                              Completar Autorização
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCheckAuthorization}
                          disabled={isAuthorizing}
                          className="flex-1 h-12 bg-gray-600 hover:bg-gray-700"
                        >
                          {isAuthorizing ? <Loader2 className="animate-spin mr-2" size={14} /> : <RefreshCw size={14} className="mr-2" />}
                          Verificar Status
                        </Button>
                      </div>
                      <p className="text-[10px] text-slate-400 text-center">
                        Passo 1: Gerar código de autorização<br />
                        Passo 2: Acessar a URL acima e inserir o código<br />
                        Passo 3: Clicar em "Completar Autorização" após inserir o código
                      </p>
                    </div>
                  )}
                  {authStatus === 'AUTHORIZED' && (
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-slate-500">
                        Sua aplicação está autorizada para acessar os dados deste estabelecimento no Uairango.
                      </p>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          onClick={handleInitiateAuthorization}
                          className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
                        >
                          <LinkIcon size={14} className="mr-2" />
                          Renovar Autorização
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCheckAuthorization}
                          className="flex-1 h-12 bg-gray-600 hover:bg-gray-700"
                        >
                          <RefreshCw size={14} className="mr-2" />
                          Verificar Status
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-tight">ID do Estabelecimento (Merchant ID)</label>
                <Input 
                  value={establishmentId} 
                  onChange={e => setEstablishmentId(e.target.value)} 
                  placeholder="Cole o ID do estabelecimento" 
                  className="h-12 bg-slate-50 border-slate-200 focus:bg-white font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-tight">Token de Desenvolvedor (Legado - opcional)</label>
                <div className="relative">
                  <Input 
                    value={token} 
                    onChange={e => setToken(e.target.value)} 
                    placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." 
                    type={showToken ? 'text' : 'password'}
                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold uppercase hover:text-slate-800"
                  >
                    {showToken ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">Use apenas se OAuth 2.0 não estiver disponível</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-tight">Ambiente</label>
                  <select
                    value={env}
                    onChange={e => setEnv(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-mono focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                  >
                    <option value="production">Produção</option>
                    <option value="development">Desenvolvimento</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-tight">Aceitar Pedidos</label>
                  <div className="flex items-center gap-3 h-12 px-4 rounded-xl border border-slate-200 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setAutoAccept(!autoAccept)}
                      className={`relative w-12 h-7 rounded-full transition-all shrink-0 ${
                        autoAccept ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                        autoAccept ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                    <span className="text-xs text-slate-600 font-medium">
                      {autoAccept ? 'Automático' : 'Manual'}
                    </span>
                  </div>
                </div>
              </div>
              
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
                  <p className="text-sm font-bold text-slate-700">Ativar Integração UaiRango</p>
                  <p className="text-[10px] text-slate-400">Sincronizar cardápio e receber pedidos</p>
                </div>
                {isActive ? (
                  <CheckCircle size={20} className="text-emerald-500" />
                ) : (
                  <XCircle size={20} className="text-slate-400" />
                )}
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
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Database size={18} className="text-amber-600" />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Importar Cardápio</h2>
                    <p className="text-[10px] text-slate-400 font-medium">Buscar produtos do UaiRango</p>
                  </div>
                </div>
                {lastImport && (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase">Última importação</p>
                    <p className="text-xs font-black text-slate-600">{lastImport.toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Ao importar, o sistema buscará <span className="font-black">categorias, produtos e fotos</span> diretamente do UaiRango. 
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Pizzas e sabores serão organizados automaticamente no formato <span className="font-black">Produto Base + Grupo de Sabores</span>. 
                      Itens com o mesmo nome serão atualizados.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleImportMenu} 
                disabled={isImporting || (!credentialsOk && !token) || !establishmentId}
                className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-xl shadow-orange-500/30 text-lg font-black uppercase tracking-wider"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="animate-spin mr-3" size={18} />
                    Importando...
                  </>
                ) : (
                  <>
                    <Download size={18} className="mr-3" />
                    Importar Cardápio do UaiRango
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-blue-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Como Obter</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-blue-600">1</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Acesse o painel do <span className="font-bold">UaiRango → Meus Apps</span>
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-blue-600">2</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Em <span className="font-bold">API OAuth 2.0</span>, copie o <span className="font-bold">Client ID e Client Secret</span>
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-blue-600">3</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  O <span className="font-bold">Merchant ID</span> está no perfil da sua conta
                </p>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-slate-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Testar Conexão</h3>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <Button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !credentialsOk}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
              >
                {isTesting ? (
                  <><Loader2 className="animate-spin mr-2" size={14} /> Testando...</>
                ) : (
                  <><Wifi size={14} className="mr-2" /> Testar Conexão</>
                )}
              </Button>

              {connectionStatus && (
                <div className="mt-3 p-3 rounded-xl border text-xs space-y-2" style={{
                  backgroundColor: connectionStatus.connected ? '#f0fdf4' : '#fef2f2',
                  borderColor: connectionStatus.connected ? '#bbf7d0' : '#fecaca'
                }}>
                  <div className="flex items-center gap-2">
                    {connectionStatus.connected ? (
                      <><Wifi size={14} className="text-emerald-600" /><span className="font-bold text-emerald-700">Conectado</span></>
                    ) : (
                      <><WifiOff size={14} className="text-red-600" /><span className="font-bold text-red-700">Falha: {connectionStatus.error}</span></>
                    )}
                  </div>
                  {connectionStatus.merchant && (
                    <>
                      <p className="text-slate-600"><span className="font-semibold">Loja:</span> {connectionStatus.merchant.name}</p>
                      <p className="text-slate-600"><span className="font-semibold">Razão Social:</span> {connectionStatus.merchant.corporateName}</p>
                      <p className="text-slate-600"><span className="font-semibold">Cidade:</span> {connectionStatus.merchant.address?.city}/{connectionStatus.merchant.address?.state}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white">
              <div className="flex items-center gap-2">
                <Store size={16} className="text-violet-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Status da Loja</h3>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {connectionStatus?.connected ? (
                <>
                  {merchantName && (
                    <p className="text-xs text-slate-500"><span className="font-semibold">{merchantName}</span></p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Delivery</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isMerchantOnline ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isMerchantOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={handleToggleMerchantStatus}
                    disabled={isTogglingMerchant}
                    className={`w-full h-12 ${isMerchantOnline ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'} shadow-lg`}
                  >
                    {isTogglingMerchant ? (
                      <><Loader2 className="animate-spin mr-2" size={14} /> Alterando...</>
                    ) : (
                      <><Power size={14} className="mr-2" /> {isMerchantOnline ? 'Fechar Loja' : 'Abrir Loja'}</>
                    )}
                  </Button>
                </>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">Teste a conexão primeiro</p>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-slate-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Status das Credenciais</h3>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">OAuth 2.0</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  credentialsOk ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {credentialsOk ? 'Configurado' : 'Pendente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Client ID</span>
                <span className="text-[10px] font-mono text-slate-500">{maskValue(clientId)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Client Secret</span>
                <span className="text-[10px] font-mono text-slate-500">{maskValue(clientSecret)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Merchant ID</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  establishmentId ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {establishmentId ? 'Configurado' : 'Pendente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Token (Legado)</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  token ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {token ? 'Configurado' : 'Opcional'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Globe size={14} className="text-slate-400" />
                <span className="text-xs text-slate-500 flex-1 ml-2">Ambiente</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  env === 'production' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {env === 'production' ? 'Produção' : 'Desenvolvimento'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <PhoneOff size={14} className="text-slate-400" />
                <span className="text-xs text-slate-500 flex-1 ml-2">Telefone (0800)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-400">
                  Protegido
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Integração</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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

export default UairangoSettingsPage;
