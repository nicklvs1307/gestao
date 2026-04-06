import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import PrinterLayoutEditor, { type ReceiptLayout } from '../PrinterLayoutEditor';
import { type PrinterConfig } from '../../services/printing';
import { 
  Printer as PrinterIcon, RefreshCw, CreditCard, ChefHat, LayoutTemplate, 
  Plus, Trash2, Wifi, WifiOff, CheckCircle, XCircle, Loader2, Zap,
  Printer as PrinterIcon2
} from 'lucide-react';

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

const StatusIndicator: React.FC<{ status: 'online' | 'offline' | 'checking' }> = ({ status }) => {
  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2">
        <Loader2 size={14} className="animate-spin text-orange-500" />
        <span className="text-[8px] font-black uppercase text-orange-500">VERIFICANDO...</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      {status === 'online' ? (
        <>
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[8px] font-black uppercase text-emerald-600">ONLINE</span>
        </>
      ) : (
        <>
          <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
          <span className="text-[8px] font-black uppercase text-rose-600">OFFLINE</span>
        </>
      )}
    </div>
  );
};

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

export const SettingsPrintingTab: React.FC<SettingsPrintingTabProps> = ({
  agentStatus, availablePrinters, printerConfig, receiptLayout, categories,
  operation, onLoadPrinters, onPrinterConfigChange, onReceiptLayoutChange, onOperationChange,
  restaurantName, restaurantLogo, restaurantAddress
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      {/* SIDEBAR - Status & Automation */}
      <div className="space-y-4">
        {/* Agent Status Card - Emerald */}
        <Card className="p-0 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Wifi size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">Agente Local</h3>
              <p className="text-[7px] font-bold text-emerald-100 uppercase tracking-widest">Status de Conexão</p>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <StatusIndicator status={agentStatus} />
              <button 
                onClick={onLoadPrinters} 
                className={cn(
                  "p-2 rounded-lg transition-all",
                  agentStatus === 'online' 
                    ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" 
                    : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                )}
              >
                <RefreshCw size={14} className={cn(agentStatus === 'checking' && "animate-spin")} />
              </button>
            </div>
            
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <PrinterIcon size={12} className="text-slate-400" />
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Impressoras</span>
              </div>
              <p className="text-[10px] font-black italic text-slate-700">
                {availablePrinters.length} disponível{availablePrinters.length !== 1 ? 'is' : ''}
              </p>
            </div>
          </div>
        </Card>

        {/* Automation Card - Slate */}
        <Card className="p-0 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-slate-900 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">Automação</h3>
              <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Impressão Auto</p>
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", operation.autoPrint ? "bg-slate-900" : "bg-slate-200")}>
                  <PrinterIcon2 size={14} className={operation.autoPrint ? "text-white" : "text-slate-500"} />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Imprimir Auto</p>
                  <p className={cn("text-[10px] font-black italic", operation.autoPrint ? "text-slate-900" : "text-slate-400")}>
                    {operation.autoPrint ? 'ATIVADO' : 'DESATIVADO'}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={operation.autoPrint}
                onChange={(v) => onOperationChange({...operation, autoPrint: v})}
              />
            </div>
            <p className="text-[8px] font-bold text-slate-400 mt-3 leading-relaxed">
              Ao aceitar pedidos no sistema, os cupons serão impressos automaticamente nas impressoras configuradas.
            </p>
          </div>
        </Card>
      </div>

      {/* Printers Configuration */}
      <Card className="lg:col-span-3 p-0 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
        {/* Printers Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <PrinterIcon size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">Configuração de Impressoras</h3>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Caixa, Cozinha e Bar</p>
          </div>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Caixa */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <CreditCard size={14} className="text-white" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase italic text-slate-700">Caixa</h4>
                </div>
                <button 
                  onClick={() => onPrinterConfigChange({...printerConfig, cashierPrinters: [...printerConfig.cashierPrinters, '']})} 
                  className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Plus size={14}/>
                </button>
              </div>
              <div className="space-y-2">
                {printerConfig.cashierPrinters.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <select 
                      className="flex-1 h-9 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none px-3 focus:border-primary focus:ring-1 focus:ring-primary/20" 
                      value={p} 
                      onChange={e => { 
                        const n = [...printerConfig.cashierPrinters]; 
                        n[i] = e.target.value; 
                        onPrinterConfigChange({...printerConfig, cashierPrinters: n}); 
                      }}
                    >
                      <option value="">Selecione...</option>
                      {availablePrinters.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                    </select>
                    {i > 0 && (
                      <button 
                        onClick={() => onPrinterConfigChange({...printerConfig, cashierPrinters: printerConfig.cashierPrinters.filter((_, idx) => idx !== i)})} 
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cozinha */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <ChefHat size={14} className="text-white" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase italic text-slate-700">Cozinha</h4>
                </div>
                <button 
                  onClick={() => onPrinterConfigChange({...printerConfig, kitchenPrinters: [...printerConfig.kitchenPrinters, { id: Date.now().toString(), name: 'Setor', printer: '' }]})} 
                  className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Plus size={14}/>
                </button>
              </div>
              <div className="space-y-2">
                {printerConfig.kitchenPrinters.map((kp, i) => (
                  <div key={kp.id} className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg relative group border border-slate-100">
                    <input
                      className="h-8 bg-slate-50 border border-slate-100 rounded-md text-[9px] font-black uppercase px-3 focus:border-primary outline-none"
                      value={kp.name}
                      onChange={e => { 
                        const n = [...printerConfig.kitchenPrinters]; 
                        n[i].name = e.target.value; 
                        onPrinterConfigChange({...printerConfig, kitchenPrinters: n}); 
                      }} 
                      placeholder="Nome do Setor"
                    />
                    <select 
                      className="h-8 bg-slate-50 border border-slate-100 rounded-md text-[9px] font-bold px-3 focus:border-primary outline-none"
                      value={kp.printer}
                      onChange={e => { 
                        const n = [...printerConfig.kitchenPrinters]; 
                        n[i].printer = e.target.value; 
                        onPrinterConfigChange({...printerConfig, kitchenPrinters: n}); 
                      }}
                    >
                      <option value="">Selecione...</option>
                      {availablePrinters.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                    </select>
                    {i > 0 && (
                      <button 
                        onClick={() => onPrinterConfigChange({...printerConfig, kitchenPrinters: printerConfig.kitchenPrinters.filter((_, idx) => idx !== i)})} 
                        className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 bg-white shadow-md rounded-full p-1 text-rose-500 transition-opacity hover:bg-rose-50"
                      >
                        <Trash2 size={12}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bar */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <LayoutTemplate size={14} className="text-white" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase italic text-slate-700">Bar / Bebidas</h4>
                </div>
                <button 
                  onClick={() => onPrinterConfigChange({...printerConfig, barPrinters: [...printerConfig.barPrinters, { id: Date.now().toString(), name: 'Bar', printer: '' }]})} 
                  className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Plus size={14}/>
                </button>
              </div>
              <div className="space-y-2">
                {printerConfig.barPrinters.map((bp, i) => (
                  <div key={bp.id} className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg relative group border border-slate-100">
                    <input
                      className="h-8 bg-slate-50 border border-slate-100 rounded-md text-[9px] font-black uppercase px-3 focus:border-primary outline-none"
                      value={bp.name}
                      onChange={e => { 
                        const n = [...printerConfig.barPrinters]; 
                        n[i].name = e.target.value; 
                        onPrinterConfigChange({...printerConfig, barPrinters: n}); 
                      }} 
                      placeholder="Nome do Bar"
                    />
                    <select 
                      className="h-8 bg-slate-50 border border-slate-100 rounded-md text-[9px] font-bold px-3 focus:border-primary outline-none"
                      value={bp.printer}
                      onChange={e => { 
                        const n = [...printerConfig.barPrinters]; 
                        n[i].printer = e.target.value; 
                        onPrinterConfigChange({...printerConfig, barPrinters: n}); 
                      }}
                    >
                      <option value="">Selecione...</option>
                      {availablePrinters.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                    </select>
                    {i > 0 && (
                      <button 
                        onClick={() => onPrinterConfigChange({...printerConfig, barPrinters: printerConfig.barPrinters.filter((_, idx) => idx !== i)})} 
                        className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 bg-white shadow-md rounded-full p-1 text-rose-500 transition-opacity hover:bg-rose-50"
                      >
                        <Trash2 size={12}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Category Mapping */}
            <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="text-[10px] font-black uppercase italic text-slate-700 flex items-center gap-2 mb-4">
                <LayoutTemplate size={12}/> Roteamento de Categorias
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {categories.map(cat => (
                  <div key={cat.id} className="p-2 bg-white border border-slate-100 rounded-xl flex flex-col gap-1.5">
                    <span className="text-[8px] font-black text-slate-500 uppercase truncate">{cat.name}</span>
                    <select 
                      className="h-8 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black outline-none italic focus:border-primary"
                      value={printerConfig.categoryMapping[cat.name] || ''} 
                      onChange={e => onPrinterConfigChange({...printerConfig, categoryMapping: {...printerConfig.categoryMapping, [cat.name]: e.target.value}})}
                    >
                      <option value="">NÃO IMPRIMIR</option>
                      <optgroup label="Cozinhas">
                        {printerConfig.kitchenPrinters.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                      </optgroup>
                      <optgroup label="Bares">
                        {printerConfig.barPrinters.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </optgroup>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Layout Editor */}
        <div className="border-t border-slate-100">
          <PrinterLayoutEditor 
            layout={receiptLayout}
            onChange={onReceiptLayoutChange}
            restaurantName={restaurantName}
            restaurantLogo={restaurantLogo}
            restaurantAddress={restaurantAddress}
          />
        </div>
      </Card>
    </div>
  );
};
