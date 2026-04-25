import React, { useState, useEffect } from 'react';
import { getIfoodSettings, updateIfoodSettings } from '../services/api/integrations';
import { X, Save, Loader2, TestTube, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';

interface IfoodConfigModalProps {
  onClose: () => void;
}

export const IfoodConfigModal: React.FC<IfoodConfigModalProps> = ({ onClose }) => {
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
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Falha ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="max-w-md w-full mx-4 p-8 flex items-center justify-center">
          <Loader2 className="animate-spin text-orange-500" size={24} />
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl flex items-center justify-center">
                <Zap size={18} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase">iFood</h2>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider">Integração de Pedidos</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Toggle Ativo */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <input
                type="checkbox"
                id="ifoodActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-orange-500 rounded"
              />
              <label htmlFor="ifoodActive" className="text-sm font-medium">
                Integração Ativa
              </label>
            </div>

            {/* Credenciais */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Client ID</label>
                <Input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="xxxxx-xxxxx-xxxxx"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Client Secret</label>
                <Input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="••••••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Restaurant ID</label>
                <Input
                  value={restaurantId}
                  onChange={(e) => setRestaurantId(e.target.value)}
                  placeholder="ID do Restaurante no iFood"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ambiente</label>
                <select
                  value={env}
                  onChange={(e) => setEnv(e.target.value as any)}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm"
                >
                  <option value="homologation">Homologação (Teste)</option>
                  <option value="production">Produção</option>
                </select>
              </div>
            </div>

            {/* Webhook Info */}
            {isActive && (
              <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest mb-1">
                  Webhook URL
                </p>
                <code className="text-xs text-slate-600 break-all">
                  {typeof window !== 'undefined' 
                    ? `${window.location.origin}/api/ifood/webhook`
                    : 'https://seudominio.com/api/ifood/webhook'
                  }
                </code>
                <p className="text-[8px] text-slate-400 mt-2">
                  Configure esta URL no portal iFood Developer selecionando os eventos: PLACED, CONFIRMED, CANCELLED, ORDER_PATCHED
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="flex-1 bg-orange-500 hover:bg-orange-600">
                {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save size={14} className="mr-2" />}
                Salvar
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default IfoodConfigModal;