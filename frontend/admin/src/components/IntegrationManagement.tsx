import React, { useState, useEffect } from 'react';
import SaiposConfigModal from './SaiposConfigModal';
import { getSaiposSettings } from '../services/api';
import { Puzzle, RefreshCw, Loader2, ChevronRight, Share2, Plug } from 'lucide-react';
import { cn } from '../lib/utils';
import saiposLogo from '../assets/saipos-logo.png';
import voltakiLogo from '../assets/voltaki-logo.png';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

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
    fetchStatus(); 
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Integrações</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <Share2 size={14} className="text-orange-500" /> Canais de Venda e Conexões Externas
          </p>
        </div>
        <Button variant="outline" size="sm" className="bg-white rounded-xl h-12 gap-2" onClick={fetchStatus}>
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> ATUALIZAR STATUS
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Card Saipos Premium */}
        <Card 
          onClick={handleOpenModal}
          className={cn(
            "p-0 overflow-hidden border-2 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group",
            saiposStatus ? "border-emerald-100 hover:border-emerald-500/30 bg-emerald-50/10" : "border-slate-100 bg-white"
          )}
          noPadding
        >
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-lg border border-slate-100 p-2.5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <img src={saiposLogo} alt="Saipos" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-slate-900 uppercase italic tracking-tighter leading-none">Saipos</h3>
                        <div className="mt-2">
                            {isLoading ? (
                                <div className="flex items-center gap-1.5 opacity-30"><Loader2 size={10} className="animate-spin"/><span className="text-[8px] font-black uppercase">Verificando...</span></div>
                            ) : (
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                                    saiposStatus ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-slate-100 text-slate-400 border-slate-200"
                                )}>
                                    {saiposStatus ? 'CONECTADO' : 'DESATIVADO'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 text-slate-300 group-hover:text-orange-500 transition-colors">
                    <Plug size={20} />
                </div>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Sincronização automática de pedidos e estoque com o ecossistema de gestão Saipos.
            </p>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest italic group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Configurar Integração <ChevronRight size={12} />
                </span>
                <div className={cn("w-2 h-2 rounded-full", saiposStatus ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300")} />
            </div>
          </div>
        </Card>

        {/* Card Voltaki (Coming Soon) */}
        <Card className="p-0 overflow-hidden border-2 border-slate-100 bg-slate-50/50 opacity-80 group cursor-not-allowed" noPadding>
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-slate-100 p-2.5 flex items-center justify-center grayscale">
                        <img src={voltakiLogo} alt="Voltaki" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-slate-400 uppercase italic tracking-tighter leading-none">Voltaki</h3>
                        <span className="mt-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-amber-500 text-white border border-amber-500 shadow-lg shadow-amber-500/20 inline-block">EM BREVE</span>
                    </div>
                </div>
            </div>

            <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Potencialize suas vendas com CRM inteligente e automação de fidelização por WhatsApp.
            </p>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between grayscale">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Aguardando Lançamento</span>
                <div className="w-2 h-2 rounded-full bg-slate-200" />
            </div>
          </div>
        </Card>

        {/* Placeholder Placeholder */}
        <div className="flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/30 p-10 text-center group hover:border-orange-500/30 transition-all duration-500">
          <div className="mb-4 rounded-3xl bg-white p-5 text-slate-300 border border-slate-100 shadow-sm group-hover:text-orange-500 group-hover:scale-110 transition-all">
            <Puzzle size={32} strokeWidth={1.5} />
          </div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Novos Canais</h4>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-2 opacity-60">iFood, WhatsApp & Marketplaces</p>
        </div>
      </div>

      {isModalOpen && <SaiposConfigModal onClose={handleCloseModal} />}
    </div>
  );
};

export default IntegrationManagement;