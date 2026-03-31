import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import PrinterLayoutEditor, { type ReceiptLayout } from '../PrinterLayoutEditor';
import { getPrinters, type PrinterConfig } from '../../services/printing';
import { Printer as PrinterIcon, RefreshCw, CreditCard, ChefHat, LayoutTemplate, Plus, Trash2 } from 'lucide-react';

interface SettingsPrintingTabProps {
  agentStatus: 'online' | 'offline' | 'checking';
  availablePrinters: string[];
  printerConfig: PrinterConfig;
  receiptLayout: ReceiptLayout;
  categories: { id: string; name: string }[];
  operation: { autoPrint: boolean };
  onLoadPrinters: () => Promise<void>;
  onPrinterConfigChange: (config: PrinterConfig) => void;
  onReceiptLayoutChange: (layout: ReceiptLayout) => void;
  onOperationChange: (operation: { autoPrint: boolean }) => void;
  restaurantName: string;
  restaurantLogo: string;
  restaurantAddress: string;
}

export const SettingsPrintingTab: React.FC<SettingsPrintingTabProps> = ({
  agentStatus, availablePrinters, printerConfig, receiptLayout, categories,
  operation, onLoadPrinters, onPrinterConfigChange, onReceiptLayoutChange, onOperationChange,
  restaurantName, restaurantLogo, restaurantAddress
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-1 space-y-4">
        <Card className={cn("p-4 border-2 transition-all rounded-2xl", agentStatus === 'online' ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
          <div className="flex items-center justify-between mb-4">
            <div className={cn("p-2 rounded-lg", agentStatus === 'online' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}><PrinterIcon size={16}/></div>
            <button onClick={onLoadPrinters} className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"><RefreshCw size={14} className={cn(agentStatus === 'checking' && 'animate-spin')} /></button>
          </div>
          <h3 className="text-[10px] font-black uppercase italic text-foreground leading-none">Agente Local</h3>
          <p className={cn("text-[8px] font-black uppercase mt-1", agentStatus === 'online' ? "text-emerald-600" : "text-rose-600")}>{agentStatus === 'online' ? '● CONECTADO' : '○ DESCONECTADO'}</p>
        </Card>

        <Card className="p-4 border-border rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase italic text-foreground">Automação</h3>
            <button onClick={() => onOperationChange({...operation, autoPrint: !operation.autoPrint})} className={cn("w-10 h-5 rounded-full relative transition-all", operation.autoPrint ? "bg-slate-900" : "bg-slate-300")}>
              <div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", operation.autoPrint ? "left-6" : "left-1")} />
            </button>
          </div>
          <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">Imprimir cupons automaticamente ao aceitar pedidos no sistema.</p>
        </Card>
      </div>

      <Card className="lg:col-span-3 p-4 border-border rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <h4 className="text-[10px] font-black uppercase italic text-foreground flex items-center gap-2"><CreditCard size={12}/> Caixa</h4>
              <button onClick={() => onPrinterConfigChange({...printerConfig, cashierPrinters: [...printerConfig.cashierPrinters, '']})} className="p-1 hover:bg-muted rounded-md text-muted-foreground"><Plus size={14}/></button>
            </div>
            <div className="space-y-2">
              {printerConfig.cashierPrinters.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <select className="flex-1 h-8 bg-background border border-border rounded-lg text-[10px] font-bold outline-none px-2" value={p} onChange={e => { const n = [...printerConfig.cashierPrinters]; n[i] = e.target.value; onPrinterConfigChange({...printerConfig, cashierPrinters: n}); }}>
                    <option value="">Nenhuma</option>
                    {availablePrinters.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                  </select>
                  {i > 0 && <button onClick={() => onPrinterConfigChange({...printerConfig, cashierPrinters: printerConfig.cashierPrinters.filter((_, idx) => idx !== i)})} className="text-rose-500"><Trash2 size={14}/></button>}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <h4 className="text-[10px] font-black uppercase italic text-foreground flex items-center gap-2"><ChefHat size={12}/> Cozinha</h4>
              <button onClick={() => onPrinterConfigChange({...printerConfig, kitchenPrinters: [...printerConfig.kitchenPrinters, { id: Date.now().toString(), name: 'Setor', printer: '' }]})} className="p-1 hover:bg-muted rounded-md text-muted-foreground"><Plus size={14}/></button>
            </div>
            <div className="space-y-2">
              {printerConfig.kitchenPrinters.map((kp, i) => (
                <div key={kp.id} className="grid grid-cols-2 gap-2 bg-background p-2 rounded-lg relative group">
                  <input className="h-7 bg-white border border-border rounded-md text-[9px] font-black uppercase px-2" value={kp.name} onChange={e => { const n = [...printerConfig.kitchenPrinters]; n[i].name = e.target.value; onPrinterConfigChange({...printerConfig, kitchenPrinters: n}); }} />
                  <select className="h-7 bg-white border border-border rounded-md text-[9px] font-bold px-2" value={kp.printer} onChange={e => { const n = [...printerConfig.kitchenPrinters]; n[i].printer = e.target.value; onPrinterConfigChange({...printerConfig, kitchenPrinters: n}); }}>
                    <option value="">Selecione...</option>
                    {availablePrinters.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                  </select>
                  {i > 0 && <button onClick={() => onPrinterConfigChange({...printerConfig, kitchenPrinters: printerConfig.kitchenPrinters.filter((_, idx) => idx !== i)})} className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 bg-white shadow-md rounded-full p-1 text-rose-500 transition-opacity"><Trash2 size={10}/></button>}
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-50">
            <h4 className="text-[10px] font-black uppercase italic text-foreground flex items-center gap-2 mb-3"><LayoutTemplate size={12}/> Roteamento de Categorias</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {categories.map(cat => (
                <div key={cat.id} className="p-2 bg-background border border-border rounded-xl flex flex-col gap-1.5">
                  <span className="text-[8px] font-black text-muted-foreground uppercase truncate">{cat.name}</span>
                  <select className="h-7 bg-white border border-border rounded-lg text-[9px] font-black outline-none italic" value={printerConfig.categoryMapping[cat.name] || ''} onChange={e => onPrinterConfigChange({...printerConfig, categoryMapping: {...printerConfig.categoryMapping, [cat.name]: e.target.value}})}>
                    <option value="">NÃO IMPRIMIR</option>
                    <optgroup label="Cozinhas">{printerConfig.kitchenPrinters.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</optgroup>
                    <optgroup label="Bares">{printerConfig.barPrinters.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <PrinterLayoutEditor 
          layout={receiptLayout}
          onChange={onReceiptLayoutChange}
          restaurantName={restaurantName}
          restaurantLogo={restaurantLogo}
          restaurantAddress={restaurantAddress}
        />
      </Card>
    </div>
  );
};