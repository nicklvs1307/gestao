import { useState, useEffect, useMemo } from 'react';

interface AppConfig {
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  restaurantCnpj: string;
  restaurantLogo: string;
  selectedRestaurantId: string;
}

function readConfig(): AppConfig {
  return {
    restaurantName: localStorage.getItem('restaurant_name') || 'Minha Loja',
    restaurantAddress: localStorage.getItem('restaurant_address') || '',
    restaurantPhone: localStorage.getItem('restaurant_phone') || '',
    restaurantCnpj: localStorage.getItem('restaurant_cnpj') || '',
    restaurantLogo: localStorage.getItem('restaurant_logo') || '',
    selectedRestaurantId: localStorage.getItem('selectedRestaurantId') || '',
  };
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>(() => readConfig());

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('restaurant_') || e.key === 'selectedRestaurantId') {
        setConfig(readConfig());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const refresh = () => setConfig(readConfig());

  return useMemo(() => ({ ...config, refresh }), [config]);
}

interface PrinterConfig {
  cashierPrinters: string[];
  kitchenPrinters: { id: string; name: string; printer: string }[];
  barPrinters: { id: string; name: string; printer: string }[];
  categoryMapping: Record<string, string>;
}

interface ReceiptSettings {
  showLogo: boolean;
  showAddress: boolean;
  fontSize: 'small' | 'medium' | 'large';
  headerText: string;
  footerText: string;
  itemSpacing?: number;
}

export function usePrinterConfig() {
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(() => {
    const saved = localStorage.getItem('printer_config');
    return saved ? JSON.parse(saved) : { cashierPrinters: [], kitchenPrinters: [], barPrinters: [], categoryMapping: {} };
  });

  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>(() => {
    const saved = localStorage.getItem('receipt_layout') || localStorage.getItem('receipt_settings');
    return saved ? JSON.parse(saved) : { showLogo: true, showAddress: true, fontSize: 'medium', headerText: '', footerText: '' };
  });

  const refresh = () => {
    const savedPrinter = localStorage.getItem('printer_config');
    const savedReceipt = localStorage.getItem('receipt_layout') || localStorage.getItem('receipt_settings');
    if (savedPrinter) setPrinterConfig(JSON.parse(savedPrinter));
    if (savedReceipt) setReceiptSettings(JSON.parse(savedReceipt));
  };

  return useMemo(() => ({ printerConfig, receiptSettings, refresh }), [printerConfig, receiptSettings]);
}
