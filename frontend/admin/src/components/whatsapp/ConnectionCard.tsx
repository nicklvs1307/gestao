import React from 'react';
import { 
  MessageSquare, 
  Power, 
  RefreshCw, 
  LogOut, 
  Trash2, 
  QrCode,
  CheckCircle2,
  XCircle,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { WhatsAppIcon } from './WhatsAppIcon';

type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'NOT_CREATED';

interface ConnectionCardProps {
  status: ConnectionStatus;
  instanceName?: string;
  owner?: string;
  phone?: string;
  connectedSince?: string;
  isLoading?: boolean;
  isActionLoading?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onRestart?: () => void;
  onDelete?: () => void;
  onRefreshQr?: () => void;
  qrCode?: string | null;
  className?: string;
}

const statusConfig = {
  CONNECTED: {
    label: 'Conectado',
    color: 'green',
    icon: Wifi,
    bgGradient: 'from-emerald-50 to-emerald-100/30',
    borderColor: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-700',
  },
  CONNECTING: {
    label: 'Conectando',
    color: 'yellow',
    icon: Loader2,
    bgGradient: 'from-amber-50 to-amber-100/30',
    borderColor: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-700',
  },
  DISCONNECTED: {
    label: 'Desconectado',
    color: 'red',
    icon: WifiOff,
    bgGradient: 'from-red-50 to-red-100/30',
    borderColor: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    textColor: 'text-red-700',
  },
  NOT_CREATED: {
    label: 'Não configurado',
    color: 'gray',
    icon: MessageSquare,
    bgGradient: 'from-gray-50 to-gray-100/30',
    borderColor: 'border-gray-200',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    textColor: 'text-gray-600',
  },
};

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  status,
  instanceName,
  owner,
  phone,
  connectedSince,
  isLoading = false,
  isActionLoading = false,
  onConnect,
  onDisconnect,
  onRestart,
  onDelete,
  onRefreshQr,
  qrCode,
  className,
}) => {
  const config = statusConfig[status];
  const isConnected = status === 'CONNECTED';
  const isConnecting = status === 'CONNECTING';
  const isNotCreated = status === 'NOT_CREATED';

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-2xl border border-gray-100 p-6 animate-pulse', className)}>
        <div className="flex flex-col items-center space-y-4">
          <div className="h-16 w-16 bg-gray-200 rounded-full" />
          <div className="h-6 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-2xl border overflow-hidden transition-all duration-300', config.borderColor, className)}>
      {/* Header with gradient background */}
      <div className={cn('p-6 bg-gradient-to-r', config.bgGradient)}>
        <div className="flex flex-col items-center text-center space-y-4">
          {/* WhatsApp Icon */}
          <div className={cn('p-4 rounded-2xl shadow-lg', config.iconBg)}>
            <WhatsAppIcon size={40} />
          </div>

          {/* Status */}
          <div>
            <h2 className="text-xl font-bold text-gray-900">WhatsApp</h2>
            <p className="text-sm text-gray-500 mt-1">
              {isConnected 
                ? 'Sua conta está conectada' 
                : isConnecting 
                  ? 'Aguardando leitura do QR Code...'
                  : 'Aguardando conexão'}
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full">
            {isConnected || isConnecting ? (
              <config.icon className={cn('w-4 h-4 animate-pulse', config.iconColor)} />
            ) : (
              <XCircle className={cn('w-4 h-4', config.iconColor)} />
            )}
            <span className={cn('text-sm font-semibold uppercase tracking-wider', config.textColor)}>
              {config.label}
            </span>
          </div>
        </div>
      </div>

      {/* Connection Details - Show when connected */}
      {isConnected && (instanceName || owner || phone || connectedSince) && (
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-2 gap-3">
            {instanceName && (
              <div className="p-3 bg-white rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Instância</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{instanceName}</p>
              </div>
            )}
            {owner && (
              <div className="p-3 bg-white rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aparelho</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{owner}</p>
              </div>
            )}
            {phone && (
              <div className="p-3 bg-white rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Número</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{phone}</p>
              </div>
            )}
            {connectedSince && (
              <div className="p-3 bg-white rounded-xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Conectado desde</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{connectedSince}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Code Display */}
      {!isConnected && qrCode && isConnecting && (
        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <div className="flex flex-col items-center space-y-3">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Escaneie o código abaixo
            </h3>
            <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-inner">
              <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56" />
            </div>
            <button 
              onClick={onRefreshQr}
              disabled={isActionLoading}
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1.5 transition-colors"
            >
              {isActionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Atualizar QR Code
            </button>
            <p className="text-xs text-gray-400 text-center max-w-xs">
              Abra o WhatsApp no celular → Aparelhos Conectados → Escaneie
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        {isNotCreated && (
          <button
            onClick={onConnect}
            disabled={isActionLoading}
            className="w-full bg-gradient-to-r from-primary to-primary/80 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center justify-center gap-2"
          >
            {isActionLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Power className="w-5 h-5" />
            )}
            <span>Criar Instância</span>
          </button>
        )}

        {!isNotCreated && !isConnected && !isConnecting && (
          <button
            onClick={onRestart}
            disabled={isActionLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
          >
            {isActionLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            <span>Tentar Reconectar</span>
          </button>
        )}

        {isConnected && (
          <div className="space-y-2">
            <button
              onClick={onDisconnect}
              disabled={isActionLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
            >
              {isActionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span>Desconectar</span>
            </button>
            <button
              onClick={onRestart}
              disabled={isActionLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              {isActionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>Reiniciar</span>
            </button>
          </div>
        )}

        {!isNotCreated && (
          <button
            onClick={onDelete}
            disabled={isActionLoading}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all flex items-center justify-center gap-2"
          >
            {isActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Deletar Instância</span>
          </button>
        )}
      </div>

      {/* Connected success message */}
      {isConnected && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>Pronto! Recebendo mensagens em tempo real</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionCard;
