import React from 'react';
import { Bell, UserCheck, CreditCard, X, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface TableRequest {
  id: string;
  tableNumber: number;
  type: 'WAITER' | 'BILL';
  status: string;
  createdAt: string;
}

interface TableRequestAlertProps {
  requests: TableRequest[];
  onResolve: (id: string) => void;
  onClose: () => void;
}

const TableRequestAlert: React.FC<TableRequestAlertProps> = ({ requests, onResolve, onClose }) => {
  if (requests.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-start justify-center bg-slate-950/40 backdrop-blur-sm p-4 pt-20 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="w-full max-w-md flex flex-col gap-3">
        
        {/* Header de Chamados */}
        <div className="bg-indigo-600 text-white p-4 rounded-[1.5rem] shadow-xl flex items-center justify-between border-2 border-white/10">
            <div className="flex items-center gap-3">
                <div className="bg-white text-indigo-600 p-2 rounded-xl shadow-lg">
                    <UserCheck className="animate-bounce" size={20} strokeWidth={3} />
                </div>
                <div>
                    <h2 className="text-base font-black italic uppercase tracking-tighter leading-none">Chamados</h2>
                    <p className="text-indigo-100 font-bold text-[9px] mt-0.5 uppercase tracking-widest">{requests.length} Mesa(s) aguardando</p>
                </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                <X size={18} />
            </button>
        </div>

        {/* Lista de Chamados */}
        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {requests.map((req) => (
                <div key={req.id} className="bg-white rounded-[1.25rem] shadow-lg overflow-hidden border border-indigo-50 flex items-center p-3 gap-3 transition-all hover:border-indigo-200">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border",
                        req.type === 'BILL' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-indigo-50 border-indigo-100 text-indigo-600"
                    )}>
                        {req.type === 'BILL' ? <CreditCard size={20} /> : <Bell size={20} />}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                                MESA {req.tableNumber}
                            </span>
                            <span className="text-slate-400 text-[8px] font-bold flex items-center gap-1">
                                <Clock size={10} /> {(() => {
                                    try {
                                        return format(new Date(req.createdAt), "HH:mm");
                                    } catch (e) {
                                        return "--:--";
                                    }
                                })()}
                            </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-800 leading-tight truncate">
                            {req.type === 'BILL' ? 'Pagar Conta' : 'Chamando Garçom'}
                        </h3>
                    </div>

                    <button 
                        onClick={() => onResolve(req.id)}
                        className="bg-emerald-500 text-white p-2.5 rounded-xl shadow-md hover:bg-emerald-600 active:scale-95 transition-all shrink-0"
                        title="Atender"
                    >
                        <CheckCircle2 size={18} />
                    </button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default TableRequestAlert;
