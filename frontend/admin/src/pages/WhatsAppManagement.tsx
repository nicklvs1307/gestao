import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MessageSquare, 
  Settings, 
  Power, 
  RefreshCw, 
  Bot, 
  CheckCircle2, 
  Save,
  Loader2,
  LogOut,
  RotateCw,
  Trash2,
  BarChart3,
  TrendingUp,
  Users,
  MessageCircle,
  Sparkles,
  Link2,
  Gauge,
  Zap
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { cn } from '../lib/utils';

import { WhatsAppIcon } from '../components/whatsapp/WhatsAppIcon';
import { MetricCard } from '../components/whatsapp/MetricCard';
import { ConnectionCard } from '../components/whatsapp/ConnectionCard';
import { KnowledgeBase } from '../components/whatsapp/KnowledgeBase';
import { 
  MetricsGridSkeleton, 
  SettingsCardSkeleton, 
  KnowledgeBaseSkeleton 
} from '../components/whatsapp/Skeleton';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SOCKET_URL = API_URL.replace('/api', '');

// Tab Types
type TabType = 'connection' | 'metrics' | 'agent' | 'knowledge';

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'connection', label: 'Conexão', icon: <Link2 size={18} /> },
  { id: 'metrics', label: 'Métricas', icon: <Gauge size={18} /> },
  { id: 'agent', label: 'Agente IA', icon: <Bot size={18} /> },
  { id: 'knowledge', label: 'Base de Conhecimento', icon: <Sparkles size={18} /> },
];

