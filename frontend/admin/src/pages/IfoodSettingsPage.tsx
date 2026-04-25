import React, { useState, useEffect } from 'react';
import { getIfoodSettings, updateIfoodSettings } from '../services/api/integrations';
import { ArrowLeft, Save, Loader2, Zap, MessageSquare } from 'lucide-react';
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
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl flex items-center justify-center">
            <Zap size={18} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase">iFood</h1>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Integração de Pedidos</p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Toggle Ativo */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
            <input
              type="checkbox"
              id="ifoodActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 text-orange-500 rounded"
            />
            <label htmlFor="ifoodActive" className="text-sm font-medium">
              Ativar Integração iFood
            </label>
          </div>

          {/* Credenciais */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Credenciais</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Client ID</label>
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="xxxxx-xxxxx-xxxxx"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Client Secret</label>
              <Input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Restaurant ID</label>
              <Input
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                placeholder="ID do Restaurante no iFood"
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

          {/* Webhook Info */}
          {isActive && (
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={14} className="text-orange-600" />
                <p className="text-xs font-black text-orange-600 uppercase tracking-widest">
                  Webhook URL
                </p>
              </div>
              <code className="text-xs text-slate-600 break-all block">
                {typeof window !== 'undefined' 
                  ? `${window.location.origin}/api/ifood/webhook`
                  : 'https://seudominio.com/api/ifood/webhook'
                }
              </code>
              <p className="text-[10px] text-slate-400 mt-2">
                Configure esta URL no portal iFood Developer selecionando os eventos: PLACED, CONFIRMED, CANCELLED, ORDER_PATCHED
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/integrations')} className="flex-1">
              Voltar
            </Button>
            <Button type="submit" disabled={isSaving} className="flex-1 bg-orange-500 hover:bg-orange-600">
              {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save size={14} className="mr-2" />}
              Salvar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default IfoodSettingsPage;