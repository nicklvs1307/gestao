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
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const WhatsAppManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  
  // Pega o restaurantId do localStorage ou context
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const restaurantId = user?.restaurantId;

  const [instance, setInstance] = useState<any>(null);
  const [settings, setSettings] = useState<any>({
    agentEnabled: false,
    agentName: 'Atendente Virtual',
    agentPersona: '',
    openaiApiKey: '',
    welcomeMessage: '',
    autoAcceptOrders: false
  });

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
    } catch (error) {
      console.error('Erro ao buscar dados do WhatsApp:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setStatusLoading(true);
      const res = await axios.post(`${API_URL}/whatsapp/connect`, {}, getHeaders());
      setInstance(res.data);
      
      // Busca QR Code após criar
      const qrRes = await axios.get(`${API_URL}/whatsapp/qrcode`, getHeaders());
      setQrCode(qrRes.data.base64);
      toast.success('Instância criada! Escaneie o QR Code.');
    } catch (error) {
      toast.error('Erro ao conectar ao WhatsApp');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleRefreshQr = async () => {
    try {
      setStatusLoading(true);
      const qrRes = await axios.get(`${API_URL}/whatsapp/qrcode`, getHeaders());
      setQrCode(qrRes.data.base64);
    } catch (error) {
      toast.error('Erro ao atualizar QR Code');
    } finally {
      setStatusLoading(false);
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

  const isConnected = instance?.localStatus === 'CONNECTED' || instance?.instance?.state === 'open';

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header Conexão */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
          <div className={`p-4 rounded-full ${isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            <MessageSquare size={48} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">WhatsApp</h2>
            <p className="text-sm text-gray-500">
              {isConnected ? 'Sua conta está conectada' : 'Aguardando conexão'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-sm font-medium uppercase tracking-wider">
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>

          {!isConnected && !qrCode && (
            <button
              onClick={handleConnect}
              disabled={statusLoading}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 transition flex items-center justify-center space-x-2"
            >
              {statusLoading ? <RefreshCw className="animate-spin" size={20} /> : <Power size={20} />}
              <span>Conectar WhatsApp</span>
            </button>
          )}

          {isConnected && (
            <button
              onClick={fetchData}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition flex items-center justify-center space-x-2"
            >
              <RefreshCw size={20} />
              <span>Verificar Status</span>
            </button>
          )}
        </div>

        {/* QR Code ou Status Detalhado */}
        <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          {!isConnected && qrCode ? (
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
                className="text-primary text-sm font-bold flex items-center space-x-1 hover:underline"
              >
                <RefreshCw size={14} />
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
              </div>
              <div className="flex items-center p-4 bg-blue-50 text-blue-700 rounded-lg space-x-3 text-sm">
                <CheckCircle2 size={20} />
                <p>Tudo pronto! Seu sistema já está recebendo eventos do WhatsApp em tempo real.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <MessageSquare size={64} className="opacity-20" />
              <p>Inicie a conexão para visualizar o QR Code</p>
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
                className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 outline-none transition h-[calc(100%-1.5rem)] resize-none font-mono text-sm"
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