const WhatsAppManagement: React.FC = () => {
  // User & Restaurant
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const restaurantId = user?.restaurantId;

  // Loading States
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('connection');
  const [statusLoading, setStatusLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Instance & Settings
  const [instance, setInstance] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>({
    agentEnabled: false,
    agentName: 'Atendente Virtual',
    agentPersona: '',
    welcomeMessage: '',
    autoAcceptOrders: false
  });
  const [metrics, setMetrics] = useState<any>(null);

  // Helper para headers
  const getHeaders = useCallback(() => ({
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'x-restaurant-id': restaurantId
    }
  }), [restaurantId]);

  // Derived states with useMemo
  const connectionStatus = useMemo(() => {
    if (!instance) return 'NOT_CREATED';
    if (instance.localStatus === 'CONNECTED') return 'CONNECTED';
    if (instance.localStatus === 'CONNECTING') return 'CONNECTING';
    if (!instance.name) return 'NOT_CREATED';
    return 'DISCONNECTED';
  }, [instance]);

  const instanceDetails = useMemo(() => ({
    instanceName: instance?.name,
    owner: instance?.instance?.owner,
    phone: instance?.instance?.number,
    connectedSince: instance?.instance?.status === 'CONNECTED' 
      ? new Date(instance.instance.statusTime).toLocaleString('pt-BR')
      : undefined
  }), [instance]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [instanceRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/whatsapp/status`, getHeaders()),
        axios.get(`${API_URL}/whatsapp/settings`, getHeaders())
      ]);
      
      setInstance(instanceRes.data);
      setSettings(settingsRes.data);
      
      if (instanceRes.data.localStatus === 'CONNECTING' || (!instanceRes.data.instance?.state && instanceRes.data.base64)) {
        setQrCode(instanceRes.data.base64);
      } else {
        setQrCode(null);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do WhatsApp:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoadingMetrics(true);
      const res = await axios.get(`${API_URL}/whatsapp/metrics`, getHeaders());
      setMetrics(res.data);
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    } finally {
      setLoadingMetrics(false);
    }
  }, [getHeaders]);

  // Socket connection
  useEffect(() => {
    if (!restaurantId) {
      toast.error('Contexto de restaurante não encontrado');
      setLoading(false);
      return;
    }

    fetchData();

    const socket = io(SOCKET_URL, { query: { restaurantId } });

    socket.on('whatsapp_status', (data) => {
      console.log('Update de status via socket:', data);
      setInstance((prev: any) => ({
        ...prev,
        localStatus: data.status,
        name: data.instanceName
      }));
      if (data.status === 'CONNECTED') {
        setQrCode(null);
        toast.success('WhatsApp conectado!');
      }
    });

    socket.on('whatsapp_qrcode', (data) => {
      console.log('Novo QR Code via socket');
      setQrCode(data.qrcode);
      setInstance((prev: any) => ({
        ...prev,
        localStatus: 'CONNECTING'
      }));
    });

    return () => { socket.disconnect(); };
  }, [restaurantId, fetchData]);

  // Handlers com useCallback
  const handleConnect = useCallback(async () => {
    try {
      setActionLoading(true);
      const res = await axios.post(`${API_URL}/whatsapp/connect`, {}, getHeaders());
      const instanceData = res.data;
      setInstance({
        ...instanceData,
        localStatus: instanceData.localStatus || instanceData.status
      });
      toast.success('Instância sincronizada! Aguarde o QR Code.');
      
      if (instanceData.status !== 'CONNECTED') {
        await handleRefreshQr();
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
      toast.error('Erro ao conectar ao WhatsApp');
    } finally {
      setActionLoading(false);
    }
  }, [getHeaders]);

  const handleRefreshQr = useCallback(async () => {
    try {
      setActionLoading(true);
      const qrRes = await axios.get(`${API_URL}/whatsapp/qrcode`, getHeaders());
      setQrCode(qrRes.data.base64);
      toast.success('QR Code atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar QR Code');
    } finally {
      setActionLoading(false);
    }
  }, [getHeaders]);

  const handleLogout = useCallback(async () => {
    try {
      setActionLoading(true);
      await axios.post(`${API_URL}/whatsapp/logout`, {}, getHeaders());
      toast.success('Instância desconectada.');
      await fetchData();
    } catch (error) {
      toast.error('Erro ao desconectar instância.');
    } finally {
      setActionLoading(false);
    }
  }, [getHeaders, fetchData]);

  const handleRestart = useCallback(async () => {
    try {
      setActionLoading(true);
      await axios.post(`${API_URL}/whatsapp/restart`, {}, getHeaders());
      toast.success('Instância reiniciada. Aguarde o novo QR Code ou conexão.');
      await fetchData();
    } catch (error) {
      toast.error('Erro ao reiniciar instância.');
    } finally {
      setActionLoading(false);
    }
  }, [getHeaders, fetchData]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Tem certeza que deseja deletar esta instância do WhatsApp? Isso não pode ser desfeito.')) return;
    
    try {
      setActionLoading(true);
      await axios.delete(`${API_URL}/whatsapp/delete`, getHeaders());
      toast.success('Instância deletada.');
      setInstance(null);
      setQrCode(null);
    } catch (error) {
      toast.error('Erro ao deletar instância.');
    } finally {
      setActionLoading(false);
    }
  }, [getHeaders]);

  const handleSaveSettings = useCallback(async () => {
    try {
      setSavingSettings(true);
      await axios.put(`${API_URL}/whatsapp/settings`, settings, getHeaders());
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingSettings(false);
    }
  }, [settings, getHeaders]);

  const handleClearHistory = useCallback(async () => {
    if (!confirm('Deseja realmente limpar TODO o histórico de conversas do agente? Esta ação fará com que a IA perca o contexto.')) return;

    try {
      setClearingHistory(true);
      await axios.post(`${API_URL}/whatsapp/clear-history`, { all: true }, getHeaders());
      toast.success('Histórico de conversas reiniciado!');
      fetchMetrics();
    } catch (error) {
      toast.error('Erro ao limpar histórico');
    } finally {
      setClearingHistory(false);
    }
  }, [getHeaders, fetchMetrics]);

  const handleToggleAgent = useCallback((enabled: boolean) => {
    setSettings(prev => ({ ...prev, agentEnabled: enabled }));
  }, []);

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'connection':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ConnectionCard
              status={connectionStatus}
              instanceName={instanceDetails.instanceName}
              owner={instanceDetails.owner}
              phone={instanceDetails.phone}
              connectedSince={instanceDetails.connectedSince}
              isLoading={loading}
              isActionLoading={actionLoading}
              onConnect={handleConnect}
              onDisconnect={handleLogout}
              onRestart={handleRestart}
              onDelete={handleDelete}
              onRefreshQr={handleRefreshQr}
              qrCode={qrCode}
              className="lg:col-span-1"
            />
            
            {!loading && connectionStatus === 'CONNECTED' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <CheckCircle2 size={20} />
                  </div>
                  <h3 className="font-bold text-gray-900">Status da Conexão</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 size={18} />
                      <span className="font-medium">Tudo pronto!</span>
                    </div>
                    <p className="text-sm text-emerald-600 mt-1">
                      Seu sistema está recebendo eventos do WhatsApp em tempo real.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'metrics':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/25">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Métricas do Agente</h2>
                  <p className="text-sm text-gray-500">Acompanhe o desempenho da IA</p>
                </div>
              </div>
              <button
                onClick={fetchMetrics}
                disabled={loadingMetrics}
                className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center gap-2"
              >
                {loadingMetrics ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                <span>Atualizar</span>
              </button>
            </div>

            {loadingMetrics || !metrics ? (
              <MetricsGridSkeleton />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="Conversas"
                    value={metrics.totalConversations}
                    subtitle={`${metrics.activeConversations} ativas (24h)`}
                    icon={<Users size={20} />}
                    color="blue"
                  />
                  <MetricCard
                    title="Mensagens"
                    value={metrics.monthMessages}
                    subtitle={`${metrics.todayMessages} hoje`}
                    icon={<MessageCircle size={20} />}
                    color="purple"
                  />
                  <MetricCard
                    title="Pedidos (mês)"
                    value={metrics.ordersCreatedByAI}
                    subtitle="Via agente IA"
                    icon={<CheckCircle2 size={20} />}
                    color="green"
                  />
                  <MetricCard
                    title="Status"
                    value={metrics.agentEnabled ? 'Ativo' : 'Inativo'}
                    subtitle={`${metrics.conversationsWithAgent} IA | ${metrics.conversationsWithHuman} humano`}
                    icon={<TrendingUp size={20} />}
                    color={metrics.agentEnabled ? 'green' : 'orange'}
                  />
                </div>

                {metrics.debug?.skills && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Zap size={18} className="text-amber-500" />
                      Skills Ativas ({metrics.debug.skills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {metrics.debug.skills.map((skill: any) => (
                        <div key={skill.name} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                          <span className="text-sm font-semibold text-gray-700 capitalize">{skill.name}</span>
                          <span className="text-xs text-gray-400 ml-2">({skill.tools.length} tools)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'agent':
        return (
          <div className="space-y-6">
            <AgentSettingsCard
              settings={settings}
              onSettingsChange={setSettings}
              onSave={handleSaveSettings}
              onToggleAgent={handleToggleAgent}
              onClearHistory={handleClearHistory}
              savingSettings={savingSettings}
              clearingHistory={clearingHistory}
            />
          </div>
        );

      case 'knowledge':
        return restaurantId ? (
          <KnowledgeBase restaurantId={restaurantId} getHeaders={getHeaders} />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/25">
          <WhatsAppIcon size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp & IA</h1>
          <p className="text-gray-500">Gerencie sua conexão e agente conversacional</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all',
              activeTab === tab.id
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {renderTabContent()}
      </div>
    </div>
  );
};

// Agent Settings Card Component (separated for cleanliness)
interface AgentSettingsCardProps {
  settings: any;
  onSettingsChange: (settings: any) => void;
  onSave: () => void;
  onToggleAgent: (enabled: boolean) => void;
  onClearHistory: () => void;
  savingSettings: boolean;
  clearingHistory: boolean;
}

const AgentSettingsCard: React.FC<AgentSettingsCardProps> = ({
  settings,
  onSettingsChange,
  onSave,
  onToggleAgent,
  onClearHistory,
  savingSettings,
  clearingHistory,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/25">
              <Bot size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Agente Conversacional (IA)</h3>
              <p className="text-sm text-gray-500">Automatize seu atendimento</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Status do Agente:</span>
            <button
              onClick={() => onToggleAgent(!settings.agentEnabled)}
              className={cn(
                'relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300',
                settings.agentEnabled 
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
                  : 'bg-gray-200'
              )}
            >
              <span 
                className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300',
                  settings.agentEnabled ? 'translate-x-6' : 'translate-x-1'
                )} 
              />
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Agente</label>
            <input 
              type="text" 
              value={settings.agentName}
              onChange={(e) => onSettingsChange({ ...settings, agentName: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
              placeholder="Ex: Bia do Suporte"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Mensagem de Boas-vindas</label>
            <textarea 
              rows={4}
              value={settings.welcomeMessage}
              onChange={(e) => onSettingsChange({ ...settings, welcomeMessage: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition resize-none"
              placeholder="Olá! Bem-vindo ao..."
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="h-full">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Persona e Regras (Prompt)</label>
            <textarea 
              rows={10}
              value={settings.agentPersona}
              onChange={(e) => onSettingsChange({ ...settings, agentPersona: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition resize-none font-mono text-sm"
              placeholder="Você é um atendente da hamburgueria... Objetivos: ..."
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
        <button
          onClick={onClearHistory}
          disabled={clearingHistory}
          className="text-red-500 hover:text-red-700 text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50"
        >
          {clearingHistory ? <RefreshCw className="animate-spin" size={16} /> : <RotateCw size={16} />}
          <span>Reiniciar Todas as Conversas</span>
        </button>

        <button
          onClick={onSave}
          disabled={savingSettings}
          className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-2"
        >
          {savingSettings ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
          <span>Salvar Configurações</span>
        </button>
      </div>
    </div>
  );
};

export default WhatsAppManagement;
