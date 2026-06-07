import React, { useState, useEffect } from 'react';
import { 
  getUairangoSettings, 
  updateUairangoSettings, 
  importUairangoMenu, 
  getUairangoConnectionStatus, 
  updateUairangoMerchantStatus
} from '../services/api';
import { ArrowLeft, Save, Loader2, Database, Download, CheckCircle, XCircle, Wifi, WifiOff, Store, Power, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import uairangoLogo from '../assets/uairango-logo.png';

const UairangoSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [establishmentId, setEstablishmentId] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastImport, setLastImport] = useState<Date | null>(null);
  const [uairangoEnv, setUairangoEnv] = useState<'production' | 'development'>('production');

  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; merchant?: any; operations?: any[]; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [isMerchantOnline, setIsMerchantOnline] = useState(false);
  const [isTogglingMerchant, setIsTogglingMerchant] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await getUairangoSettings();
        setEstablishmentId(settings.uairangoEstablishmentId || '');
        setIsActive(settings.uairangoActive || false);
        setAutoAccept(settings.uairangoAutoAcceptOrders || false);
        setUairangoEnv(settings.uairangoEnv || 'production');
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar configurações do UaiRango.');
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
      await updateUairangoSettings({ 
        uairangoEstablishmentId: establishmentId,
        uairangoActive: isActive,
        uairangoAutoAcceptOrders: autoAccept,
        uairangoEnv: uairangoEnv,
      });
      toast.success('Configurações salvas!');
    } catch (error) {
      toast.error('Falha ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!isActive || !establishmentId) {
      toast.error('Ative a integração e configure o Merchant ID antes de testar.');
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
        toast.success('Conexão estabelecida!');
      } else {
        toast.error(status.error || 'Falha na conexão.');
      }
    } catch (error) {
      toast.error('Erro ao testar conexão.');
    } finally {
      setIsTesting(false);
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
    if (!establishmentId) {
      toast.error('Configure o Merchant ID antes de importar.');
      return;
    }
    if (!isActive) {
      toast.error('Ative a integração primeiro.');
      return;
    }

    setIsImporting(true);
    try {
      const result = await importUairangoMenu();
      toast.success(`Importação concluída: ${result.importedCount} itens importados!`);
      setLastImport(new Date());
    } catch (error) {
      console.error(error);
      toast.error('Erro ao importar cardápio.');
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
                {isActive ? 'Ativo' : 'Desativado'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Integração Centralizada</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Store size={18} className="text-orange-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Configuração</h2>
                  <p className="text-[10px] text-slate-500 font-medium">Integração via OAuth 2.0 (centralizado)</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-tight">Merchant ID</label>
                <Input 
                  value={establishmentId} 
                  onChange={e => setEstablishmentId(e.target.value)} 
                  placeholder="Cole o ID do estabelecimento (ex: f4af41ba-e01e-4500-b5cf-0bcb130589db)" 
                  className="h-12 bg-slate-50 border-slate-200 focus:bg-white font-mono text-sm"
                />
                <p className="text-[10px] text-slate-500">Encontre o Merchant ID no painel do UaiRango</p>
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
                  <p className="text-sm font-bold text-slate-700">Ativar Integração</p>
                  <p className="text-[10px] text-slate-500">Sincronizar cardápio e receber pedidos</p>
                </div>
                {isActive ? (
                  <CheckCircle size={20} className="text-emerald-500" />
                ) : (
                  <XCircle size={20} className="text-slate-500" />
                )}
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAutoAccept(!autoAccept)}
                  className={`relative w-14 h-8 rounded-full transition-all ${
                    autoAccept ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                    autoAccept ? 'left-7' : 'left-1'
                  }`} />
                </button>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">Aceitar Pedidos Automaticamente</p>
                  <p className="text-[10px] text-slate-500">Novos pedidos são aceitos sem intervenção</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">Ambiente</p>
                  <p className="text-[10px] text-slate-500">
                    {uairangoEnv === 'production' ? 'Produção (dados reais)' : 'Sandbox (teste)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUairangoEnv(uairangoEnv === 'production' ? 'development' : 'production')}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    uairangoEnv === 'production' 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {uairangoEnv === 'production' ? 'PRODUÇÃO' : 'SANDBOX'}
                </button>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => navigate('/integrations')} className="flex-1 h-12">
                  Voltar
                </Button>
                <Button type="submit" disabled={isSaving} className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20">
                  {isSaving ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save size={14} className="mr-2" />}
                  Salvar
                </Button>
              </div>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Wifi size={18} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 uppercase text-sm tracking-tight">Testar Conexão</h2>
                  <p className="text-[10px] text-slate-500 font-medium">Verifique a comunicação com UaiRango</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <Button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !isActive || !establishmentId}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
              >
                {isTesting ? (
                  <><Loader2 className="animate-spin mr-3" size={18} />Testando...</>
                ) : (
                  <><Wifi size={18} className="mr-3" />Testar Conexão</>
                )}
              </Button>

              {connectionStatus && (
                <div className="p-4 rounded-xl border" style={{
                  backgroundColor: connectionStatus.connected ? '#f0fdf4' : '#fef2f2',
                  borderColor: connectionStatus.connected ? '#bbf7d0' : '#fecaca'
                }}>
                  <div className="flex items-center gap-2 mb-3">
                    {connectionStatus.connected ? (
                      <><CheckCircle size={18} className="text-emerald-600" /><span className="font-bold text-emerald-700">Conectado</span></>
                    ) : (
                      <><AlertTriangle size={18} className="text-red-600" /><span className="font-bold text-red-700">Falha na Conexão</span></>
                    )}
                  </div>
                  {connectionStatus.connected && connectionStatus.merchant && (
                    <div className="space-y-1 text-sm">
                      <p><span className="font-semibold text-slate-600">Loja:</span> <span className="text-slate-800">{connectionStatus.merchant.name}</span></p>
                      <p><span className="font-semibold text-slate-600">Razão Social:</span> <span className="text-slate-800">{connectionStatus.merchant.corporateName}</span></p>
                      <p><span className="font-semibold text-slate-600">Cidade:</span> <span className="text-slate-800">{connectionStatus.merchant.address?.city}/{connectionStatus.merchant.address?.state}</span></p>
                    </div>
                  )}
                  {!connectionStatus.connected && connectionStatus.error && (
                    <p className="text-sm text-red-600">{connectionStatus.error}</p>
                  )}
                </div>
              )}
            </div>
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
                    <p className="text-[10px] text-slate-500 font-medium">Sincronizar produtos do UaiRango</p>
                  </div>
                </div>
                {lastImport && (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase">Última importação</p>
                    <p className="text-xs font-black text-slate-600">{lastImport.toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs text-amber-800 leading-relaxed">
                  A importação buscará <span className="font-black">categorias, produtos e fotos</span> diretamente do UaiRango. 
                  Pizzas serão organizadas automaticamente no formato <span className="font-black">Produto Base + Grupo de Sabores</span>.
                </p>
              </div>

              <Button 
                onClick={handleImportMenu} 
                disabled={isImporting || !isActive || !establishmentId}
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
                    Importar Cardápio
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white">
              <div className="flex items-center gap-2">
                <Store size={16} className="text-violet-500" />
                <h3 className="font-black text-slate-800 text-sm uppercase">Status da Loja</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {connectionStatus?.connected ? (
                <>
                  {merchantName && (
                    <div className="text-center pb-2 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-800">{merchantName}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Delivery</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isMerchantOnline ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isMerchantOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Retirada</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isMerchantOnline ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isMerchantOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={handleToggleMerchantStatus}
                    disabled={isTogglingMerchant || !connectionStatus?.connected}
                    className={`w-full h-12 ${isMerchantOnline ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'} shadow-lg`}
                  >
                    {isTogglingMerchant ? (
                      <><Loader2 className="animate-spin mr-2" size={14} />Alterando...</>
                    ) : (
                      <><Power size={14} className="mr-2" />{isMerchantOnline ? 'Fechar Loja' : 'Abrir Loja'}</>
                    )}
                  </Button>
                  {!connectionStatus?.connected && (
                    <p className="text-[10px] text-slate-500 text-center mt-1">Teste a conexão primeiro</p>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <WifiOff size={24} className="mx-auto text-slate-500 mb-2" />
                  <p className="text-xs text-slate-500">Teste a conexão primeiro</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UairangoSettingsPage;