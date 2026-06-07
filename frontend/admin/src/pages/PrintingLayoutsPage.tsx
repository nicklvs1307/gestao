import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Settings, ArrowLeft, Loader2, Plus, LayoutTemplate } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { usePrintLayoutMulti } from '../hooks/usePrintLayoutMulti';
import { PrintLayoutTypeSelector } from '../components/PrintLayoutTypeSelector';
import PrintLayoutBlockEditor from '../components/PrintLayoutBlockEditor';
import { ReceiptPreview } from '../components/ReceiptPreview';
import type { PrintLayoutType } from '../types/printLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const PrintingLayoutsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    layouts,
    selectedType,
    currentLayout,
    currentBlocks,
    currentGlobalSettings,
    isLoading,
    isSaving,
    allExist,
    setSelectedType,
    createDefault,
    createAllDefaults,
    updateGlobalSettings,
    updateBlocks,
    addCustomBlock,
    removeBlock,
    refresh,
  } = usePrintLayoutMulti();

  const [showPreview, setShowPreview] = useState(true);

  // Handle type selection
  const handleTypeSelect = useCallback((type: PrintLayoutType) => {
    setSelectedType(type);
  }, [setSelectedType]);

  // Handle create default layout for selected type
  const handleCreateDefault = useCallback(async () => {
    await createDefault(selectedType);
  }, [createDefault, selectedType]);

  // Handle create all layouts
  const handleCreateAll = useCallback(async () => {
    await createAllDefaults();
  }, [createAllDefaults]);

  // Restaurant info from user
  const restaurantName = user?.restaurantName || user?.name || 'SEU RESTAURANTE';
  const restaurantLogo = user?.restaurantLogo || '';
  const restaurantAddress = user?.restaurantAddress || '';

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center animate-pulse">
          <Settings size={28} className="text-slate-500" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-4">
          CARREGANDO MODELOS...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <LayoutTemplate size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
              Modelos de <span className="text-primary">Impressão</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">
              Configure comandas para Delivery, Retirada e Mesa
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full lg:w-auto">
          {/* Toggle Preview */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={cn(
              "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
              showPreview
                ? "bg-orange-500 text-white shadow-lg shadow-orange-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {showPreview ? 'OCULTAR PREVIEW' : 'MOSTRAR PREVIEW'}
          </button>

          {/* Create All Button */}
          {!allExist && (
            <Button
              onClick={handleCreateAll}
              disabled={isSaving}
              isLoading={isSaving}
              className="h-9 px-6 rounded-lg shadow-lg shadow-primary/20 text-[9px] font-black uppercase tracking-widest"
            >
              <Plus size={14} className="mr-2" />
              CRIAR TODOS OS MODELOS
            </Button>
          )}
        </div>
      </div>

      {/* Type Selector */}
      <Card className="p-5 bg-white border border-slate-200 shadow-sm rounded-2xl">
        <PrintLayoutTypeSelector
          selectedType={selectedType}
          onSelectType={handleTypeSelect}
          layouts={layouts}
          disabled={isSaving}
        />
      </Card>

      {/* Main Content */}
      <div className={cn(
        "grid gap-6",
        showPreview ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"
      )}>
        {/* Editor Section */}
        <div className="space-y-6">
          {!currentLayout ? (
            /* No Layout State */
            <Card className="p-8 bg-white border border-slate-200 shadow-sm rounded-2xl">
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
                  <Printer size={36} className="text-slate-500" />
                </div>
                <h3 className="text-[13px] font-black uppercase text-slate-700 mb-2 text-center">
                  Modelo Não Configurado
                </h3>
                <p className="text-[10px] text-slate-500 text-center mb-8 max-w-md leading-relaxed">
                  Configure o layout personalizado da comanda de{' '}
                  <span className="font-bold text-slate-600">
                    {selectedType === 'delivery' ? 'Delivery' : selectedType === 'pickup' ? 'Retirada' : 'Mesa'}
                  </span>{' '}
                  com blocos arrastáveis, tipografia customizada e muito mais.
                </p>
                <button
                  onClick={handleCreateDefault}
                  disabled={isSaving}
                  className="px-8 py-4 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      CRIANDO...
                    </span>
                  ) : (
                    'CRIAR MODELO PADRÃO'
                  )}
                </button>
              </div>
            </Card>
          ) : (
            /* Layout Editor */
            <Card className="p-0 bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              {/* Editor Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Settings size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase italic text-white tracking-tighter">
                    Editor de Layout
                  </h3>
                  <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">
                    {selectedType === 'delivery' ? 'DELIVERY' : selectedType === 'pickup' ? 'RETIRADA' : 'MESA'} - Arraste os blocos para reordenar
                  </p>
                </div>
              </div>

              {/* Block Editor */}
              <div className="p-4">
                <PrintLayoutBlockEditor
                  blocks={currentBlocks}
                  globalSettings={currentGlobalSettings!}
                  isSaving={isSaving}
                  onUpdateGlobalSettings={updateGlobalSettings}
                  onUpdateBlocks={updateBlocks}
                  onAddCustomBlock={addCustomBlock}
                  onRemoveBlock={removeBlock}
                  restaurantName={restaurantName}
                  restaurantLogo={restaurantLogo}
                  restaurantAddress={restaurantAddress}
                />
              </div>
            </Card>
          )}
        </div>

        {/* Preview Section */}
        {showPreview && currentLayout && currentGlobalSettings && (
          <div className="xl:sticky xl:top-4 xl:self-start">
            <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
              <ReceiptPreview
                layout={currentLayout}
                blocks={currentBlocks}
                globalSettings={currentGlobalSettings}
                layoutType={selectedType}
                restaurantName={restaurantName}
                restaurantLogo={restaurantLogo}
                restaurantAddress={restaurantAddress}
              />
            </Card>
          </div>
        )}
      </div>

      {/* Saving Indicator */}
      {isSaving && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-3 px-5 py-3 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-200">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[9px] font-black uppercase tracking-widest">
              SALVANDO ALTERAÇÕES...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintingLayoutsPage;
