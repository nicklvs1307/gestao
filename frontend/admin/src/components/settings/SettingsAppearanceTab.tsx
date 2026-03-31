import React, { useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Image as ImageIcon, LayoutTemplate, Palette, Smartphone, Plus, Trash2 } from 'lucide-react';
import { uploadLogo, uploadCover, uploadVideoBanner } from '../../services/api';
import type { AppearanceSettings } from './types';

interface SettingsAppearanceTabProps {
  appearance: AppearanceSettings;
  setAppearance: React.Dispatch<React.SetStateAction<AppearanceSettings>>;
}

export const SettingsAppearanceTab: React.FC<SettingsAppearanceTabProps> = ({
  appearance, setAppearance
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <Card className="p-4 space-y-4 border-border">
        <h3 className="text-[10px] font-black uppercase text-foreground italic flex items-center gap-2 border-b border-slate-50 pb-2">
          <ImageIcon size={14} className="text-orange-500"/> Brand Assets
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Logo Principal</p>
            <div className="aspect-square bg-background border-2 border-dashed border-border rounded-2xl flex items-center justify-center p-3 group relative cursor-pointer overflow-hidden" onClick={() => logoInputRef.current?.click()}>
              <img src={appearance.logo} className="w-full h-full object-contain group-hover:scale-105 transition-all" alt="Logo" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-[8px] font-black text-white uppercase italic">Trocar</span>
              </div>
            </div>
            <input type="file" ref={logoInputRef} className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              const { logoUrl } = await uploadLogo(file); setAppearance({...appearance, logo: `/api${logoUrl}`});
            }} />
          </div>
          <div className="space-y-2">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Capa do Menu</p>
            <div className="aspect-video bg-background border-2 border-dashed border-border rounded-xl flex items-center justify-center relative group cursor-pointer overflow-hidden" onClick={() => coverInputRef.current?.click()}>
              <img src={appearance.cover} className="w-full h-full object-cover group-hover:scale-105 transition-all" alt="Capa" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-[8px] font-black text-white uppercase italic">Trocar</span>
              </div>
            </div>
            <input type="file" ref={coverInputRef} className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              const { coverUrl } = await uploadCover(file); setAppearance({...appearance, cover: `/api${coverUrl}`});
            }} />
          </div>
        </div>
      </Card>

      <Card className="lg:col-span-3 p-4 space-y-4 border-border">
        <div className="space-y-4">
          <div>
            <h3 className="text-[10px] font-black uppercase text-foreground italic flex items-center gap-2 border-b border-slate-50 pb-2 mb-3">
              <LayoutTemplate size={14} className="text-orange-500"/> Banners de Vídeo (Opcional)
            </h3>
            <div className="space-y-2">
              {appearance.videoBanners.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input type="text" className="w-full h-9 px-3 rounded-lg bg-background border border-border text-[11px] font-bold focus:border-primary outline-none transition-all" value={url} onChange={(e) => {
                    const newBanners = [...appearance.videoBanners];
                    newBanners[index] = e.target.value;
                    setAppearance({...appearance, videoBanners: newBanners});
                  }}/>
                  <Button variant="destructive" size="icon" onClick={() => {
                    const newBanners = appearance.videoBanners.filter((_, i) => i !== index);
                    setAppearance({...appearance, videoBanners: newBanners});
                  }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-3" onClick={() => setAppearance({...appearance, videoBanners: [...appearance.videoBanners, '']})}>
              <Plus size={14} className="mr-2"/> Adicionar Link Manual
            </Button>
            <Button variant="secondary" className="mt-3 ml-2 bg-orange-500 text-white hover:bg-orange-600" onClick={() => videoInputRef.current?.click()}>
              <Smartphone size={14} className="mr-2"/> Upload de Vídeo
            </Button>
            <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              try {
                const { toast } = await import('sonner');
                const { videoUrl } = await uploadVideoBanner(file);
                setAppearance({...appearance, videoBanners: [...appearance.videoBanners, `/api${videoUrl}`]});
                toast.success('Vídeo enviado com sucesso!');
              } catch (error) {
                const { toast } = await import('sonner');
                toast.error('Erro ao enviar vídeo.');
              }
            }}/>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase text-foreground italic flex items-center gap-2 border-b border-slate-50 pb-2">
              <Palette size={14} className="text-orange-500"/> Paleta de Cores
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              {[
                { id: 'primary', label: 'Destaque (Principal)', val: appearance.primary },
                { id: 'secondary', label: 'Contraste (Títulos)', val: appearance.secondary },
                { id: 'background', label: 'Fundo do Aplicativo', val: appearance.background },
              ].map((c) => (
                <div key={c.id} className="p-3 bg-background border border-border rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{c.id}</p>
                    <p className="text-[10px] font-bold text-foreground uppercase italic">{c.label}</p>
                  </div>
                  <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border-2 border-white shadow-sm" value={c.val} onChange={e => setAppearance({...appearance, [c.id]: e.target.value})} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 p-8 bg-slate-900 rounded-[2rem] text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Smartphone className="text-orange-500 mx-auto mb-4" size={32} />
          <h4 className="text-white font-black italic uppercase text-sm tracking-tight">Experiência do Cliente</h4>
          <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-[0.2em] max-w-sm mx-auto mt-2 leading-relaxed">As cores aplicadas aqui alteram instantaneamente o layout do cardápio digital, proporcionando uma identidade visual única.</p>
        </div>
      </Card>
    </div>
  );
};