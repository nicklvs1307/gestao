import React, { useState, useEffect } from 'react';
import { getAsaasSettings, updateAsaasSettings, testAsaasConnection } from '../services/api/integrations';
import { ArrowLeft, Save, Loader2, CheckCircle, AlertCircle, WifiOff, Eye, EyeOff, QrCode, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import asaasLogo from '../assets/asaas-logo.png';

const AsaasSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [isActive, setIsActive] = useState(false);
  const [pixEnabled, setPixEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await getAsaasSettings();
        setIsConfigured(settings.asaasConfigured || false);
        setEnvironment(settings.asaasEnvironment || 'sandbox');
        setIsActive(settings.asaasActive || false);
        setPixEnabled(settings.asaasPixEnabled || false);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar configurações do Asaas.');
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
      const payload: Record<string, unknown> = {
        asaasEnvironment: environment,
        asaasActive: isActive,
        asaasPixEnabled: pixEnabled,
      };

      // Só enviar API Key se o usuário digitou uma nova
      if (apiKey.trim()) {
        payload.asaasApiKey = apiKey.trim();
      }

      await updateAsaasSettings(payload);
      setIsConfigured(true);
      setApiKey('');
      toast.success('Configurações Asaas salvas!');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Falha ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus(null);
    try {
      await testAsaasConnection();
      setConnectionStatus('success');
      toast.success('Conexão com Asaas validada!');
    } catch (error) {
      setConnectionStatus('error');
      toast.error('Falha na conexão. Verifique a API Key.');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-500" size={24} />
      </div>
    );
  }

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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 p-2">
            <img src={asaasLogo} alt="Asaas" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Asaas</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Pagamento PIX Online</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
          {isActive ? 'ATIVO' : 'DESATIVADO'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Credenciais */}
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Credenciais</h2>
          <p className="text-xs text-slate-500">
            Obtenha sua API Key no painel do Asaas em Configurações → API.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={isConfigured ? '••••••••••••••••••••••••' : 'Cole sua API Key do Asaas'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {isConfigured && !apiKey && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle size={12} /> API Key configurada
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ambiente</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEnvironment('sandbox')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  environment === 'sandbox'
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Sandbox (Testes)
              </button>
              <button
                type="button"
                onClick={() => setEnvironment('production')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  environment === 'production'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Produção
              </button>
            </div>
          </div>
        </Card>

        {/* Configurações */}
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Configurações</h2>

          <div className="flex items-center justify-between py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-900">Integração Ativa</p>
              <p className="text-xs text-slate-500">Habilitar pagamento via Asaas</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className="text-slate-400 hover:text-blue-500 transition-colors"
            >
              {isActive ? <ToggleRight size={36} className="text-blue-500" /> : <ToggleLeft size={36} />}
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">PIX no Cardápio Digital</p>
              <p className="text-xs text-slate-500">Exibir opção de pagamento PIX para clientes</p>
            </div>
            <button
              type="button"
              onClick={() => setPixEnabled(!pixEnabled)}
              className="text-slate-400 hover:text-blue-500 transition-colors"
            >
              {pixEnabled ? <ToggleRight size={36} className="text-blue-500" /> : <ToggleLeft size={36} />}
            </button>
          </div>
        </Card>

        {/* Teste de Conexão */}
        {isConfigured && (
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Teste de Conexão</h2>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center gap-2"
              >
                {isTesting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : connectionStatus === 'success' ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : connectionStatus === 'error' ? (
                  <AlertCircle size={16} className="text-red-500" />
                ) : (
                  <WifiOff size={16} />
                )}
                {isTesting ? 'Testando...' : 'Testar Conexão'}
              </Button>
              {connectionStatus === 'success' && (
                <span className="text-xs text-green-600 font-bold">Conexão OK!</span>
              )}
              {connectionStatus === 'error' && (
                <span className="text-xs text-red-600 font-bold">Falha na conexão</span>
              )}
            </div>
          </Card>
        )}

        {/* Webhook Info */}
        <Card className="p-6 space-y-4 bg-blue-50/50 border-blue-100">
          <h2 className="text-sm font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
            <QrCode size={16} /> Webhook
          </h2>
          <div className="space-y-2">
            <p className="text-xs text-blue-800">
              Configure esta URL no painel do Asaas para receber notificações de pagamento:
            </p>
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <code className="text-xs text-blue-600 break-all">
                {window.location.origin}/webhooks/asaas
              </code>
            </div>
            <p className="text-xs text-blue-600">
              O webhook atualiza automaticamente o status do pedido quando o pagamento é confirmado.
            </p>
          </div>
        </Card>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-8"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AsaasSettingsPage;
