import React, { useState, useEffect } from 'react';
import { getSaiposSettings, updateSaiposSettings } from '../services/api';
import { X, Save, Loader2, Info, ShieldCheck, Key, Store } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface SaiposConfigModalProps {
  onClose: () => void;
}

const SaiposConfigModal: React.FC<SaiposConfigModalProps> = ({ onClose }) => {
  const [partnerId, setPartnerId] = useState('');
  const [secret, setSecret] = useState('');
  const [codStore, setCodStore] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await getSaiposSettings();
        setPartnerId(settings.saiposPartnerId || '');
        setSecret(settings.saiposSecret || '');
        setCodStore(settings.saiposCodStore || '');
        setIsActive(settings.saiposIntegrationActive || false);
      } catch (error) {
        console.error('Erro ao buscar configurações da Saipos:', error);
        toast.error('Não foi possível carregar as configurações.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const settingsToSave = { 
      saiposPartnerId: partnerId,
      saiposSecret: secret,
      saiposCodStore: codStore, 
      saiposIntegrationActive: isActive 
    };
    
    try {
      await updateSaiposSettings(settingsToSave);
      toast.success('Configurações da Saipos atualizadas!');
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar configurações da Saipos:', error);
      toast.error('Erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Configurar Saipos</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Integração</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        {isLoading ? (
          <div className="p-10 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs font-medium text-slate-500">Buscando configurações...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-4 space-y-4">
              <div className="bg-blue-50/50 border border-blue-100/50 rounded-lg p-3 flex gap-3">
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-800 leading-snug">
                  Insira as credenciais Saipos para habilitar a sincronização automática de pedidos.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label htmlFor="partnerId" className="text-[11px] font-bold text-slate-500 uppercase ml-1">ID do Parceiro</label>
                  <input
                    id="partnerId"
                    type="text"
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    placeholder="partner_id"
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="secret" className="text-[11px] font-bold text-slate-500 uppercase ml-1">Secret Key</label>
                  <input
                    id="secret"
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Insira o secret"
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="codStore" className="text-[11px] font-bold text-slate-500 uppercase ml-1">Código da Loja</label>
                  <input
                    id="codStore"
                    type="text"
                    value={codStore}
                    onChange={(e) => setCodStore(e.target.value)}
                    placeholder="cod_store"
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">Status da Integração</span>
                  <span className={cn("text-[9px] font-bold uppercase tracking-wider", isActive ? "text-emerald-600" : "text-slate-400")}>
                    {isActive ? 'Ativada' : 'Desativada'}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsActive(!isActive)} 
                  disabled={isSaving}
                  className={cn(
                    "w-10 h-5 rounded-full relative transition-all duration-300",
                    isActive ? "bg-emerald-500" : "bg-slate-300"
                  )}
                >
                  <span className={cn(
                    "absolute w-3.5 h-3.5 bg-white rounded-full top-0.75 transition-all shadow-sm",
                    isActive ? "left-5.5" : "left-1"
                  )} />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="flex-[2] h-9 px-3 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SaiposConfigModal;
