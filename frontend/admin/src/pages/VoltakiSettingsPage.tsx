import React from 'react';
import { ArrowLeft, Zap, Star, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const VoltakiSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/integrations')}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-xl flex items-center justify-center">
            <Zap size={18} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase">Voltaki</h1>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">CRM e Fidelização</p>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <Card className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-2xl flex items-center justify-center">
          <Clock size={32} className="text-amber-500" />
        </div>
        
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white mb-4">
          <Star size={10} />
          Em Breve
        </span>

        <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">
          CRM Inteligente
        </h2>
        
        <p className="text-sm text-slate-500 mb-6">
          Potencialize suas vendas com automação de fidelização por WhatsApp.
        </p>

        <div className="space-y-3 text-left bg-slate-50 p-4 rounded-xl">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Funcionalidades</h3>
          
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <Zap size={12} className="text-emerald-600" />
            </div>
            <span className="text-slate-600">Programa de Fidelidade automatico</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <Zap size={12} className="text-emerald-600" />
            </div>
            <span className="text-slate-600">Promoções por tempo limitado</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <Zap size={12} className="text-emerald-600" />
            </div>
            <span className="text-slate-600">Fluxos de automação por WhatsApp</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <Zap size={12} className="text-emerald-600" />
            </div>
            <span className="text-slate-600">Análise de comportamento de clientes</span>
          </div>
        </div>

        <Button onClick={() => navigate('/integrations')} variant="outline" className="w-full mt-6">
          Voltar para Integrações
        </Button>
      </Card>
    </div>
  );
};

export default VoltakiSettingsPage;