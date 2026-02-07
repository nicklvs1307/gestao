import React, { useState, useEffect } from 'react';
import { getSaiposSettings, updateSaiposSettings } from '../services/api';
import { X, Save, Loader2, Info, ShieldCheck, Key, Lock, Store, CheckCircle } from 'lucide-react';
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
      <div className="ui-modal-content w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header Master */}
        <div className="px-10 py-8 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
                <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl shadow-slate-200">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Configurar Saipos</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Credenciais de API e Sincronismo</p>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-slate-50"><X size={24} /></Button>
        </div>
        
        {isLoading ? (
          <div className="p-24 flex flex-col items-center justify-center gap-4 opacity-30">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Autenticando...</span>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} id="saipos-form" className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-slate-50/30 space-y-8">
                <Card className="p-5 border-orange-100 bg-orange-50/20 flex gap-4 items-start shadow-inner">
                    <Info size={20} className="text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-orange-900 leading-relaxed uppercase italic">
                        Insira as chaves de acesso fornecidas pelo suporte técnico da Saipos para ativar o recebimento automático de pedidos.
                    </p>
                </Card>

                <div className="space-y-6">
                    <Input label="Partner ID" value={partnerId} onChange={e => setPartnerId(e.target.value)} placeholder="Ex: partner_123..." required />
                    <Input label="API Secret Key" type="password" value={secret} onChange={e => setSecret(e.target.value)} placeholder="••••••••••••••••" required />
                    <Input label="Código da Loja (Saipos)" value={codStore} onChange={e => setCodStore(e.target.value)} placeholder="Ex: store_99" required />
                </div>

                {/* Toggle de Ativação Premium */}
                <Card className={cn("p-6 border-2 transition-all cursor-pointer flex items-center justify-between", isActive ? "border-emerald-500 bg-emerald-50" : "border-slate-100 bg-white")} onClick={() => setIsActive(!isActive)}>
                    <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-lg", isActive ? "bg-emerald-500 text-white shadow-emerald-100" : "bg-slate-100 text-slate-400")}>
                            <RefreshCw size={20} className={isActive ? "animate-spin-slow" : ""} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">Status da Operação</p>
                            <span className={cn("text-[9px] font-black uppercase tracking-widest", isActive ? "text-emerald-600" : "text-slate-400")}>{isActive ? 'TRANSMISSÃO ATIVA' : 'INTEGRAÇÃO PAUSADA'}</span>
                        </div>
                    </div>
                    <div className={cn("w-14 h-7 rounded-full relative transition-all shadow-inner", isActive ? "bg-emerald-500" : "bg-slate-300")}>
                        <div className={cn("absolute w-5 h-5 bg-white rounded-full top-1 transition-all shadow-md", isActive ? "left-8" : "left-1")} />
                    </div>
                </Card>
            </form>

            {/* Footer Fixo */}
            <footer className="px-10 py-6 bg-white border-t border-slate-100 flex gap-4 shrink-0">
                <Button variant="ghost" onClick={onClose} className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400" disabled={isSaving}>CANCELAR</Button>
                <Button type="submit" form="saipos-form" isLoading={isSaving} className="flex-[2] h-14 rounded-2xl shadow-xl shadow-slate-200 uppercase tracking-widest italic font-black">
                    <Save size={18} className="mr-2" /> SALVAR CREDENCIAIS
                </Button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default SaiposConfigModal;