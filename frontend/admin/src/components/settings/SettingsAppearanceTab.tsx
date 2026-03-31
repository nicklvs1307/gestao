import React, { useRef } from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Image as ImageIcon, LayoutTemplate, Palette, Smartphone, Plus, Trash2, Upload, Video, Eye } from 'lucide-react';
import { uploadLogo, uploadCover, uploadVideoBanner } from '../../services/api';
import type { AppearanceSettings } from './types';

interface SettingsAppearanceTabProps {
  appearance: AppearanceSettings;
  setAppearance: React.Dispatch<React.SetStateAction<AppearanceSettings>>;
}

const ColorPicker: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  colorName: string;
}> = ({ label, value, onChange, colorName }) => (
  <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
    <div>
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{colorName}</p>
      <p className="text-[10px] font-bold text-slate-700 uppercase italic">{label}</p>
    </div>
    <div className="relative group">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white shadow-md transition-transform group-hover:scale-110"
      />
      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white shadow-md flex items-center justify-center">
        <Palette size={10} className="text-slate-400" />
      </div>
    </div>
  </div>
);

export const SettingsAppearanceTab: React.FC<SettingsAppearanceTabProps> = ({
  appearance, setAppearance
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File, uploadFn: (f: File) => Promise<{ logoUrl?: string; coverUrl?: string; videoUrl?: string }>) => {
    try {
      const { toast } = await import('sonner');
      const result = await uploadFn(file);
      if ('logoUrl' in result && result.logoUrl) {
        setAppearance(prev => ({ ...prev, logo: `/api${result.logoUrl}` }));
      } else if ('coverUrl' in result && result.coverUrl) {
        setAppearance(prev => ({ ...prev, cover: `/api${result.coverUrl}` }));
      } else if ('videoUrl' in result && result.videoUrl) {
        setAppearance(prev => ({ ...prev, videoBanners: [...prev.videoBanners, `/api${result.videoUrl}`] }));
      }
      toast.success('Upload realizado com sucesso!');
    } catch (error) {
      const { toast } = await import('sonner');
      toast.error('Erro ao fazer upload.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      {/* Card 1: BRAND ASSETS - Orange Theme */}
      <Card className="p-0 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <ImageIcon size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">Brand Assets</h3>
            <p className="text-[7px] font-bold text-orange-100 uppercase tracking-widest">Logo e Capa</p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Logo Principal</p>
            <div 
              className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center p-3 group relative cursor-pointer overflow-hidden hover:border-orange-300 transition-colors"
              onClick={() => logoInputRef.current?.click()}
            >
              {appearance.logo ? (
                <>
                  <img src={appearance.logo} className="w-full h-full object-contain group-hover:scale-105 transition-all duration-300" alt="Logo" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="text-center">
                      <Upload size={20} className="text-white mx-auto mb-1" />
                      <span className="text-[8px] font-black text-white uppercase italic">Trocar</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <ImageIcon size={32} className="text-slate-300 mx-auto mb-2" />
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Click para Upload</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={logoInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file, uploadLogo);
              }} 
            />
          </div>

          {/* Cover Upload */}
          <div className="space-y-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Capa do Menu</p>
            <div 
              className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center relative group cursor-pointer overflow-hidden hover:border-orange-300 transition-colors"
              onClick={() => coverInputRef.current?.click()}
            >
              {appearance.cover ? (
                <>
                  <img src={appearance.cover} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" alt="Cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="text-center">
                      <Upload size={20} className="text-white mx-auto mb-1" />
                      <span className="text-[8px] font-black text-white uppercase italic">Trocar</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <LayoutTemplate size={32} className="text-slate-300 mx-auto mb-2" />
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Click para Upload</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={coverInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file, uploadCover);
              }} 
            />
          </div>
        </div>
      </Card>

      {/* Card 2: BANNERS & COLORS - Slate Theme */}
      <Card className="lg:col-span-3 p-0 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
        {/* Banners Section */}
        <div className="bg-slate-900 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <Video size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">Banners de Vídeo</h3>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Opcional - Automatic Menu</p>
          </div>
        </div>
        <div className="p-4 border-b border-slate-100">
          <div className="space-y-3">
            {appearance.videoBanners.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => {
                      const newBanners = [...appearance.videoBanners];
                      newBanners[index] = e.target.value;
                      setAppearance({...appearance, videoBanners: newBanners});
                    }}
                    placeholder="https://..."
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 border-rose-200 text-rose-500 hover:bg-rose-500 hover:text-white"
                  onClick={() => {
                    const newBanners = appearance.videoBanners.filter((_, i) => i !== index);
                    setAppearance({...appearance, videoBanners: newBanners});
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              className="h-8 text-[8px] font-black uppercase tracking-widest border-slate-200"
              onClick={() => setAppearance({...appearance, videoBanners: [...appearance.videoBanners, '']})}
            >
              <Plus size={12} className="mr-1"/> Adicionar Link
            </Button>
            <Button
              variant="secondary"
              className="h-8 text-[8px] font-black uppercase tracking-widest bg-orange-500 text-white border-orange-500 hover:bg-orange-600"
              onClick={() => videoInputRef.current?.click()}
            >
              <Smartphone size={12} className="mr-1"/> Upload Vídeo
            </Button>
            <input 
              type="file" 
              ref={videoInputRef} 
              className="hidden" 
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file, uploadVideoBanner);
              }}
            />
          </div>
        </div>

        {/* Colors Section */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <Palette size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">Paleta de Cores</h3>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Identidade Visual do Menu</p>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ColorPicker
              label="Destaque (Principal)"
              value={appearance.primary}
              onChange={(v) => setAppearance({...appearance, primary: v})}
              colorName="PRIMARY"
            />
            <ColorPicker
              label="Contraste (Títulos)"
              value={appearance.secondary}
              onChange={(v) => setAppearance({...appearance, secondary: v})}
              colorName="SECONDARY"
            />
            <ColorPicker
              label="Fundo do App"
              value={appearance.background}
              onChange={(v) => setAppearance({...appearance, background: v})}
              colorName="BACKGROUND"
            />
          </div>
        </div>

        {/* Preview Card */}
        <div className="p-4 bg-slate-900 rounded-b-2xl">
          <div className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-4 right-4">
              <div className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-full">
                <Eye size={10} className="text-white/60" />
                <span className="text-[6px] font-black uppercase text-white/60">Preview</span>
              </div>
            </div>
            <Smartphone className="text-orange-500 mx-auto mb-4" size={40} />
            <h4 className="text-white font-black italic uppercase text-base tracking-tight">Experiência do Cliente</h4>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.15em] max-w-sm mx-auto mt-2 leading-relaxed">
              As cores aplicadas aqui alteram instantaneamente o layout do cardápio digital, proporcionando uma identidade visual única e memorável.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <div 
                className="w-8 h-8 rounded-lg shadow-lg"
                style={{ backgroundColor: appearance.primary }}
              />
              <div 
                className="w-8 h-8 rounded-lg shadow-lg"
                style={{ backgroundColor: appearance.secondary }}
              />
              <div 
                className="w-8 h-8 rounded-lg shadow-lg"
                style={{ backgroundColor: appearance.background }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
