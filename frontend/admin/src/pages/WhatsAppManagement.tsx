import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Settings, 
  Power, 
  RefreshCw, 
  Bot, 
  CheckCircle2, 
  XCircle,
  QrCode,
  Save,
  Loader2,
  LogOut,
  RotateCw,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const WhatsAppManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const restaurantId = user?.restaurantId;

  const [instance, setInstance] = useState<any>(null);
  const [settings, setSettings] = useState<any>({
    agentEnabled: false,
    agentName: 'Atendente Virtual',
    agentPersona: '',
    welcomeMessage: '',
    autoAcceptOrders: false
  });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [actionLoading, setActionLoading] = useState(false); // Para ações de controle

  // Helper para headers
  const getHeaders = () => ({
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'x-restaurant-id': restaurantId
    }
  });

  useEffect(() => {
    if (restaurantId) {
      fetchData();
      const interval = setInterval(fetchData, 10000); // Atualiza a cada 10 segundos
      return () => clearInterval(interval);
    } else {
      toast.error('Contexto de restaurante não encontrado');
      setLoading(false);
    }
  }, [restaurantId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [instanceRes, settingsRes] = await Promise.all([
        axios.get(`${API_URL}/whatsapp/status`, getHeaders()),
        axios.get(`${API_URL}/whatsapp/settings`, getHeaders())
      ]);
      
      setInstance(instanceRes.data);
      setSettings(settingsRes.data);
      // Se a instância estiver CONECTANDO ou o QR Code for exibido, busca o QR Code
      if (instanceRes.data.localStatus === 'CONNECTING' || (!instanceRes.data.instance?.state && instanceRes.data.base64)) {
        setQrCode(instanceRes.data.base64); // A API de status já pode retornar o QR code
      } else {
        setQrCode(null);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do WhatsApp:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setActionLoading(true);
      const res = await axios.post(`${API_URL}/whatsapp/connect`, {}, getHeaders());
      setInstance(res.data);
      toast.success('Instância criada! Escaneie o QR Code.');
      await fetchData(); // Atualiza dados para mostrar o QR code
    } catch (error) {
      toast.error('Erro ao conectar ao WhatsApp');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefreshQr = async () => {
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
  };

  const handleLogout = async () => {
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
  };

  const handleRestart = async () => {
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
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja deletar esta instância do WhatsApp? Isso não pode ser desfeito.')) {
      return;
    }
    try {
      setActionLoading(true);
      await axios.delete(`${API_URL}/whatsapp/delete`, getHeaders());
      toast.success('Instância deletada.');
      setInstance(null); // Limpa a instância do estado
      setQrCode(null);
    } catch (error) {
      toast.error('Erro ao deletar instância.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await axios.put(`${API_URL}/whatsapp/settings`, settings, getHeaders());
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isConnected = instance?.localStatus === 'CONNECTED';
  const isConnecting = instance?.localStatus === 'CONNECTING'; // Pode ser conectando ou esperando QR Code
  const isNotCreated = instance?.localStatus === 'NOT_CREATED' || !instance?.name; // 'NOT_CREATED' ou sem nome de instância local

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header Conexão */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
          <div className={`p-4 rounded-full ${isConnected ? 'bg-green-100 text-green-600' : isConnecting ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
            <MessageSquare size={48} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">WhatsApp</h2>
            <p className="text-sm text-gray-500">
              {isConnected ? 'Sua conta está conectada' : isConnecting ? 'Aguardando leitura do QR Code...' : 'Aguardando conexão'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-sm font-medium uppercase tracking-wider">
              {isConnected ? 'Online' : isConnecting ? 'Conectando' : 'Offline'}
            </span>
          </div>

          {isNotCreated && (
            <button
              onClick={handleConnect}
              disabled={actionLoading}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 transition flex items-center justify-center space-x-2"
            >
              {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <Power size={20} />}
              <span>Criar Instância</span>
            </button>
          )}

          {!isNotCreated && !isConnected && !isConnecting && ( // Se existe mas não está conectado ou conectando
            <button
              onClick={handleRestart} // Tenta reiniciar para gerar um novo QR Code ou conectar
              disabled={actionLoading}
              className="w-full bg-yellow-500 text-white py-2 rounded-lg font-medium hover:bg-yellow-600 transition flex items-center justify-center space-x-2"
            >
              {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <RotateCw size={20} />}
              <span>Tentar Reconectar</span>
            </button>
          )}

          {isConnected && (
            <div className="space-y-2 w-full">
              <button
                onClick={handleLogout}
                disabled={actionLoading}
                className="w-full bg-yellow-500 text-white py-2 rounded-lg font-medium hover:bg-yellow-600 transition flex items-center justify-center space-x-2"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <LogOut size={20} />}
                <span>Desconectar</span>
              </button>
              <button
                onClick={handleRestart}
                disabled={actionLoading}
                className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition flex items-center justify-center space-x-2"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <RotateCw size={20} />}
                <span>Reiniciar</span>
              </button>
            </div>
          )}

          {!isNotCreated && ( // Botão de deletar sempre visível se a instância existe localmente
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="w-full bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 transition flex items-center justify-center space-x-2"
            >
              {actionLoading ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
              <span>Deletar Instância</span>
            </button>
          )}
        </div>

        {/* QR Code ou Status Detalhado */}
        <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          {!isConnected && qrCode && isConnecting ? ( // Exibe QR Code apenas se estiver CONECTANDO e tiver QR Code
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <h3 className="font-bold text-gray-800 flex items-center space-x-2">
                <QrCode size={20} />
                <span>Escaneie o código abaixo</span>
              </h3>
              <div className="p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
              </div>
              <button 
                onClick={handleRefreshQr}
                disabled={actionLoading}
                className="text-primary text-sm font-bold flex items-center space-x-1 hover:underline"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                <span>Atualizar QR Code</span>
              </button>
              <p className="text-xs text-gray-400 text-center max-w-xs">
                Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e aponte a câmera para esta tela.
              </p>
            </div>
          ) : isConnected ? (
            <div className="space-y-6">
              <h3 className="font-bold text-gray-800 border-b pb-2">Detalhes da Instância</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Instância</p>
                  <p className="font-mono text-sm">{instance?.name || 'N/A'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Aparelho</p>
                  <p className="text-sm">{instance?.instance?.owner || 'Desconhecido'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Número</p>
                  <p className="text-sm">{instance?.instance?.number || 'N/A'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Conectado desde</p>
                  <p className="text-sm">{instance?.instance?.status === 'CONNECTED' ? new Date(instance.instance.statusTime).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-blue-50 text-blue-700 rounded-lg space-x-3 text-sm">
                <CheckCircle2 size={20} />
                <p>Tudo pronto! Seu sistema já está recebendo eventos do WhatsApp em tempo real.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <MessageSquare size={64} className="opacity-20" />
              <p>
                {isNotCreated ? 'Clique em "Criar Instância" para começar' : 'Instância desconectada ou aguardando QR Code.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Configurações da IA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Agente Conversacional (IA)</h3>
              <p className="text-xs text-gray-500 italic">Automatize seu atendimento com inteligência artificial humanizada</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-600">Status do Agente:</span>
            <button
              onClick={() => setSettings({ ...settings, agentEnabled: !settings.agentEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.agentEnabled ? 'bg-primary' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.agentEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Agente</label>
              <input 
                type="text" 
                value={settings.agentName}
                onChange={(e) => setSettings({ ...settings, agentName: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none transition"
                placeholder="Ex: Bia do Suporte"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Mensagem de Boas-vindas</label>
              <textarea 
                rows={3}
                value={settings.welcomeMessage}
                onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none transition resize-none"
                placeholder="Olá! Bem-vindo ao..."
              ></textarea>
            </div>
          </div>

          <div className="space-y-4 flex flex-col h-full">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-1">Persona e Regras de Comportamento (Prompt)</label>
              <textarea 
                rows={10}
                value={settings.agentPersona}
                onChange={(e) => setSettings({ ...settings, agentPersona: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none transition resize-none font-mono text-sm"
                placeholder="Você é um atendente da hamburgueria... Objetivos: ..."
              ></textarea>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end items-center">
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 transition flex items-center space-x-2"
          >
            {savingSettings ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
            <span>Salvar Configurações da IA</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppManagement;
