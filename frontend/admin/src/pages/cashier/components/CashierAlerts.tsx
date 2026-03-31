import React, { memo, useCallback } from 'react';
import { AlertCircle, HelpCircle, Truck, ArrowRight } from 'lucide-react';
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

  const handleShowSettlements = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onShowSettlements();
  }, [onShowSettlements]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {session.activeOrdersCount > 0 && (
        <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 rounded-2xl hover:shadow-lg transition-all">
          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle size={20} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-amber-900 uppercase italic leading-none">
              Pedidos Ativos
            </p>
            <p className="text-[9px] text-amber-600 font-bold uppercase mt-1">
              {session.activeOrdersCount} pendentes. Finalize-os para fechar.
            </p>
          </div>
        </div>
      )}

      {session.openTablesCount > 0 && (
        <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-200 rounded-2xl hover:shadow-lg transition-all">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <HelpCircle size={20} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-indigo-900 uppercase italic leading-none">
              Mesas Abertas
            </p>
            <p className="text-[9px] text-indigo-600 font-bold uppercase mt-1">
              {session.openTablesCount} mesas ocupadas.
            </p>
          </div>
        </div>
      )}

      {session.pendingDriverSettlementsCount > 0 && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-br from-rose-50 to-white border-2 border-rose-200 rounded-2xl hover:shadow-lg transition-all">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
              <Truck size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-rose-900 uppercase italic leading-none">
                Acertos Pendentes
              </p>
              <p className="text-[9px] text-rose-600 font-bold uppercase mt-1">
                {session.pendingDriverSettlementsCount} motoboy(s) aguardando acerto.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowSettlements}
            className="h-9 text-[10px] font-black text-rose-600 hover:bg-rose-100 uppercase tracking-widest rounded-xl"
          >
            Ver <ArrowRight size={12} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
});

CashierAlerts.displayName = 'CashierAlerts';
export default CashierAlerts;
