import React, { memo, useCallback } from 'react';
import { AlertCircle, HelpCircle, Truck, ArrowRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface CashierAlertsProps {
  session: any;
  onShowSettlements: () => void;
  onShowActiveOrders: () => void;
  onShowOpenTables: () => void;
}

const CashierAlerts: React.FC<CashierAlertsProps> = memo(({ session, onShowSettlements, onShowActiveOrders, onShowOpenTables }) => {
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

  const handleShowActiveOrders = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onShowActiveOrders();
  }, [onShowActiveOrders]);

  const handleShowOpenTables = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onShowOpenTables();
  }, [onShowOpenTables]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {session.activeOrdersCount > 0 && (
        <div className="flex items-center justify-between p-3 bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
              <AlertCircle size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wide leading-none">
                Pedidos Ativos
              </p>
              <p className="text-[9px] text-amber-600 font-semibold uppercase mt-0.5">
                {session.activeOrdersCount} pendentes
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowActiveOrders}
            className="h-7 text-[9px] font-bold text-amber-600 hover:bg-amber-100 uppercase tracking-wider rounded-lg"
          >
            Ver <ArrowRight size={10} className="ml-0.5" />
          </Button>
        </div>
      )}

      {session.openTablesCount > 0 && (
        <div className="flex items-center justify-between p-3 bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-xl hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <HelpCircle size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-900 uppercase tracking-wide leading-none">
                Mesas Abertas
              </p>
              <p className="text-[9px] text-indigo-600 font-semibold uppercase mt-0.5">
                {session.openTablesCount} mesas ocupadas
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowOpenTables}
            className="h-7 text-[9px] font-bold text-indigo-600 hover:bg-indigo-100 uppercase tracking-wider rounded-lg"
          >
            Ver <ArrowRight size={10} className="ml-0.5" />
          </Button>
        </div>
      )}

      {session.pendingDriverSettlementsCount > 0 && (
        <div className="flex items-center justify-between p-3 bg-gradient-to-br from-rose-50 to-white border border-rose-200 rounded-xl hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
              <Truck size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-rose-900 uppercase tracking-wide leading-none">
                Acertos Pendentes
              </p>
              <p className="text-[9px] text-rose-600 font-semibold uppercase mt-0.5">
                {session.pendingDriverSettlementsCount} motoboy(s)
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowSettlements}
            className="h-7 text-[9px] font-bold text-rose-600 hover:bg-rose-100 uppercase tracking-wider rounded-lg"
          >
            Ver <ArrowRight size={10} className="ml-0.5" />
          </Button>
        </div>
      )}
    </div>
  );
});

CashierAlerts.displayName = 'CashierAlerts';
export default CashierAlerts;
