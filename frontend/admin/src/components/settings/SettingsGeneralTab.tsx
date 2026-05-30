import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Store, MapPin, Navigation, Clock, TrendingUp, BarChart3, Power, PackageCheck, Wallet, Link2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { GeneralSettings, OperationSettings, OperatingHour, LoyaltySettings, PixelSettings } from './types';

interface SettingsGeneralTabProps {
  general: GeneralSettings;
  operation: OperationSettings;
  operatingHours: OperatingHour[];
  loyalty: LoyaltySettings;
  pixels: PixelSettings;
  isSlugAvailable: boolean | null;
  isCheckingSlug: boolean;
  onSlugChange: (slug: string) => void;
  setGeneral: React.Dispatch<React.SetStateAction<GeneralSettings>>;
  setOperation: React.Dispatch<React.SetStateAction<OperationSettings>>;
  setOperatingHours: React.Dispatch<React.SetStateAction<OperatingHour[]>>;
  setLoyalty: React.Dispatch<React.SetStateAction<LoyaltySettings>>;
  setPixels: React.Dispatch<React.SetStateAction<PixelSettings>>;
}

const InputField: React.FC<{
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  className?: string;
}> = ({ label, value, onChange, type = 'text', placeholder, className }) => (
  <div className={cn("space-y-1.5", className)}>
    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(type === 'number' ? e.target.value : e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-300"
    />
  </div>
);

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  activeColor?: string;
}> = ({ checked, onChange, activeColor = "bg-primary" }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={cn("w-11 h-6 rounded-full relative transition-all duration-300", checked ? activeColor : "bg-slate-300")}
  >
    <div className={cn("absolute w-4 h-4 bg-white rounded-full top-1 transition-all shadow-md", checked ? "left-6" : "left-1")} />
  </button>
);

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

