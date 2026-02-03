import React, { useState, useEffect } from 'react';
import SaiposConfigModal from './SaiposConfigModal';
import { getSaiposSettings } from '../services/api';
import { Puzzle, RefreshCw, Loader2, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import saiposLogo from '../assets/saipos-logo.png';
import voltakiLogo from '../assets/voltaki-logo.png';

const IntegrationManagement: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saiposStatus, setSaiposStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const settings = await getSaiposSettings();
      setSaiposStatus(settings.saiposIntegrationActive || false);
    } catch (error) {
      console.error('Erro ao buscar status da integração:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    fetchStatus(); // Atualiza o status quando o modal é fechado
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 border-b">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Integrações</h2>
          <p className="text-muted-foreground text-sm">Conecte e gerencie serviços de parceiros.</p>
        </div>
        <button 
          onClick={fetchStatus} 
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Atualizar Status
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {/* Card da Saipos */}
        <div 
          onClick={handleOpenModal}
          className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md cursor-pointer border-slate-200 hover:border-blue-300"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 p-1.5 group-hover:bg-blue-100 transition-colors border border-blue-100/50">
                  <img src={saiposLogo} alt="Saipos Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Saipos</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isLoading ? (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        Verificando...
                      </span>
                    ) : (
                      <div className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        saiposStatus ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-50 text-slate-500 border border-slate-200"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", saiposStatus ? "bg-emerald-500" : "bg-slate-400")}></span>
                        {saiposStatus ? 'Ativo' : 'Inativo'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
              Sincronize seus pedidos em tempo real com o sistema de gestão Saipos.
            </p>
          </div>
          
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-50">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Configurar</span>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>

        {/* Card do Voltaki */}
        <div 
          className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all border-slate-200 opacity-90"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-orange-50 p-1.5 border border-orange-100/50">
                  <img src={voltakiLogo} alt="Voltaki Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Voltaki CRM</h3>
                  <div className="flex items-center gap-1.5 mt-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                    Em breve
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
              Plataforma de CRM e Fidelização para aumentar a recorrência.
            </p>
          </div>
          
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Indisponível</span>
            <ChevronRight size={14} className="text-slate-200" />
          </div>
        </div>

        {/* Placeholder para futuras integrações */}
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-8 text-center opacity-60">
          <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400">
            <Puzzle size={24} />
          </div>
          <p className="text-sm font-medium text-slate-500">Mais integrações em breve</p>
          <p className="text-xs text-slate-400 mt-1">iFood, WhatsApp e mais...</p>
        </div>
      </div>

      {isModalOpen && <SaiposConfigModal onClose={handleCloseModal} />}
    </div>
  );
};

export default IntegrationManagement;
