import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPrinters, checkAgentStatus, type PrinterConfig } from '../services/printing';
import PrinterLayoutEditor, { type ReceiptLayout } from '../components/PrinterLayoutEditor';
import { Save, Settings, Palette, Link, Printer, Sliders } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { useSettings } from '../components/settings';
import { SettingsGeneralTab, SettingsAppearanceTab, SettingsPrintingTab, SettingsLinksTab } from '../components/settings';

const SettingsManagement: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'printing' | 'links'>('general');

  const {
    general,
    operation,
    operatingHours,
    loyalty,
    pixels,
    appearance,
    isLoading,
    isSaving,
    availablePrinters,
    agentStatus,
    categories,
    isSlugAvailable,
    isCheckingSlug,
    setGeneral,
    setOperation,
    setOperatingHours,
    setLoyalty,
    setPixels,
    setAppearance,
    handleSave,
    loadPrinters
  } = useSettings();

  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(() => {
    const saved = localStorage.getItem('printer_config');
    return saved ? JSON.parse(saved) : {
      cashierPrinters: [''],
      kitchenPrinters: [{ id: 'k1', name: 'Cozinha Principal', printer: '' }],
      barPrinters: [{ id: 'b1', name: 'Bar / Bebidas', printer: '' }],
      categoryMapping: {}
    };
  });

  const [receiptLayout, setReceiptLayout] = useState<ReceiptLayout>(() => {
    const saved = localStorage.getItem('receipt_layout');
    return saved ? JSON.parse(saved) : {
      showLogo: true,
      showAddress: true,
      showOrderDate: true,
      fontSize: 'medium',
      headerText: '',
      footerText: 'OBRIGADO PELA PREFERÊNCIA!',
      itemSpacing: 2
    };
  });

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/printing')) setActiveTab('printing');
    else if (path.includes('/appearance')) setActiveTab('appearance');
    else if (path.includes('/links')) setActiveTab('links');
    else setActiveTab('general');
  }, [location.pathname]);

  const handleSaveChanges = async () => {
    await handleSave();
    localStorage.setItem('printer_config', JSON.stringify(printerConfig));
    localStorage.setItem('receipt_layout', JSON.stringify(receiptLayout));
  };

  const handleSlugChange = (slug: string) => {
    setGeneral(prev => ({ ...prev, slug }));
  };

  const tabs = [
    { id: 'general', label: 'GERAL', icon: Sliders },
    { id: 'appearance', label: 'VISUAL', icon: Palette },
    { id: 'printing', label: 'IMPRESSÃO', icon: Printer },
    { id: 'links', label: 'LINKS', icon: Link },
  ] as const;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center animate-pulse">
          <Settings size={28} className="text-slate-300" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-4">SINCRONIZANDO DADOS...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10 max-w-[1400px] mx-auto">
      {/* HEADER - ERP Premium */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <Settings size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-2">
              Configurações <span className="text-primary">Sistema</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Gestão de Identidade e Operação
            </p>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full lg:w-auto">
          {/* Tabs estilo Pill/Slide */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button 
                  key={tab.id}
                  onClick={() => navigate(`/settings/${tab.id}`)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300",
                    activeTab === tab.id 
                      ? "bg-white text-slate-900 shadow-md" 
                      : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                  )}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          
          <Button 
            onClick={handleSaveChanges} 
            disabled={isSaving} 
            isLoading={isSaving} 
            className="h-9 px-6 rounded-lg shadow-lg shadow-primary/20 text-[9px] font-black uppercase tracking-widest"
          >
            <Save size={14} className="mr-2" /> 
            {isSaving ? 'SALVANDO' : 'ATUALIZAR'}
          </Button>
        </div>
      </div>

      {/* Tabs Content */}
      {activeTab === 'general' && (
        <SettingsGeneralTab
          general={general}
          operation={operation}
          operatingHours={operatingHours}
          loyalty={loyalty}
          pixels={pixels}
          setGeneral={setGeneral}
          setOperation={setOperation}
          setOperatingHours={setOperatingHours}
          setLoyalty={setLoyalty}
          setPixels={setPixels}
        />
      )}

      {activeTab === 'appearance' && (
        <SettingsAppearanceTab
          appearance={appearance}
          setAppearance={setAppearance}
        />
      )}

      {activeTab === 'printing' && (
        <SettingsPrintingTab
          agentStatus={agentStatus}
          availablePrinters={availablePrinters}
          printerConfig={printerConfig}
          receiptLayout={receiptLayout}
          categories={categories}
          operation={operation}
          onLoadPrinters={loadPrinters}
          onPrinterConfigChange={setPrinterConfig}
          onReceiptLayoutChange={setReceiptLayout}
          onOperationChange={(op) => setOperation(prev => ({ ...prev, autoPrint: op.autoPrint }))}
          restaurantName={general.name}
          restaurantLogo={appearance.logo}
          restaurantAddress={general.address}
        />
      )}

      {activeTab === 'links' && (
        <SettingsLinksTab
          slug={general.slug}
          isSlugAvailable={isSlugAvailable}
          isCheckingSlug={isCheckingSlug}
          onSlugChange={handleSlugChange}
        />
      )}
    </div>
  );
};

export default SettingsManagement;
