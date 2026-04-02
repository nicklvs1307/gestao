import React, { useState, useEffect } from 'react';
import { X, Bike, Search, Loader2, CheckCircle, Phone } from 'lucide-react';
import { getDrivers } from '../services/api';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { useScrollLock } from '../hooks/useScrollLock';

interface DriverSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (driverId: string) => void;
  orderId?: string;
}

const DriverSelectionModal: React.FC<DriverSelectionModalProps> = ({ isOpen, onClose, onSelect, orderId }) => {
  useScrollLock(isOpen);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadDrivers();
    }
  }, [isOpen]);

  const loadDrivers = async () => {
    try {
      setIsLoading(true);
      const data = await getDrivers();
      setDrivers(data || []);
    } catch (error) {
      console.error("Erro ao carregar motoristas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.phone && d.phone.includes(searchTerm))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter leading-none">
              Selecionar <span className="text-orange-600">Entregador</span>
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {orderId ? `Pedido #${orderId.slice(-4).toUpperCase()}` : 'Ação em massa'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </header>

        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="BUSCAR ENTREGADOR..." 
              className="w-full h-10 pl-10 pr-4 bg-slate-100 border-none rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar pr-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-30 gap-2">
                <Loader2 size={24} className="animate-spin text-orange-500" />
                <span className="text-[8px] font-black uppercase tracking-widest">Carregando...</span>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="text-center py-10 text-[10px] font-black text-slate-400 uppercase italic">
                Nenhum entregador encontrado
              </div>
            ) : (
              filteredDrivers.map(driver => (
                <button 
                  key={driver.id}
                  onClick={() => onSelect(driver.id)}
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-orange-500/30 hover:bg-orange-50 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-orange-500 group-hover:border-orange-200 transition-all shadow-sm">
                      <Bike size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase italic leading-none">{driver.name}</p>
                      {driver.phone && (
                        <p className="text-[9px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                          <Phone size={8} /> {driver.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckCircle size={18} className="text-orange-500" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <footer className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-[9px] font-black uppercase italic tracking-widest">
            Cancelar
          </Button>
        </footer>
      </div>
    </div>
  );
};

export default DriverSelectionModal;
