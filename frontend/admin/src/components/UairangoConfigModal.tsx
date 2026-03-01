import React, { useState, useEffect } from 'react';
import { getUairangoSettings, updateUairangoSettings, importUairangoMenu } from '../services/api';
import { X, Save, Loader2, Info, ShoppingBag, RefreshCw, Database, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';

interface UairangoConfigModalProps {
  onClose: () => void;
}

const UairangoConfigModal: React.FC<UairangoConfigModalProps> = ({ onClose }) => {
  const [token, setToken] = useState('');
  const [establishmentId, setEstablishmentId] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await getUairangoSettings();
        setToken(settings.uairangoToken || '');
        setEstablishmentId(settings.uairangoEstablishmentId || '');
        setIsActive(settings.uairangoActive || false);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar configurações do UaiRango.');
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
      await updateUairangoSettings({ 
        uairangoToken: token,
        uairangoEstablishmentId: establishmentId,
        uairangoActive: isActive 
      });
      toast.success('Configurações UaiRango salvas!');
      onClose();
    } catch (error) {
      toast.error('Falha ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportMenu = async () => {
    if (!token || !establishmentId) {
      toast.error('Configure o Token e o ID antes de importar.');
      return;
    }

    setIsImporting(true);
    try {
      const result = await importUairangoMenu();
      toast.success(`Importação concluída: ${result.importedCount} itens importados!`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao importar cardápio do UaiRango.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-content w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header Compacto e Largo */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-orange-500 text-white p-2 rounded-xl shadow-lg">
                    <ShoppingBag size={18} />
                </div>
                <div>
                    <h3 className="text-base font-black text-slate-900 italic uppercase tracking-tighter leading-none">Configurar UaiRango</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Integração de Cardápio e Pedidos</p>
                </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all">
                <X size={18} />
            </button>
        </div>
        
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 opacity-30">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="text-[9px] font-black uppercase tracking-widest">Carregando...</span>
          </div>
        ) : (
          <>
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-50/30 space-y-6">
                <div className="flex gap-4 items-start bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-blue-900 leading-tight uppercase italic">
                        Utilize o Token de Desenvolvedor disponível no painel do UaiRango. 
                        A importação criará categorias, produtos e adicionais automaticamente.
                    </p>
                </div>

                <form onSubmit={handleSubmit} id="uairango-form" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Input 
                            label="Token de Desenvolvedor (UaiRango)" 
                            value={token} 
                            onChange={e => setToken(e.target.value)} 
                            placeholder="eyJ0eXAiOiJKV1Qi..." 
                            required 
                        />
                    </div>
                    
                    <Input 
                        label="ID do Estabelecimento" 
                        value={establishmentId} 
                        onChange={e => setEstablishmentId(e.target.value)} 
                        placeholder="Ex: 12345" 
                        required 
                    />

                    <div className="flex items-end pb-1">
                        <Card 
                            className={cn(
                                "flex-1 p-2.5 border-2 transition-all cursor-pointer flex items-center justify-between h-[44px]", 
                                isActive ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100 bg-white"
                            )} 
                            onClick={() => setIsActive(!isActive)}
                            noPadding
                        >
                            <div className="flex items-center gap-2">
                                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", isActive ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>
                                    <RefreshCw size={12} className={isActive ? "animate-spin-slow" : ""} />
                                </div>
                                <span className={cn("text-[8px] font-black uppercase tracking-widest", isActive ? "text-emerald-600" : "text-slate-400")}>
                                    {isActive ? 'INTEGRAÇÃO ATIVA' : 'DESATIVADA'}
                                </span>
                            </div>
                            <div className={cn("w-8 h-4 rounded-full relative transition-all", isActive ? "bg-emerald-500" : "bg-slate-200")}>
                                <div className={cn("absolute w-2.5 h-2.5 bg-white rounded-full top-0.5 transition-all shadow-sm", isActive ? "left-5" : "left-0.5")} />
                            </div>
                        </Card>
                    </div>
                </form>

                {/* Seção de Importação */}
                <div className="pt-6 border-t border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                        <Database size={14} className="text-orange-500" />
                        <h4 className="text-[10px] font-black text-slate-900 uppercase italic">Ações de Dados</h4>
                    </div>
                    
                    <Card className="p-6 border-2 border-dashed border-slate-200 bg-white hover:border-orange-500/30 transition-all group">
                        <div className="flex flex-col gap-6">
                            <div className="flex gap-4 items-start bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-amber-900 uppercase italic leading-tight">Aviso de Importação Manual</p>
                                    <p className="text-[8px] font-bold text-amber-700 uppercase leading-relaxed">
                                        Ao clicar abaixo, o sistema irá buscar categorias, produtos e fotos diretamente do UaiRango. 
                                        Pizzas e sabores serão organizados automaticamente no formato Saipos (Produto Base + Grupo de Sabores). 
                                        Itens com o mesmo nome serão atualizados.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="text-center md:text-left">
                                    <p className="text-xs font-black text-slate-900 uppercase italic">Importar Cardápio UaiRango</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Sincronização manual de produtos e preços</p>
                                </div>
                                <Button 
                                    onClick={handleImportMenu} 
                                    isLoading={isImporting}
                                    disabled={isSaving || !token || !establishmentId}
                                    className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-12 px-8 gap-2 group-hover:scale-105 transition-all shadow-lg shadow-orange-500/20"
                                >
                                    <Download size={16} /> <span className="text-[10px] font-black uppercase italic">Iniciar Importação Agora</span>
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <footer className="px-6 py-4 bg-white border-t border-slate-100 flex gap-3 shrink-0">
                <Button variant="ghost" onClick={onClose} className="flex-1 h-10 rounded-lg font-black uppercase text-[9px] tracking-widest text-slate-400" disabled={isSaving || isImporting}>DESCARTAR</Button>
                <Button type="submit" form="uairango-form" isLoading={isSaving} disabled={isImporting} className="flex-[2] h-10 rounded-lg shadow-md uppercase tracking-widest italic font-black text-[10px]">
                    SALVAR CONFIGURAÇÕES
                </Button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default UairangoConfigModal;