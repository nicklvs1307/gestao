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
    <div className="ui-modal-overlay">
      <div className="ui-modal-content w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-600/10 flex items-center justify-center text-orange-600 shadow-sm">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Integração Saipos</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configurações de API</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="h-10 w-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
          >
            <X size={20} />
          </button>
        </div>
        
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-8 space-y-6">
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex gap-3 shadow-sm">
                <Info size={18} className="text-orange-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-orange-900 leading-snug">
                  Insira as credenciais fornecidas pela Saipos para automatizar seus pedidos.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="partnerId" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID do Parceiro</label>
                  <input
                    id="partnerId"
                    type="text"
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    placeholder="partner_id"
                    className="ui-input w-full"
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="secret" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secret Key</label>
                  <input
                    id="secret"
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Insira o secret"
                    className="ui-input w-full"
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="codStore" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código da Loja</label>
                  <input
                    id="codStore"
                    type="text"
                    value={codStore}
                    onChange={(e) => setCodStore(e.target.value)}
                    placeholder="cod_store"
                    className="ui-input w-full"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Sincronização Ativa</span>
                  <span className={cn("text-[9px] font-bold uppercase", isActive ? "text-emerald-600" : "text-slate-400")}>
                    {isActive ? 'Operando' : 'Pausada'}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsActive(!isActive)} 
                  disabled={isSaving}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner",
                    isActive ? "bg-emerald-500" : "bg-slate-300"
                  )}
                >
                  <span className={cn(
                    "absolute w-4 h-4 bg-white rounded-full top-1 transition-all shadow-md",
                    isActive ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-6 py-2.5 text-xs font-black uppercase text-slate-400 hover:text-slate-900 transition-all"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="ui-button-primary flex-1"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Save size={18} />
                    <span>Salvar Configuração</span>
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
