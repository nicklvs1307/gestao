import React, { memo, useCallback, useState } from 'react';
import { X, Printer, Download, Loader2, Calendar, Lock, Unlock, User } from 'lucide-react';
import { getCashierClosing, getCashierSessionOrders } from '../../../services/api';
import { printCashierClosureFromHistory, downloadCashierClosurePDFFromHistory, getPrinterConfigFromStorage } from '../../../services/printer';
import { formatSP } from '@/lib/timezone';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

interface SessionHistory {
  id: string;
  openedAt: string;
  closedAt: string | null;
  initialAmount: number;
  finalAmount: number | null;
  status: string;
  user?: { name: string };
}

interface ClosingHistoryModalProps {
  isOpen: boolean;
  sessions: SessionHistory[];
  onClose: () => void;
}

const ClosingHistoryModal: React.FC<ClosingHistoryModalProps> = memo(({ isOpen, sessions, onClose }) => {
  const [loadingSession, setLoadingSession] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionHistory | null>(null);
  const [closingData, setClosingData] = useState<Record<string, unknown> | null>(null);
  const [sessionOrders, setSessionOrders] = useState<unknown[]>([]);

  const handleSelectSession = useCallback(async (session: SessionHistory) => {
    if (session.status !== 'CLOSED') {
      setSelectedSession(session);
      return;
    }

    setLoadingSession(session.id);
    setSelectedSession(session);
    
    try {
      const [data, orders] = await Promise.all([
        getCashierClosing(session.id),
        getCashierSessionOrders(session.id)
      ]);
      setClosingData(data);
      setSessionOrders(orders || []);
    } catch (error) {
      console.error('Error fetching closing:', error);
    } finally {
      setLoadingSession(null);
    }
  }, []);

  const handlePrintPOS = useCallback(async () => {
    if (!closingData) return;

    try {
      const config = getPrinterConfigFromStorage();
      await printCashierClosureFromHistory(closingData, undefined, config, sessionOrders);
    } catch (error) {
      console.error('Error printing:', error);
    }
  }, [closingData, sessionOrders]);

  const handleDownloadPDF = useCallback(async () => {
    if (!closingData) return;

    try {
      await downloadCashierClosurePDFFromHistory(closingData, undefined, sessionOrders);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }, [closingData, sessionOrders]);

  const handleClose = useCallback(() => {
    setSelectedSession(null);
    setClosingData(null);
    setSessionOrders([]);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase italic">
                Histórico de Caixas
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Selecione uma sessão para imprimir
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-9 w-9 p-0 rounded-xl">
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {selectedSession ? (
            <div className="space-y-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setSelectedSession(null); setClosingData(null); setSessionOrders([]); }}
                className="text-xs font-bold uppercase tracking-widest"
              >
                ← Voltar para lista
              </Button>

              {/* Session Info */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'px-2 py-1 rounded-lg text-[10px] font-black uppercase',
                      selectedSession.status === 'OPEN' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-200 text-slate-600'
                    )}>
                      {selectedSession.status === 'OPEN' ? 'Aberto' : 'Fechado'}
                    </span>
                  </div>
                  {selectedSession.user && (
                    <div className="flex items-center gap-1">
                      <User size={12} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-500">{selectedSession.user.name}</span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Abertura</p>
                    <p className="font-black text-slate-700">{formatSP(selectedSession.openedAt, 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                  {selectedSession.closedAt && (
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Fechamento</p>
                      <p className="font-black text-slate-700">{formatSP(selectedSession.closedAt, 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Fundo Inicial</p>
                    <p className="font-black text-emerald-600">R$ {Number(selectedSession.initialAmount).toFixed(2)}</p>
                  </div>
                  {selectedSession.finalAmount !== null && (
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Informado</p>
                      <p className="font-black text-slate-700">R$ {Number(selectedSession.finalAmount).toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions or Loading */}
              {loadingSession ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  <span className="ml-2 text-xs font-bold text-slate-500">Carregando dados...</span>
                </div>
              ) : selectedSession.status === 'CLOSED' && closingData ? (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="text-[10px] font-black text-emerald-700 uppercase mb-2">Resumo das Vendas</p>
                    <div className="space-y-1">
                      {Object.entries(closingData.salesByMethod as Record<string, number> || {}).map(([method, amount]) => (
                        <div key={method} className="flex justify-between text-xs">
                          <span className="font-bold text-emerald-800 capitalize">{method}</span>
                          <span className="font-black text-emerald-900">R$ {Number(amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-emerald-200 flex justify-between">
                      <span className="text-xs font-black text-emerald-800">TOTAL</span>
                      <span className="text-sm font-black text-emerald-900">R$ {(closingData.totalSales as number || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Print Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={handlePrintPOS}
                      className="h-12 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest rounded-xl"
                    >
                      <Printer size={16} className="mr-2" />
                      Imprimir na POS
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleDownloadPDF}
                      className="h-12 border-slate-300 text-slate-700 font-black uppercase text-[10px] tracking-widest rounded-xl"
                    >
                      <Download size={16} className="mr-2" />
                      Baixar PDF
                    </Button>
                  </div>
                </div>
              ) : selectedSession.status === 'OPEN' ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
                  <p className="text-xs font-bold text-amber-700">
                    Este caixa está aberto. Feche-o primeiro para imprimir o relatório.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-md',
                    session.status === 'OPEN' 
                      ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        session.status === 'OPEN' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      )}>
                        {session.status === 'OPEN' ? <Unlock size={18} /> : <Lock size={18} />}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800">
                          {formatSP(session.openedAt, 'dd/MM/yyyy')}
                        </p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">
                          {formatSP(session.openedAt, 'HH:mm')} - {session.closedAt ? formatSP(session.closedAt, 'HH:mm') : 'Em andamento'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-700">
                        R$ {Number(session.initialAmount).toFixed(2)}
                      </p>
                      {session.user && (
                        <p className="text-[9px] text-slate-400 font-bold uppercase">
                          {session.user.name}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ClosingHistoryModal.displayName = 'ClosingHistoryModal';
export default ClosingHistoryModal;