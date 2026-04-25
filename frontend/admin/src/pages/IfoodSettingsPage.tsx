import React, { useState, useEffect } from 'react';
import { getIfoodSettings, updateIfoodSettings } from '../services/api/integrations';
import { ArrowLeft, Save, Loader2, Zap, MessageSquare, CheckCircle, XCircle, ExternalLink, Key, Building } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

const IfoodSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [env, setEnv] = useState<'production' | 'homologation'>('homologation');
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await getIfoodSettings();
        setClientId(settings.ifoodClientId || '');
        setClientSecret(settings.ifoodClientSecret === '********' ? '' : settings.ifoodClientSecret || '');
        setRestaurantId(settings.ifoodRestaurantId || '');
        setEnv(settings.ifoodEnv || 'homologation');
        setIsActive(settings.ifoodIntegrationActive || false);
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
        ifoodClientId: clientId,
        ifoodClientSecret: clientSecret,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-orange-500" size={24} />
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
            <img src={require('../assets/ifood-logo.png').default} alt="iFood" className="w-9 h-9 object-contain" />
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
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Integração de Pedidos via API</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal - Formulário */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card de Credenciais */}
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Key size={18} className="text-orange-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Credenciais da API</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Configure seu Client ID e Client Secret</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Client ID</label>
                  <Input
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Client Secret</label>
                  <Input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="••••••••••••••••••••••"
                    className="h-12 bg-slate-50 border-slate-200 focus:bg-white"
                  />
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
                  <p className="text-sm font-bold text-slate-700">Ativar Integração iFood</p>
                  <p className="text-[10px] text-slate-400">Receba pedidos automaticamente</p>
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
                <Button type="submit" disabled={isSaving} className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20">
                  {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save size={14} className="mr-2" />}
                  Salvar Configurações
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Coluna Lateral - Info */}
        <div className="space-y-6">
          {/* Webhook URL */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-orange-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Webhook URL</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-900 rounded-lg">
                <code className="text-xs text-emerald-400 break-all font-mono">
                  {`${window.location.origin}/api/ifood/webhook`}
                </code>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Configure esta URL no portal iFood Developer selecionando os eventos: <span className="font-black text-slate-700">PLACED</span>, <span className="font-black text-slate-700">CONFIRMED</span>, <span className="font-black text-slate-700">CANCELLED</span>, <span className="font-black text-slate-700">ORDER_PATCHED</span>
              </p>
              <a 
                href="https://developer.ifood.com.br" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                Portal Developer <ExternalLink size={12} />
              </a>
            </div>
          </Card>

          {/* Dicas */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-2">
                <Building size={16} className="text-blue-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Dicas</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-black text-slate-500">1</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Teste primeiro no ambiente de <span className="font-black text-slate-700">Homologação</span> antes de ir para Produção
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-black text-slate-500">2</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mantenha suas credenciais <span className="font-black text-slate-700">em segurança</span> e nunca compartilhe
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-black text-slate-500">3</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  O Restaurant ID está disponível no seu perfil no portal iFood
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IfoodSettingsPage;