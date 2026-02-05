import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSettings, updateSettings, getCategories, uploadLogo, checkSlugAvailability } from '../services/api';
import { getPrinters, checkAgentStatus, type PrinterConfig } from '../services/printing';
import ReceiptPreview from "../components/ReceiptPreview";
import { 
  Save, Copy, ExternalLink, Upload, Palette, Store, 
  Clock, Percent, MapPin, Phone, Link as LinkIcon, Image as ImageIcon,
  CheckCircle, Loader2, Printer, RefreshCw, AlertTriangle, LayoutTemplate, Settings, Plus, Trash2,
  XCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const clientUrl = window.location.hostname.includes('towersfy.com') 
  ? `https://${window.location.hostname.replace('admin.', '').replace('kicardapio.', '')}` 
  : 'http://localhost:5174'; 

const initialLogo = 'https://via.placeholder.com/150x80.png?text=Sua+Logo';
const initialBgImage = 'https://via.placeholder.com/800x450.png?text=Fundo+do+Cardapio';

const SettingsManagement: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'printing' | 'links'>('general');

  useEffect(() => {
      if (location.pathname.includes('/settings/printing')) {
          setActiveTab('printing');
      } else if (location.pathname.includes('/settings/appearance')) {
          setActiveTab('appearance');
      } else if (location.pathname.includes('/settings/links')) {
          setActiveTab('links');
      } else {
          setActiveTab('general');
      }
  }, [location.pathname]);

  const handleTabChange = (tab: string) => {
      if (tab === 'general') navigate('/settings/general');
      else if (tab === 'appearance') navigate('/settings/appearance');
      else if (tab === 'printing') navigate('/settings/printing');
      else if (tab === 'links') navigate('/settings/links');
  };

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [restaurantId, setRestaurantId] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [serviceTaxPercentage, setServiceTaxPercentage] = useState(10);

  // Debounce para verificação de slug
  useEffect(() => {
    if (!slug || slug === originalSlug) {
      setIsSlugAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const { available } = await checkSlugAvailability(slug);
        setIsSlugAvailable(available);
      } catch (error) {
        console.error('Erro ao verificar slug:', error);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug, originalSlug]);
  const [openingHours, setOpeningHours] = useState('');
  const [logoUrl, setLogoUrl] = useState(initialLogo);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState('30-40 min');
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);

  // Novos campos: Fidelidade
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [pointsPerReal, setPointsPerReal] = useState(1);
  const [cashbackPercentage, setCashbackPercentage] = useState(0);

  const [primaryColor, setPrimaryColor] = useState('#6a11cb');
  const [secondaryColor, setSecondaryColor] = useState('#2575fc');
  const [backgroundColor, setBackgroundColor] = useState('#f0f2f5');
  const [backgroundType, setBackgroundType] = useState('color');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(initialBgImage);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);

  const [agentStatus, setAgentStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>({
      cashierPrinters: [''],
      kitchenPrinters: [{ id: 'k1', name: 'Cozinha 1', printer: '' }],
      barPrinters: [{ id: 'b1', name: 'Bar 1', printer: '' }],
      categoryMapping: {} 
  });
  
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({
      showLogo: true,
      showAddress: true,
      fontSize: 'medium',
      headerText: '',
      footerText: 'Obrigado pela preferência!'
  });

  const loadPrinters = async () => {
      setAgentStatus('checking');
      const isOnline = await checkAgentStatus();
      setAgentStatus(isOnline ? 'online' : 'offline');
      if (isOnline) {
          const printers = await getPrinters();
          setAvailablePrinters(printers);
      }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [settingsData, categoriesData] = await Promise.all([
            getSettings(),
            getCategories(true)
        ]);
        
        setRestaurantId(settingsData.id || '');
        setRestaurantName(settingsData.name || '');
        setAddress(settingsData.address || '');
        setPhone(settingsData.phone || '');
        setSlug(settingsData.slug || '');
        setOriginalSlug(settingsData.slug || '');
        setServiceTaxPercentage(settingsData.serviceTaxPercentage || 10);
        setOpeningHours(settingsData.openingHours || '');
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const formattedLogoUrl = settingsData.logoUrl 
          ? (settingsData.logoUrl.startsWith('http') ? settingsData.logoUrl : `${baseUrl}${settingsData.logoUrl}`)
          : initialLogo;
          
        setLogoUrl(formattedLogoUrl);
        
        if (settingsData.settings) {
          setPrimaryColor(settingsData.settings.primaryColor || '#6a11cb');
          setSecondaryColor(settingsData.settings.secondaryColor || '#2575fc');
          setBackgroundColor(settingsData.settings.backgroundColor || '#f0f2f5');
          setBackgroundType(settingsData.settings.backgroundType || 'color');
          setBackgroundImageUrl(settingsData.settings.backgroundImageUrl || initialBgImage);
          setIsStoreOpen(settingsData.settings.isOpen || false);
          setDeliveryFee(settingsData.settings.deliveryFee || 0);
          setDeliveryTime(settingsData.settings.deliveryTime || '30-40 min');
          setAutoAcceptOrders(settingsData.settings.autoAcceptOrders || false);
          setLoyaltyEnabled(settingsData.settings.loyaltyEnabled || false);
          setPointsPerReal(settingsData.settings.pointsPerReal || 1);
          setCashbackPercentage(settingsData.settings.cashbackPercentage || 0);
        }

        if (Array.isArray(categoriesData)) setCategories(categoriesData);

        const savedPrinterConfig = localStorage.getItem('printer_config');
        if (savedPrinterConfig) {
            const parsed = JSON.parse(savedPrinterConfig);
            // Migração de dados antigos para o novo formato de array se necessário
            setPrinterConfig({
                cashierPrinters: parsed.cashierPrinters || [parsed.cashierPrinter || ''],
                kitchenPrinters: parsed.kitchenPrinters || [{ id: 'k1', name: 'Cozinha 1', printer: parsed.kitchenPrinter || '' }],
                barPrinters: parsed.barPrinters || [{ id: 'b1', name: 'Bar 1', printer: parsed.barPrinter || '' }],
                categoryMapping: parsed.categoryMapping || {}
            });
        }

        const savedReceiptSettings = localStorage.getItem('receipt_settings');
        if (savedReceiptSettings) setReceiptSettings(JSON.parse(savedReceiptSettings));
        
        await loadPrinters();
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSaving(true);
      const { logoUrl: newLogoUrl } = await uploadLogo(file);
      // O backend retorna algo como /uploads/filename.png
      // Precisamos garantir que a URL esteja completa para exibição se necessário, 
      // ou apenas salvar o caminho relativo se o componente de imagem tratar isso.
      // Como o backend usa static em /uploads, o caminho relativo /uploads/... funciona.
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const fullUrl = newLogoUrl.startsWith('http') ? newLogoUrl : `${baseUrl}${newLogoUrl}`;
      setLogoUrl(fullUrl);
      toast.success('Logo atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload da logo:', error);
      toast.error('Erro ao fazer upload da logo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSaving(true);
      const { logoUrl: newCoverUrl } = await uploadLogo(file);
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const fullUrl = newCoverUrl.startsWith('http') ? newCoverUrl : `${baseUrl}${newCoverUrl}`;
      setBackgroundImageUrl(fullUrl);
      toast.success('Imagem de capa atualizada!');
    } catch (error) {
      console.error('Erro ao fazer upload da capa:', error);
      toast.error('Erro ao fazer upload da capa.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    if (slug !== originalSlug && isSlugAvailable === false) {
      toast.error('O endereço escolhido já está em uso.');
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({
        name: restaurantName, 
        slug, // Enviando a slug personalizada
        address, 
        phone, 
        serviceTaxPercentage,
        openingHours, 
        primaryColor, 
        secondaryColor, 
        backgroundColor,
        backgroundType, 
        backgroundImageUrl, 
        isOpen: isStoreOpen,
        deliveryFee, 
        deliveryTime, 
        autoAcceptOrders,
        loyaltyEnabled,
        pointsPerReal,
        cashbackPercentage
      });
      setOriginalSlug(slug);
      setIsSlugAvailable(null);
      localStorage.setItem('printer_config', JSON.stringify(printerConfig));
      localStorage.setItem('receipt_settings', JSON.stringify(receiptSettings));
      toast.success('Configurações salvas!');
    } catch (e) { 
      console.error(e);
      toast.error('Falha ao salvar as configurações.'); 
    } finally { 
      setIsSaving(false); 
    }
  };

  // Helpers para Múltiplas Impressoras
  const addCashierPrinter = () => {
      if (printerConfig.cashierPrinters.length < 5) {
          setPrinterConfig({...printerConfig, cashierPrinters: [...printerConfig.cashierPrinters, '']});
      }
  };
  const removeCashierPrinter = (index: number) => {
      const newPrinters = printerConfig.cashierPrinters.filter((_, i) => i !== index);
      setPrinterConfig({...printerConfig, cashierPrinters: newPrinters.length ? newPrinters : ['']});
  };

  const addKitchenPrinter = () => {
      if (printerConfig.kitchenPrinters.length < 5) {
          const nextId = `k${printerConfig.kitchenPrinters.length + 1}`;
          setPrinterConfig({...printerConfig, kitchenPrinters: [...printerConfig.kitchenPrinters, { id: nextId, name: `Cozinha ${printerConfig.kitchenPrinters.length + 1}`, printer: '' }]});
      }
  };
  const removeKitchenPrinter = (id: string) => {
      setPrinterConfig({...printerConfig, kitchenPrinters: printerConfig.kitchenPrinters.filter(p => p.id !== id)});
  };

  const addBarPrinter = () => {
      if (printerConfig.barPrinters.length < 5) {
          const nextId = `b${printerConfig.barPrinters.length + 1}`;
          setPrinterConfig({...printerConfig, barPrinters: [...printerConfig.barPrinters, { id: nextId, name: `Bar ${printerConfig.barPrinters.length + 1}`, printer: '' }]});
      }
  };
  const removeBarPrinter = (id: string) => {
      setPrinterConfig({...printerConfig, barPrinters: printerConfig.barPrinters.filter(p => p.id !== id)});
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
          <p className="text-muted-foreground text-sm">Gerencie o sistema e múltiplas impressoras.</p>
        </div>
        <button onClick={handleSaveChanges} disabled={isSaving} className="bg-primary text-primary-foreground px-8 h-10 rounded-md font-medium hover:bg-primary/90 flex items-center gap-2">
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Salvar Tudo
        </button>
      </div>

      <div className="flex space-x-1 rounded-xl bg-muted p-1">
          {['general', 'appearance', 'printing', 'links'].map((tab) => (
              <button key={tab} onClick={() => handleTabChange(tab)} className={cn("w-full rounded-lg py-2.5 text-sm font-medium transition-all", activeTab === tab ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {tab === 'general' && 'Geral'}
                  {tab === 'appearance' && 'Aparência'}
                  {tab === 'printing' && 'Impressão'}
                  {tab === 'links' && 'Links'}
              </button>
          ))}
      </div>

      <div className="mt-6">
        {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-card border rounded-xl p-6 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2 border-b pb-2"><Store size={18}/> Dados da Empresa</h3>
                    <div className="space-y-4">
                        <div><label className="text-sm">Nome</label><input type="text" className="w-full border rounded-md h-10 px-3 mt-1" value={restaurantName} onChange={e => setRestaurantName(e.target.value)} /></div>
                        <div><label className="text-sm">Endereço</label><input type="text" className="w-full border rounded-md h-10 px-3 mt-1" value={address} onChange={e => setAddress(e.target.value)} /></div>
                        <div><label className="text-sm">Telefone</label><input type="text" className="w-full border rounded-md h-10 px-3 mt-1" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                    </div>
                </div>
                <div className="bg-card border rounded-xl p-6 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2 border-b pb-2"><Clock size={18}/> Operação</h3>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <span>Status da Loja: <b>{isStoreOpen ? 'Aberta' : 'Fechada'}</b></span>
                        <button onClick={() => setIsStoreOpen(!isStoreOpen)} className={cn("w-11 h-6 rounded-full relative transition-colors", isStoreOpen ? "bg-emerald-500" : "bg-slate-300")}>
                            <span className={cn("absolute w-4 h-4 bg-white rounded-full top-1 transition-all", isStoreOpen ? "left-6" : "left-1")} />
                        </button>
                    </div>
                    <div><label className="text-sm">Taxa de Serviço (%)</label><input type="number" className="w-full border rounded-md h-10 px-3 mt-1" value={serviceTaxPercentage} onChange={e => setServiceTaxPercentage(parseFloat(e.target.value))} /></div>
                    <div><label className="text-sm">Horário</label><input type="text" className="w-full border rounded-md h-10 px-3 mt-1" value={openingHours} onChange={e => setOpeningHours(e.target.value)} /></div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50/50 border-blue-100 mt-2">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-blue-900">Aceite Automático</span>
                            <span className="text-[10px] text-blue-600 uppercase font-black">Pedidos de Delivery</span>
                        </div>
                        <button onClick={() => setAutoAcceptOrders(!autoAcceptOrders)} className={cn("w-11 h-6 rounded-full relative transition-colors", autoAcceptOrders ? "bg-blue-600" : "bg-slate-300")}>
                            <span className={cn("absolute w-4 h-4 bg-white rounded-full top-1 transition-all", autoAcceptOrders ? "left-6" : "left-1")} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-blue-600">Taxa de Entrega (R$)</label>
                            <input type="number" className="w-full border-blue-200 border rounded-md h-10 px-3 mt-1" value={deliveryFee} onChange={e => setDeliveryFee(parseFloat(e.target.value))} />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-blue-600">Tempo de Entrega</label>
                            <input type="text" className="w-full border-blue-200 border rounded-md h-10 px-3 mt-1" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} placeholder="Ex: 30-45 min" />
                        </div>
                    </div>
                </div>

                {/* FIDELIDADE E MARKETING */}
                <div className="bg-card border rounded-xl p-6 space-y-4 md:col-span-2">
                    <h3 className="font-semibold flex items-center gap-2 border-b pb-2"><CheckCircle size={18} className="text-emerald-500" /> Programa de Fidelidade & Cashback</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center justify-between p-4 border rounded-xl bg-emerald-50/30 border-emerald-100">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-emerald-900">Ativar Fidelidade</span>
                                <span className="text-[10px] text-emerald-600 uppercase font-black">Pontos e Cashback</span>
                            </div>
                            <button onClick={() => setLoyaltyEnabled(!loyaltyEnabled)} className={cn("w-11 h-6 rounded-full relative transition-colors", loyaltyEnabled ? "bg-emerald-500" : "bg-slate-300")}>
                                <span className={cn("absolute w-4 h-4 bg-white rounded-full top-1 transition-all", loyaltyEnabled ? "left-6" : "left-1")} />
                            </button>
                        </div>

                        <div className={cn("space-y-1 transition-opacity", !loyaltyEnabled && "opacity-50")}>
                            <label className="text-sm font-bold text-slate-700">Pontos por Real (R$ 1,00 = X pontos)</label>
                            <input 
                                type="number" 
                                disabled={!loyaltyEnabled}
                                className="w-full border rounded-md h-10 px-3 mt-1" 
                                value={pointsPerReal} 
                                onChange={e => setPointsPerReal(parseInt(e.target.value))} 
                            />
                        </div>

                        <div className={cn("space-y-1 transition-opacity", !loyaltyEnabled && "opacity-50")}>
                            <label className="text-sm font-bold text-slate-700">% de Cashback (Saldo para próxima compra)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    disabled={!loyaltyEnabled}
                                    className="w-full border rounded-md h-10 px-3 mt-1 pr-8" 
                                    value={cashbackPercentage} 
                                    onChange={e => setCashbackPercentage(parseFloat(e.target.value))} 
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'appearance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-card border rounded-xl p-6 space-y-6">
                    <div className="flex flex-col items-center gap-4">
                        <h3 className="w-full font-semibold border-b pb-2 flex items-center gap-2">
                            <ImageIcon size={18} /> Logotipo
                        </h3>
                        <div className="w-40 h-40 border-2 border-dashed rounded-2xl flex items-center justify-center p-2 bg-slate-50/50">
                            <img src={logoUrl} className="max-w-full max-h-full object-contain drop-shadow-sm" alt="Logo" />
                        </div>
                        <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoChange} accept="image/*" />
                        <button onClick={() => logoInputRef.current?.click()} className="w-full bg-white border h-10 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
                            Trocar Logo
                        </button>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <h3 className="w-full font-semibold border-b pb-2 flex items-center gap-2">
                            <ImageIcon size={18} /> Imagem de Capa (Delivery)
                        </h3>
                        <div className="w-full aspect-video border-2 border-dashed rounded-2xl flex items-center justify-center overflow-hidden bg-slate-50/50">
                            <img src={backgroundImageUrl} className="w-full h-full object-cover" alt="Capa" />
                        </div>
                        <input type="file" ref={coverInputRef} className="hidden" onChange={handleCoverChange} accept="image/*" />
                        <button onClick={() => coverInputRef.current?.click()} className="w-full bg-white border h-10 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
                            Trocar Imagem de Capa
                        </button>
                    </div>
                </div>

                <div className="bg-card border rounded-xl p-6 space-y-6">
                    <h3 className="font-semibold border-b pb-2 flex items-center gap-2">
                        <Palette size={18} /> Cores do Tema
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-xl">
                            <div>
                                <p className="text-sm font-bold text-slate-700">Cor Primária</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Botões e Destaques</p>
                            </div>
                            <input type="color" className="w-12 h-12 rounded-lg cursor-pointer border-none" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-xl">
                            <div>
                                <p className="text-sm font-bold text-slate-700">Cor Secundária</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Elementos de Apoio</p>
                            </div>
                            <input type="color" className="w-12 h-12 rounded-lg cursor-pointer border-none" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-xl">
                            <div>
                                <p className="text-sm font-bold text-slate-700">Cor de Fundo</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Área Geral</p>
                            </div>
                            <input type="color" className="w-12 h-12 rounded-lg cursor-pointer border-none" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'printing' && (
            <div className="space-y-6">
                <div className="bg-card border rounded-xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-3 rounded-full", agentStatus === 'online' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600")}><Printer size={24}/></div>
                        <div><h3 className="font-bold">Agente Local Multi-Impressão</h3><p className="text-sm text-muted-foreground">{agentStatus === 'online' ? 'Conectado' : 'Não detectado'}</p></div>
                    </div>
                    <button onClick={loadPrinters} className="border px-4 py-2 rounded-md hover:bg-muted flex items-center gap-2"><RefreshCw size={14} className={cn(agentStatus === 'checking' && 'animate-spin')}/> Atualizar</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* IMPRESSORAS DE CAIXA */}
                    <div className="bg-card border rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-semibold">Conferência / Caixa (Até 5)</h3>
                            <button onClick={addCashierPrinter} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md flex items-center gap-1 hover:bg-primary/20"><Plus size={14}/> Add</button>
                        </div>
                        {printerConfig.cashierPrinters.map((printer, idx) => (
                            <div key={idx} className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Impressora {idx + 1}</label>
                                    <select className="w-full h-10 border rounded-md px-3" value={printer} onChange={(e) => {
                                        const newPrinters = [...printerConfig.cashierPrinters];
                                        newPrinters[idx] = e.target.value;
                                        setPrinterConfig({...printerConfig, cashierPrinters: newPrinters});
                                    }}>
                                        <option value="">-- Selecione --</option>
                                        {availablePrinters.map((p, pIdx) => <option key={`${p}-${pIdx}`} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                {idx > 0 && <button onClick={() => removeCashierPrinter(idx)} className="h-10 px-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18}/></button>}
                            </div>
                        ))}
                    </div>

                    {/* MAPEAMENTO DE CATEGORIAS */}
                    <div className="bg-card border rounded-xl p-6 space-y-4">
                        <h3 className="font-semibold border-b pb-2">Roteamento de Itens</h3>
                        <div className="max-h-60 overflow-y-auto border rounded">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted"><tr><th className="px-3 py-2">Categoria</th><th className="px-3 py-2 text-right">Enviar Para</th></tr></thead>
                                <tbody>
                                    {categories.map(cat => (
                                        <tr key={cat.id} className="border-t">
                                            <td className="px-3 py-2 font-medium">{cat.name}</td>
                                            <td className="px-3 py-2 text-right">
                                                <select 
                                                    className="text-xs border rounded p-1 w-full max-w-[150px]"
                                                    value={printerConfig.categoryMapping[cat.name] || 'k1'}
                                                    onChange={(e) => setPrinterConfig({...printerConfig, categoryMapping: {...printerConfig.categoryMapping, [cat.name]: e.target.value}})}
                                                >
                                                    <optgroup label="Cozinhas">
                                                        {printerConfig.kitchenPrinters.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                                                    </optgroup>
                                                    <optgroup label="Bares">
                                                        {printerConfig.barPrinters.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                    </optgroup>
                                                    <option value="none">Não Imprimir Produção</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* PONTOS DE COZINHA */}
                    <div className="bg-card border rounded-xl p-6 space-y-4">
                         <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-semibold">Pontos de Cozinha (Até 5)</h3>
                            <button onClick={addKitchenPrinter} className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-orange-200"><Plus size={14}/> Novo Ponto</button>
                        </div>
                        {printerConfig.kitchenPrinters.map((kp, idx) => (
                            <div key={kp.id} className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg relative">
                                <div>
                                    <label className="text-[10px] uppercase font-bold">Nome da Praça</label>
                                    <input type="text" className="w-full h-8 border rounded px-2 text-sm" value={kp.name} onChange={(e) => {
                                        const newK = [...printerConfig.kitchenPrinters];
                                        newK[idx].name = e.target.value;
                                        setPrinterConfig({...printerConfig, kitchenPrinters: newK});
                                    }} />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold">Impressora</label>
                                    <select className="w-full h-8 border rounded px-2 text-sm" value={kp.printer} onChange={(e) => {
                                        const newK = [...printerConfig.kitchenPrinters];
                                        newK[idx].name = newK[idx].name; // Mantém nome
                                        newK[idx].printer = e.target.value;
                                        setPrinterConfig({...printerConfig, kitchenPrinters: newK});
                                    }}>
                                        <option value="">-- Selecione --</option>
                                        {availablePrinters.map((p, pIdx) => <option key={`kp-opt-${pIdx}`} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                {idx > 0 && <button onClick={() => removeKitchenPrinter(kp.id)} className="absolute -top-2 -right-2 bg-white border shadow-sm p-1 rounded-full text-red-500 hover:bg-red-50"><Trash2 size={14}/></button>}
                            </div>
                        ))}
                    </div>

                    {/* PONTOS DE BAR */}
                    <div className="bg-card border rounded-xl p-6 space-y-4">
                         <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-semibold">Pontos de Bar / Bebidas (Até 5)</h3>
                            <button onClick={addBarPrinter} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-blue-200"><Plus size={14}/> Novo Ponto</button>
                        </div>
                        {printerConfig.barPrinters.map((bp, idx) => (
                            <div key={bp.id} className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg relative">
                                <div>
                                    <label className="text-[10px] uppercase font-bold">Nome da Praça</label>
                                    <input type="text" className="w-full h-8 border rounded px-2 text-sm" value={bp.name} onChange={(e) => {
                                        const newB = [...printerConfig.barPrinters];
                                        newB[idx].name = e.target.value;
                                        setPrinterConfig({...printerConfig, barPrinters: newB});
                                    }} />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold">Impressora</label>
                                    <select className="w-full h-8 border rounded px-2 text-sm" value={bp.printer} onChange={(e) => {
                                        const newB = [...printerConfig.barPrinters];
                                        newB[idx].printer = e.target.value;
                                        setPrinterConfig({...printerConfig, barPrinters: newB});
                                    }}>
                                        <option value="">-- Selecione --</option>
                                        {availablePrinters.map((p, pIdx) => <option key={`bp-printer-${pIdx}`} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                {idx > 0 && <button onClick={() => removeBarPrinter(bp.id)} className="absolute -top-2 -right-2 bg-white border shadow-sm p-1 rounded-full text-red-500 hover:bg-red-50"><Trash2 size={14}/></button>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-card border rounded-xl p-6 space-y-6">
                    <h3 className="font-semibold border-b pb-2 flex items-center gap-2"><LayoutTemplate size={18}/> Personalização do Layout</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2"><input type="checkbox" checked={receiptSettings.showLogo} onChange={e => setReceiptSettings({...receiptSettings, showLogo: e.target.checked})} /> <label>Exibir Logo</label></div>
                            <div className="flex items-center gap-2"><input type="checkbox" checked={receiptSettings.showAddress} onChange={e => setReceiptSettings({...receiptSettings, showAddress: e.target.checked})} /> <label>Exibir Endereço</label></div>
                            <div><label className="text-sm font-medium">Fonte</label>
                                <select className="w-full border h-10 rounded px-3 mt-1" value={receiptSettings.fontSize} onChange={e => setReceiptSettings({...receiptSettings, fontSize: e.target.value as any})}>
                                    <option value="small">Pequena</option><option value="medium">Média</option><option value="large">Grande</option>
                                </select>
                            </div>
                            <div><label className="text-sm font-medium">Topo</label><textarea className="w-full border rounded p-2 text-sm mt-1" rows={2} value={receiptSettings.headerText} onChange={e => setReceiptSettings({...receiptSettings, headerText: e.target.value})} /></div>
                            <div><label className="text-sm font-medium">Rodapé</label><textarea className="w-full border rounded p-2 text-sm mt-1" rows={2} value={receiptSettings.footerText} onChange={e => setReceiptSettings({...receiptSettings, footerText: e.target.value})} /></div>
                            
                            <button 
                                onClick={async () => {
                                    if (printerConfig.cashierPrinters.length === 0 || !printerConfig.cashierPrinters[0]) return alert("Selecione uma impressora de caixa primeiro!");
                                    const mockOrder: any = { 
                                        id: 'TEST1234', createdAt: new Date().toISOString(), total: 45.90, orderType: 'TABLE', tableNumber: 5,
                                        items: [{ quantity: 1, priceAtTime: 28.90, product: { name: 'X-Bacon Teste', category: { name: 'Lanches' } } }]
                                    };
                                    await printOrder(mockOrder, printerConfig, receiptSettings, { name: restaurantName, address: address });
                                }}
                                className="w-full mt-4 bg-secondary text-secondary-foreground border h-10 rounded-md hover:bg-secondary/80 flex items-center justify-center gap-2"
                            >
                                <Printer size={16} /> Imprimir Cupom de Teste (Caixa)
                            </button>
                        </div>
                        <div className="lg:col-span-2 bg-gray-100 p-8 rounded-xl flex justify-center border-2 border-dashed">
                             <ReceiptPreview settings={receiptSettings} restaurantName={restaurantName} restaurantAddress={address} logoUrl={logoUrl} />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'links' && (
            <div className="bg-card border rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-semibold">Links e Acesso ao Cardápio</h3>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold uppercase">Configuração de Domínio</span>
                </div>
                
                <div className="grid gap-6">
                    <div className="bg-muted/30 p-4 rounded-lg border border-dashed">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Store size={14} className="text-primary"/> Endereço do Cardápio (Slug Personalizada)
                        </label>
                        <div className="relative flex gap-2 mt-2">
                            <div className="relative flex-1">
                                <input 
                                    type="text"
                                    className={cn(
                                        "w-full border rounded-md h-12 px-3 bg-white font-mono text-sm transition-all outline-none",
                                        isSlugAvailable === true && "border-emerald-500 ring-2 ring-emerald-100",
                                        isSlugAvailable === false && "border-red-500 ring-2 ring-red-100"
                                    )}
                                    value={slug} 
                                    onChange={e => {
                                        const val = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
                                        setSlug(val);
                                    }}
                                    placeholder="ex: minha-loja"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {isCheckingSlug && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
                                    {isSlugAvailable === true && <CheckCircle size={16} className="text-emerald-500" />}
                                    {isSlugAvailable === false && <XCircle size={16} className="text-red-500" />}
                                </div>
                            </div>
                            <button 
                                onClick={() => {navigator.clipboard.writeText(slug); toast.success('Slug copiado!');}} 
                                className="bg-white border px-3 rounded-md hover:bg-slate-50 transition-colors"
                                title="Copiar Slug"
                            >
                                <Copy size={16}/>
                            </button>
                        </div>
                        {isSlugAvailable === false && (
                            <p className="text-[11px] text-red-600 font-bold mt-2 flex items-center gap-1">
                                <AlertTriangle size={12}/> Este endereço já está em uso por outro restaurante.
                            </p>
                        )}
                        {isSlugAvailable === true && (
                            <p className="text-[11px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
                                <CheckCircle size={12}/> Endereço disponível!
                            </p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-2">O endereço deve conter apenas letras, números e hífens. Ex: `pizzaria-do-joao`</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700">URL do seu Cardápio Digital</label>
                            <div className="flex gap-2 mt-2">
                                <input 
                                    readOnly 
                                    className="flex-1 border rounded-md h-10 px-3 bg-muted/50 font-medium text-blue-600" 
                                    value={window.location.hostname.includes('towersfy.com') ? `https://${slug}.towersfy.com` : `${clientUrl}/${slug}`} 
                                />
                                <button 
                                    onClick={() => {
                                        const url = window.location.hostname.includes('towersfy.com') ? `https://${slug}.towersfy.com` : `${clientUrl}/${slug}`;
                                        navigator.clipboard.writeText(url); 
                                        toast.success('Link copiado!');
                                    }} 
                                    className="bg-white border px-3 rounded-md hover:bg-slate-50"
                                >
                                    <Copy size={16}/>
                                </button>
                                <a 
                                    href={window.location.hostname.includes('towersfy.com') ? `https://${slug}.towersfy.com` : `${clientUrl}/${slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-primary text-white px-4 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-all font-medium"
                                >
                                    <ExternalLink size={16}/> Abrir Cardápio
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default SettingsManagement;