export const SettingsGeneralTab: React.FC<SettingsGeneralTabProps> = ({
  general, operation, operatingHours, loyalty, pixels,
  isSlugAvailable, isCheckingSlug, onSlugChange,
  setGeneral, setOperation, setOperatingHours, setLoyalty, setPixels
}) => {
  const dayLabels = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  const updateGeneral = (field: keyof GeneralSettings, value: string | number) => {
    setGeneral(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Row 1: IDENTIDADE + LOCALIZAÇÃO + ENTREGA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* IDENTIDADE */}
        <Card className="p-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <SectionHeader
            icon={<Store size={16} className="text-white" />}
            title="Identidade"
            subtitle="Dados do Estabelecimento"
            colorClass="bg-primary"
          />
          <div className="p-4 space-y-3">
            <InputField
              label="Nome da Loja"
              value={general.name}
              onChange={(v) => updateGeneral('name', v)}
              placeholder="Nome da sua loja"
            />
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="WhatsApp / SAC"
                value={general.phone}
                onChange={(v) => updateGeneral('phone', v)}
                placeholder="(00) 00000-0000"
              />
              <InputField
                label="Taxa Serviço (%)"
                value={general.serviceTax}
                onChange={(v) => updateGeneral('serviceTax', parseFloat(v) || 0)}
                type="number"
              />
            </div>
          </div>
        </Card>

        {/* LOCALIZAÇÃO */}
        <Card className="p-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <SectionHeader
            icon={<MapPin size={16} className="text-white" />}
            title="Localização"
            subtitle="Endereço e Geo"
            colorClass="bg-slate-800"
          />
          <div className="p-4 space-y-3">
            <InputField
              label="Endereço Completo"
              value={general.address}
              onChange={(v) => updateGeneral('address', v)}
              placeholder="Rua, número, bairro..."
            />
            <div className="grid grid-cols-3 gap-3">
              <InputField
                label="Cidade"
                value={general.city}
                onChange={(v) => updateGeneral('city', v)}
                placeholder="Cidade"
              />
              <InputField
                label="UF"
                value={general.state}
                onChange={(v) => updateGeneral('state', v)}
                placeholder="SP"
              />
              <InputField
                label="Taxa Entrega"
                value={general.deliveryFee}
                onChange={(v) => updateGeneral('deliveryFee', parseFloat(v) || 0)}
                type="number"
              />
            </div>
          </div>
        </Card>

        {/* ENTREGA + OPERAÇÃO */}
        <div className="space-y-4">
          {/* ENTREGA */}
          <Card className="p-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <SectionHeader
              icon={<Navigation size={16} className="text-white" />}
              title="Entrega"
              subtitle="Taxa e Tempo"
              colorClass="bg-emerald-600"
            />
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Tempo Médio"
                  value={general.deliveryTime}
                  onChange={(v) => updateGeneral('deliveryTime', v)}
                  placeholder="30-40 min"
                />
                <InputField
                  label="Mínimo (R$)"
                  value={general.minOrderValue}
                  onChange={(v) => updateGeneral('minOrderValue', parseFloat(v) || 0)}
                  type="number"
                />
              </div>
            </div>
          </Card>

          {/* OPERAÇÃO */}
          <Card className="p-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <SectionHeader
              icon={<Clock size={16} className="text-white" />}
              title="Operação"
              subtitle="Status e Automação"
              colorClass="bg-slate-700"
            />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", operation.isOpen ? "bg-emerald-100" : "bg-rose-100")}>
                    <Power size={14} className={cn(operation.isOpen ? "text-emerald-600" : "text-rose-600")} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Loja Aberta</p>
                    <p className={cn("text-xs font-black italic", operation.isOpen ? "text-emerald-600" : "text-rose-600")}>
                      {operation.isOpen ? 'ONLINE' : 'OFFLINE'}
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={operation.isOpen}
                  onChange={(v) => setOperation(prev => ({ ...prev, isOpen: v }))}
                  activeColor="bg-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-100">
                    <PackageCheck size={14} className={operation.autoAccept ? "text-slate-900" : "text-slate-400"} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Aceite Automático</p>
                    <p className="text-xs font-black italic text-slate-700">
                      {operation.autoAccept ? 'ATIVADO' : 'MANUAL'}
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={operation.autoAccept}
                  onChange={(v) => setOperation(prev => ({ ...prev, autoAccept: v }))}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", operation.autoOpenDelivery ? "bg-emerald-100" : "bg-slate-100")}>
                    <Wallet size={14} className={operation.autoOpenDelivery ? "text-emerald-600" : "text-slate-400"} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Agendamento</p>
                    <p className={cn("text-xs font-black italic", operation.autoOpenDelivery ? "text-emerald-600" : "text-slate-400")}>
                      {operation.autoOpenDelivery ? 'ATIVADO' : 'DESATIVADO'}
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={operation.autoOpenDelivery}
                  onChange={(v) => setOperation(prev => ({ ...prev, autoOpenDelivery: v }))}
                  activeColor="bg-emerald-500"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* HORÁRIOS DE FUNCIONAMENTO */}
      {operation.autoOpenDelivery && (
        <Card className="p-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <SectionHeader
            icon={<Clock size={16} className="text-white" />}
            title="Horário de Funcionamento"
            subtitle="Agenda Semanal"
            colorClass="bg-slate-900"
          />
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {operatingHours.map((schedule, index) => (
                <div key={schedule.dayOfWeek} className={cn(
                  "p-3 rounded-lg border transition-all",
                  schedule.isClosed ? "bg-slate-50 border-slate-100" : "bg-emerald-50 border-emerald-100"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest",
                      schedule.isClosed ? "text-slate-400" : "text-emerald-600"
                    )}>
                      {dayLabels[schedule.dayOfWeek]}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...operatingHours];
                        updated[index] = {...updated[index], isClosed: !updated[index].isClosed};
                        setOperatingHours(updated);
                      }}
                      className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-black uppercase transition-all",
                        schedule.isClosed ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
                      )}
                    >
                      {schedule.isClosed ? 'X' : '✓'}
                    </button>
                  </div>
                  <div className="space-y-1">
                    <input
                      type="time"
                      disabled={schedule.isClosed}
                      value={schedule.openingTime}
                      onChange={(e) => {
                        const updated = [...operatingHours];
                        updated[index] = {...updated[index], openingTime: e.target.value};
                        setOperatingHours(updated);
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-[10px] font-medium text-center disabled:opacity-30"
                    />
                    <span className="text-[7px] text-slate-300 block text-center">às</span>
                    <input
                      type="time"
                      disabled={schedule.isClosed}
                      value={schedule.closingTime}
                      onChange={(e) => {
                        const updated = [...operatingHours];
                        updated[index] = {...updated[index], closingTime: e.target.value};
                        setOperatingHours(updated);
                      }}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-[10px] font-medium text-center disabled:opacity-30"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Row 2: FIDELIDADE + PIXELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* FIDELIDADE */}
        <Card className="p-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <SectionHeader
            icon={<TrendingUp size={16} className="text-white" />}
            title="Programa de Fidelidade"
            subtitle="Cashback e Pontos"
            colorClass="bg-emerald-500"
          />
          <div className="p-4">
            <div className="flex items-center justify-between mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">Ativar Programa</span>
              <ToggleSwitch
                checked={loyalty.enabled}
                onChange={(v) => setLoyalty(prev => ({ ...prev, enabled: v }))}
                activeColor="bg-emerald-500"
              />
            </div>
            <div className={cn("transition-all", !loyalty.enabled && "opacity-50 pointer-events-none")}>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-emerald-100">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <span className="text-emerald-600 font-black text-sm">R$</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">1 Real =</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <input
                        type="number"
                        value={loyalty.pointsPerReal}
                        onChange={(e) => setLoyalty(prev => ({ ...prev, pointsPerReal: parseInt(e.target.value) || 0 }))}
                        className="w-14 h-9 px-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-black italic text-emerald-700 text-center"
                      />
                      <span className="text-[9px] font-bold text-emerald-600 uppercase">Pontos</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-100">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Percent size={16} className="text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[8px] font-bold text-orange-600 uppercase tracking-widest">Cashback</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <input
                        type="number"
                        value={loyalty.cashback}
                        onChange={(e) => setLoyalty(prev => ({ ...prev, cashback: parseFloat(e.target.value) || 0 }))}
                        className="w-14 h-9 px-2 bg-orange-50 border border-orange-200 rounded-lg text-[11px] font-black italic text-orange-600 text-center"
                      />
                      <span className="text-[9px] font-bold text-orange-600 uppercase">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* PIXELS */}
        <Card className="p-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <SectionHeader
            icon={<BarChart3 size={16} className="text-white" />}
            title="Pixels e Analytics"
            subtitle="Rastreamento de Conversões"
            colorClass="bg-blue-600"
          />
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-lg border border-blue-100">
                <p className="text-[8px] font-bold uppercase tracking-widest text-blue-400 mb-1.5">Meta Pixel</p>
                <input
                  value={pixels.metaPixelId}
                  onChange={(e) => setPixels(prev => ({ ...prev, metaPixelId: e.target.value }))}
                  placeholder="1234567890"
                  className="w-full h-9 px-2 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-medium text-slate-700 placeholder:text-blue-200"
                />
              </div>
              <div className="p-3 bg-white rounded-lg border border-blue-100">
                <p className="text-[8px] font-bold uppercase tracking-widest text-blue-400 mb-1.5">Google GA4</p>
                <input
                  value={pixels.googleAnalyticsId}
                  onChange={(e) => setPixels(prev => ({ ...prev, googleAnalyticsId: e.target.value }))}
                  placeholder="G-XXXXXXXXXX"
                  className="w-full h-9 px-2 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-medium text-slate-700 placeholder:text-blue-200"
                />
              </div>
              <div className="p-3 bg-white rounded-lg border border-blue-100">
                <p className="text-[8px] font-bold uppercase tracking-widest text-blue-400 mb-1.5">Pixel Interno</p>
                <input
                  value={pixels.internalPixelId}
                  onChange={(e) => setPixels(prev => ({ ...prev, internalPixelId: e.target.value }))}
                  placeholder="ID Personalizado"
                  className="w-full h-9 px-2 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-medium text-slate-700 placeholder:text-blue-200"
                />
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-[9px] font-medium text-blue-700 leading-relaxed">
                <strong className="text-blue-800">Meta Pixel:</strong> Facebook/Instagram.
                <span className="mx-1">|</span>
                <strong className="text-blue-800">GA4:</strong> Google Analytics.
                <span className="mx-1">|</span>
                <strong className="text-blue-800">Pixel:</strong> Integrações customizadas.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* LINKS */}
      <Card className="p-0 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <SectionHeader
          icon={<Link2 size={16} className="text-white" />}
          title="Links e URLs"
          subtitle="Identificador do Estabelecimento"
          colorClass="bg-slate-700"
        />
        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="space-y-1.5 mb-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Slug / Identificador</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={general.slug}
                      onChange={(e) => onSlugChange(e.target.value)}
                      placeholder="nome-da-loja"
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-300"
                    />
                  </div>
                  <div className="flex items-center gap-2 min-w-[120px]">
                    {isCheckingSlug && (
                      <Loader2 size={14} className="text-slate-400 animate-spin" />
                    )}
                    {!isCheckingSlug && isSlugAvailable === true && (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle size={14} />
                        <span className="text-[9px] font-bold uppercase">Disponível</span>
                      </div>
                    )}
                    {!isCheckingSlug && isSlugAvailable === false && (
                      <div className="flex items-center gap-1 text-rose-600">
                        <XCircle size={14} />
                        <span className="text-[9px] font-bold uppercase">Indisponível</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                URL do cardápio: <span className="text-primary font-medium">ki.com.br/{general.slug || '...'}</span>
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const Percent: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="19" y1="5" x2="5" y2="19"></line>
    <circle cx="6.5" cy="6.5" r="2.5"></circle>
    <circle cx="17.5" cy="17.5" r="2.5"></circle>
  </svg>
);
