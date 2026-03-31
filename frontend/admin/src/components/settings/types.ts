// Tipos e interfaces centralizados para Settings
export interface GeneralSettings {
  name: string;
  address: string;
  phone: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  slug: string;
  openingHours: string;
  serviceTax: number;
  deliveryFee: number;
  deliveryTime: string;
  minOrderValue: number;
}

export interface OperationSettings {
  isOpen: boolean;
  autoAccept: boolean;
  autoPrint: boolean;
  autoOpenDelivery: boolean;
  deliveryOpeningTime: string;
  deliveryClosingTime: string;
}

export interface OperatingHour {
  dayOfWeek: number;
  openingTime: string;
  closingTime: string;
  isClosed: boolean;
}

export interface LoyaltySettings {
  enabled: boolean;
  pointsPerReal: number;
  cashback: number;
}

export interface PixelSettings {
  metaPixelId: string;
  googleAnalyticsId: string;
  internalPixelId: string;
}

export interface AppearanceSettings {
  primary: string;
  secondary: string;
  background: string;
  logo: string;
  cover: string;
  videoBanners: string[];
}

export interface SettingsState {
  general: GeneralSettings;
  operation: OperationSettings;
  operatingHours: OperatingHour[];
  loyalty: LoyaltySettings;
  pixels: PixelSettings;
  appearance: AppearanceSettings;
}

export const defaultOperatingHours: OperatingHour[] = [
  { dayOfWeek: 0, openingTime: '18:00', closingTime: '23:00', isClosed: false },
  { dayOfWeek: 1, openingTime: '18:00', closingTime: '23:00', isClosed: false },
  { dayOfWeek: 2, openingTime: '18:00', closingTime: '23:00', isClosed: false },
  { dayOfWeek: 3, openingTime: '18:00', closingTime: '23:00', isClosed: false },
  { dayOfWeek: 4, openingTime: '18:00', closingTime: '23:00', isClosed: false },
  { dayOfWeek: 5, openingTime: '18:00', closingTime: '23:00', isClosed: false },
  { dayOfWeek: 6, openingTime: '00:00', closingTime: '00:00', isClosed: true },
];

export const initialLogo = 'https://via.placeholder.com/150x80.png?text=Sua+Logo';
export const initialBgImage = 'https://via.placeholder.com/800x450.png?text=Fundo+do+Cardapio';

export const initialGeneral: GeneralSettings = {
  name: '', address: '', phone: '', city: '', state: '',
  latitude: '', longitude: '', slug: '', openingHours: '',
  serviceTax: 10, deliveryFee: 0, deliveryTime: '30-40 min', minOrderValue: 0
};

export const initialOperation: OperationSettings = {
  isOpen: false, autoAccept: false, autoPrint: true,
  autoOpenDelivery: false, deliveryOpeningTime: '', deliveryClosingTime: ''
};

export const initialLoyalty: LoyaltySettings = {
  enabled: false, pointsPerReal: 1, cashback: 0
};

export const initialPixels: PixelSettings = {
  metaPixelId: '', googleAnalyticsId: '', internalPixelId: ''
};

export const initialAppearance: AppearanceSettings = {
  primary: '#f97316', secondary: '#0f172a', background: '#f8fafc',
  logo: initialLogo, cover: initialBgImage, videoBanners: []
};