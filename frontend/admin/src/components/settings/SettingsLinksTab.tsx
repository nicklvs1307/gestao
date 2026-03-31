import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Globe, Copy, ExternalLink, CheckCircle, XCircle, Loader2 } from 'lucide-react';

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
    toast.success('Link copiado!');
  };

  const publicUrl = window.location.hostname.includes('towersfy.com') 
    ? `https://${slug}.towersfy.com` 
    : `${clientUrl}/${slug}`;

  return (
    <Card className="p-8 bg-slate-900 text-white relative overflow-hidden rounded-[2.5rem] shadow-2xl max-w-2xl mx-auto mt-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="relative z-10 space-y-8">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-orange-500 text-white rounded-2xl shadow-xl shadow-orange-500/30"><Globe size={24}/></div>
          <div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Domínio e Acesso</h3>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1">Configuração de Endereço Web Personalizado</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">Identificador Slug</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  className={cn(
                    "w-full h-12 bg-white/5 border-2 border-white/10 rounded-xl px-5 font-black text-lg italic outline-none uppercase transition-all", 
                    isSlugAvailable === true && "border-emerald-500 text-emerald-400", 
                    isSlugAvailable === false && "border-rose-500 text-rose-400"
                  )} 
                  value={slug} 
                  onChange={e => onSlugChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isCheckingSlug ? <Loader2 size={16} className="animate-spin text-white/30" /> : isSlugAvailable === true ? <CheckCircle size={20} className="text-emerald-500" /> : isSlugAvailable === false ? <XCircle size={20} className="text-rose-500" /> : null}
                </div>
              </div>
              <button onClick={handleCopy} className="h-12 w-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"><Copy size={18}/></button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 flex items-center justify-between group shadow-xl">
            <div className="truncate">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 leading-none">URL Pública do Cardápio</p>
              <span className="text-sm font-black text-foreground italic tracking-tighter truncate">{publicUrl}</span>
            </div>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="p-2.5 bg-slate-900 text-white rounded-lg shadow-md hover:scale-105 transition-all">
              <ExternalLink size={16}/>
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
};