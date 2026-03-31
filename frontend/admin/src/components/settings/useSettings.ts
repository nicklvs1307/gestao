import { useState, useEffect, useCallback } from 'react';
import { 
  getSettings, 
  updateSettings, 
  getCategories, 
  uploadLogo, 
  uploadCover, 
  uploadVideoBanner, 
  checkSlugAvailability 
} from '../../services/api';
import { getPrinters, checkAgentStatus } from '../../services/printing';
import {
  initialGeneral,
  initialOperation,
  initialLoyalty,
  initialPixels,
  initialAppearance,
  defaultOperatingHours,
  type GeneralSettings,
  type OperationSettings,
  type OperatingHour,
  type LoyaltySettings,
  type PixelSettings,
  type AppearanceSettings,
} from './types';

interface UseSettingsReturn {
  // States
  general: GeneralSettings;
  operation: OperationSettings;
  operatingHours: OperatingHour[];
  loyalty: LoyaltySettings;
  pixels: PixelSettings;
  appearance: AppearanceSettings;
  originalSlug: string;
  isSlugAvailable: boolean | null;
  isCheckingSlug: boolean;
  isLoading: boolean;
  isSaving: boolean;
  availablePrinters: string[];
  agentStatus: 'online' | 'offline' | 'checking';
  categories: { id: string; name: string }[];
  
  // Setters
  setGeneral: React.Dispatch<React.SetStateAction<GeneralSettings>>;
  setOperation: React.Dispatch<React.SetStateAction<OperationSettings>>;
  setOperatingHours: React.Dispatch<React.SetStateAction<OperatingHour[]>>;
  setLoyalty: React.Dispatch<React.SetStateAction<LoyaltySettings>>;
  setPixels: React.Dispatch<React.SetStateAction<PixelSettings>>;
  setAppearance: React.Dispatch<React.SetStateAction<AppearanceSettings>>;
  
  // Actions
  handleSave: () => Promise<void>;
  loadPrinters: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [general, setGeneral] = useState<GeneralSettings>(initialGeneral);
  const [operation, setOperation] = useState<OperationSettings>(initialOperation);
  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>(defaultOperatingHours);
  const [loyalty, setLoyalty] = useState<LoyaltySettings>(initialLoyalty);
  const [pixels, setPixels] = useState<PixelSettings>(initialPixels);
  const [appearance, setAppearance] = useState<AppearanceSettings>(initialAppearance);
  
  const [originalSlug, setOriginalSlug] = useState('');
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [agentStatus, setAgentStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);

  const loadPrinters = useCallback(async () => {
    setAgentStatus('checking');
    const isOnline = await checkAgentStatus();
    setAgentStatus(isOnline ? 'online' : 'offline');
    if (isOnline) {
      const printers = await getPrinters();
      setAvailablePrinters(printers);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const [settingsData, categoriesData] = await Promise.all([getSettings(), getCategories(true)]);
      
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
        logo: settingsData.logoUrl ? `/api${settingsData.logoUrl.replace(/^\/api/, '')}` : initialAppearance.logo,
        cover: settingsData.settings?.backgroundImageUrl ? `/api${settingsData.settings.backgroundImageUrl.replace(/^\/api/, '')}` : initialAppearance.cover,
        videoBanners: settingsData.settings?.videoBanners || []
      });

      setOriginalSlug(settingsData.slug || '');
      if (Array.isArray(categoriesData)) setCategories(categoriesData);
      
      await loadPrinters();
    } catch (error) { 
      console.error(error); 
    }
    finally { 
      setIsLoading(false); 
    }
  }, [loadPrinters]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Slug Check
  useEffect(() => {
    if (!general.slug || general.slug === originalSlug) { 
      setIsSlugAvailable(null); 
      return; 
    }
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

  const handleSave = useCallback(async () => {
    const { toast } = await import('sonner');
    if (general.slug !== originalSlug && isSlugAvailable === false) {
      toast.error('Endereço em uso.');
      return;
    }
    setIsSaving(true);
    try {
      await updateSettings({
        name: general.name,
        slug: general.slug,
        address: general.address,
        phone: general.phone,
        city: general.city,
        state: general.state,
        serviceTaxPercentage: general.serviceTax,
        openingHours: general.openingHours,
        latitude: general.latitude,
        longitude: general.longitude,
        primaryColor: appearance.primary,
        secondaryColor: appearance.secondary,
        backgroundColor: appearance.background,
        backgroundImageUrl: appearance.cover.replace(/^\/api/, ''),
        isOpen: operation.isOpen,
        deliveryFee: general.deliveryFee,
        deliveryTime: general.deliveryTime,
        minOrderValue: general.minOrderValue,
        autoAcceptOrders: operation.autoAccept,
        autoPrintEnabled: operation.autoPrint,
        autoOpenDelivery: operation.autoOpenDelivery,
        deliveryOpeningTime: operation.deliveryOpeningTime,
        deliveryClosingTime: operation.deliveryClosingTime,
        loyaltyEnabled: loyalty.enabled,
        pointsPerReal: loyalty.pointsPerReal,
        cashbackPercentage: loyalty.cashback,
        videoBanners: appearance.videoBanners,
        metaPixelId: pixels.metaPixelId,
        googleAnalyticsId: pixels.googleAnalyticsId,
        internalPixelId: pixels.internalPixelId,
        operatingHours
      });
      setOriginalSlug(general.slug);
      toast.success('Configurações salvas!');
    } catch (e) { 
      const { toast } = await import('sonner');
      toast.error('Erro ao salvar.'); 
    }
    finally { setIsSaving(false); }
  }, [general, operation, loyalty, pixels, appearance, operatingHours, originalSlug, isSlugAvailable]);

  return {
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
  };
}