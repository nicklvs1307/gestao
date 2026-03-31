import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Globe, Copy, ExternalLink, CheckCircle, XCircle, Loader2, Link2, QrCode } from 'lucide-react';

const clientUrl = window.location.hostname.includes('towersfy.com') 
  ? `https://${window.location.hostname.replace('admin.', '').replace('kicardapio.', '')}` 
  : 'http://localhost:5174';

interface SettingsLinksTabProps {
  slug: string;
  isSlugAvailable: boolean | null;
  isCheckingSlug: boolean;
  onSlugChange: (slug: string) => void;
}

export const SettingsLinksTab: React.FC<SettingsLinksTabProps> = ({
  slug, isSlugAvailable, isCheckingSlug, onSlugChange
}) => {
  const handleCopy = async () => {
    const { toast } = await import('sonner');
    navigator.clipboard.writeText(slug);
    toast.success('Link copiado com sucesso!');
  };

  const handleCopyUrl = async () => {
    const { toast } = await import('sonner');
    navigator.clipboard.writeText(publicUrl);
    toast.success('URL copiada!');
  };

  const publicUrl = window.location.hostname.includes('towersfy.com') 
    ? `https://${slug}.towersfy.com` 
    : `${clientUrl}/${slug}`;

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl p-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden rounded-[2.5rem] shadow-2xl shadow-slate-900/50 border border-slate-700">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 blur-[140px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 blur-[100px] translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 p-8 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/30">
              <Globe size={26} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">
                Domínio <span className="text-orange-500">&</span> Acesso
              </h3>
              <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">
                Configuração de Endereço Web Personalizado
              </p>
            </div>
          </div>
          
          {/* Slug Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Link2 size={12} className="text-slate-500" />
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Identificador Slug</label>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input 
                  className={cn(
                    "w-full h-12 bg-white/5 border-2 border-white/10 rounded-xl px-5 font-black text-lg italic uppercase outline-none transition-all placeholder:text-slate-600", 
                    isSlugAvailable === true && "border-emerald-500 bg-emerald-500/10 text-emerald-400", 
                    isSlugAvailable === false && "border-rose-500 bg-rose-500/10 text-rose-400"
                  )} 
                  value={slug} 
                  onChange={e => onSlugChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                  placeholder="seu-restaurante"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isCheckingSlug ? (
                    <Loader2 size={18} className="animate-spin text-slate-400" />
                  ) : isSlugAvailable === true ? (
                    <CheckCircle size={20} className="text-emerald-500" />
                  ) : isSlugAvailable === false ? (
                    <XCircle size={20} className="text-rose-500" />
                  ) : null}
                </div>
              </div>
              <button 
                onClick={handleCopy} 
                className="h-12 w-14 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all border border-white/10"
              >
                <Copy size={18}/>
              </button>
            </div>
            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest pl-1">
              Este identificador será usado na URL pública do seu cardápio
            </p>
          </div>

          {/* Public URL Card */}
          <div className="bg-white rounded-2xl p-5 flex items-center justify-between group shadow-xl border border-slate-100">
            <div className="truncate flex-1 mr-4">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none flex items-center gap-1">
                <QrCode size={10} /> URL Pública do Cardápio
              </p>
              <span className="text-sm font-black text-slate-800 italic tracking-tighter truncate block">
                {publicUrl}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopyUrl} 
                className="p-2.5 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-all"
              >
                <Copy size={16}/>
              </button>
              <a 
                href={publicUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="p-2.5 bg-slate-900 text-white rounded-lg shadow-md hover:scale-105 hover:shadow-lg transition-all flex items-center justify-center"
              >
                <ExternalLink size={16}/>
              </a>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-[7px] font-black uppercase text-emerald-400 tracking-widest">Status</span>
              </div>
              <p className="text-[12px] font-black italic text-white">
                {isSlugAvailable === true ? 'DISPONÍVEL' : isSlugAvailable === false ? 'INDISPONÍVEL' : 'AGUARDANDO'}
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span className="text-[7px] font-black uppercase text-orange-400 tracking-widest">Tipo</span>
              </div>
              <p className="text-[12px] font-black italic text-white">
                {window.location.hostname.includes('towersfy.com') ? 'DOMÍNIO PRÓPRIO' : 'LOCALHOST'}
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
            <p className="text-[8px] font-bold text-slate-300 leading-relaxed">
              <strong className="text-orange-400">Dica:</strong> Escolha um slug curto e memorável que represente seu estabelecimento. 
              Esta URL será compartilhada com seus clientes no WhatsApp e redes sociais.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
