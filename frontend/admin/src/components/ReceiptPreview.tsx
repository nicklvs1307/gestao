import React, { useMemo } from 'react';
import { cn } from '../lib/utils';
import type {
  PrintLayoutConfig,
  PrintLayoutBlock,
  PrintLayoutGlobalSettings,
  PrintLayoutType,
} from '../types/printLayout';
import {
  Truck,
  ShoppingBag,
  Armchair,
  Receipt,
} from 'lucide-react';

interface ReceiptPreviewProps {
  layout: PrintLayoutConfig;
  blocks: PrintLayoutBlock[];
  globalSettings: PrintLayoutGlobalSettings;
  layoutType: PrintLayoutType;
  restaurantName?: string;
  restaurantLogo?: string;
  restaurantAddress?: string;
}

// Mock order data for preview
const MOCK_ORDERS: Record<PrintLayoutType, {
  orderNumber: string;
  date: string;
  time: string;
  table?: string;
  waiter?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  neighborhood?: string;
  deliveryFee?: string;
  estimatedTime?: string;
  pickupTime?: string;
  items: Array<{ qty: number; name: string; price: string; observation?: string }>;
  subtotal: string;
  total: string;
  paymentMethod: string;
}> = {
  delivery: {
    orderNumber: '#12345',
    date: '04/06/2026',
    time: '19:30',
    customerName: 'João Silva',
    customerPhone: '(11) 99999-9999',
    customerAddress: 'Rua das Flores, 123 - Apt 42',
    neighborhood: 'Centro - São Paulo/SP',
    deliveryFee: 'R$ 8,00',
    estimatedTime: '40-60 min',
    items: [
      { qty: 2, name: 'Hambúrguer Gourmet', price: 'R$ 70,00', observation: 'SEM CEBOLA E COM BACON EXTRA' },
      { qty: 1, name: 'Coca-Cola 350ml', price: 'R$ 7,00' },
      { qty: 1, name: 'Batata Frita Grande', price: 'R$ 22,00' },
    ],
    subtotal: 'R$ 99,00',
    total: 'R$ 107,00',
    paymentMethod: 'Cartão de Crédito',
  },
  pickup: {
    orderNumber: '#12346',
    date: '04/06/2026',
    time: '19:45',
    customerName: 'Maria Santos',
    customerPhone: '(11) 98888-8888',
    pickupTime: '20:15',
    items: [
      { qty: 1, name: 'Pizza Margherita', price: 'R$ 45,00' },
      { qty: 2, name: 'Suco Natural 500ml', price: 'R$ 18,00' },
    ],
    subtotal: 'R$ 63,00',
    total: 'R$ 63,00',
    paymentMethod: 'Pix',
  },
  table: {
    orderNumber: '#12347',
    date: '04/06/2026',
    time: '20:00',
    table: 'MESA 05',
    waiter: 'Lucas N.',
    customerName: 'Cliente Mesa',
    customerPhone: '',
    items: [
      { qty: 2, name: 'Hambúrguer Gourmet', price: 'R$ 70,00', observation: 'MAL PASSADO' },
      { qty: 1, name: 'Guaraná 350ml', price: 'R$ 6,00' },
      { qty: 1, name: 'Sorvete Chocolate', price: 'R$ 15,00' },
    ],
    subtotal: 'R$ 91,00',
    total: 'R$ 91,00',
    paymentMethod: 'Dinheiro',
  },
};

// Helper to format paper width to pixels
const formatPaperWidth = (width: number): string => {
  switch (width) {
    case 58: return '220px';
    case 72: return '270px';
    case 80: default: return '320px';
  }
};

// Helper to get font size class
const getFontSizeClass = (size?: string | null, global?: string): string => {
  const s = size || global || 'medium';
  switch (s) {
    case 'small': return 'text-[9px]';
    case 'large': return 'text-[13px]';
    default: return 'text-[11px]';
  }
};

// Helper to get font weight
const getFontWeight = (weight?: string | null): string => {
  return weight === 'bold' ? 'font-black' : 'font-normal';
};

// Helper to get font style
const getFontStyle = (style?: string | null): string => {
  return style === 'italic' ? 'italic' : '';
};

// Helper to get text alignment
const getTextAlign = (align?: string | null): string => {
  switch (align) {
    case 'left': return 'text-left';
    case 'right': return 'text-right';
    case 'center': default: return 'text-center';
  }
};

