import React, { memo } from 'react';
import { AlertCircle, HelpCircle, Truck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface CashierAlertsProps {
  session: any;
  onShowSettlements: () => void;
}

const CashierAlerts: React.FC<CashierAlertsProps> = memo(({ session, onShowSettlements }) => {
  if (!session) return null;

  const hasBlocks =
    session.activeOrdersCount > 0 ||
    session.openTablesCount > 0 ||
    session.pendingDriverSettlementsCount > 0;

  if (!hasBlocks) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {session.activeOrdersCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg animate-in slide-in-from-top-2">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-[11px] font-bold text-amber-900 uppercase tracking-tight leading-none mb-1">
              Pedidos Ativos
            </p>
            <p className="text-[10px] text-amber-600 font-bold uppercase">
              {session.activeOrdersCount} pendentes. Finalize-os para fechar.
            </p>
          </div>
        </div>
      )}

      {session.openTablesCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg animate-in slide-in-from-top-2">
          <HelpCircle size={18} className="text-indigo-600 shrink-0" />
          <div>
            <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-tight leading-none mb-1">
              Mesas Abertas
            </p>
            <p className="text-[10px] text-indigo-600 font-bold uppercase">
              {session.openTablesCount} mesas ocupadas.
            </p>
          </div>
        </div>
      )}

      {session.pendingDriverSettlementsCount > 0 && (
        <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <Truck size={18} className="text-rose-600 shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-rose-900 uppercase tracking-tight leading-none mb-1">
                Acertos Pendentes
              </p>
              <p className="text-[10px] text-rose-600 font-bold uppercase">
                {session.pendingDriverSettlementsCount} motoboy(s) aguardando acerto.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowSettlements}
            className="h-8 text-[10px] font-bold text-rose-600 hover:bg-rose-100 uppercase"
          >
            Exibir Detalhes
          </Button>
        </div>
      )}
    </div>
  );
});

CashierAlerts.displayName = 'CashierAlerts';
export default CashierAlerts;
