import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { 
  getIfoodSettings, 
  updateIfoodSettings,
  getSaiposSettings,
  updateSaiposSettings,
  getUairangoSettings,
  updateUairangoSettings
} from '../../services/api/integrations';
import { Card } from '../ui/Card';
import { Save, Loader2, ExternalLink, CheckCircle, XCircle, Zap } from 'lucide-react';

interface IfoodSettings {
  ifoodRestaurantId?: string;
  ifoodIntegrationActive?: boolean;
  ifoodEnv?: string;
  ifoodCredentialsConfigured?: boolean;
}

interface SaiposSettings {
  saiposPartnerId?: string;
  saiposSecret?: string;
  saiposCodStore?: string;
  saiposIntegrationActive?: boolean;
  saiposEnv?: string;
}

interface UairangoSettings {
  uairangoToken?: string;
  uairangoEstablishmentId?: string;
  uairangoActive?: boolean;
}

export const SettingsIntegrationsTab: React.FC = () => {
  const [activeIntegration, setActiveIntegration] = useState<'ifood' | 'saipos' | 'uairango'>('ifood');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [ifoodSettings, setIfoodSettings] = useState<IfoodSettings>({});
  const [saiposSettings, setSaiposSettings] = useState<SaiposSettings>({});
  const [uairangoSettings, setUairangoSettings] = useState<UairangoSettings>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [ifood, saipos, uairango] = await Promise.all([
        getIfoodSettings().catch(() => ({})),
        getSaiposSettings().catch(() => ({})),
        getUairangoSettings().catch(() => ({}))
      ]);
      
      setIfoodSettings(ifood || {});
      setSaiposSettings(saipos || {});
      setUairangoSettings(uairango || {});
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveIfood = async () => {
    setIsSaving(true);
    try {
      await updateIfoodSettings(ifoodSettings);
      toast.success('Configurações do iFood salvas!');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSaipos = async () => {
    setIsSaving(true);
    try {
      await updateSaiposSettings(saiposSettings);
      toast.success('Configurações da Saipos salvas!');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUairango = async () => {
    setIsSaving(true);
    try {
      await updateUairangoSettings(uairangoSettings);
      toast.success('Configurações do UaiRango salvas!');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const integrations = [
    { 
      id: 'ifood', 
      label: 'iFood', 
      icon: Zap,
      color: 'from-orange-500 to-orange-600',
      active: ifoodSettings.ifoodIntegrationActive
    },
    { 
      id: 'saipos', 
      label: 'Saipos', 
      icon: Zap,
      color: 'from-blue-500 to-blue-600',
      active: saiposSettings.saiposIntegrationActive
    },
    { 
      id: 'uairango', 
      label: 'UaiRango', 
      icon: Zap,
      color: 'from-green-500 to-green-600',
      active: uairangoSettings.uairangoActive
    }
  ] as const;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs de Integração */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <button
              key={integration.id}
              onClick={() => setActiveIntegration(integration.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                activeIntegration === integration.id
                  ? `bg-white shadow-md text-slate-900`
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
              )}
            >
              <Icon size={12} />
              {integration.label}
              {integration.active && (
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* iFood Settings */}
      {activeIntegration === 'ifood' && (
        <Card className="p-6 max-w-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase">iFood</h3>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">
                Integração de Pedidos
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="ifoodActive"
                checked={ifoodSettings.ifoodIntegrationActive || false}
                onChange={(e) => setIfoodSettings(prev => ({ ...prev, ifoodIntegrationActive: e.target.checked }))}
                className="w-4 h-4 text-orange-500"
              />
              <label htmlFor="ifoodActive" className="text-sm font-medium">
                Integração Ativa
              </label>
            </div>

            {/* Status das credenciais da plataforma */}
            <div className={`p-3 rounded-lg border ${ifoodSettings.ifoodCredentialsConfigured 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-red-50 border-red-200'}`}>
              <p className={`text-[8px] font-black uppercase tracking-widest ${ifoodSettings.ifoodCredentialsConfigured ? 'text-emerald-600' : 'text-red-600'}`}>
                {ifoodSettings.ifoodCredentialsConfigured ? 'Credenciais da plataforma configuradas' : 'Credenciais não configuradas'}
              </p>
              <p className="text-[8px] text-slate-400 mt-1">
                Client ID e Secret são gerenciados pelo administrador do sistema
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Restaurant ID</label>
                <input
                  type="text"
                  value={ifoodSettings.ifoodRestaurantId || ''}
                  onChange={(e) => setIfoodSettings(prev => ({ ...prev, ifoodRestaurantId: e.target.value }))}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm"
                  placeholder="ID do Restaurante"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ambiente</label>
                <select
                  value={ifoodSettings.ifoodEnv || 'homologation'}
                  onChange={(e) => setIfoodSettings(prev => ({ ...prev, ifoodEnv: e.target.value }))}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm"
                >
                  <option value="homologation">Homologação (Teste)</option>
                  <option value="production">Produção</option>
                </select>
              </div>
            </div>

            {ifoodSettings.ifoodIntegrationActive && (
              <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                  Recebimento de Pedidos
                </p>
                <p className="text-xs text-emerald-700 font-bold">Polling Ativo (a cada 30s)</p>
                <p className="text-[8px] text-slate-400 mt-2">
                  O sistema busca automaticamente novos pedidos do iFood
                </p>
              </div>
            )}

            <button
              onClick={handleSaveIfood}
              disabled={isSaving}
              className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Salvar Configurações
            </button>
          </div>
        </Card>
      )}

      {/* Saipos Settings */}
      {activeIntegration === 'saipos' && (
        <Card className="p-6 max-w-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase">Saipos</h3>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">
                Integração de Pedidos
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="saiposActive"
                checked={saiposSettings.saiposIntegrationActive || false}
                onChange={(e) => setSaiposSettings(prev => ({ ...prev, saiposIntegrationActive: e.target.checked }))}
                className="w-4 h-4 text-blue-500"
              />
              <label htmlFor="saiposActive" className="text-sm font-medium">
                Integração Ativa
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Partner ID</label>
                <input
                  type="text"
                  value={saiposSettings.saiposPartnerId || ''}
                  onChange={(e) => setSaiposSettings(prev => ({ ...prev, saiposPartnerId: e.target.value }))}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Secret</label>
                <input
                  type="password"
                  value={saiposSettings.saiposSecret || ''}
                  onChange={(e) => setSaiposSettings(prev => ({ ...prev, saiposSecret: e.target.value }))}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Código Loja</label>
                <input
                  type="text"
                  value={saiposSettings.saiposCodStore || ''}
                  onChange={(e) => setSaiposSettings(prev => ({ ...prev, saiposCodStore: e.target.value }))}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ambiente</label>
                <select
                  value={saiposSettings.saiposEnv || 'homologation'}
                  onChange={(e) => setSaiposSettings(prev => ({ ...prev, saiposEnv: e.target.value }))}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm"
                >
                  <option value="homologation">Homologação</option>
                  <option value="production">Produção</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSaveSaipos}
              disabled={isSaving}
              className="w-full h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Salvar Configurações
            </button>
          </div>
        </Card>
      )}

      {/* UaiRango Settings */}
      {activeIntegration === 'uairango' && (
        <Card className="p-6 max-w-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase">UaiRango</h3>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">
                Importação de Cardápio
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="uairangoActive"
                checked={uairangoSettings.uairangoActive || false}
                onChange={(e) => setUairangoSettings(prev => ({ ...prev, uairangoActive: e.target.checked }))}
                className="w-4 h-4 text-green-500"
              />
              <label htmlFor="uairangoActive" className="text-sm font-medium">
                Integração Ativa
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Token de Desenvolvedor</label>
              <input
                type="password"
                value={uairangoSettings.uairangoToken || ''}
                onChange={(e) => setUairangoSettings(prev => ({ ...prev, uairangoToken: e.target.value }))}
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm"
                placeholder="••••••••••••"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ID do Establecimento</label>
              <input
                type="text"
                value={uairangoSettings.uairangoEstablishmentId || ''}
                onChange={(e) => setUairangoSettings(prev => ({ ...prev, uairangoEstablishmentId: e.target.value }))}
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm"
              />
            </div>

            <button
              onClick={handleSaveUairango}
              disabled={isSaving}
              className="w-full h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Salvar Configurações
            </button>
          </div>
        </Card>
      )}
    </div>
  );
};