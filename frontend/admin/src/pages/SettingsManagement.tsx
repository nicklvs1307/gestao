import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSettings, updateSettings, getCategories, uploadLogo, uploadCover, checkSlugAvailability } from '../services/api';
import { getPrinters, checkAgentStatus, type PrinterConfig } from '../services/printing';
import { 
  Save, Copy, ExternalLink, Palette, Store, 
  Clock, MapPin, Phone, Link as LinkIcon, Image as ImageIcon,
  CheckCircle, Loader2, Printer as PrinterIcon, RefreshCw, LayoutTemplate, Plus, Trash2,
  XCircle, Smartphone, MousePointer2, CreditCard, DollarSign, ChefHat, Beer, Settings, Globe, Navigation, TrendingUp
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
    serviceTax: 10, deliveryFee: 0, deliveryTime: '30-40 min'
  });

  const [operation, setOperation] = useState({
    isOpen: false, autoAccept: false, autoPrint: true
  });

  const [loyalty, setLoyalty] = useState({
    enabled: false, pointsPerReal: 1, cashback: 0
  });

  const [appearance, setAppearance] = useState({
    primary: '#f97316', secondary: '#0f172a', background: '#f8fafc',
    logo: initialLogo, cover: initialBgImage
  });

  const [originalSlug, setOriginalSlug] = useState('');
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [agentStatus, setAgentStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>({
      cashierPrinters: [''],
      kitchenPrinters: [{ id: 'k1', name: 'Cozinha Principal', printer: '' }],
      barPrinters: [{ id: 'b1', name: 'Bar / Bebidas', printer: '' }],
      categoryMapping: {} 
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
        deliveryTime: settingsData.settings?.deliveryTime || '30-40 min'
      });

      setOperation({
        isOpen: settingsData.settings?.isOpen || false,
        autoAccept: settingsData.settings?.autoAcceptOrders || false,
        autoPrint: settingsData.settings?.autoPrintEnabled !== undefined ? settingsData.settings.autoPrintEnabled : true
      });

      setLoyalty({
        enabled: settingsData.settings?.loyaltyEnabled || false,
        pointsPerReal: settingsData.settings?.pointsPerReal || 1,
        cashback: settingsData.settings?.cashbackPercentage || 0
      });

      setAppearance({
        primary: settingsData.settings?.primaryColor || '#f97316',
        secondary: settingsData.settings?.secondaryColor || '#0f172a',
        background: settingsData.settings?.backgroundColor || '#f8fafc',
        logo: settingsData.logoUrl ? `/api${settingsData.logoUrl.replace(/^\/api/, '')}` : initialLogo,
        cover: settingsData.settings?.backgroundImageUrl ? `/api${settingsData.settings.backgroundImageUrl.replace(/^\/api/, '')}` : initialBgImage
      });

      setOriginalSlug(settingsData.slug || '');
      if (Array.isArray(categoriesData)) setCategories(categoriesData);
      
      const savedPrinter = localStorage.getItem('printer_config');
      if (savedPrinter) setPrinterConfig(JSON.parse(savedPrinter));

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
        autoAcceptOrders: operation.autoAccept, autoPrintEnabled: operation.autoPrint,
        loyaltyEnabled: loyalty.enabled, pointsPerReal: loyalty.pointsPerReal, cashbackPercentage: loyalty.cashback
      });
      setOriginalSlug(general.slug);
      localStorage.setItem('printer_config', JSON.stringify(printerConfig));
      toast.success('Configurações salvas!');
    } catch (e) { toast.error('Erro ao salvar.'); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center h-[60vh] opacity-30"><Loader2 className="animate-spin text-orange-500 mb-4" size={32}/><span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Dados...</span></div>;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10 max-w-[1400px] mx-auto">
      {/* ENTERPRISE STICKY HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md z-40 py-4 border-b border-slate-200 px-1">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg"><Settings size={18}/></div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase italic leading-none">Configurações</h1>
            <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest mt-1">Gestão de Identidade e Operação</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="hidden lg:flex bg-slate-100 p-0.5 rounded-lg gap-0.5">
            {['general', 'appearance', 'printing', 'links'].map((tab) => (
              <button 
                key={tab} 
                onClick={() => navigate(`/settings/${tab}`)}
                className={cn("px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all", activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:bg-white/50")}
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

      <div className="grid grid-cols-1 gap-4">
        {/* TAB: GERAL (DENSIDADE MÁXIMA) */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coluna 1: Dados Vitais */}
            <Card className="p-4 space-y-4 border-slate-100">
              <h3 className="text-[10px] font-black uppercase text-slate-900 italic flex items-center gap-2 border-b border-slate-50 pb-2">
                <Store size={14} className="text-orange-500"/> Identidade
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Nome do Estabelecimento</label>
                  <input className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-bold focus:border-orange-500 outline-none transition-all" value={general.name} onChange={e => setGeneral({...general, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp / SAC</label>
                    <input className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-bold" value={general.phone} onChange={e => setGeneral({...general, phone: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Taxa Serviço (%)</label>
                    <input type="number" className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-bold" value={general.serviceTax} onChange={e => setGeneral({...general, serviceTax: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Horário de Funcionamento</label>
                  <input className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-bold" value={general.openingHours} onChange={e => setGeneral({...general, openingHours: e.target.value})} placeholder="Seg a Sex 18h-23h" />
                </div>
              </div>
            </Card>

            {/* Coluna 2: Localização e Mapas */}
            <Card className="p-4 space-y-4 border-slate-100">
              <h3 className="text-[10px] font-black uppercase text-slate-900 italic flex items-center gap-2 border-b border-slate-50 pb-2">
                <MapPin size={14} className="text-orange-500"/> Localização
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Endereço Completo</label>
                  <input className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-bold" value={general.address} onChange={e => setGeneral({...general, address: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Cidade</label>
                    <input className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-bold" value={general.city} onChange={e => setGeneral({...general, city: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Estado (UF)</label>
                    <input className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-bold" value={general.state} onChange={e => setGeneral({...general, state: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Latitude</label>
                    <input className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-bold" value={general.latitude} onChange={e => setGeneral({...general, latitude: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Longitude</label>
                    <input className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-bold" value={general.longitude} onChange={e => setGeneral({...general, longitude: e.target.value})} />
                  </div>
                </div>
              </div>
            </Card>

            {/* Coluna 3: Delivery e Operação */}
            <div className="space-y-4">
              <Card className="p-4 space-y-3 border-orange-100 bg-orange-50/20">
                <h3 className="text-[10px] font-black uppercase text-orange-900 italic flex items-center gap-2">
                  <Navigation size={14} className="text-orange-500"/> Entrega
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Taxa Fixa (R$)</label>
                    <input type="number" className="w-full h-9 px-3 rounded-lg bg-white border border-orange-100 text-[11px] font-bold" value={general.deliveryFee} onChange={e => setGeneral({...general, deliveryFee: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Tempo Médio</label>
                    <input className="w-full h-9 px-3 rounded-lg bg-white border border-orange-100 text-[11px] font-bold" value={general.deliveryTime} onChange={e => setGeneral({...general, deliveryTime: e.target.value})} />
                  </div>
                </div>
              </Card>

              <Card className="p-4 space-y-3 border-slate-100">
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Loja Aberta</p>
                    <p className={cn("text-[10px] font-black italic", operation.isOpen ? "text-emerald-600" : "text-rose-600")}>{operation.isOpen ? 'ONLINE' : 'OFFLINE'}</p>
                  </div>
                  <button onClick={() => setOperation({...operation, isOpen: !operation.isOpen})} className={cn("w-10 h-5 rounded-full relative transition-all", operation.isOpen ? "bg-emerald-500" : "bg-slate-300")}>
                    <div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", operation.isOpen ? "left-6" : "left-1")} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Aceite Automático</p>
                    <p className="text-[10px] font-black italic text-slate-700">{operation.autoAccept ? 'ATIVADO' : 'MANUAL'}</p>
                  </div>
                  <button onClick={() => setOperation({...operation, autoAccept: !operation.autoAccept})} className={cn("w-10 h-5 rounded-full relative transition-all", operation.autoAccept ? "bg-slate-900" : "bg-slate-300")}>
                    <div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", operation.autoAccept ? "left-6" : "left-1")} />
                  </button>
                </div>
              </Card>
            </div>

            {/* Seção Longa: Fidelidade (Full Width) */}
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
                      <span className="text-[9px] font-bold uppercase text-slate-400">R$ 1 =</span>
                      <input type="number" className="w-14 h-8 px-2 rounded-lg bg-white border border-emerald-100 text-[11px] font-bold" value={loyalty.pointsPerReal} onChange={e => setLoyalty({...loyalty, pointsPerReal: parseInt(e.target.value)})} />
                      <span className="text-[9px] font-bold uppercase text-slate-400">Pontos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase text-slate-400">Cashback</span>
                      <input type="number" className="w-14 h-8 px-2 rounded-lg bg-white border border-emerald-100 text-[11px] font-bold" value={loyalty.cashback} onChange={e => setLoyalty({...loyalty, cashback: parseFloat(e.target.value)})} />
                      <span className="text-[9px] font-bold uppercase text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB: VISUAL (DENSIDADE ENTERPRISE) */}
        {activeTab === 'appearance' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="p-4 space-y-4 border-slate-100">
              <h3 className="text-[10px] font-black uppercase text-slate-900 italic flex items-center gap-2 border-b border-slate-50 pb-2">
                <ImageIcon size={14} className="text-orange-500"/> Brand Assets
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Logo Principal</p>
                  <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center p-3 group relative cursor-pointer overflow-hidden" onClick={() => logoInputRef.current?.click()}>
                    <img src={appearance.logo} className="w-full h-full object-contain group-hover:scale-105 transition-all" alt="Logo" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-[8px] font-black text-white uppercase italic">Trocar</span>
                    </div>
                  </div>
                  <input type="file" ref={logoInputRef} className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const { logoUrl } = await uploadLogo(file); setAppearance({...appearance, logo: `/api${logoUrl}`});
                  }} />
                </div>
                <div className="space-y-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Capa do Menu</p>
                  <div className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center relative group cursor-pointer overflow-hidden" onClick={() => coverInputRef.current?.click()}>
                    <img src={appearance.cover} className="w-full h-full object-cover group-hover:scale-105 transition-all" alt="Capa" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-[8px] font-black text-white uppercase italic">Trocar</span>
                    </div>
                  </div>
                  <input type="file" ref={coverInputRef} className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const { coverUrl } = await uploadCover(file); setAppearance({...appearance, cover: `/api${coverUrl}`});
                  }} />
                </div>
              </div>
            </Card>

            <Card className="lg:col-span-3 p-4 space-y-4 border-slate-100">
              <h3 className="text-[10px] font-black uppercase text-slate-900 italic flex items-center gap-2 border-b border-slate-50 pb-2">
                <Palette size={14} className="text-orange-500"/> Paleta de Cores
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'primary', label: 'Destaque (Principal)', val: appearance.primary },
                  { id: 'secondary', label: 'Contraste (Títulos)', val: appearance.secondary },
                  { id: 'background', label: 'Fundo do Aplicativo', val: appearance.background },
                ].map((c) => (
                  <div key={c.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{c.id}</p>
                      <p className="text-[10px] font-bold text-slate-900 uppercase italic">{c.label}</p>
                    </div>
                    <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border-2 border-white shadow-sm" value={c.val} onChange={e => setAppearance({...appearance, [c.id]: e.target.value})} />
                  </div>
                ))}
              </div>
              <div className="mt-4 p-8 bg-slate-900 rounded-[2rem] text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Smartphone className="text-orange-500 mx-auto mb-4" size={32} />
                <h4 className="text-white font-black italic uppercase text-sm tracking-tight">Experiência do Cliente</h4>
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] max-w-sm mx-auto mt-2 leading-relaxed">As cores aplicadas aqui alteram instantaneamente o layout do cardápio digital, proporcionando uma identidade visual única.</p>
              </div>
            </Card>
          </div>
        )}

        {/* TAB: IMPRESSÃO (GRID COMPACTO) */}
        {activeTab === 'printing' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1 space-y-4">
              <Card className={cn("p-4 border-2 transition-all rounded-2xl", agentStatus === 'online' ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-2 rounded-lg", agentStatus === 'online' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}><PrinterIcon size={16}/></div>
                  <button onClick={loadPrinters} className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"><RefreshCw size={14} className={cn(agentStatus === 'checking' && 'animate-spin')} /></button>
                </div>
                <h3 className="text-[10px] font-black uppercase italic text-slate-900 leading-none">Agente Local</h3>
                <p className={cn("text-[8px] font-black uppercase mt-1", agentStatus === 'online' ? "text-emerald-600" : "text-rose-600")}>{agentStatus === 'online' ? '● CONECTADO' : '○ DESCONECTADO'}</p>
              </Card>

              <Card className="p-4 border-slate-100 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase italic text-slate-900">Automação</h3>
                  <button onClick={() => setOperation({...operation, autoPrint: !operation.autoPrint})} className={cn("w-10 h-5 rounded-full relative transition-all", operation.autoPrint ? "bg-slate-900" : "bg-slate-300")}>
                    <div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", operation.autoPrint ? "left-6" : "left-1")} />
                  </button>
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Imprimir cupons automaticamente ao aceitar pedidos no sistema.</p>
              </Card>
            </div>

            <Card className="lg:col-span-3 p-4 border-slate-100 rounded-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <h4 className="text-[10px] font-black uppercase italic text-slate-900 flex items-center gap-2"><CreditCard size={12}/> Caixa</h4>
                    <button onClick={() => setPrinterConfig({...printerConfig, cashierPrinters: [...printerConfig.cashierPrinters, '']})} className="p-1 hover:bg-slate-100 rounded-md text-slate-500"><Plus size={14}/></button>
                  </div>
                  <div className="space-y-2">
                    {printerConfig.cashierPrinters.map((p, i) => (
                      <div key={i} className="flex gap-2">
                        <select className="flex-1 h-8 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold outline-none px-2" value={p} onChange={e => {
                          const n = [...printerConfig.cashierPrinters]; n[i] = e.target.value; setPrinterConfig({...printerConfig, cashierPrinters: n});
                        }}>
                          <option value="">Nenhuma</option>
                          {availablePrinters.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                        </select>
                        {i > 0 && <button onClick={() => setPrinterConfig({...printerConfig, cashierPrinters: printerConfig.cashierPrinters.filter((_, idx) => idx !== i)})} className="text-rose-500"><Trash2 size={14}/></button>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <h4 className="text-[10px] font-black uppercase italic text-slate-900 flex items-center gap-2"><ChefHat size={12}/> Cozinha</h4>
                    <button onClick={() => setPrinterConfig({...printerConfig, kitchenPrinters: [...printerConfig.kitchenPrinters, { id: Date.now().toString(), name: 'Setor', printer: '' }]})} className="p-1 hover:bg-slate-100 rounded-md text-slate-500"><Plus size={14}/></button>
                  </div>
                  <div className="space-y-2">
                    {printerConfig.kitchenPrinters.map((kp, i) => (
                      <div key={kp.id} className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg relative group">
                        <input className="h-7 bg-white border border-slate-100 rounded-md text-[9px] font-black uppercase px-2" value={kp.name} onChange={e => {
                          const n = [...printerConfig.kitchenPrinters]; n[i].name = e.target.value; setPrinterConfig({...printerConfig, kitchenPrinters: n});
                        }} />
                        <select className="h-7 bg-white border border-slate-100 rounded-md text-[9px] font-bold px-2" value={kp.printer} onChange={e => {
                          const n = [...printerConfig.kitchenPrinters]; n[i].printer = e.target.value; setPrinterConfig({...printerConfig, kitchenPrinters: n});
                        }}>
                          <option value="">Selecione...</option>
                          {availablePrinters.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                        </select>
                        {i > 0 && <button onClick={() => setPrinterConfig({...printerConfig, kitchenPrinters: printerConfig.kitchenPrinters.filter((_, idx) => idx !== i)})} className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 bg-white shadow-md rounded-full p-1 text-rose-500 transition-opacity"><Trash2 size={10}/></button>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-50">
                  <h4 className="text-[10px] font-black uppercase italic text-slate-900 flex items-center gap-2 mb-3"><LayoutTemplate size={12}/> Roteamento de Categorias</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {categories.map(cat => (
                      <div key={cat.id} className="p-2 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-1.5">
                        <span className="text-[8px] font-black text-slate-400 uppercase truncate">{cat.name}</span>
                        <select className="h-7 bg-white border border-slate-100 rounded-lg text-[9px] font-black outline-none italic" value={printerConfig.categoryMapping[cat.name] || ''} onChange={e => setPrinterConfig({...printerConfig, categoryMapping: {...printerConfig.categoryMapping, [cat.name]: e.target.value}})}>
                          <option value="">NÃO IMPRIMIR</option>
                          <optgroup label="Cozinhas">{printerConfig.kitchenPrinters.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</optgroup>
                          <optgroup label="Bares">{printerConfig.barPrinters.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB: LINKS (ENTERPRISE DENSITY) */}
        {activeTab === 'links' && (
          <Card className="p-8 bg-slate-900 text-white relative overflow-hidden rounded-[2.5rem] shadow-2xl max-w-2xl mx-auto mt-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[120px] -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-orange-500 text-white rounded-2xl shadow-xl shadow-orange-500/30"><Globe size={24}/></div>
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Domínio e Acesso</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Configuração de Endereço Web Personalizado</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Identificador Slug</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input className={cn("w-full h-12 bg-white/5 border-2 border-white/10 rounded-xl px-5 font-black text-lg italic outline-none uppercase transition-all", isSlugAvailable === true && "border-emerald-500 text-emerald-400", isSlugAvailable === false && "border-rose-500 text-rose-400")} value={general.slug} onChange={e => setGeneral({...general, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {isCheckingSlug ? <Loader2 size={16} className="animate-spin text-white/30" /> : isSlugAvailable === true ? <CheckCircle size={20} className="text-emerald-500" /> : isSlugAvailable === false ? <XCircle size={20} className="text-rose-500" /> : null}
                      </div>
                    </div>
                    <button onClick={() => {navigator.clipboard.writeText(general.slug); toast.success('Link copiado!');}} className="h-12 w-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"><Copy size={18}/></button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 flex items-center justify-between group shadow-xl">
                  <div className="truncate">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">URL Pública do Cardápio</p>
                    <span className="text-sm font-black text-slate-900 italic tracking-tighter truncate">
                      {window.location.hostname.includes('towersfy.com') ? `https://${general.slug}.towersfy.com` : `${clientUrl}/${general.slug}`}
                    </span>
                  </div>
                  <a href={window.location.hostname.includes('towersfy.com') ? `https://${general.slug}.towersfy.com` : `${clientUrl}/${general.slug}`} target="_blank" rel="noreferrer" className="p-2.5 bg-slate-900 text-white rounded-lg shadow-md hover:scale-105 transition-all">
                    <ExternalLink size={16}/>
                  </a>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SettingsManagement;
