import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPrinters, checkAgentStatus, type PrinterConfig } from '../services/printing';
import PrinterLayoutEditor, { type ReceiptLayout } from '../components/PrinterLayoutEditor';
import { Save, Settings } from 'lucide-react';
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
    originalSlug,
    isSlugAvailable,
    isCheckingSlug,
    isLoading,
    isSaving,
    availablePrinters,
    agentStatus,
    categories,
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] opacity-30">
        <Settings size={32} className="animate-spin text-primary mb-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Dados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 bg-background/90 backdrop-blur-md z-40 py-4 border-b border-border px-1">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg"><Settings size={18}/></div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tighter uppercase italic leading-none">Configurações</h1>
            <p className="text-muted-foreground text-[8px] font-bold uppercase tracking-widest mt-1">Gestão de Identidade e Operação</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="hidden lg:flex bg-muted p-0.5 rounded-lg gap-0.5">
            {['general', 'appearance', 'printing', 'links'].map((tab) => (
              <button 
                key={tab} 
                onClick={() => navigate(`/settings/${tab}`)}
                className={cn("px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all", activeTab === tab ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:bg-white/50")}
              >
                {tab === 'general' ? 'Geral' : tab === 'appearance' ? 'Visual' : tab === 'printing' ? 'Impressão' : 'Links'}
              </button>
            ))}
          </div>
          <Button onClick={handleSaveChanges} disabled={isSaving} isLoading={isSaving} className="flex-1 md:flex-none px-6 h-10 rounded-xl shadow-lg italic font-black text-[10px] uppercase tracking-widest bg-slate-900 text-white hover:bg-black transition-all">
            <Save size={14} className="mr-2" /> ATUALIZAR SISTEMA
          </Button>
        </div>
      </div>

      {/* Tabs */}
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