// Types for the modular print layout system

export interface PrintLayoutConfig {
  id: string;
  restaurantId: string;
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
  lineHeight: number;
  paperWidth: number;
  sectionSpacing: number;
  itemSpacing: number;
  paperFeed: number;
  useInit: boolean;
  createdAt: string;
  updatedAt: string;
  blocks: PrintLayoutBlock[];
}

export interface PrintLayoutBlock {
  id: string;
  layoutId: string;
  blockType: string;
  label: string;
  isVisible: boolean;
  order: number;
  fontSize?: string | null;
  fontWeight?: string | null;
  fontStyle?: string | null;
  textAlign?: string | null;
  customContent?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrintLayoutGlobalSettings {
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
  lineHeight: number;
  paperWidth: number;
  sectionSpacing: number;
  itemSpacing: number;
  paperFeed: number;
  useInit: boolean;
}

export interface PrintLayoutBlockUpdate {
  blockType: string;
  isVisible: boolean;
  order: number;
  fontSize?: string | null;
  fontWeight?: string | null;
  fontStyle?: string | null;
  textAlign?: string | null;
  customContent?: string | null;
}

export interface PrintLayoutBlockType {
  type: string;
  label: string;
  defaultOrder: number;
}

export interface PrintLayoutMigrationData {
  globalSettings: Partial<PrintLayoutGlobalSettings>;
  blocks: {
    blockType: string;
    label: string;
    isVisible: boolean;
    order: number;
    fontSize?: string | null;
    fontWeight?: string | null;
    fontStyle?: string | null;
    textAlign?: string | null;
    customContent?: string | null;
  }[];
}

// Legacy types for localStorage migration
export interface LegacyReceiptSettings {
  showLogo?: boolean;
  showAddress?: boolean;
  showOrderDate?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  headerText?: string;
  footerText?: string;
  itemSpacing?: number;
  paperFeed?: number;
  useInit?: boolean;
}
