import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSettings, updateSettings, getCategories, uploadLogo, uploadCover, checkSlugAvailability } from '../services/api';
import { getPrinters, checkAgentStatus, type PrinterConfig } from '../services/printing';
import ReceiptPreview from "../components/ReceiptPreview";
import { 
  Save, Copy, ExternalLink, Palette, Store, 
  Clock, MapPin, Phone, Link as LinkIcon, Image as ImageIcon,
  CheckCircle, Loader2, Printer as PrinterIcon, RefreshCw, AlertTriangle, LayoutTemplate, Plus, Trash2,
  XCircle, Smartphone, MousePointer2, CreditCard, DollarSign
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
        const [settingsData, categoriesData] = await Promise.all([ getSettings(), getCategories(true) ]);
        setRestaurantName(settingsData.name || '');
        setAddress(settingsData.address || '');
        setPhone(settingsData.phone || '');
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

  // Debounce para slug
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
        openingHours, primaryColor, secondaryColor, backgroundColor,
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

  if (isLoading) return <div className="flex flex-col items-center justify-center h-[60vh] opacity-30"><Loader2 className="animate-spin text-orange-500 mb-4" size={40}/><span className="text-[10px] font-black uppercase tracking-widest">Carregando Configurações...</span></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Fixo */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 sticky top-0 bg-[#f8fafc]/90 backdrop-blur-md z-30 py-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Configurações</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Personalize sua loja e periféricos</p>
        </div>
        <Button onClick={handleSaveChanges} disabled={isSaving} isLoading={isSaving} className="px-10 h-14 rounded-2xl shadow-xl shadow-slate-200 italic font-black">
            SALVAR TUDO
        </Button>
      </div>

      {/* Tabs Premium */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1 shadow-inner max-w-2xl">
          {['general', 'appearance', 'printing', 'links'].map((tab) => (
              <button key={tab} onClick={() => handleTabChange(tab)} className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === tab ? "bg-white text-slate-900 shadow-md scale-[1.02]" : "text-slate-500 hover:text-slate-700")}>
                  {tab === 'general' ? 'Dados Gerais' : tab === 'appearance' ? 'Visual' : tab === 'printing' ? 'Impressoras' : 'Endereços'}
              </button>
          ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-8 space-y-6">
                    <h3 className="text-sm font-black uppercase text-slate-900 italic flex items-center gap-3 border-b border-slate-50 pb-4">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Store size={18}/></div>
                        Perfil da Empresa
                    </h3>
                    <div className="space-y-4">
                        <Input label="Nome Fantasia" value={restaurantName} onChange={e => setRestaurantName(e.target.value)} />
                        <Input label="Endereço Físico" value={address} onChange={e => setAddress(e.target.value)} />
                        <Input label="WhatsApp / Telefone" value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                </Card>

                <Card className="p-8 space-y-6">
                    <h3 className="text-sm font-black uppercase text-slate-900 italic flex items-center gap-3 border-b border-slate-50 pb-4">
                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Clock size={18}/> Operação e Delivery</div>
                    </h3>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] transition-all">
                            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status da Loja</p><p className={cn("text-base font-black italic", isStoreOpen ? "text-emerald-600" : "text-rose-600")}>{isStoreOpen ? 'ABERTA AGORA' : 'FECHADA NO MOMENTO'}</p></div>
                            <button onClick={() => setIsStoreOpen(!isStoreOpen)} className={cn("w-14 h-7 rounded-full relative transition-all shadow-inner", isStoreOpen ? "bg-emerald-500" : "bg-slate-300")}><div className={cn("absolute w-5 h-5 bg-white rounded-full top-1 transition-all shadow-md", isStoreOpen ? "left-8" : "left-1")} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <Input label="Taxa de Serviço (%)" type="number" value={serviceTaxPercentage} onChange={e => setServiceTaxPercentage(parseFloat(e.target.value))} />
                            <Input label="Taxa de Entrega (R$)" type="number" value={deliveryFee} onChange={e => setDeliveryFee(parseFloat(e.target.value))} />
                        </div>
                        <Input label="Horário de Funcionamento (Texto)" value={openingHours} onChange={e => setOpeningHours(e.target.value)} placeholder="Ex: Seg a Sex das 18h às 23h" />
                    </div>
                </Card>

                <Card className="lg:col-span-2 p-8 space-y-6 border-emerald-100 bg-emerald-50/10">
                    <h3 className="text-sm font-black uppercase text-emerald-900 italic flex items-center gap-3 border-b border-emerald-100/50 pb-4">
                        <div className="p-2 bg-emerald-500 rounded-lg text-white shadow-lg shadow-emerald-100"><CheckCircle size={18}/></div>
                        Fidelidade e Cashback
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex items-center justify-between p-5 bg-white border-2 border-emerald-100 rounded-[2rem]">
                            <div><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Programa de Pontos</p><p className="text-xs font-bold text-emerald-900">{loyaltyEnabled ? 'ATIVO' : 'INATIVO'}</p></div>
                            <button onClick={() => setLoyaltyEnabled(!loyaltyEnabled)} className={cn("w-14 h-7 rounded-full relative transition-all shadow-inner", loyaltyEnabled ? "bg-emerald-500" : "bg-slate-200")}><div className={cn("absolute w-5 h-5 bg-white rounded-full top-1 transition-all shadow-md", loyaltyEnabled ? "left-8" : "left-1")} /></button>
                        </div>
                        <div className={cn("transition-all", !loyaltyEnabled && "opacity-30 grayscale pointer-events-none")}><Input label="Pontos por Real (R$ 1 = X pts)" type="number" value={pointsPerReal} onChange={e => setPointsPerReal(parseInt(e.target.value))} /></div>
                        <div className={cn("transition-all", !loyaltyEnabled && "opacity-30 grayscale pointer-events-none")}><Input label="% de Cashback" type="number" value={cashbackPercentage} onChange={e => setCashbackPercentage(parseFloat(e.target.value))} /></div>
                    </div>
                </Card>
            </div>
        )}

        {activeTab === 'appearance' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 p-8 space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={14}/> Logotipo Principal</h3>
                        <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex items-center justify-center p-6 group hover:border-orange-500 transition-all cursor-pointer overflow-hidden relative" onClick={() => logoInputRef.current?.click()}>
                            <img src={logoUrl} className="w-full h-full object-contain drop-shadow-xl group-hover:scale-105 transition-transform" alt="Logo" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black text-[10px] uppercase tracking-widest italic">Trocar Logo</div>
                        </div>
                        <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoChange} accept="image/*" />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={14}/> Imagem de Capa (Mobile)</h3>
                        <div className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex items-center justify-center overflow-hidden group hover:border-orange-500 transition-all cursor-pointer relative" onClick={() => coverInputRef.current?.click()}>
                            <img src={backgroundImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="Capa" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black text-[10px] uppercase tracking-widest italic">Trocar Capa</div>
                        </div>
                        <input type="file" ref={coverInputRef} className="hidden" onChange={handleCoverChange} accept="image/*" />
                    </div>
                </Card>

                <Card className="lg:col-span-2 p-8 space-y-8">
                    <div>
                        <h3 className="text-sm font-black uppercase text-slate-900 italic flex items-center gap-3 border-b border-slate-50 pb-4"><Palette size={18} className="text-orange-500"/> Personalização Visual</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">Defina as cores que seus clientes verão no Cardápio Digital.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { label: 'Cor de Destaque', desc: 'Botões e ícones principais', value: primaryColor, setter: setPrimaryColor },
                            { label: 'Cor de Texto / Títulos', desc: 'Textos e elementos de destaque', value: secondaryColor, setter: setSecondaryColor },
                            { label: 'Cor de Fundo', desc: 'Fundo geral do aplicativo', value: backgroundColor, setter: setBackgroundColor },
                        ].map((color, i) => (
                            <div key={i} className="flex items-center justify-between p-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] hover:border-orange-200 transition-all">
                                <div><p className="text-xs font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">{color.label}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{color.desc}</p></div>
                                <div className="relative group"><input type="color" className="w-12 h-12 rounded-xl cursor-pointer border-4 border-white shadow-lg shadow-black/5" value={color.value} onChange={e => color.setter(e.target.value)} /></div>
                            </div>
                        ))}
                    </div>

                    <div className="p-8 bg-slate-900 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col items-center text-center gap-4">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-500/10 to-transparent opacity-50" />
                        <Smartphone className="text-orange-500 relative z-10" size={40} />
                        <h4 className="text-white font-black uppercase italic tracking-tighter relative z-10 text-xl">Preview em tempo real</h4>
                        <p className="text-slate-400 text-xs font-medium max-w-xs relative z-10 leading-relaxed uppercase tracking-widest text-[9px]">O seu cardápio se ajustará automaticamente com estas definições.</p>
                    </div>
                </Card>
            </div>
        )}

        {activeTab === 'printing' && (
            <div className="space-y-8 animate-in fade-in duration-300">
                <Card className={cn("p-6 flex items-center justify-between border-2 transition-all", agentStatus === 'online' ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
                    <div className="flex items-center gap-5">
                        <div className={cn("p-4 rounded-[1.5rem] shadow-lg transition-transform hover:scale-110", agentStatus === 'online' ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-rose-500 text-white shadow-rose-200")}><PrinterIcon size={28}/></div>
                        <div><h3 className={cn("text-xl font-black uppercase italic tracking-tighter leading-none", agentStatus === 'online' ? "text-emerald-900" : "text-rose-900")}>Agente Multi-Impressão</h3><p className={cn("text-[10px] font-black uppercase tracking-[0.2em] mt-1.5", agentStatus === 'online' ? "text-emerald-600" : "text-rose-600")}>{agentStatus === 'online' ? '● CONECTADO E PRONTO' : '○ NÃO DETECTADO NO SISTEMA'}</p></div>
                    </div>
                    <Button variant="outline" size="sm" className="bg-white rounded-xl gap-2 font-black italic" onClick={loadPrinters}>
                        <RefreshCw size={16} className={cn(agentStatus === 'checking' && 'animate-spin')}/> ATUALIZAR
                    </Button>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="p-8 space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-4"><h3 className="text-sm font-black uppercase text-slate-900 italic flex items-center gap-3"><div className="p-2 bg-slate-100 rounded-lg text-slate-600"><CreditCard size={18}/></div> Conferência / Caixa</h3><Button variant="ghost" size="icon" className="text-orange-600 bg-orange-50 rounded-xl" onClick={addCashierPrinter}><Plus size={18}/></Button></div>
                        <div className="space-y-4">{printerConfig.cashierPrinters.map((printer, idx) => (
                            <div key={idx} className="flex gap-3 items-end animate-in slide-in-from-left-2">
                                <div className="flex-1 space-y-1.5"><label className="text-[9px] uppercase font-black text-slate-400 tracking-widest ml-1">Impressora #{idx + 1}</label><select className="ui-input w-full h-12" value={printer} onChange={(e) => { const newP = [...printerConfig.cashierPrinters]; newP[idx] = e.target.value; setPrinterConfig({...printerConfig, cashierPrinters: newP}); }}><option value="">-- Selecione --</option>{availablePrinters.map((p, pIdx) => <option key={pIdx} value={p}>{p}</option>)}</select></div>
                                {idx > 0 && <Button variant="ghost" size="icon" className="h-12 w-12 bg-rose-50 text-rose-500 rounded-xl" onClick={() => removeCashierPrinter(idx)}><Trash2 size={18}/></Button>}
                            </div>
                        ))}</div>
                    </Card>

                    <Card className="p-8 space-y-6">
                        <h3 className="text-sm font-black uppercase text-slate-900 italic flex items-center gap-3 border-b border-slate-50 pb-4"><div className="p-2 bg-slate-100 rounded-lg text-slate-600"><MousePointer2 size={18}/></div> Roteamento de Itens</h3>
                        <div className="overflow-hidden border border-slate-100 rounded-[2rem] bg-slate-50/30">
                            <table className="w-full text-left border-collapse"><thead className="bg-slate-100/50"><tr><th className="px-6 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Categoria</th><th className="px-6 py-3 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Destino da Produção</th></tr></thead>
                                <tbody className="divide-y divide-slate-50">{categories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-white transition-colors group"><td className="px-6 py-4 font-black text-xs text-slate-700 uppercase italic">{cat.name}</td><td className="px-6 py-4 text-right"><select className="text-[10px] font-black uppercase tracking-widest border-2 border-slate-100 rounded-lg p-1.5 w-full max-w-[180px] bg-white italic outline-none focus:border-orange-500 transition-all" value={printerConfig.categoryMapping[cat.name] || 'k1'} onChange={(e) => setPrinterConfig({...printerConfig, categoryMapping: {...printerConfig.categoryMapping, [cat.name]: e.target.value}})}>
                                        <optgroup label="Cozinhas">{printerConfig.kitchenPrinters.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</optgroup>
                                        <optgroup label="Bares">{printerConfig.barPrinters.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>
                                        <option value="none">NÃO IMPRIMIR</option></select></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'links' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-8 space-y-8 bg-slate-900 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <div className="space-y-2 relative z-10">
                        <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3"><div className="p-2 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20"><LinkIcon size={20}/></div> Endereço do Cardápio</h3>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-12 leading-tight">Escolha sua "Slug" personalizada para acesso rápido.</p>
                    </div>
                    
                    <div className="space-y-6 relative z-10">
                        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Identificador da Loja (Subdomínio)</label>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <input type="text" className={cn("w-full h-14 pl-6 pr-12 rounded-2xl bg-white/5 border-2 border-white/10 font-black text-lg italic tracking-tighter transition-all outline-none uppercase", isSlugAvailable === true && "border-emerald-500 text-emerald-400", isSlugAvailable === false && "border-rose-500 text-rose-400")} value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''))} placeholder="ex: romapizzaria" />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">{isCheckingSlug && <Loader2 size={18} className="animate-spin text-slate-500" />}{isSlugAvailable === true && <CheckCircle size={20} className="text-emerald-500" />}{isSlugAvailable === false && <XCircle size={20} className="text-rose-500" />}</div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-14 w-14 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10" onClick={() => {navigator.clipboard.writeText(slug); toast.success('Copiado!');}}><Copy size={20}/></Button>
                            </div>
                            {isSlugAvailable === false && <p className="text-[10px] text-rose-400 font-bold uppercase italic flex items-center gap-2 ml-1"><AlertTriangle size={14}/> Este endereço já está em uso.</p>}
                            {isSlugAvailable === true && <p className="text-[10px] text-emerald-400 font-bold uppercase italic flex items-center gap-2 ml-1"><CheckCircle size={14}/> Endereço disponível para uso!</p>}
                        </div>

                        <div className="space-y-4 pt-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Seu Link Direto:</h4>
                            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-xl">
                                <span className="flex-1 font-black text-slate-900 italic text-sm truncate uppercase tracking-tighter">{window.location.hostname.includes('towersfy.com') ? `https://${slug}.towersfy.com` : `${clientUrl}/${slug}`}</span>
                                <Button variant="ghost" size="icon" className="bg-slate-50 text-slate-400 hover:text-orange-600 rounded-xl" onClick={() => { navigator.clipboard.writeText(window.location.hostname.includes('towersfy.com') ? `https://${slug}.towersfy.com` : `${clientUrl}/${slug}`); toast.success('Link copiado!'); }}><Copy size={18}/></Button>
                                <a href={window.location.hostname.includes('towersfy.com') ? `https://${slug}.towersfy.com` : `${clientUrl}/${slug}`} target="_blank" rel="noreferrer" className="p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:scale-105 transition-all"><ExternalLink size={18}/></a>
                            </div>
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