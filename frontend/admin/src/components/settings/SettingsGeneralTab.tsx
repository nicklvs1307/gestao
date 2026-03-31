import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Store, MapPin, Navigation, Clock, TrendingUp, BarChart3, Power, PackageCheck, Wallet } from 'lucide-react';
import type { GeneralSettings, OperationSettings, OperatingHour, LoyaltySettings, PixelSettings } from './types';

interface SettingsGeneralTabProps {
  general: GeneralSettings;
  operation: OperationSettings;
  operatingHours: OperatingHour[];
  loyalty: LoyaltySettings;
  pixels: PixelSettings;
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
    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(type === 'number' ? e.target.value : e.target.value)}
      placeholder={placeholder}
      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-300"
    />
  </div>
);

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  activeColor?: string;
}> = ({ checked, onChange, activeColor = "bg-slate-900" }) => (
  <button
    onClick={() => onChange(!checked)}
    className={cn("w-10 h-5 rounded-full relative transition-all duration-300", checked ? activeColor : "bg-slate-300")}
  >
    <div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-md", checked ? "left-6" : "left-1")} />
  </button>
);

export const SettingsGeneralTab: React.FC<SettingsGeneralTabProps> = ({
  general, operation, operatingHours, loyalty, pixels,
  setGeneral, setOperation, setOperatingHours, setLoyalty, setPixels
}) => {
  const dayLabels = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  const updateGeneral = (field: keyof GeneralSettings, value: string | number) => {
    setGeneral(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Card 1: IDENTIDADE - Slate Theme */}
      <Card className="p-0 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
        <div className="bg-slate-900 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <Store size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">Identidade</h3>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Dados do Estabelecimento</p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <InputField
            label="Nome do Estabelecimento"
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

      {/* Card 2: LOCALIZAÇÃO - Orange Theme */}
      <Card className="p-0 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
        <div className="bg-orange-500 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <MapPin size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">Localização</h3>
            <p className="text-[7px] font-bold text-orange-100 uppercase tracking-widest">Endereço e Geo</p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <InputField
            label="Endereço Completo"
            value={general.address}
            onChange={(v) => updateGeneral('address', v)}
            placeholder="Rua, número, bairro..."
          />
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Cidade"
              value={general.city}
              onChange={(v) => updateGeneral('city', v)}
              placeholder="Cidade"
            />
            <InputField
              label="Estado (UF)"
              value={general.state}
              onChange={(v) => updateGeneral('state', v)}
              placeholder="SP"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Latitude"
              value={general.latitude}
              onChange={(v) => updateGeneral('latitude', v)}
              placeholder="-23.5505"
            />
            <InputField
              label="Longitude"
              value={general.longitude}
              onChange={(v) => updateGeneral('longitude', v)}
              placeholder="-46.6333"
            />
          </div>
        </div>
      </Card>

      {/* Card 3: ENTREGA & OPERAÇÃO - Emerald Theme */}
      <div className="space-y-4">
        <Card className="p-0 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Navigation size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">Entrega</h3>
              <p className="text-[7px] font-bold text-emerald-100 uppercase tracking-widest">Taxa e Tempo</p>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-3">
              <InputField
                label="Taxa (R$)"
                value={general.deliveryFee}
                onChange={(v) => updateGeneral('deliveryFee', parseFloat(v) || 0)}
                type="number"
              />
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

        <Card className="p-0 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">Operação</h3>
              <p className="text-[7px] font-bold text-emerald-100 uppercase tracking-widest">Status e Automação</p>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", operation.isOpen ? "bg-emerald-100" : "bg-rose-100")}>
                  <Power size={14} className={cn(operation.isOpen ? "text-emerald-600" : "text-rose-600")} />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Loja Aberta</p>
                  <p className={cn("text-[10px] font-black italic", operation.isOpen ? "text-emerald-600" : "text-rose-600")}>
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

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", operation.autoAccept ? "bg-slate-100" : "bg-slate-100")}>
                  <PackageCheck size={14} className={operation.autoAccept ? "text-slate-900" : "text-slate-400"} />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Aceite Automático</p>
                  <p className="text-[10px] font-black italic text-slate-700">
                    {operation.autoAccept ? 'ATIVADO' : 'MANUAL'}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={operation.autoAccept}
                onChange={(v) => setOperation(prev => ({ ...prev, autoAccept: v }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", operation.autoOpenDelivery ? "bg-emerald-100" : "bg-slate-100")}>
                  <Wallet size={14} className={operation.autoOpenDelivery ? "text-emerald-600" : "text-slate-400"} />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Agendamento</p>
                  <p className={cn("text-[10px] font-black italic", operation.autoOpenDelivery ? "text-emerald-600" : "text-slate-400")}>
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

      {/* HORÁRIOS DE FUNCIONAMENTO */}
      {operation.autoOpenDelivery && (
        <Card className="lg:col-span-3 p-0 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-slate-900 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Clock size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">Horário de Funcionamento</h3>
                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Agenda Semanal</p>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {operatingHours.map((schedule, index) => (
                <div key={schedule.dayOfWeek} className={cn(
                  "p-3 rounded-xl border transition-all",
                  schedule.isClosed ? "bg-slate-50 border-slate-100" : "bg-emerald-50 border-emerald-100"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest",
                      schedule.isClosed ? "text-slate-400" : "text-emerald-600"
                    )}>
                      {dayLabels[schedule.dayOfWeek]}
                    </span>
                    <button 
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
                      className="w-full h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-center disabled:opacity-30"
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
                      className="w-full h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-center disabled:opacity-30"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* FIDELIDADE - Emerald Theme */}
      <Card className="lg:col-span-3 p-0 bg-gradient-to-br from-emerald-50 to-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">Programa de Fidelidade</h3>
              <p className="text-[7px] font-bold text-emerald-100 uppercase tracking-widest">Cashback e Pontos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[8px] font-black uppercase text-emerald-100">Ativar Programa</span>
            <ToggleSwitch
              checked={loyalty.enabled}
              onChange={(v) => setLoyalty(prev => ({ ...prev, enabled: v }))}
              activeColor="bg-emerald-500"
            />
          </div>
        </div>
        <div className={cn("p-4 transition-all", !loyalty.enabled && "opacity-50 pointer-events-none")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <span className="text-emerald-600 font-black text-lg">R$</span>
              </div>
              <div className="flex-1">
                <p className="text-[7px] font-bold text-emerald-600 uppercase tracking-widest">1 Real equals</p>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={loyalty.pointsPerReal}
                    onChange={(e) => setLoyalty(prev => ({ ...prev, pointsPerReal: parseInt(e.target.value) || 0 }))}
                    className="w-16 h-9 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-black italic text-emerald-700 text-center"
                  />
                  <span className="text-[9px] font-black text-emerald-600 uppercase">Pontos</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Percent size={18} className="text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-[7px] font-bold text-orange-600 uppercase tracking-widest">Cashback</p>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={loyalty.cashback}
                    onChange={(e) => setLoyalty(prev => ({ ...prev, cashback: parseFloat(e.target.value) || 0 }))}
                    className="w-16 h-9 px-3 bg-orange-50 border border-orange-200 rounded-lg text-[11px] font-black italic text-orange-600 text-center"
                  />
                  <span className="text-[9px] font-black text-orange-600 uppercase">Por cento</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* PIXELS - Blue Theme */}
      <Card className="lg:col-span-3 p-0 bg-gradient-to-br from-blue-50 to-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">Pixels e Analytics</h3>
              <p className="text-[7px] font-bold text-blue-100 uppercase tracking-widest">Rastreamento de Conversões</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
              <p className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-2">Meta Pixel ID</p>
              <input
                value={pixels.metaPixelId}
                onChange={(e) => setPixels(prev => ({ ...prev, metaPixelId: e.target.value }))}
                placeholder="1234567890"
                className="w-full h-9 px-3 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-bold text-slate-700 placeholder:text-blue-200"
              />
            </div>
            <div className="p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
              <p className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-2">Google Analytics (GA4)</p>
              <input
                value={pixels.googleAnalyticsId}
                onChange={(e) => setPixels(prev => ({ ...prev, googleAnalyticsId: e.target.value }))}
                placeholder="G-XXXXXXXXXX"
                className="w-full h-9 px-3 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-bold text-slate-700 placeholder:text-blue-200"
              />
            </div>
            <div className="p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
              <p className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-2">Pixel Interno</p>
              <input
                value={pixels.internalPixelId}
                onChange={(e) => setPixels(prev => ({ ...prev, internalPixelId: e.target.value }))}
                placeholder="ID Personalizado"
                className="w-full h-9 px-3 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-bold text-slate-700 placeholder:text-blue-200"
              />
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-900/5 rounded-xl border border-blue-100">
            <p className="text-[8px] font-bold text-blue-700 leading-relaxed">
              <strong className="text-blue-800">Meta Pixel:</strong> Rastreie conversões no Facebook e Instagram.<br/>
              <strong className="text-blue-800">GA4:</strong> Análise completa no Google Analytics 4.<br/>
              <strong className="text-blue-800">Pixel Interno:</strong> Integrações personalizadas com outros sistemas.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Helper icon component
const Percent: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="19" y1="5" x2="5" y2="19"></line>
    <circle cx="6.5" cy="6.5" r="2.5"></circle>
    <circle cx="17.5" cy="17.5" r="2.5"></circle>
  </svg>
);
