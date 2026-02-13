import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSettings, updateSettings, getCategories, uploadLogo, uploadCover, checkSlugAvailability } from '../services/api';
import { getPrinters, checkAgentStatus, type PrinterConfig } from '../services/printing';
import ReceiptPreview from "../components/ReceiptPreview";
import { 
  Save, Copy, ExternalLink, Palette, Store, 
  Clock, MapPin, Phone, Link as LinkIcon, Image as ImageIcon,
  CheckCircle, Loader2, Printer as PrinterIcon, RefreshCw, AlertTriangle, LayoutTemplate, Plus, Trash2,
  XCircle, Smartphone, MousePointer2, CreditCard, DollarSign, ChefHat, Beer, Settings
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

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

  useEffect(() => {
      if (location.pathname.includes('/settings/printing')) setActiveTab('printing');
      else if (location.pathname.includes('/settings/appearance')) setActiveTab('appearance');
      else if (location.pathname.includes('/settings/links')) setActiveTab('links');
      else setActiveTab('general');
  }, [location.pathname]);

  const handleTabChange = (tab: string) => {
      const routes: Record<string, string> = {
          'general': '/settings/general',
          'appearance': '/settings/appearance',
          'printing': '/settings/printing',
          'links': '/settings/links'
      };
      navigate(routes[tab] || '/settings');
  };

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [serviceTaxPercentage, setServiceTaxPercentage] = useState(10);
  const [openingHours, setOpeningHours] = useState('');
  const [logoUrl, setLogoUrl] = useState(initialLogo);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState('30-40 min');
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);

  // Fidelidade
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [pointsPerReal, setPointsPerReal] = useState(1);
  const [cashbackPercentage, setCashbackPercentage] = useState(0);

  // Aparência
  const [primaryColor, setPrimaryColor] = useState('#f97316');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');
  const [backgroundColor, setBackgroundColor] = useState('#f8fafc');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(initialBgImage);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>({
      cashierPrinters: [''],
      kitchenPrinters: [{ id: 'k1', name: 'Cozinha Principal', printer: '' }],
      barPrinters: [{ id: 'b1', name: 'Bar / Bebidas', printer: '' }],
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
        const [settingsData, categoriesData] = await Promise.all([ getSettings(), getCategories(true) ]);
        setRestaurantName(settingsData.name || '');
        setAddress(settingsData.address || '');
        setPhone(settingsData.phone || '');
        setLatitude(settingsData.latitude?.toString() || '');
        setLongitude(settingsData.longitude?.toString() || '');
        setSlug(settingsData.slug || '');
        setOriginalSlug(settingsData.slug || '');
        setServiceTaxPercentage(settingsData.serviceTaxPercentage || 10);
        setOpeningHours(settingsData.openingHours || '');
        
        if (settingsData.logoUrl) setLogoUrl(`/api${settingsData.logoUrl}`);
        
        if (settingsData.settings) {
          const s = settingsData.settings;
          setPrimaryColor(s.primaryColor || '#f97316');
          setSecondaryColor(s.secondaryColor || '#0f172a');
          setBackgroundColor(s.backgroundColor || '#f8fafc');
          setBackgroundImageUrl(s.backgroundImageUrl ? `/api${s.backgroundImageUrl}` : initialBgImage);
          setIsStoreOpen(s.isOpen || false);
          setDeliveryFee(s.deliveryFee || 0);
          setDeliveryTime(s.deliveryTime || '30-40 min');
          setAutoAcceptOrders(s.autoAcceptOrders || false);
          setLoyaltyEnabled(s.loyaltyEnabled || false);
          setPointsPerReal(s.pointsPerReal || 1);
          setCashbackPercentage(s.cashbackPercentage || 0);
        }

        if (Array.isArray(categoriesData)) setCategories(categoriesData);
        const savedPrinterConfig = localStorage.getItem('printer_config');
        if (savedPrinterConfig) setPrinterConfig(JSON.parse(savedPrinterConfig));
        const savedReceiptSettings = localStorage.getItem('receipt_settings');
        if (savedReceiptSettings) setReceiptSettings(JSON.parse(savedReceiptSettings));
        
        await loadPrinters();
      } catch (error) { console.error(error); }
      finally { setIsLoading(false); }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!slug || slug === originalSlug) { setIsSlugAvailable(null); return; }
    const timer = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const { available } = await checkSlugAvailability(slug);
        setIsSlugAvailable(available);
      } catch (e) { console.error(e); }
      finally { setIsCheckingSlug(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [slug, originalSlug]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsSaving(true);
      const { logoUrl: newUrl } = await uploadLogo(file);
      setLogoUrl(`/api${newUrl}`);
      toast.success('Logo atualizada!');
    } catch (e) { toast.error('Falha no upload.'); }
    finally { setIsSaving(false); }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsSaving(true);
      const { coverUrl: newUrl } = await uploadCover(file);
      setBackgroundImageUrl(`/api${newUrl}`);
      toast.success('Capa atualizada!');
    } catch (e) { toast.error('Falha no upload da capa.'); }
    finally { setIsSaving(false); }
  };

  const handleSaveChanges = async () => {
    if (slug !== originalSlug && isSlugAvailable === false) return toast.error('Endereço em uso.');
    setIsSaving(true);
    try {
      await updateSettings({
        name: restaurantName, slug, address, phone, serviceTaxPercentage,
        openingHours, latitude, longitude, primaryColor, secondaryColor, backgroundColor,
        backgroundImageUrl, isOpen: isStoreOpen, deliveryFee, deliveryTime,
        autoAcceptOrders, loyaltyEnabled, pointsPerReal, cashbackPercentage
      });
      setOriginalSlug(slug);
      setIsSlugAvailable(null);
      localStorage.setItem('printer_config', JSON.stringify(printerConfig));
      localStorage.setItem('receipt_settings', JSON.stringify(receiptSettings));
      toast.success('Configurações salvas!');
    } catch (e) { toast.error('Erro ao salvar.'); }
    finally { setIsSaving(false); }
  };

  const addKitchenPrinter = () => setPrinterConfig(prev => ({ ...prev, kitchenPrinters: [...prev.kitchenPrinters, { id: 'k' + (prev.kitchenPrinters.length + 1), name: 'Nova Cozinha', printer: '' }] }));
  const addBarPrinter = () => setPrinterConfig(prev => ({ ...prev, barPrinters: [...prev.barPrinters, { id: 'b' + (prev.barPrinters.length + 1), name: 'Novo Bar', printer: '' }] }));
  const addCashierPrinter = () => setPrinterConfig(prev => ({ ...prev, cashierPrinters: [...prev.cashierPrinters, ''] }));

  const removePrinter = (listName: 'kitchenPrinters' | 'barPrinters' | 'cashierPrinters', index: number) => {
      setPrinterConfig(prev => ({
          ...prev,
          [listName]: prev[listName].filter((_, i) => i !== index)
      }));
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center h-[60vh] opacity-30"><Loader2 className="animate-spin text-orange-500 mb-4" size={32}/><span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Loja...</span></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header Compacto */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md z-40 py-3 border-b border-slate-200">
        <div className="flex items-center gap-4">
            <div className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-lg"><Settings size={20}/></div>
            <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Configurações</h1>
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">Personalização e Periféricos</p>
            </div>
        </div>
        <Button onClick={handleSaveChanges} disabled={isSaving} isLoading={isSaving} className="px-8 h-11 rounded-xl shadow-lg italic font-black text-[11px] uppercase tracking-widest">
            <Save size={18} className="mr-2" /> SALVAR TUDO
        </Button>
      </div>

      {/* Tabs Compactas */}
      <div className="flex bg-slate-200/50 p-1 rounded-2xl gap-1 shadow-inner w-full max-w-xl">
          {['general', 'appearance', 'printing', 'links'].map((tab) => (
              <button key={tab} onClick={() => handleTabChange(tab)} className={cn("flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", activeTab === tab ? "bg-white text-slate-900 shadow-sm scale-[1.02]" : "text-slate-500 hover:text-slate-700")}>
                  {tab === 'general' ? 'Dados' : tab === 'appearance' ? 'Visual' : tab === 'printing' ? 'Impressão' : 'Links'}
              </button>
          ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 space-y-6">
                    <h3 className="text-xs font-black uppercase text-slate-900 italic flex items-center gap-2 border-b border-slate-50 pb-3">
                        <Store size={16} className="text-orange-500"/> Dados da Empresa
                    </h3>
                    <div className="space-y-4">
                        <Input label="Nome Fantasia" value={restaurantName} onChange={e => setRestaurantName(e.target.value)} />
                        <Input label="Endereço Físico" value={address} onChange={e => setAddress(e.target.value)} />
                        <Input label="WhatsApp / Telefone" value={phone} onChange={e => setPhone(e.target.value)} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Latitude" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="-23.5505" />
                            <Input label="Longitude" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="-46.6333" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 space-y-6">
                    <h3 className="text-xs font-black uppercase text-slate-900 italic flex items-center gap-2 border-b border-slate-50 pb-3">
                        <Clock size={16} className="text-orange-500"/> Operação e Delivery
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl">
                            <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Status da Loja</p><p className={cn("text-sm font-black italic", isStoreOpen ? "text-emerald-600" : "text-rose-600")}>{isStoreOpen ? 'ABERTA' : 'FECHADA'}</p></div>
                            <button onClick={() => setIsStoreOpen(!isStoreOpen)} className={cn("w-10 h-5 rounded-full relative transition-all shadow-inner", isStoreOpen ? "bg-emerald-500" : "bg-slate-300")}><div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", isStoreOpen ? "left-6" : "left-1")} /></button>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-orange-50 border-2 border-orange-100 rounded-2xl">
                            <div><p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-0.5">Aceite Automático</p><p className="text-xs font-bold text-orange-900">{autoAcceptOrders ? 'ATIVADO' : 'MANUAL'}</p></div>
                            <button onClick={() => setAutoAcceptOrders(!autoAcceptOrders)} className={cn("w-10 h-5 rounded-full relative transition-all shadow-inner", autoAcceptOrders ? "bg-orange-500" : "bg-orange-200")}><div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", autoAcceptOrders ? "left-6" : "left-1")} /></button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Taxa Serviço (%)" type="number" value={serviceTaxPercentage} onChange={e => setServiceTaxPercentage(parseFloat(e.target.value))} />
                            <Input label="Taxa Entrega (R$)" type="number" value={deliveryFee} onChange={e => setDeliveryFee(parseFloat(e.target.value))} />
                        </div>
                        <Input label="Funcionamento" value={openingHours} onChange={e => setOpeningHours(e.target.value)} placeholder="Seg a Sex 18h-23h" />
                    </div>
                </Card>

                <Card className="lg:col-span-2 p-6 space-y-6 border-emerald-100 bg-emerald-50/10">
                    <h3 className="text-xs font-black uppercase text-emerald-900 italic flex items-center gap-2 border-b border-emerald-100/50 pb-3">
                        <CheckCircle size={16} className="text-emerald-500"/> Fidelidade e Cashback
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex items-center justify-between p-4 bg-white border-2 border-emerald-100 rounded-2xl">
                            <div><p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Programa Pontos</p><p className="text-xs font-bold text-emerald-900">{loyaltyEnabled ? 'ATIVO' : 'INATIVO'}</p></div>
                            <button onClick={() => setLoyaltyEnabled(!loyaltyEnabled)} className={cn("w-10 h-5 rounded-full relative transition-all shadow-inner", loyaltyEnabled ? "bg-emerald-500" : "bg-slate-200")}><div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", loyaltyEnabled ? "left-6" : "left-1")} /></button>
                        </div>
                        <div className={cn(!loyaltyEnabled && "opacity-30 pointer-events-none")}><Input label="R$ 1 = X Pontos" type="number" value={pointsPerReal} onChange={e => setPointsPerReal(parseInt(e.target.value))} /></div>
                        <div className={cn(!loyaltyEnabled && "opacity-30 pointer-events-none")}><Input label="% de Cashback" type="number" value={cashbackPercentage} onChange={e => setCashbackPercentage(parseFloat(e.target.value))} /></div>
                    </div>
                </Card>
            </div>
        )}

        {activeTab === 'appearance' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 p-6 space-y-6">
                    <div className="space-y-3">
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic"><ImageIcon size={12}/> Logo Principal</h3>
                        <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center p-4 group hover:border-orange-500 transition-all cursor-pointer overflow-hidden relative" onClick={() => logoInputRef.current?.click()}>
                            <img src={logoUrl} className="w-full h-full object-contain drop-shadow-lg group-hover:scale-105 transition-transform" alt="Logo" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black text-[9px] uppercase tracking-widest italic">Trocar</div>
                        </div>
                        <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoChange} accept="image/*" />
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-50">
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic"><ImageIcon size={12}/> Capa do Cardápio</h3>
                        <div className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden group hover:border-orange-500 transition-all cursor-pointer relative" onClick={() => coverInputRef.current?.click()}>
                            <img src={backgroundImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Capa" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black text-[9px] uppercase tracking-widest italic">Trocar Capa</div>
                        </div>
                        <input type="file" ref={coverInputRef} className="hidden" onChange={handleCoverChange} accept="image/*" />
                    </div>
                </Card>

                <Card className="lg:col-span-2 p-6 space-y-6">
                    <h3 className="text-xs font-black uppercase text-slate-900 italic flex items-center gap-2 border-b border-slate-50 pb-3"><Palette size={16} className="text-orange-500"/> Identidade Visual</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { label: 'Destaque', val: primaryColor, set: setPrimaryColor },
                            { label: 'Títulos', val: secondaryColor, set: setSecondaryColor },
                            { label: 'Fundo', val: backgroundColor, set: setBackgroundColor },
                        ].map((color, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl">
                                <div><p className="text-xs font-black text-slate-900 uppercase italic leading-none">{color.label}</p></div>
                                <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border-2 border-white shadow-md" value={color.val} onChange={e => color.set(e.target.value)} />
                            </div>
                        ))}
                    </div>
                    <div className="p-6 bg-slate-900 rounded-3xl text-center space-y-3 relative overflow-hidden">
                        <div className="absolute inset-0 bg-orange-500/5" />
                        <Smartphone className="text-orange-500 mx-auto" size={32} />
                        <h4 className="text-white font-black uppercase italic text-sm relative z-10">Preview Responsivo</h4>
                        <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest max-w-xs mx-auto relative z-10">As cores e imagens aplicadas aqui refletem imediatamente na experiência do seu cliente final.</p>
                    </div>
                </Card>
            </div>
        )}

        {activeTab === 'printing' && (
            <div className="space-y-6">
                <Card className={cn("p-4 flex items-center justify-between border-2 transition-all", agentStatus === 'online' ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
                    <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl shadow-md", agentStatus === 'online' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}><PrinterIcon size={24}/></div>
                        <div><h3 className="text-sm font-black uppercase italic text-slate-900 leading-none">Agente de Impressão</h3><p className={cn("text-[8px] font-black uppercase mt-1", agentStatus === 'online' ? "text-emerald-600" : "text-rose-600")}>{agentStatus === 'online' ? '● CONECTADO' : '○ OFFLINE'}</p></div>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-[9px] font-black" onClick={loadPrinters}>
                        <RefreshCw size={14} className={cn(agentStatus === 'checking' && 'animate-spin', "mr-1")}/> ATUALIZAR
                    </Button>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <Card className="p-6 space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                                <h3 className="text-xs font-black uppercase italic flex items-center gap-2"><CreditCard size={14} className="text-blue-500"/> Impressoras do Caixa</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 bg-blue-50 rounded-lg" onClick={addCashierPrinter}><Plus size={16}/></Button>
                            </div>
                            <div className="space-y-3">{printerConfig.cashierPrinters.map((p, i) => (
                                <div key={i} className="flex gap-2">
                                    <select className="ui-input flex-1 h-10 text-[10px] font-black italic" value={p} onChange={e => { const n = [...printerConfig.cashierPrinters]; n[i] = e.target.value; setPrinterConfig({...printerConfig, cashierPrinters: n}); }}><option value="">-- Selecione --</option>{availablePrinters.map((pr, idx) => <option key={idx} value={pr}>{pr}</option>)}</select>
                                    {i > 0 && <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 bg-rose-50 rounded-lg" onClick={() => removePrinter('cashierPrinters', i)}><Trash2 size={14}/></Button>}
                                </div>
                            ))}</div>
                        </Card>

                        <Card className="p-6 space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                                <h3 className="text-xs font-black uppercase italic flex items-center gap-2"><ChefHat size={14} className="text-orange-500"/> Pontos de Cozinha</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 bg-orange-50 rounded-lg" onClick={addKitchenPrinter}><Plus size={16}/></Button>
                            </div>
                            <div className="space-y-4">{printerConfig.kitchenPrinters.map((kp, i) => (
                                <div key={kp.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                    <div className="flex gap-2">
                                        <input type="text" className="ui-input flex-1 h-9 text-[10px] font-black uppercase" value={kp.name} onChange={e => { const n = [...printerConfig.kitchenPrinters]; n[i].name = e.target.value; setPrinterConfig({...printerConfig, kitchenPrinters: n}); }} placeholder="Nome do Setor" />
                                        {i > 0 && <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500" onClick={() => removePrinter('kitchenPrinters', i)}><Trash2 size={14}/></Button>}
                                    </div>
                                    <select className="ui-input w-full h-9 text-[10px]" value={kp.printer} onChange={e => { const n = [...printerConfig.kitchenPrinters]; n[i].printer = e.target.value; setPrinterConfig({...printerConfig, kitchenPrinters: n}); }}><option value="">-- Selecione Impressora --</option>{availablePrinters.map((pr, idx) => <option key={idx} value={pr}>{pr}</option>)}</select>
                                </div>
                            ))}</div>
                        </Card>

                        <Card className="p-6 space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                                <h3 className="text-xs font-black uppercase italic flex items-center gap-2"><Beer size={14} className="text-indigo-500"/> Pontos de Bar</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 bg-indigo-50 rounded-lg" onClick={addBarPrinter}><Plus size={16}/></Button>
                            </div>
                            <div className="space-y-4">{printerConfig.barPrinters.map((bp, i) => (
                                <div key={bp.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                    <div className="flex gap-2">
                                        <input type="text" className="ui-input flex-1 h-9 text-[10px] font-black uppercase" value={bp.name} onChange={e => { const n = [...printerConfig.barPrinters]; n[i].name = e.target.value; setPrinterConfig({...printerConfig, barPrinters: n}); }} placeholder="Nome do Setor" />
                                        {i > 0 && <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500" onClick={() => removePrinter('barPrinters', i)}><Trash2 size={14}/></Button>}
                                    </div>
                                    <select className="ui-input w-full h-9 text-[10px]" value={bp.printer} onChange={e => { const n = [...printerConfig.barPrinters]; n[i].printer = e.target.value; setPrinterConfig({...printerConfig, barPrinters: n}); }}><option value="">-- Selecione Impressora --</option>{availablePrinters.map((pr, idx) => <option key={idx} value={pr}>{pr}</option>)}</select>
                                </div>
                            ))}</div>
                        </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                        <h3 className="text-xs font-black uppercase italic flex items-center gap-2 border-b border-slate-50 pb-3"><MousePointer2 size={14} className="text-orange-500"/> Roteamento</h3>
                        <div className="overflow-hidden border border-slate-100 rounded-2xl">
                            <table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="px-4 py-2 text-[8px] font-black uppercase text-slate-400">Categoria</th><th className="px-4 py-2 text-right text-[8px] font-black uppercase text-slate-400">Destino</th></tr></thead>
                                <tbody className="divide-y divide-slate-50">{categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-black text-[10px] text-slate-700 uppercase italic">{cat.name}</td><td className="px-4 py-3 text-right"><select className="text-[9px] font-black uppercase border-2 border-slate-100 rounded-lg p-1.5 w-full max-w-[140px] bg-white outline-none focus:border-orange-500" value={printerConfig.categoryMapping[cat.name] || ''} onChange={(e) => setPrinterConfig({...printerConfig, categoryMapping: {...printerConfig.categoryMapping, [cat.name]: e.target.value}})}>
                                        <option value="">NÃO IMPRIMIR</option>
                                        <optgroup label="Cozinhas">{printerConfig.kitchenPrinters.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</optgroup>
                                        <optgroup label="Bares">{printerConfig.barPrinters.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup></select></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'links' && (
            <Card className="p-8 bg-slate-900 text-white relative overflow-hidden shadow-2xl max-w-3xl mx-auto">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="space-y-6 relative z-10">
                    <div className="flex items-center gap-4"><div className="p-3 bg-orange-500 rounded-2xl shadow-xl shadow-orange-500/20"><LinkIcon size={24}/></div><div><h3 className="text-xl font-black italic uppercase tracking-tighter leading-none">Endereço do Cardápio</h3><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Configuração de Slug e Link Direto</p></div></div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Identificador da Loja</label>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <input type="text" className={cn("w-full h-12 pl-5 pr-12 rounded-xl bg-white/5 border-2 border-white/10 font-black text-base italic tracking-tighter outline-none uppercase transition-all", isSlugAvailable === true && "border-emerald-500 text-emerald-400", isSlugAvailable === false && "border-rose-500 text-rose-400")} value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">{isCheckingSlug ? <Loader2 size={16} className="animate-spin text-slate-500" /> : isSlugAvailable === true ? <CheckCircle size={18} className="text-emerald-500" /> : isSlugAvailable === false ? <XCircle size={18} className="text-rose-500" /> : null}</div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-12 w-12 bg-white/5 border border-white/10 text-white" onClick={() => {navigator.clipboard.writeText(slug); toast.success('Copiado!');}}><Copy size={18}/></Button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-xl">
                        <span className="flex-1 font-black text-slate-900 italic text-xs truncate uppercase tracking-tighter">{window.location.hostname.includes('towersfy.com') ? `https://${slug}.towersfy.com` : `${clientUrl}/${slug}`}</span>
                        <a href={window.location.hostname.includes('towersfy.com') ? `https://${slug}.towersfy.com` : `${clientUrl}/${slug}`} target="_blank" rel="noreferrer" className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg hover:scale-105 transition-all"><ExternalLink size={16}/></a>
                    </div>
                </div>
            </Card>
        )}
      </div>
    </div>
  );
};

export default SettingsManagement;