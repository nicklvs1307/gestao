import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSettings, updateSettings, getCategories, uploadLogo, uploadCover, uploadVideoBanner, checkSlugAvailability } from '../services/api';
import { getPrinters, checkAgentStatus, type PrinterConfig } from '../services/printing';
import PrinterLayoutEditor, { type ReceiptLayout } from '../components/PrinterLayoutEditor';
import { 
  Save, Copy, ExternalLink, Palette, Store, 
  Clock, MapPin, Phone, Link as LinkIcon, Image as ImageIcon,
  CheckCircle, Loader2, Printer as PrinterIcon, RefreshCw, LayoutTemplate, Plus, Trash2,
  XCircle, Smartphone, MousePointer2, CreditCard, DollarSign, ChefHat, Beer, Settings, Globe, Navigation, TrendingUp, BarChart3
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const clientUrl = window.location.hostname.includes('towersfy.com') 
  ? `https://${window.location.hostname.replace('admin.', '').replace('kicardapio.', '')}` 
  : 'http://localhost:5174'; 

const initialLogo = 'https://via.placeholder.com/150x80.png?text=Sua+Logo';
const initialBgImage = 'https://via.placeholder.com/800x450.png?text=Fundo+do+Cardapio';

interface ReceiptSettings {
    showLogo: boolean;
    showAddress: boolean;
    fontSize: 'small' | 'medium' | 'large';
    headerText: string;
    footerText: string;
}

const SettingsManagement: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'printing' | 'links'>('general');

  // Grouped States for Enterprise Density
  const [general, setGeneral] = useState({
    name: '', address: '', phone: '', city: '', state: '', 
    latitude: '', longitude: '', slug: '', openingHours: '',
    serviceTax: 10, deliveryFee: 0, deliveryTime: '30-40 min', minOrderValue: 0
  });

  const [operation, setOperation] = useState({
    isOpen: false, autoAccept: false, autoPrint: true,
    autoOpenDelivery: false, deliveryOpeningTime: '', deliveryClosingTime: ''
  });

  const defaultOperatingHours = [
    { dayOfWeek: 0, openingTime: '18:00', closingTime: '23:00', isClosed: false },
    { dayOfWeek: 1, openingTime: '18:00', closingTime: '23:00', isClosed: false },
    { dayOfWeek: 2, openingTime: '18:00', closingTime: '23:00', isClosed: false },
    { dayOfWeek: 3, openingTime: '18:00', closingTime: '23:00', isClosed: false },
    { dayOfWeek: 4, openingTime: '18:00', closingTime: '23:00', isClosed: false },
    { dayOfWeek: 5, openingTime: '18:00', closingTime: '23:00', isClosed: false },
    { dayOfWeek: 6, openingTime: '00:00', closingTime: '00:00', isClosed: true },
  ];
  const [operatingHours, setOperatingHours] = useState(defaultOperatingHours);

  const [loyalty, setLoyalty] = useState({
    enabled: false, pointsPerReal: 1, cashback: 0
  });

  const [pixels, setPixels] = useState({
    metaPixelId: '', googleAnalyticsId: '', internalPixelId: ''
  });

  const [appearance, setAppearance] = useState({
    primary: '#f97316', secondary: '#0f172a', background: '#f8fafc',
    logo: initialLogo, cover: initialBgImage,
    videoBanners: [] as string[]
  });

  const [originalSlug, setOriginalSlug] = useState('');
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [agentStatus, setAgentStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  
  const [receiptLayout, setReceiptLayout] = useState<ReceiptLayout>({
    showLogo: true,
    showAddress: true,
    showOrderDate: true,
    fontSize: 'medium',
    headerText: '',
    footerText: 'OBRIGADO PELA PREFERÊNCIA!',
    itemSpacing: 2
  });
  
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>({
      cashierPrinters: [''],
      kitchenPrinters: [{ id: 'k1', name: 'Cozinha Principal', printer: '' }],
      barPrinters: [{ id: 'b1', name: 'Bar / Bebidas', printer: '' }],
      categoryMapping: {} 
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/printing')) setActiveTab('printing');
    else if (path.includes('/appearance')) setActiveTab('appearance');
    else if (path.includes('/links')) setActiveTab('links');
    else setActiveTab('general');
  }, [location.pathname]);

  const fetchSettings = async () => {
    try {
      const [settingsData, categoriesData] = await Promise.all([ getSettings(), getCategories(true) ]);
      
      setGeneral({
        name: settingsData.name || '',
        address: settingsData.address || '',
        phone: settingsData.phone || '',
        city: settingsData.city || '',
        state: settingsData.state || '',
        latitude: settingsData.latitude?.toString() || '',
        longitude: settingsData.longitude?.toString() || '',
        slug: settingsData.slug || '',
        openingHours: settingsData.openingHours || '',
        serviceTax: settingsData.serviceTaxPercentage || 10,
        deliveryFee: settingsData.settings?.deliveryFee || 0,
        deliveryTime: settingsData.settings?.deliveryTime || '30-40 min',
        minOrderValue: settingsData.settings?.minOrderValue || 0
      });

      setOperation({
        isOpen: settingsData.settings?.isOpen || false,
        autoAccept: settingsData.settings?.autoAcceptOrders || false,
        autoPrint: settingsData.settings?.autoPrintEnabled !== undefined ? settingsData.settings.autoPrintEnabled : true,
        autoOpenDelivery: settingsData.settings?.autoOpenDelivery || false,
        deliveryOpeningTime: settingsData.settings?.deliveryOpeningTime || '',
        deliveryClosingTime: settingsData.settings?.deliveryClosingTime || ''
      });

      setOperatingHours(settingsData.settings?.operatingHours || defaultOperatingHours);

      setLoyalty({
        enabled: settingsData.settings?.loyaltyEnabled || false,
        pointsPerReal: settingsData.settings?.pointsPerReal || 1,
        cashback: settingsData.settings?.cashbackPercentage || 0
      });

      setPixels({
        metaPixelId: settingsData.settings?.metaPixelId || '',
        googleAnalyticsId: settingsData.settings?.googleAnalyticsId || '',
        internalPixelId: settingsData.settings?.internalPixelId || ''
      });

      setAppearance({
        primary: settingsData.settings?.primaryColor || '#f97316',
        secondary: settingsData.settings?.secondaryColor || '#0f172a',
        background: settingsData.settings?.backgroundColor || '#f8fafc',
        logo: settingsData.logoUrl ? `/api${settingsData.logoUrl.replace(/^\/api/, '')}` : initialLogo,
        cover: settingsData.settings?.backgroundImageUrl ? `/api${settingsData.settings.backgroundImageUrl.replace(/^\/api/, '')}` : initialBgImage,
        videoBanners: settingsData.settings?.videoBanners || []
      });

      setOriginalSlug(settingsData.slug || '');
      if (Array.isArray(categoriesData)) setCategories(categoriesData);
      
      const savedPrinter = localStorage.getItem('printer_config');
      if (savedPrinter) setPrinterConfig(JSON.parse(savedPrinter));

      const savedLayout = localStorage.getItem('receipt_layout');
      if (savedLayout) setReceiptLayout(JSON.parse(savedLayout));

      await loadPrinters();
    } catch (error) { console.error(error); }
    finally { setIsLoading(false); }
  };

  const loadPrinters = async () => {
    setAgentStatus('checking');
    const isOnline = await checkAgentStatus();
    setAgentStatus(isOnline ? 'online' : 'offline');
    if (isOnline) {
      const printers = await getPrinters();
      setAvailablePrinters(printers);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  // Slug Check
  useEffect(() => {
    if (!general.slug || general.slug === originalSlug) { setIsSlugAvailable(null); return; }
    const timer = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const { available } = await checkSlugAvailability(general.slug);
        setIsSlugAvailable(available);
      } catch (e) { console.error(e); }
      finally { setIsCheckingSlug(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [general.slug, originalSlug]);

  const handleSaveChanges = async () => {
    if (general.slug !== originalSlug && isSlugAvailable === false) return toast.error('Endereço em uso.');
    setIsSaving(true);
    try {
      await updateSettings({
        name: general.name, slug: general.slug, address: general.address, phone: general.phone,
        city: general.city, state: general.state, serviceTaxPercentage: general.serviceTax,
        openingHours: general.openingHours, latitude: general.latitude, longitude: general.longitude,
        primaryColor: appearance.primary, secondaryColor: appearance.secondary, backgroundColor: appearance.background,
        backgroundImageUrl: appearance.cover.replace(/^\/api/, ''), 
        isOpen: operation.isOpen, deliveryFee: general.deliveryFee, deliveryTime: general.deliveryTime,
        minOrderValue: general.minOrderValue,
        autoAcceptOrders: operation.autoAccept, autoPrintEnabled: operation.autoPrint,
        autoOpenDelivery: operation.autoOpenDelivery, deliveryOpeningTime: operation.deliveryOpeningTime, deliveryClosingTime: operation.deliveryClosingTime,
        loyaltyEnabled: loyalty.enabled, pointsPerReal: loyalty.pointsPerReal, cashbackPercentage: loyalty.cashback,
        videoBanners: appearance.videoBanners,
        metaPixelId: pixels.metaPixelId, googleAnalyticsId: pixels.googleAnalyticsId, internalPixelId: pixels.internalPixelId,
        operatingHours
      });
      setOriginalSlug(general.slug);
      localStorage.setItem('printer_config', JSON.stringify(printerConfig));
      localStorage.setItem('receipt_layout', JSON.stringify(receiptLayout));
      toast.success('Configurações salvas!');
    } catch (e) { toast.error('Erro ao salvar.'); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center h-[60vh] opacity-30"><Loader2 className="animate-spin text-primary mb-4" size={32}/><span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Dados...</span></div>;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10 max-w-[1400px] mx-auto">
      {/* ENTERPRISE STICKY HEADER */}
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

      <div className="grid grid-cols-1 gap-6">
        {/* TAB: GERAL - LAYOUT OTIMIZADO */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Card 1: Identidade do Estabelecimento */}
            <Card className="p-6 space-y-5 border-border/50 shadow-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                <div className="p-2.5 bg-orange-500/10 rounded-xl">
                  <Store size={18} className="text-orange-500" />
                </div>
                <h3 className="text-sm font-bold uppercase text-foreground tracking-wide">Identidade</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome do Estabelecimento</label>
                  <input 
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-sm font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all" 
                    value={general.name} 
                    onChange={e => setGeneral({...general, name: e.target.value})} 
                    placeholder="Digite o nome da sua loja"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp / SAC</label>
                    <input 
                      className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-sm font-medium" 
                      value={general.phone} 
                      onChange={e => setGeneral({...general, phone: e.target.value})}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Taxa Serviço (%)</label>
                    <input 
                      type="number" 
                      className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-sm font-medium" 
                      value={general.serviceTax} 
                      onChange={e => setGeneral({...general, serviceTax: parseFloat(e.target.value)})} 
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Card 2: Localização */}
            <Card className="p-6 space-y-5 border-border/50 shadow-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                <div className="p-2.5 bg-slate-800/10 rounded-xl">
                  <MapPin size={18} className="text-slate-600" />
                </div>
                <h3 className="text-sm font-bold uppercase text-foreground tracking-wide">Localização</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Endereço Completo</label>
                  <input 
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-sm font-medium" 
                    value={general.address} 
                    onChange={e => setGeneral({...general, address: e.target.value})}
                    placeholder="Rua, número, bairro"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cidade</label>
                    <input 
                      className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-sm font-medium" 
                      value={general.city} 
                      onChange={e => setGeneral({...general, city: e.target.value})}
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado (UF)</label>
                    <input 
                      className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-sm font-medium" 
                      value={general.state} 
                      onChange={e => setGeneral({...general, state: e.target.value})}
                      placeholder="SP"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Latitude</label>
                    <input 
                      className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-sm font-medium" 
                      value={general.latitude} 
                      onChange={e => setGeneral({...general, latitude: e.target.value})}
                      placeholder="-23.550520"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Longitude</label>
                    <input 
                      className="w-full h-11 px-4 rounded-xl bg-background border border-border/60 text-sm font-medium" 
                      value={general.longitude} 
                      onChange={e => setGeneral({...general, longitude: e.target.value})}
                      placeholder="-46.633308"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Card 3: Status da Operação */}
            <Card className="p-6 space-y-5 border-border/50 shadow-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                  <Settings size={18} className="text-emerald-600" />
                </div>
                <h3 className="text-sm font-bold uppercase text-foreground tracking-wide">Status Operação</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border/40">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-full", operation.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Loja Aberta</p>
                      <p className={cn("text-xs font-medium", operation.isOpen ? "text-emerald-600" : "text-slate-500")}>
                        {operation.isOpen ? 'Aceitando pedidos' : 'Fechada'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setOperation({...operation, isOpen: !operation.isOpen})} 
                    className={cn("w-12 h-6 rounded-full relative transition-all", operation.isOpen ? "bg-emerald-500" : "bg-slate-300")}
                  >
                    <div className={cn("absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all shadow-md", operation.isOpen ? "left-6" : "left-0.5")} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border/40">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Aceite Automático</p>
                    <p className="text-xs text-muted-foreground">Pedidos confirmados sem intervenção</p>
                  </div>
                  <button 
                    onClick={() => setOperation({...operation, autoAccept: !operation.autoAccept})} 
                    className={cn("w-12 h-6 rounded-full relative transition-all", operation.autoAccept ? "bg-slate-900" : "bg-slate-300")}
                  >
                    <div className={cn("absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all shadow-md", operation.autoAccept ? "left-6" : "left-0.5")} />
                  </button>
                </div>
              </div>
            </Card>

            {/* Card 4: Configurações de Entrega */}
            <Card className="p-6 space-y-5 border-orange-100/50 shadow-sm bg-orange-500/[0.02]">
              <div className="flex items-center gap-3 pb-3 border-b border-orange-100/30">
                <div className="p-2.5 bg-orange-500/10 rounded-xl">
                  <Navigation size={18} className="text-orange-500" />
                </div>
                <h3 className="text-sm font-bold uppercase text-foreground tracking-wide">Entrega</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Taxa Entrega (R$)</label>
                  <input 
                    type="number" 
                    className="w-full h-11 px-4 rounded-xl bg-white border border-orange-100 text-sm font-medium" 
                    value={general.deliveryFee} 
                    onChange={e => setGeneral({...general, deliveryFee: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tempo Médio</label>
                  <input 
                    className="w-full h-11 px-4 rounded-xl bg-white border border-orange-100 text-sm font-medium" 
                    value={general.deliveryTime} 
                    onChange={e => setGeneral({...general, deliveryTime: e.target.value})}
                    placeholder="30-40 min"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pedido Mín. (R$)</label>
                  <input 
                    type="number" 
                    className="w-full h-11 px-4 rounded-xl bg-white border border-orange-100 text-sm font-medium" 
                    value={general.minOrderValue} 
                    onChange={e => setGeneral({...general, minOrderValue: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </Card>

            {/* Card 5: Horário de Funcionamento */}
            <Card className="lg:col-span-2 p-6 space-y-5 border-border/50 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-500/10 rounded-xl">
                    <Clock size={18} className="text-orange-500" />
                  </div>
                  <h3 className="text-sm font-bold uppercase text-foreground tracking-wide">Horário de Funcionamento</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-semibold uppercase tracking-wider", operation.autoOpenDelivery ? "text-emerald-600" : "text-muted-foreground")}>
                    {operation.autoOpenDelivery ? 'Agendamento Ativo' : 'Agendamento Inativo'}
                  </span>
                  <button
                    onClick={() => setOperation({...operation, autoOpenDelivery: !operation.autoOpenDelivery})}
                    className={cn("w-12 h-6 rounded-full relative transition-all", operation.autoOpenDelivery ? "bg-emerald-500" : "bg-slate-300")}
                  >
                    <div className={cn("absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all shadow-md", operation.autoOpenDelivery ? "left-6" : "left-0.5")} />
                  </button>
                </div>
              </div>

              {operation.autoOpenDelivery && (
                <div className="grid grid-cols-7 gap-2">
                  {operatingHours.map((schedule, index) => {
                    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                    return (
                      <div key={schedule.dayOfWeek} className="text-center space-y-2 p-3 bg-background rounded-xl border border-border/30">
                        <span className="text-xs font-bold uppercase text-muted-foreground block">
                          {dayLabels[schedule.dayOfWeek]}
                        </span>
                        <input
                          type="time"
                          disabled={schedule.isClosed}
                          value={schedule.openingTime}
                          onChange={e => {
                            const updated = [...operatingHours];
                            updated[index] = {...updated[index], openingTime: e.target.value};
                            setOperatingHours(updated);
                          }}
                          className="w-full h-9 px-2 rounded-lg bg-white border border-border/60 text-xs font-medium text-center disabled:opacity-40"
                        />
                        <span className="text-xs text-muted-foreground">às</span>
                        <input
                          type="time"
                          disabled={schedule.isClosed}
                          value={schedule.closingTime}
                          onChange={e => {
                            const updated = [...operatingHours];
                            updated[index] = {...updated[index], closingTime: e.target.value};
                            setOperatingHours(updated);
                          }}
                          className="w-full h-9 px-2 rounded-lg bg-white border border-border/60 text-xs font-medium text-center disabled:opacity-40"
                        />
                        <button
                          onClick={() => {
                            const updated = [...operatingHours];
                            updated[index] = {...updated[index], isClosed: !updated[index].isClosed};
                            setOperatingHours(updated);
                          }}
                          className={cn(
                            "w-full h-7 rounded-md flex items-center justify-center text-xs font-bold uppercase transition-all", 
                            schedule.isClosed ? "bg-rose-500 text-white" : "bg-emerald-500 text-white hover:bg-emerald-600"
                          )}
                        >
                          {schedule.isClosed ? 'Fechado' : 'Aberto'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Card 6: Programa de Fidelidade */}
            <Card className="xl:col-span-3 p-6 border-emerald-100/50 shadow-sm bg-emerald-500/[0.02]">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl">
                    <TrendingUp size={22} className="text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold uppercase text-emerald-900 tracking-wide">Programa de Fidelidade</h3>
                    <p className="text-sm text-emerald-600/80 mt-0.5">Estimule a recorrência com Cashback</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-emerald-800">Ativar Programa</span>
                    <button 
                      onClick={() => setLoyalty({...loyalty, enabled: !loyalty.enabled})} 
                      className={cn("w-12 h-6 rounded-full relative transition-all", loyalty.enabled ? "bg-emerald-500" : "bg-slate-300")}
                    >
                      <div className={cn("absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all shadow-md", loyalty.enabled ? "left-6" : "left-0.5")} />
                    </button>
                  </div>
                  <div className={cn("flex items-center gap-4", !loyalty.enabled && "opacity-40 pointer-events-none")}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">R$ 1 =</span>
                      <input 
                        type="number" 
                        className="w-20 h-10 px-3 rounded-lg bg-white border border-emerald-100 text-sm font-semibold" 
                        value={loyalty.pointsPerReal} 
                        onChange={e => setLoyalty({...loyalty, pointsPerReal: parseInt(e.target.value)})} 
                      />
                      <span className="text-sm font-medium text-muted-foreground">Pontos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Cashback</span>
                      <input 
                        type="number" 
                        className="w-20 h-10 px-3 rounded-lg bg-white border border-emerald-100 text-sm font-semibold" 
                        value={loyalty.cashback} 
                        onChange={e => setLoyalty({...loyalty, cashback: parseFloat(e.target.value)})} 
                      />
                      <span className="text-sm font-medium text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Card 7: Pixels e Analytics */}
            <Card className="xl:col-span-3 p-6 border-blue-100/50 shadow-sm bg-blue-500/[0.02]">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-2xl">
                    <BarChart3 size={22} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold uppercase text-blue-900 tracking-wide">Pixels e Analytics</h3>
                    <p className="text-sm text-blue-600/80 mt-0.5">Rastreamento de Conversões e Análises</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full lg:w-auto">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meta Pixel ID</label>
                    <input 
                      className="w-full h-10 px-4 rounded-lg bg-white border border-blue-100 text-sm font-medium" 
                      placeholder="1234567890"
                      value={pixels.metaPixelId} 
                      onChange={e => setPixels({...pixels, metaPixelId: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Google Analytics (GA4)</label>
                    <input 
                      className="w-full h-10 px-4 rounded-lg bg-white border border-blue-100 text-sm font-medium" 
                      placeholder="G-XXXXXXXXXX"
                      value={pixels.googleAnalyticsId} 
                      onChange={e => setPixels({...pixels, googleAnalyticsId: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pixel Interno</label>
                    <input 
                      className="w-full h-10 px-4 rounded-lg bg-white border border-blue-100 text-sm font-medium" 
                      placeholder="ID Personalizado"
                      value={pixels.internalPixelId} 
                      onChange={e => setPixels({...pixels, internalPixelId: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <div>
                      <p className="font-semibold text-blue-900">Meta Pixel</p>
                      <p className="text-xs text-blue-700">Rastreamento de conversões no Facebook e Instagram</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <div>
                      <p className="font-semibold text-blue-900">Google Analytics 4</p>
                      <p className="text-xs text-blue-700">Análise completa de comportamento e conversões</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <div>
                      <p className="font-semibold text-blue-900">Pixel Interno</p>
                      <p className="text-xs text-blue-700">Integrações personalizadas com outros sistemas</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB: VISUAL - LAYOUT OTIMIZADO */}
        {activeTab === 'appearance' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card: Brand Assets */}
            <Card className="p-6 space-y-6 border-border/50 shadow-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                <div className="p-2.5 bg-orange-500/10 rounded-xl">
                  <ImageIcon size={18} className="text-orange-500" />
                </div>
                <h3 className="text-sm font-bold uppercase text-foreground tracking-wide">Brand Assets</h3>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logo Principal</p>
                  <div className="aspect-square bg-background border-2 border-dashed border-border/60 rounded-2xl flex items-center justify-center p-4 group relative cursor-pointer overflow-hidden hover:border-orange-500/50 transition-all" onClick={() => logoInputRef.current?.click()}>
                    <img src={appearance.logo} className="w-full h-full object-contain group-hover:scale-105 transition-all" alt="Logo" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                      <span className="text-xs font-bold text-white uppercase italic">Trocar Imagem</span>
                    </div>
                  </div>
                  <input type="file" ref={logoInputRef} className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const { logoUrl } = await uploadLogo(file); setAppearance({...appearance, logo: `/api${logoUrl}`});
                  }} />
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Capa do Menu</p>
                  <div className="aspect-video bg-background border-2 border-dashed border-border/60 rounded-2xl flex items-center justify-center relative group cursor-pointer overflow-hidden hover:border-orange-500/50 transition-all" onClick={() => coverInputRef.current?.click()}>
                    <img src={appearance.cover} className="w-full h-full object-cover group-hover:scale-105 transition-all" alt="Capa" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                      <span className="text-xs font-bold text-white uppercase italic">Trocar Imagem</span>
                    </div>
                  </div>
                  <input type="file" ref={coverInputRef} className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const { coverUrl } = await uploadCover(file); setAppearance({...appearance, cover: `/api${coverUrl}`});
                  }} />
                </div>
              </div>
            </Card>

            {/* Card: Video Banners & Cores */}
            <Card className="lg:col-span-2 p-6 space-y-6 border-border/50 shadow-sm">
              {/* Banners de Vídeo */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                  <div className="p-2.5 bg-slate-800/10 rounded-xl">
                    <LayoutTemplate size={18} className="text-slate-600" />
                  </div>
                  <h3 className="text-sm font-bold uppercase text-foreground tracking-wide">Banners de Vídeo (Opcional)</h3>
                </div>
                <div className="space-y-3">
                  {appearance.videoBanners.map((url, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input 
                        type="text" 
                        className="flex-1 h-11 px-4 rounded-xl bg-background border border-border/60 text-sm font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                        placeholder="https://exemplo.com/video.mp4"
                        value={url}
                        onChange={(e) => {
                          const newBanners = [...appearance.videoBanners];
                          newBanners[index] = e.target.value;
                          setAppearance({...appearance, videoBanners: newBanners});
                        }}
                      />
                      <Button variant="destructive" size="icon" onClick={() => {
                          const newBanners = appearance.videoBanners.filter((_, i) => i !== index);
                          setAppearance({...appearance, videoBanners: newBanners});
                      }}>
                          <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button 
                      variant="outline" 
                      className="h-10"
                      onClick={() => setAppearance({...appearance, videoBanners: [...appearance.videoBanners, '']})}
                  >
                      <Plus size={16} className="mr-2"/> Adicionar Link
                  </Button>
                  <Button 
                      variant="secondary" 
                      className="h-10 bg-orange-500 text-white hover:bg-orange-600"
                      onClick={() => videoInputRef.current?.click()}
                  >
                      <Smartphone size={16} className="mr-2"/> Upload de Vídeo
                  </Button>
                  <input 
                      type="file" 
                      ref={videoInputRef} 
                      className="hidden" 
                      accept="video/*"
                      onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                              const { videoUrl } = await uploadVideoBanner(file);
                              setAppearance({...appearance, videoBanners: [...appearance.videoBanners, `/api${videoUrl}`]});
                              toast.success('Vídeo enviado com sucesso!');
                          } catch (error) {
                              toast.error('Erro ao enviar vídeo.');
                          }
                      }}
                  />
                </div>
              </div>

              {/* Paleta de Cores */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                  <div className="p-2.5 bg-orange-500/10 rounded-xl">
                    <Palette size={18} className="text-orange-500" />
                  </div>
                  <h3 className="text-sm font-bold uppercase text-foreground tracking-wide">Paleta de Cores</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'primary', label: 'Destaque (Principal)', val: appearance.primary, desc: 'Cor principal do cardápio' },
                    { id: 'secondary', label: 'Contraste (Títulos)', val: appearance.secondary, desc: 'Cor para títulos e enfatiza' },
                    { id: 'background', label: 'Fundo do App', val: appearance.background, desc: 'Cor de fundo geral' },
                  ].map((c) => (
                    <div key={c.id} className="p-4 bg-background border border-border/40 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{c.id}</p>
                        <p className="text-sm font-medium text-foreground">{c.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                      </div>
                      <div className="shrink-0">
                        <input type="color" className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white shadow-md" value={c.val} onChange={e => setAppearance({...appearance, [c.id]: e.target.value})} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview Card */}
              <div className="mt-6 p-8 bg-slate-900 rounded-[2.5rem] text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 blur-[80px] -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <Smartphone className="text-orange-500 mx-auto mb-4" size={36} />
                  <h4 className="text-white font-bold uppercase text-base tracking-wide">Experiência do Cliente</h4>
                  <p className="text-muted-foreground text-sm font-medium mt-3 max-w-sm mx-auto leading-relaxed">As cores aplicadas aqui alteram instantaneamente o layout do cardápio digital, proporcionando uma identidade visual única para sua marca.</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB: IMPRESSÃO - LAYOUT OTIMIZADO */}
        {activeTab === 'printing' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Coluna Lateral: Status & Automação */}
            <div className="lg:col-span-1 space-y-6">
              {/* Card: Status do Agente */}
              <Card className={cn("p-6 border-2 transition-all rounded-2xl", agentStatus === 'online' ? "bg-emerald-50/50 border-emerald-200/50" : "bg-rose-50/50 border-rose-200/50")}>
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-3 rounded-xl", agentStatus === 'online' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                    <PrinterIcon size={20} />
                  </div>
                  <button onClick={loadPrinters} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                    <RefreshCw size={16} className={cn(agentStatus === 'checking' && 'animate-spin')} />
                  </button>
                </div>
                <h3 className="text-sm font-bold uppercase text-foreground tracking-wide">Agente Local</h3>
                <p className={cn("text-xs font-semibold uppercase mt-1", agentStatus === 'online' ? "text-emerald-600" : "text-rose-600")}>
                  {agentStatus === 'online' ? '● Conectado' : '○ Desconectado'}
                </p>
                {agentStatus === 'online' && (
                  <p className="text-xs text-muted-foreground mt-2">{availablePrinters.length} impressora(s) encontrada(s)</p>
                )}
              </Card>

              {/* Card: Automação */}
              <Card className="p-6 border-border/50 shadow-sm rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase text-foreground tracking-wide">Automação</h3>
                  <button 
                    onClick={() => setOperation({...operation, autoPrint: !operation.autoPrint})} 
                    className={cn("w-12 h-6 rounded-full relative transition-all", operation.autoPrint ? "bg-slate-900" : "bg-slate-300")}
                  >
                    <div className={cn("absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all shadow-md", operation.autoPrint ? "left-6" : "left-0.5")} />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">Imprimir cupons automaticamente ao aceitar pedidos no sistema.</p>
              </Card>
            </div>

            {/* Coluna Principal: Configurações de Impressão */}
            <Card className="lg:col-span-3 p-6 border-border/50 shadow-sm rounded-2xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Caixa */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border/30">
                    <h4 className="text-sm font-bold uppercase text-foreground flex items-center gap-2">
                      <CreditCard size={16} className="text-slate-600" /> Caixa
                    </h4>
                    <button 
                      onClick={() => setPrinterConfig({...printerConfig, cashierPrinters: [...printerConfig.cashierPrinters, '']})} 
                      className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {printerConfig.cashierPrinters.map((p, i) => (
                      <div key={i} className="flex gap-3">
                        <select 
                          className="flex-1 h-11 bg-background border border-border/60 rounded-xl text-sm font-medium px-4 outline-none focus:border-orange-500" 
                          value={p} 
                          onChange={e => {
                            const n = [...printerConfig.cashierPrinters]; n[i] = e.target.value; setPrinterConfig({...printerConfig, cashierPrinters: n});
                          }}
                        >
                          <option value="">Nenhuma impressora</option>
                          {availablePrinters.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                        </select>
                        {i > 0 && (
                          <button 
                            onClick={() => setPrinterConfig({...printerConfig, cashierPrinters: printerConfig.cashierPrinters.filter((_, idx) => idx !== i)})} 
                            className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cozinha */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border/30">
                    <h4 className="text-sm font-bold uppercase text-foreground flex items-center gap-2">
                      <ChefHat size={16} className="text-orange-500" /> Cozinha
                    </h4>
                    <button 
                      onClick={() => setPrinterConfig({...printerConfig, kitchenPrinters: [...printerConfig.kitchenPrinters, { id: Date.now().toString(), name: 'Setor', printer: '' }]})} 
                      className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {printerConfig.kitchenPrinters.map((kp, i) => (
                      <div key={kp.id} className="grid grid-cols-2 gap-3 bg-background p-3 rounded-xl border border-border/30 relative group">
                        <input 
                          className="h-10 bg-white border border-border/60 rounded-lg text-sm font-medium px-3 outline-none focus:border-orange-500" 
                          placeholder="Nome do setor"
                          value={kp.name} 
                          onChange={e => {
                            const n = [...printerConfig.kitchenPrinters]; n[i].name = e.target.value; setPrinterConfig({...printerConfig, kitchenPrinters: n});
                          }} 
                        />
                        <select 
                          className="h-10 bg-white border border-border/60 rounded-lg text-sm font-medium px-3 outline-none focus:border-orange-500" 
                          value={kp.printer} 
                          onChange={e => {
                            const n = [...printerConfig.kitchenPrinters]; n[i].printer = e.target.value; setPrinterConfig({...printerConfig, kitchenPrinters: n});
                          }}
                        >
                          <option value="">Selecione...</option>
                          {availablePrinters.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                        </select>
                        {i > 0 && (
                          <button 
                            onClick={() => setPrinterConfig({...printerConfig, kitchenPrinters: printerConfig.kitchenPrinters.filter((_, idx) => idx !== i)})} 
                            className="absolute -right-3 -top-3 opacity-0 group-hover:opacity-100 bg-white shadow-md rounded-full p-2 text-rose-500 hover:bg-rose-50 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Roteamento de Categorias */}
                <div className="md:col-span-2 pt-4 border-t border-border/30">
                  <h4 className="text-sm font-bold uppercase text-foreground flex items-center gap-2 mb-4">
                    <LayoutTemplate size={16} className="text-orange-500" /> Roteamento de Categorias
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {categories.map(cat => (
                      <div key={cat.id} className="p-3 bg-background border border-border/40 rounded-xl flex flex-col gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase truncate">{cat.name}</span>
                        <select 
                          className="h-9 bg-white border border-border/60 rounded-lg text-xs font-medium px-2 outline-none focus:border-orange-500" 
                          value={printerConfig.categoryMapping[cat.name] || ''} 
                          onChange={e => setPrinterConfig({...printerConfig, categoryMapping: {...printerConfig.categoryMapping, [cat.name]: e.target.value}})}
                        >
                          <option value="">NÃO IMPRIMIR</option>
                          <optgroup label="Cozinhas">{printerConfig.kitchenPrinters.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</optgroup>
                          <optgroup label="Bares">{printerConfig.barPrinters.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Editor de Layout da Comanda */}
              <div className="pt-6 border-t border-border/30">
                <PrinterLayoutEditor 
                  layout={receiptLayout}
                  onChange={setReceiptLayout}
                  restaurantName={general.name}
                  restaurantLogo={appearance.logo}
                  restaurantAddress={general.address}
                />
              </div>
            </Card>
          </div>
        )}

        {/* TAB: LINKS - LAYOUT OTIMIZADO */}
        {activeTab === 'links' && (
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 bg-slate-900 text-white relative overflow-hidden rounded-[2.5rem] shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[120px] -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 space-y-8">
                {/* Header */}
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-orange-500 text-white rounded-2xl shadow-xl shadow-orange-500/30">
                    <Globe size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold uppercase tracking-wide">Domínio e Acesso</h3>
                    <p className="text-muted-foreground text-sm font-medium mt-1">Configuração de Endereço Web Personalizado</p>
                  </div>
                </div>
                
                {/* Slug Input */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Identificador (Slug)</label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input 
                        className={cn(
                          "w-full h-14 bg-white/5 border-2 border-white/10 rounded-xl px-5 font-bold text-lg outline-none uppercase transition-all placeholder:text-white/20",
                          isSlugAvailable === true && "border-emerald-500 text-emerald-400",
                          isSlugAvailable === false && "border-rose-500 text-rose-400"
                        )} 
                        value={general.slug} 
                        onChange={e => setGeneral({...general, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} 
                        placeholder="meu-restaurante"
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        {isCheckingSlug ? (
                          <Loader2 size={20} className="animate-spin text-white/30" />
                        ) : isSlugAvailable === true ? (
                          <CheckCircle size={22} className="text-emerald-500" />
                        ) : isSlugAvailable === false ? (
                          <XCircle size={22} className="text-rose-500" />
                        ) : null}
                      </div>
                    </div>
                    <button 
                      onClick={() => {navigator.clipboard.writeText(general.slug); toast.success('Link copiado!');}} 
                      className="h-14 w-14 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
                    >
                      <Copy size={20} />
                    </button>
                  </div>
                </div>

                {/* URL Pública */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">URL Pública do Cardápio</label>
                  <div className="bg-white rounded-2xl p-5 flex items-center justify-between gap-4 shadow-xl">
                    <div className="truncate flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Link completo</p>
                      <span className="text-base font-bold text-foreground truncate block">
                        {window.location.hostname.includes('towersfy.com') 
                          ? `https://${general.slug}.towersfy.com` 
                          : `${clientUrl}/${general.slug}`}
                      </span>
                    </div>
                    <a 
                      href={window.location.hostname.includes('towersfy.com') 
                        ? `https://${general.slug}.towersfy.com` 
                        : `${clientUrl}/${general.slug}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="p-3 bg-slate-900 text-white rounded-xl shadow-md hover:scale-105 hover:bg-slate-800 transition-all"
                    >
                      <ExternalLink size={20} />
                    </a>
                  </div>
                </div>

                {/* Preview Info */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Compartilhe este link com seus clientes para que acessem o cardápio digital. O endereço será único e permanente.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsManagement;