// Receipt line component
const ReceiptLine: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('leading-tight', className)}>
    {children}
  </div>
);

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
  layout,
  blocks,
  globalSettings,
  layoutType,
  restaurantName = 'SEU RESTAURANTE',
  restaurantLogo,
  restaurantAddress,
}) => {
  const mockOrder = MOCK_ORDERS[layoutType];
  const visibleBlocks = useMemo(() => 
    [...blocks].filter(b => b.isVisible).sort((a, b) => a.order - b.order),
    [blocks]
  );

  // Type icon and label
  const typeConfig = {
    delivery: { icon: Truck, label: 'DELIVERY', color: 'text-blue-500' },
    pickup: { icon: ShoppingBag, label: 'RETIRADA', color: 'text-emerald-500' },
    table: { icon: Armchair, label: 'MESA', color: 'text-orange-500' },
  };

  const TypeIcon = typeConfig[layoutType].icon;

  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="mb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <TypeIcon size={14} className={typeConfig[layoutType].color} />
          <h3 className="text-[11px] font-black uppercase text-slate-900 italic">
            Preview - {typeConfig[layoutType].label}
          </h3>
        </div>
        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
          Simulador de Cupom ({globalSettings.paperWidth}mm)
        </p>
      </div>

      {/* Receipt Paper */}
      <div
        className="bg-white shadow-2xl rounded-sm border-t-[8px] border-slate-200 border-dashed relative overflow-hidden"
        style={{
          fontFamily: globalSettings.fontFamily,
          lineHeight: globalSettings.lineHeight,
          width: formatPaperWidth(globalSettings.paperWidth),
          minHeight: '400px',
        }}
      >
        {/* Paper texture overlay */}
        <div className="absolute top-0 right-0 w-12 h-12 bg-slate-50 transform rotate-45 translate-x-8 -translate-y-8" />
        
        {/* Content */}
        <div className="p-4 space-y-3">
          {visibleBlocks.map((block) => {
            const fontSize = getFontSizeClass(block.fontSize, globalSettings.fontSize);
            const fontWeight = getFontWeight(block.fontWeight);
            const fontStyle = getFontStyle(block.fontStyle);
            const textAlign = getTextAlign(block.textAlign);

            return (
              <div
                key={block.id}
                className={cn(fontSize, fontWeight, fontStyle, textAlign)}
              >
                {/* Logo Block */}
                {block.blockType === 'logo' && restaurantLogo && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={restaurantLogo}
                      alt="Logo"
                      className="h-12 w-auto grayscale opacity-80"
                    />
                  </div>
                )}

                {/* Address Block (Header with restaurant info) */}
                {block.blockType === 'address' && (
                  <ReceiptLine className="text-center">
                    <p className="font-black uppercase tracking-tight text-[12px]">
                      {restaurantName}
                    </p>
                    {restaurantAddress && (
                      <p className="text-[8px] text-slate-500 mt-0.5">
                        {restaurantAddress}
                      </p>
                    )}
                  </ReceiptLine>
                )}

                {/* Order Date */}
                {block.blockType === 'orderDate' && (
                  <ReceiptLine className="text-center">
                    <p className="text-[9px] text-slate-500 font-bold">
                      {mockOrder.date} {mockOrder.time}
                    </p>
                  </ReceiptLine>
                )}

                {/* Header Custom Text */}
                {block.blockType === 'header' && block.customContent && (
                  <ReceiptLine className="text-center border-y border-dashed border-slate-300 py-1">
                    <p className="font-black italic uppercase">
                      {block.customContent}
                    </p>
                  </ReceiptLine>
                )}

                {/* Order Number */}
                {block.blockType === 'orderNumber' && (
                  <ReceiptLine className="text-left">
                    <div className="flex justify-between font-black border-b border-slate-100 pb-1">
                      <span>
                        {layoutType === 'table' ? mockOrder.table : typeConfig[layoutType].label}
                      </span>
                      <span>{mockOrder.orderNumber}</span>
                    </div>
                    {mockOrder.waiter && (
                      <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">
                        Garçom: {mockOrder.waiter}
                      </p>
                    )}
                  </ReceiptLine>
                )}

                {/* Customer Info */}
                {block.blockType === 'customerInfo' && (
                  <ReceiptLine className="text-left text-[9px] text-slate-500">
                    <p className="font-bold uppercase">Cliente: {mockOrder.customerName}</p>
                    <p className="uppercase">Tel: {mockOrder.customerPhone}</p>
                  </ReceiptLine>
                )}

                {/* Table Info */}
                {block.blockType === 'tableInfo' && mockOrder.table && (
                  <ReceiptLine className="text-center">
                    <p className="font-black uppercase text-[13px]">
                      {mockOrder.table}
                    </p>
                    {mockOrder.waiter && (
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        Garçom: {mockOrder.waiter}
                      </p>
                    )}
                  </ReceiptLine>
                )}

                {/* Delivery Info */}
                {block.blockType === 'deliveryInfo' && (
                  <ReceiptLine className="text-left text-[9px] text-slate-500">
                    <p className="font-bold uppercase text-blue-600">
                      <Truck size={10} className="inline mr-1" />
                      ENTREGA
                    </p>
                    {mockOrder.customerAddress && (
                      <p className="mt-0.5">{mockOrder.customerAddress}</p>
                    )}
                    {mockOrder.neighborhood && (
                      <p>{mockOrder.neighborhood}</p>
                    )}
                    {mockOrder.estimatedTime && (
                      <p className="font-bold text-blue-600 mt-1">
                        Tempo estimado: {mockOrder.estimatedTime}
                      </p>
                    )}
                  </ReceiptLine>
                )}

                {/* Pickup Info */}
                {block.blockType === 'pickupInfo' && (
                  <ReceiptLine className="text-left text-[9px] text-slate-500">
                    <p className="font-bold uppercase text-emerald-600">
                      <ShoppingBag size={10} className="inline mr-1" />
                      RETIRADA
                    </p>
                    {mockOrder.pickupTime && (
                      <p className="font-bold text-emerald-600 mt-1">
                        Horário previsto: {mockOrder.pickupTime}
                      </p>
                    )}
                  </ReceiptLine>
                )}

                {/* Items */}
                {block.blockType === 'items' && (
                  <ReceiptLine className="text-left space-y-2 border-b border-dashed border-slate-300 pb-2">
                    {mockOrder.items.map((item, i) => (
                      <div key={i} style={{ marginBottom: `${globalSettings.itemSpacing}px` }}>
                        <div className="flex justify-between items-start">
                          <span className="font-black uppercase leading-none">
                            {item.qty}x {item.name}
                          </span>
                          <span className="text-[10px] font-bold">{item.price}</span>
                        </div>
                        {item.observation && (
                          <p className="text-[8px] font-bold text-slate-500 italic ml-3 leading-tight uppercase">
                            (!) {item.observation}
                          </p>
                        )}
                      </div>
                    ))}
                  </ReceiptLine>
                )}

                {/* Observations */}
                {block.blockType === 'observations' && (
                  <ReceiptLine className="text-left text-[9px] text-slate-500 italic">
                    <p className="font-bold uppercase">Obs: Sem cebola, bem passado</p>
                  </ReceiptLine>
                )}

                {/* Totals */}
                {block.blockType === 'totals' && (
                  <ReceiptLine className="text-left space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span>SUBTOTAL:</span>
                      <span>{mockOrder.subtotal}</span>
                    </div>
                    {mockOrder.deliveryFee && (
                      <div className="flex justify-between text-[10px] font-bold text-blue-600">
                        <span>TAXA ENTREGA:</span>
                        <span>{mockOrder.deliveryFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[12px] font-black border-t border-slate-200 pt-1">
                      <span>TOTAL:</span>
                      <span>{mockOrder.total}</span>
                    </div>
                  </ReceiptLine>
                )}

                {/* Payment */}
                {block.blockType === 'payment' && (
                  <ReceiptLine className="text-left text-[9px] text-slate-500">
                    <p className="font-bold uppercase">
                      Pagamento: {mockOrder.paymentMethod}
                    </p>
                  </ReceiptLine>
                )}

                {/* Change */}
                {block.blockType === 'change' && (
                  <ReceiptLine className="text-left text-[9px] text-slate-500">
                    <p className="font-bold uppercase">Troco para: R$ 150,00</p>
                    <p className="font-bold uppercase">Troco: R$ 43,00</p>
                  </ReceiptLine>
                )}

                {/* Footer */}
                {block.blockType === 'footer' && block.customContent && (
                  <ReceiptLine className="text-center pt-2">
                    <p className="font-black italic uppercase">
                      {block.customContent}
                    </p>
                  </ReceiptLine>
                )}

                {/* QR Code */}
                {block.blockType === 'qrcode' && (
                  <ReceiptLine className="flex justify-center">
                    <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center">
                      <Receipt size={24} className="text-slate-500" />
                    </div>
                  </ReceiptLine>
                )}

                {/* Custom Block */}
                {block.blockType.startsWith('custom_') && (
                  <ReceiptLine className="text-left text-[9px] text-slate-500 italic">
                    <p>{block.customContent || '[Conteúdo customizado]'}</p>
                  </ReceiptLine>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer branding */}
        <div className="pt-4 mt-2 border-t border-dashed border-slate-200 px-4">
          <div className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.3em] text-center">
            KICARDAPIO@
          </div>
        </div>

        {/* Paper end gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-50 to-transparent" />
      </div>

      {/* Legend */}
      <p className="text-[8px] font-bold text-slate-500 uppercase italic mt-3">
        * Layout meramente ilustrativo
      </p>
    </div>
  );
};
