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

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  colorClass: string;
}> = ({ icon, title, subtitle, colorClass }) => (
  <div className={cn("flex items-center gap-3 p-3", colorClass)}>
    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
      {icon}
    </div>
    <div>
      <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">{title}</h3>
      <p className="text-[8px] font-bold text-white/70 uppercase tracking-widest">{subtitle}</p>
    </div>
  </div>
);

const ColorPicker: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  colorName: string;
}> = ({ label, value, onChange, colorName }) => (
  <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">{colorName}</p>
      <p className="text-[10px] font-medium text-slate-700">{label}</p>
    </div>
    <div className="relative group">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-11 h-11 rounded-lg cursor-pointer border-2 border-white shadow-md transition-transform group-hover:scale-110"
      />
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
    <div className="space-y-4">
      {/* Row 1: BRAND ASSETS + BANNERS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* BRAND ASSETS */}
        <Card className="p-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <SectionHeader
            icon={<ImageIcon size={16} className="text-white" />}
            title="Brand Assets"
            subtitle="Logo e Capa"
            colorClass="bg-primary"
          />
          <div className="p-4 space-y-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Logo Principal</p>
              <div
                className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center p-3 group relative cursor-pointer overflow-hidden hover:border-primary/50 transition-colors"
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
                    <ImageIcon size={28} className="text-slate-300 mx-auto mb-2" />
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Upload</span>
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
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Capa do Menu</p>
              <div
                className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center relative group cursor-pointer overflow-hidden hover:border-primary/50 transition-colors"
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
                    <LayoutTemplate size={28} className="text-slate-300 mx-auto mb-2" />
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Upload</span>
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

        {/* BANNERS & COLORS */}
        <Card className="lg:col-span-3 p-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          {/* Banners Section */}
          <SectionHeader
            icon={<Video size={16} className="text-white" />}
            title="Banners de Vídeo"
            subtitle="Opcional - Automatic Menu"
            colorClass="bg-slate-800"
          />
          <div className="p-4 border-b border-slate-100">
            <div className="space-y-2">
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
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 border-rose-200 text-rose-500 hover:bg-rose-500 hover:text-white"
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
                className="h-9 text-[9px] font-bold uppercase tracking-wider border-slate-200"
                onClick={() => setAppearance({...appearance, videoBanners: [...appearance.videoBanners, '']})}
              >
                <Plus size={12} className="mr-1"/> Adicionar Link
              </Button>
              <Button
                variant="secondary"
                className="h-9 text-[9px] font-bold uppercase tracking-wider bg-primary text-white border-primary hover:bg-primary/90"
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
          <SectionHeader
            icon={<Palette size={16} className="text-white" />}
            title="Paleta de Cores"
            subtitle="Identidade Visual do Menu"
            colorClass="bg-slate-700"
          />
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
          <div className="p-4 bg-slate-900 rounded-b-xl">
            <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-3 right-3">
                <div className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-full">
                  <Eye size={10} className="text-white/60" />
                  <span className="text-[6px] font-black uppercase text-white/60">Preview</span>
                </div>
              </div>
              <Smartphone className="text-primary mx-auto mb-3" size={32} />
              <h4 className="text-white font-black italic uppercase text-sm tracking-tight">Experiência do Cliente</h4>
              <p className="text-slate-400 text-[8px] font-medium uppercase tracking-wider max-w-sm mx-auto mt-1 leading-relaxed">
                As cores alteram instantaneamente o layout do cardápio digital.
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <div
                  className="w-7 h-7 rounded-lg shadow-lg"
                  style={{ backgroundColor: appearance.primary }}
                />
                <div
                  className="w-7 h-7 rounded-lg shadow-lg"
                  style={{ backgroundColor: appearance.secondary }}
                />
                <div
                  className="w-7 h-7 rounded-lg shadow-lg"
                  style={{ backgroundColor: appearance.background }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
