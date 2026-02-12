import React, { useState, useEffect } from 'react';
import { getSaiposSettings, updateSaiposSettings } from '../services/api';
import { X, Save, Loader2, Info, ShieldCheck, RefreshCw, Globe, TestTube } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';

interface SaiposConfigModalProps {
  onClose: () => void;
}

const SaiposConfigModal: React.FC<SaiposConfigModalProps> = ({ onClose }) => {
  const [partnerId, setPartnerId] = useState('');
  const [secret, setSecret] = useState('');
  const [codStore, setCodStore] = useState('');
  const [env, setEnv] = useState<'production' | 'homologation'>('homologation');
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
        setEnv(settings.saiposEnv || 'homologation');
        setIsActive(settings.saiposIntegrationActive || false);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar credenciais.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSaiposSettings({ 
        saiposPartnerId: partnerId,
        saiposSecret: secret,
        saiposCodStore: codStore,
        saiposEnv: env,
        saiposIntegrationActive: isActive 
      });
      toast.success('Configurações Saipos sincronizadas!');
      onClose();
    } catch (error) {
      toast.error('Falha ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-content w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header Compacto e Largo */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-slate-900 text-white p-2 rounded-xl shadow-lg">
                    <ShieldCheck size={18} />
                </div>
                <div>
                    <h3 className="text-base font-black text-slate-900 italic uppercase tracking-tighter leading-none">Configurar Saipos</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sincronização de Pedidos</p>
                </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all">
                <X size={18} />
            </button>
        </div>
        
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 opacity-30">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="text-[9px] font-black uppercase tracking-widest">Sincronizando...</span>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} id="saipos-form" className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-50/30 space-y-6">
                <div className="flex gap-4 items-start bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                    <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-orange-900 leading-tight uppercase italic">
                        Insira as chaves fornecidas pela Saipos. O ambiente de teste usa a URL de homologação.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Linha 1: Partner e Secret */}
                    <Input label="Partner ID" value={partnerId} onChange={e => setPartnerId(e.target.value)} placeholder="partner_..." required />
                    <Input label="API Secret Key" type="password" value={secret} onChange={e => setSecret(e.target.value)} placeholder="••••••••" required />
                    
                    {/* Linha 2: Código da Loja e Ambiente */}
                    <Input label="Cód. Loja (Saipos)" value={codStore} onChange={e => setCodStore(e.target.value)} placeholder="Ex: store_99" required />
                    
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">Ambiente</label>
                        <div className="flex p-1 bg-white border border-slate-200 rounded-xl gap-1 h-11">
                            <button 
                                type="button" 
                                onClick={() => setEnv('homologation')}
                                className={cn(
                                    "flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-all flex items-center justify-center gap-1.5",
                                    env === 'homologation' ? "bg-amber-500 text-white shadow-md" : "text-slate-400 hover:bg-slate-50"
                                )}
                            >
                                <TestTube size={12} /> Teste
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setEnv('production')}
                                className={cn(
                                    "flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-all flex items-center justify-center gap-1.5",
                                    env === 'production' ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:bg-slate-50"
                                )}
                            >
                                <Globe size={12} /> Real
                            </button>
                        </div>
                    </div>
                </div>

                {/* Status Ativação Compacto */}
                <Card 
                    className={cn(
                        "p-4 border-2 transition-all cursor-pointer flex items-center justify-between", 
                        isActive ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100 bg-white"
                    )} 
                    onClick={() => setIsActive(!isActive)}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", isActive ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>
                            <RefreshCw size={16} className={isActive ? "animate-spin-slow" : ""} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-900 uppercase italic leading-none mb-1">Status da Integração</p>
                            <span className={cn("text-[8px] font-black uppercase tracking-widest", isActive ? "text-emerald-600" : "text-slate-400")}>{isActive ? 'TRANSMISSÃO ATIVA' : 'SINCRO PAUSADO'}</span>
                        </div>
                    </div>
                    <div className={cn("w-10 h-5 rounded-full relative transition-all", isActive ? "bg-emerald-500" : "bg-slate-200")}>
                        <div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", isActive ? "left-6" : "left-1")} />
                    </div>
                </Card>
            </form>

            <footer className="px-6 py-4 bg-white border-t border-slate-100 flex gap-3 shrink-0">
                <Button variant="ghost" onClick={onClose} className="flex-1 h-10 rounded-lg font-black uppercase text-[9px] tracking-widest text-slate-400" disabled={isSaving}>DESCARTAR</Button>
                <Button type="submit" form="saipos-form" isLoading={isSaving} className="flex-[2] h-10 rounded-lg shadow-md uppercase tracking-widest italic font-black text-[10px]">
                    SALVAR CREDENCIAIS
                </Button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default SaiposConfigModal;