import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Store, MapPin, Settings, Clock, Navigation, TrendingUp, BarChart3 } from 'lucide-react';
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

export const SettingsGeneralTab: React.FC<SettingsGeneralTabProps> = ({
  general, operation, operatingHours, loyalty, pixels,
  setGeneral, setOperation, setOperatingHours, setLoyalty, setPixels
}) => {
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Card 1: Identidade */}
      <Card className="p-4 space-y-4 border-border">
        <h3 className="text-[10px] font-black uppercase text-foreground italic flex items-center gap-2 border-b border-background pb-2">
          <Store size={14} className="text-primary"/> Identidade
        </h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Nome do Estabelecimento</label>
            <input className="w-full h-9 px-3 rounded-lg bg-background border border-border text-[11px] font-bold focus:border-primary outline-none transition-all" value={general.name} onChange={e => setGeneral({...general, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">WhatsApp / SAC</label>
              <input className="w-full h-9 px-3 rounded-lg bg-background border border-border text-[11px] font-bold" value={general.phone} onChange={e => setGeneral({...general, phone: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Taxa Serviço (%)</label>
              <input type="number" className="w-full h-9 px-3 rounded-lg bg-background border border-border text-[11px] font-bold" value={general.serviceTax} onChange={e => setGeneral({...general, serviceTax: parseFloat(e.target.value)})} />
            </div>
          </div>
        </div>
      </Card>

      {/* Card 2: Localização */}
      <Card className="p-4 space-y-4 border-border">
        <h3 className="text-[10px] font-black uppercase text-foreground italic flex items-center gap-2 border-b border-slate-50 pb-2">
          <MapPin size={14} className="text-orange-500"/> Localização
        </h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Endereço Completo</label>
            <input className="w-full h-9 px-3 rounded-lg bg-background border border-border text-[11px] font-bold" value={general.address} onChange={e => setGeneral({...general, address: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Cidade</label>
              <input className="w-full h-9 px-3 rounded-lg bg-background border border-border text-[11px] font-bold" value={general.city} onChange={e => setGeneral({...general, city: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Estado (UF)</label>
              <input className="w-full h-9 px-3 rounded-lg bg-background border border-border text-[11px] font-bold" value={general.state} onChange={e => setGeneral({...general, state: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Latitude</label>
              <input className="w-full h-9 px-3 rounded-lg bg-background border border-border text-[11px] font-bold" value={general.latitude} onChange={e => setGeneral({...general, latitude: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Longitude</label>
              <input className="w-full h-9 px-3 rounded-lg bg-background border border-border text-[11px] font-bold" value={general.longitude} onChange={e => setGeneral({...general, longitude: e.target.value})} />
            </div>
          </div>
        </div>
      </Card>

      {/* Card 3: Delivery e Operação */}
      <div className="space-y-4">
        <Card className="p-4 space-y-3 border-orange-100 bg-orange-50/20">
          <h3 className="text-[10px] font-black uppercase text-orange-900 italic flex items-center gap-2">
            <Navigation size={14} className="text-orange-500"/> Entrega
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Taxa (R$)</label>
              <input type="number" className="w-full h-9 px-3 rounded-lg bg-white border border-orange-100 text-[11px] font-bold" value={general.deliveryFee} onChange={e => setGeneral({...general, deliveryFee: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Tempo Médio</label>
              <input className="w-full h-9 px-3 rounded-lg bg-white border border-orange-100 text-[11px] font-bold" value={general.deliveryTime} onChange={e => setGeneral({...general, deliveryTime: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Mínimo (R$)</label>
              <input type="number" className="w-full h-9 px-3 rounded-lg bg-white border border-orange-100 text-[11px] font-bold" value={general.minOrderValue} onChange={e => setGeneral({...general, minOrderValue: parseFloat(e.target.value)})} />
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3 border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase text-foreground italic flex items-center gap-2">
              <Clock size={14} className="text-primary"/> Horário de Funcionamento
            </h3>
            <button onClick={() => setOperation({...operation, autoOpenDelivery: !operation.autoOpenDelivery})} className={cn("w-10 h-5 rounded-full relative transition-all", operation.autoOpenDelivery ? "bg-emerald-500" : "bg-slate-300")}>
              <div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", operation.autoOpenDelivery ? "left-6" : "left-1")} />
            </button>
          </div>
          <p className={cn("text-[8px] font-bold uppercase tracking-widest", operation.autoOpenDelivery ? "text-emerald-600" : "text-muted-foreground")}>
            {operation.autoOpenDelivery ? 'AGENDAMENTO ATIVADO' : 'AGENDAMENTO DESATIVADO'}
          </p>

          {operation.autoOpenDelivery && (
            <div className="space-y-1.5 pt-2 border-t border-border">
              {operatingHours.map((schedule, index) => (
                <div key={schedule.dayOfWeek} className="flex items-center gap-2 p-1.5 bg-background rounded-lg">
                  <span className="text-[9px] font-black uppercase text-muted-foreground w-8 shrink-0">{dayLabels[schedule.dayOfWeek]}</span>
                  <input type="time" disabled={schedule.isClosed} value={schedule.openingTime} onChange={e => { const updated = [...operatingHours]; updated[index] = {...updated[index], openingTime: e.target.value}; setOperatingHours(updated); }} className="flex-1 h-8 px-2 rounded-md bg-white border border-border text-[11px] font-bold disabled:opacity-30" />
                  <span className="text-[8px] text-muted-foreground">às</span>
                  <input type="time" disabled={schedule.isClosed} value={schedule.closingTime} onChange={e => { const updated = [...operatingHours]; updated[index] = {...updated[index], closingTime: e.target.value}; setOperatingHours(updated); }} className="flex-1 h-8 px-2 rounded-md bg-white border border-border text-[11px] font-bold disabled:opacity-30" />
                  <button onClick={() => { const updated = [...operatingHours]; updated[index] = {...updated[index], isClosed: !updated[index].isClosed}; setOperatingHours(updated); }} className={cn("w-8 h-8 rounded-md flex items-center justify-center transition-all text-[8px] font-black uppercase", schedule.isClosed ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200")}>
                    {schedule.isClosed ? 'X' : 'OK'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-3 border-border">
          <div className="flex items-center justify-between p-2 bg-background rounded-xl">
            <div>
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Loja Aberta</p>
              <p className={cn("text-[10px] font-black italic", operation.isOpen ? "text-emerald-600" : "text-rose-600")}>{operation.isOpen ? 'ONLINE' : 'OFFLINE'}</p>
            </div>
            <button onClick={() => setOperation({...operation, isOpen: !operation.isOpen})} className={cn("w-10 h-5 rounded-full relative transition-all", operation.isOpen ? "bg-emerald-500" : "bg-slate-300")}>
              <div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", operation.isOpen ? "left-6" : "left-1")} />
            </button>
          </div>
          <div className="flex items-center justify-between p-2 bg-background rounded-xl">
            <div>
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Aceite Automático</p>
              <p className="text-[10px] font-black italic text-foreground">{operation.autoAccept ? 'ATIVADO' : 'MANUAL'}</p>
            </div>
            <button onClick={() => setOperation({...operation, autoAccept: !operation.autoAccept})} className={cn("w-10 h-5 rounded-full relative transition-all", operation.autoAccept ? "bg-slate-900" : "bg-slate-300")}>
              <div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", operation.autoAccept ? "left-6" : "left-1")} />
            </button>
          </div>
        </Card>
      </div>

      {/* Fidelidade */}
      <Card className="lg:col-span-3 p-4 border-emerald-100 bg-emerald-50/10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-md"><TrendingUp size={16}/></div>
            <div>
              <h3 className="text-[10px] font-black uppercase text-emerald-900 italic leading-none">Programa de Fidelidade</h3>
              <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Estimule a recorrência com Cashback</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black uppercase italic text-emerald-800">Ativar Programa</span>
              <button onClick={() => setLoyalty({...loyalty, enabled: !loyalty.enabled})} className={cn("w-10 h-5 rounded-full relative transition-all", loyalty.enabled ? "bg-emerald-500" : "bg-slate-300")}>
                <div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", loyalty.enabled ? "left-6" : "left-1")} />
              </button>
            </div>
            <div className={cn("flex gap-3 transition-opacity", !loyalty.enabled && "opacity-20 pointer-events-none")}>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase text-muted-foreground">R$ 1 =</span>
                <input type="number" className="w-14 h-8 px-2 rounded-lg bg-white border border-emerald-100 text-[11px] font-bold" value={loyalty.pointsPerReal} onChange={e => setLoyalty({...loyalty, pointsPerReal: parseInt(e.target.value)})} />
                <span className="text-[9px] font-bold uppercase text-muted-foreground">Pontos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase text-muted-foreground">Cashback</span>
                <input type="number" className="w-14 h-8 px-2 rounded-lg bg-white border border-emerald-100 text-[11px] font-bold" value={loyalty.cashback} onChange={e => setLoyalty({...loyalty, cashback: parseFloat(e.target.value)})} />
                <span className="text-[9px] font-bold uppercase text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Pixels */}
      <Card className="lg:col-span-3 p-4 border-blue-100 bg-blue-50/10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 text-white rounded-xl shadow-md"><BarChart3 size={16}/></div>
            <div>
              <h3 className="text-[10px] font-black uppercase text-blue-900 italic leading-none">Pixels e Analytics</h3>
              <p className="text-[8px] font-bold text-blue-600 uppercase tracking-widest mt-1">Rastreamento de Conversões e Análises</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full md:w-auto">
            <div className="space-y-1">
              <label className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">Meta Pixel ID</label>
              <input className="w-full h-8 px-3 rounded-lg bg-white border border-blue-100 text-[10px] font-bold" placeholder="1234567890" value={pixels.metaPixelId} onChange={e => setPixels({...pixels, metaPixelId: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">Google Analytics (GA4)</label>
              <input className="w-full h-8 px-3 rounded-lg bg-white border border-blue-100 text-[10px] font-bold" placeholder="G-XXXXXXXXXX" value={pixels.googleAnalyticsId} onChange={e => setPixels({...pixels, googleAnalyticsId: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">Pixel Interno</label>
              <input className="w-full h-8 px-3 rounded-lg bg-white border border-blue-100 text-[10px] font-bold" placeholder="ID Personalizado" value={pixels.internalPixelId} onChange={e => setPixels({...pixels, internalPixelId: e.target.value})} />
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-[8px] font-bold text-blue-700 leading-relaxed">
            <strong>Meta Pixel:</strong> Use para rastrear conversões no Facebook e Instagram. <br/>
            <strong>GA4:</strong> Use para análise completa no Google Analytics 4. <br/>
            <strong>Pixel Interno:</strong> Para integrações personalizadas com outros sistemas.
          </p>
        </div>
      </Card>
    </div>
  );
};