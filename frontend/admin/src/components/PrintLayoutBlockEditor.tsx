import React, { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Eye,
  EyeOff,
  Settings2,
  Plus,
  Trash2,
  Type,
  Hash,
  Printer,
  Scissors,
  Image as ImageIcon,
  AlignLeft,
  MapPin,
  Calendar,
  Hash as HashIcon,
  User,
  LayoutGrid,
  ShoppingBag,
  MessageSquare,
  Calculator,
  CreditCard,
  Banknote,
  FileText,
  QrCode,
  Code,
  ChevronDown,
  ChevronUp,
  LayoutPanelTop,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type {
  PrintLayoutBlock,
  PrintLayoutBlockUpdate,
  PrintLayoutGlobalSettings,
} from '../types/printLayout';

// Icon map for block types
const BLOCK_ICONS: Record<string, React.ElementType> = {
  logo: ImageIcon,
  address: MapPin,
  orderDate: Calendar,
  header: FileText,
  orderNumber: HashIcon,
  customerInfo: User,
  tableInfo: LayoutGrid,
  items: ShoppingBag,
  observations: MessageSquare,
  totals: Calculator,
  payment: CreditCard,
  change: Banknote,
  footer: FileText,
  qrcode: QrCode,
};

function getBlockIcon(blockType: string): React.ElementType {
  if (blockType.startsWith('custom_')) return Code;
  return BLOCK_ICONS[blockType] || FileText;
}

// ─── Sortable Block Item ────────────────────────────────────────────

interface SortableBlockItemProps {
  block: PrintLayoutBlock;
  onToggleVisibility: (blockType: string) => void;
  onOpenSettings: (block: PrintLayoutBlock) => void;
  onRemove: (blockId: string) => void;
}

function SortableBlockItem({ block, onToggleVisibility, onOpenSettings, onRemove }: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.blockType });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = getBlockIcon(block.blockType);
  const isCustom = block.blockType.startsWith('custom_');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 bg-white rounded-xl border transition-all duration-200',
        isDragging
          ? 'border-orange-400 shadow-lg shadow-orange-100 scale-[1.02] z-50'
          : 'border-slate-200 hover:border-slate-300',
        !block.isVisible && 'opacity-50'
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors touch-none"
      >
        <GripVertical size={16} />
      </button>

      {/* Icon */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        block.isVisible ? 'bg-orange-50 text-orange-500' : 'bg-slate-100 text-slate-400'
      )}>
        <Icon size={14} />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-[10px] font-black uppercase tracking-wider truncate',
          block.isVisible ? 'text-slate-800' : 'text-slate-400'
        )}>
          {block.label}
        </p>
        {isCustom && (
          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Customizado</p>
        )}
      </div>

      {/* Individual Font Settings Indicator */}
      {(block.fontSize || block.fontWeight || block.textAlign) && (
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded text-[7px] font-bold text-blue-500 uppercase">
          <Settings2 size={8} />
          Custom
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Visibility Toggle */}
        <button
          onClick={() => onToggleVisibility(block.blockType)}
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
            block.isVisible
              ? 'bg-green-50 text-green-500 hover:bg-green-100'
              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
          )}
          title={block.isVisible ? 'Ocultar bloco' : 'Mostrar bloco'}
        >
          {block.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>

        {/* Settings */}
        <button
          onClick={() => onOpenSettings(block)}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
          title="Configurações do bloco"
        >
          <Settings2 size={12} />
        </button>

        {/* Remove (only custom blocks) */}
        {isCustom && (
          <button
            onClick={() => onRemove(block.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
            title="Remover bloco"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Block Settings Popover ─────────────────────────────────────────

interface BlockSettingsPopoverProps {
  block: PrintLayoutBlock;
  onClose: () => void;
  onSave: (blockType: string, updates: Partial<PrintLayoutBlockUpdate>) => void;
}

function BlockSettingsPopover({ block, onClose, onSave }: BlockSettingsPopoverProps) {
  const [fontSize, setFontSize] = useState(block.fontSize || '');
  const [fontWeight, setFontWeight] = useState(block.fontWeight || '');
  const [fontStyle, setFontStyle] = useState(block.fontStyle || '');
  const [textAlign, setTextAlign] = useState(block.textAlign || '');
  const [customContent, setCustomContent] = useState(block.customContent || '');

  const handleSave = () => {
    onSave(block.blockType, {
      blockType: block.blockType,
      isVisible: block.isVisible,
      order: block.order,
      fontSize: fontSize || null,
      fontWeight: fontWeight || null,
      fontStyle: fontStyle || null,
      textAlign: textAlign || null,
      customContent: customContent || null,
    });
    onClose();
  };

  const isCustom = block.blockType.startsWith('custom_');
  const hasContent = ['header', 'footer', 'custom'].some(t => block.blockType.startsWith(t));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-2">
            <Settings2 size={14} className="text-orange-500" />
            Configurar: {block.label}
          </h3>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Personalize as configurações deste bloco
          </p>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Font Size Override */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
              Tamanho da Fonte (override)
            </label>
            <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
              {['', 'small', 'medium', 'large'].map(size => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={cn(
                    'flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all',
                    fontSize === size
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {size === '' ? 'Padrão' : size === 'small' ? 'P' : size === 'medium' ? 'M' : 'G'}
                </button>
              ))}
            </div>
          </div>

          {/* Font Weight */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
              Peso da Fonte
            </label>
            <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
              {['', 'normal', 'bold'].map(w => (
                <button
                  key={w}
                  onClick={() => setFontWeight(w)}
                  className={cn(
                    'flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all',
                    fontWeight === w
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {w === '' ? 'Padrão' : w === 'normal' ? 'Normal' : 'Negrito'}
                </button>
              ))}
            </div>
          </div>

          {/* Font Style */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
              Estilo da Fonte
            </label>
            <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
              {['', 'normal', 'italic'].map(s => (
                <button
                  key={s}
                  onClick={() => setFontStyle(s)}
                  className={cn(
                    'flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all',
                    fontStyle === s
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {s === '' ? 'Padrão' : s === 'normal' ? 'Reto' : 'Itálico'}
                </button>
              ))}
            </div>
          </div>

          {/* Text Align */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
              Alinhamento
            </label>
            <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
              {['', 'left', 'center', 'right'].map(a => (
                <button
                  key={a}
                  onClick={() => setTextAlign(a)}
                  className={cn(
                    'flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all',
                    textAlign === a
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {a === '' ? 'Padrão' : a === 'left' ? 'Esq' : a === 'center' ? 'Centro' : 'Dir'}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Content (for header, footer, custom blocks) */}
          {hasContent && (
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-orange-600">
                Conteúdo do Bloco
              </label>
              <textarea
                className="w-full h-24 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-bold focus:border-orange-500 outline-none resize-none"
                placeholder={isCustom ? 'Digite o conteúdo ESC/POS ou texto...' : 'Texto personalizado...'}
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Global Settings Panel ──────────────────────────────────────────

interface GlobalSettingsPanelProps {
  settings: PrintLayoutGlobalSettings;
  onChange: (settings: Partial<PrintLayoutGlobalSettings>) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

function GlobalSettingsPanel({ settings, onChange, isExpanded, onToggle }: GlobalSettingsPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center">
            <Type size={14} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-800">
              Configurações Globais
            </p>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
              Fonte, espaçamento e papel
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Font Family */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
              Família da Fonte
            </label>
            <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
              {['monospace', 'sans-serif', 'serif'].map(family => (
                <button
                  key={family}
                  onClick={() => onChange({ fontFamily: family })}
                  className={cn(
                    'flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all',
                    settings.fontFamily === family
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                  style={{ fontFamily: family }}
                >
                  {family === 'monospace' ? 'Mono' : family === 'sans-serif' ? 'Sans' : 'Serif'}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
              Tamanho da Fonte
            </label>
            <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => onChange({ fontSize: size })}
                  className={cn(
                    'flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all',
                    settings.fontSize === size
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {size === 'small' ? 'Pequena' : size === 'medium' ? 'Média' : 'Grande'}
                </button>
              ))}
            </div>
          </div>

          {/* Line Height */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex justify-between mb-2">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                Altura da Linha
              </label>
              <span className="text-[10px] font-black text-orange-600 italic">{settings.lineHeight.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              className="w-full accent-orange-500"
              value={settings.lineHeight}
              onChange={(e) => onChange({ lineHeight: parseFloat(e.target.value) })}
            />
          </div>

          {/* Paper Width */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
              Largura do Papel
            </label>
            <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
              {[58, 72, 80].map(width => (
                <button
                  key={width}
                  onClick={() => onChange({ paperWidth: width })}
                  className={cn(
                    'flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all',
                    settings.paperWidth === width
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {width}mm
                </button>
              ))}
            </div>
          </div>

          {/* Section Spacing */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex justify-between mb-2">
              <div className="flex items-center gap-2">
                <Hash size={12} className="text-slate-400" />
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  Espaço entre Seções
                </label>
              </div>
              <span className="text-[10px] font-black text-orange-600 italic">{settings.sectionSpacing}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              step="2"
              className="w-full accent-orange-500"
              value={settings.sectionSpacing}
              onChange={(e) => onChange({ sectionSpacing: parseInt(e.target.value) })}
            />
          </div>

          {/* Item Spacing */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex justify-between mb-2">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                Espaço entre Itens
              </label>
              <span className="text-[10px] font-black text-orange-600 italic">{settings.itemSpacing}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              className="w-full accent-orange-500"
              value={settings.itemSpacing}
              onChange={(e) => onChange({ itemSpacing: parseInt(e.target.value) })}
            />
          </div>

          {/* Paper Feed */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Scissors size={12} className="text-slate-400" />
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  Linhas antes do Corte
                </label>
              </div>
              <span className="text-[10px] font-black text-orange-600 italic">{settings.paperFeed} linhas</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              className="w-full accent-orange-500"
              value={settings.paperFeed}
              onChange={(e) => onChange({ paperFeed: parseInt(e.target.value) })}
            />
          </div>

          {/* INIT Toggle */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Printer size={12} className="text-slate-400" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  Comando INIT
                </span>
              </div>
              <button
                onClick={() => onChange({ useInit: !settings.useInit })}
                className={cn(
                  'w-10 h-5 rounded-full relative transition-all',
                  settings.useInit ? 'bg-orange-500' : 'bg-slate-300'
                )}
              >
                <div
                  className={cn(
                    'absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm',
                    settings.useInit ? 'left-6' : 'left-1'
                  )}
                />
              </button>
            </div>
            <p className="text-[7px] font-bold text-slate-400 leading-relaxed">
              {settings.useInit
                ? 'Ativado: Reseta a impressora antes de cada impressão.'
                : 'Desativado: Recomendado para evitar desperdício de papel.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Block Button ───────────────────────────────────────────────

interface AddBlockButtonProps {
  onAdd: (label: string) => void;
}

function AddBlockButton({ onAdd }: AddBlockButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  const handleAddCustom = () => {
    if (!customLabel.trim()) return;
    onAdd(customLabel.trim());
    setCustomLabel('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-orange-300 hover:text-orange-500 transition-all"
      >
        <Plus size={14} />
        <span className="text-[9px] font-black uppercase tracking-widest">
          Adicionar Bloco Customizado
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white rounded-xl shadow-xl border border-slate-200 z-10">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            Nome do Bloco
          </label>
          <input
            type="text"
            className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold focus:border-orange-500 outline-none mb-3"
            placeholder="Ex: Informações de Delivery"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setIsOpen(false); setCustomLabel(''); }}
              className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddCustom}
              disabled={!customLabel.trim()}
              className="px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Adicionar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

interface PrintLayoutBlockEditorProps {
  blocks: PrintLayoutBlock[];
  globalSettings: PrintLayoutGlobalSettings;
  isSaving: boolean;
  onUpdateGlobalSettings: (settings: Partial<PrintLayoutGlobalSettings>) => void;
  onUpdateBlocks: (blocks: PrintLayoutBlockUpdate[]) => void;
  onAddCustomBlock: (label: string) => void;
  onRemoveBlock: (blockId: string) => void;
  restaurantName?: string;
  restaurantLogo?: string;
  restaurantAddress?: string;
}

const PrintLayoutBlockEditor: React.FC<PrintLayoutBlockEditorProps> = ({
  blocks,
  globalSettings,
  isSaving,
  onUpdateGlobalSettings,
  onUpdateBlocks,
  onAddCustomBlock,
  onRemoveBlock,
  restaurantName,
  restaurantLogo,
  restaurantAddress,
}) => {
  const [activeSettingsBlock, setActiveSettingsBlock] = useState<PrintLayoutBlock | null>(null);
  const [isGlobalExpanded, setIsGlobalExpanded] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order - b.order),
    [blocks]
  );

  const blockTypes = useMemo(
    () => sortedBlocks.map((b) => b.blockType),
    [sortedBlocks]
  );

  // ─── Drag End Handler ───────────────────────────────────────

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedBlocks.findIndex((b) => b.blockType === active.id);
    const newIndex = sortedBlocks.findIndex((b) => b.blockType === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedBlocks, oldIndex, newIndex);
    const updates: PrintLayoutBlockUpdate[] = reordered.map((block, index) => ({
      blockType: block.blockType,
      isVisible: block.isVisible,
      order: index,
      fontSize: block.fontSize,
      fontWeight: block.fontWeight,
      fontStyle: block.fontStyle,
      textAlign: block.textAlign,
      customContent: block.customContent,
    }));

    onUpdateBlocks(updates);
  };

  // ─── Toggle Visibility ──────────────────────────────────────

  const handleToggleVisibility = (blockType: string) => {
    const updates: PrintLayoutBlockUpdate[] = sortedBlocks.map((block) => ({
      blockType: block.blockType,
      isVisible: block.blockType === blockType ? !block.isVisible : block.isVisible,
      order: block.order,
      fontSize: block.fontSize,
      fontWeight: block.fontWeight,
      fontStyle: block.fontStyle,
      textAlign: block.textAlign,
      customContent: block.customContent,
    }));
    onUpdateBlocks(updates);
  };

  // ─── Save Block Settings ────────────────────────────────────

  const handleSaveBlockSettings = (blockType: string, updates: Partial<PrintLayoutBlockUpdate>) => {
    const fullUpdates: PrintLayoutBlockUpdate[] = sortedBlocks.map((block) => {
      if (block.blockType === blockType) {
        return {
          blockType: block.blockType,
          isVisible: block.isVisible,
          order: block.order,
          ...updates,
        };
      }
      return {
        blockType: block.blockType,
        isVisible: block.isVisible,
        order: block.order,
        fontSize: block.fontSize,
        fontWeight: block.fontWeight,
        fontStyle: block.fontStyle,
        textAlign: block.textAlign,
        customContent: block.customContent,
      };
    });
    onUpdateBlocks(fullUpdates);
  };

  // ─── Font size helper for preview ───────────────────────────

  const getPreviewFontSize = (override?: string | null) => {
    const base = override || globalSettings.fontSize;
    return base === 'small' ? 'text-[10px]' : base === 'medium' ? 'text-[12px]' : 'text-[14px]';
  };

  // ─── Build preview blocks ───────────────────────────────────

  const visibleBlocks = sortedBlocks.filter((b) => b.isVisible);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-6 border-t border-slate-100 pt-8 italic">
      {/* LEFT: CONTROLS */}
      <div className="space-y-6">
        {/* Global Settings */}
        <GlobalSettingsPanel
          settings={globalSettings}
          onChange={onUpdateGlobalSettings}
          isExpanded={isGlobalExpanded}
          onToggle={() => setIsGlobalExpanded(!isGlobalExpanded)}
        />

        {/* Block List */}
        <div>
          <h3 className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-2 mb-4">
            <LayoutPanelTop size={14} className="text-orange-500" />
            Blocos da Comanda
            <span className="text-[8px] font-bold text-slate-400 normal-case tracking-normal">
              (arraste para reordenar)
            </span>
          </h3>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={blockTypes} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sortedBlocks.map((block) => (
                  <SortableBlockItem
                    key={block.blockType}
                    block={block}
                    onToggleVisibility={handleToggleVisibility}
                    onOpenSettings={setActiveSettingsBlock}
                    onRemove={onRemoveBlock}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add Custom Block */}
          <div className="mt-4">
            <AddBlockButton onAdd={onAddCustomBlock} />
          </div>
        </div>

        {/* Saving indicator */}
        {isSaving && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl border border-orange-100">
            <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">
              Salvando...
            </span>
          </div>
        )}
      </div>

      {/* RIGHT: PREVIEW */}
      <div className="flex flex-col items-center">
        <div className="mb-4">
          <h3 className="text-[11px] font-black uppercase text-slate-900 italic flex items-center gap-2">
            <LayoutPanelTop size={14} className="text-orange-500" />
            Simulador de Cupom ({globalSettings.paperWidth}mm)
          </h3>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Prévia aproximada do layout impresso
          </p>
        </div>

        <div
          className="bg-white shadow-2xl rounded-sm p-6 border-t-[10px] border-slate-200 border-dashed relative overflow-hidden min-h-[500px]"
          style={{
            fontFamily: globalSettings.fontFamily,
            lineHeight: globalSettings.lineHeight,
            width: globalSettings.paperWidth === 58 ? '240px' : globalSettings.paperWidth === 72 ? '280px' : '320px',
          }}
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 transform rotate-45 translate-x-12 -translate-y-12" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: `${globalSettings.sectionSpacing}px` }}>
            {visibleBlocks.map((block) => {
              const Icon = getBlockIcon(block.blockType);
              const fontWeight = block.fontWeight || 'normal';
              const fontStyle = block.fontStyle || 'normal';
              const textAlign = block.textAlign || 'center';

              return (
                <div
                  key={block.blockType}
                  style={{
                    fontWeight: fontWeight as React.CSSProperties['fontWeight'],
                    fontStyle: fontStyle as React.CSSProperties['fontStyle'],
                    textAlign: textAlign as React.CSSProperties['textAlign'],
                  }}
                >
                  {block.blockType === 'logo' && restaurantLogo && (
                    <div className="flex justify-center mb-2">
                      <img src={restaurantLogo} alt="Logo" className="h-16 w-auto grayscale opacity-80" />
                    </div>
                  )}

                  {block.blockType === 'address' && (
                    <div>
                      <p className={cn('font-black uppercase leading-tight', getPreviewFontSize(block.fontSize))}>
                        {restaurantName || 'SEU RESTAURANTE'}
                      </p>
                      {restaurantAddress && (
                        <p className="text-[9px] text-slate-500 leading-tight uppercase mt-1">
                          {restaurantAddress}
                        </p>
                      )}
                    </div>
                  )}

                  {block.blockType === 'orderDate' && (
                    <p className="text-[9px] text-slate-500 font-bold uppercase">
                      {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}

                  {block.blockType === 'header' && block.customContent && (
                    <div className="border-y border-dashed border-slate-300 py-2">
                      <p className={cn('font-black italic uppercase leading-tight', getPreviewFontSize(block.fontSize))}>
                        {block.customContent}
                      </p>
                    </div>
                  )}

                  {block.blockType === 'orderNumber' && (
                    <div className="text-left space-y-1">
                      <div className={cn('flex justify-between font-black border-b border-slate-100 pb-1', getPreviewFontSize(block.fontSize))}>
                        <span>MESA 05</span>
                        <span>#1234</span>
                      </div>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                        Atendente: Lucas N.
                      </p>
                    </div>
                  )}

                  {block.blockType === 'customerInfo' && (
                    <div className="text-left text-[9px] text-slate-500 space-y-0.5">
                      <p className="font-bold uppercase">Cliente: João Silva</p>
                      <p className="uppercase">Tel: (11) 99999-9999</p>
                    </div>
                  )}

                  {block.blockType === 'tableInfo' && (
                    <div className="text-center">
                      <p className={cn('font-black uppercase', getPreviewFontSize(block.fontSize))}>
                        MESA 05
                      </p>
                    </div>
                  )}

                  {block.blockType === 'items' && (
                    <div className="text-left space-y-2 border-b border-dashed border-slate-300 pb-4">
                      {[
                        { qty: 2, name: 'Hambúrguer Gourmet', price: '70.00' },
                        { qty: 1, name: 'Coca-Cola 350ml', price: '7.00' },
                      ].map((item, i) => (
                        <div key={i} style={{ marginBottom: `${globalSettings.itemSpacing}px` }}>
                          <div className="flex justify-between items-start">
                            <span className={cn('font-black uppercase leading-none', getPreviewFontSize(block.fontSize))}>
                              {item.qty}x {item.name}
                            </span>
                            <span className="text-[10px] font-bold">{item.price}</span>
                          </div>
                          <p className="text-[8px] font-bold text-slate-500 italic ml-4 leading-tight uppercase tracking-tight">
                            (!) SEM CEBOLA E COM BACON EXTRA
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {block.blockType === 'observations' && (
                    <div className="text-left text-[9px] text-slate-500 italic">
                      <p className="font-bold uppercase">Obs: Sem cebola, bem passado</p>
                    </div>
                  )}

                  {block.blockType === 'totals' && (
                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span>SUBTOTAL:</span>
                        <span>R$ 77.00</span>
                      </div>
                      <div className="flex justify-between text-[12px] font-black border-t border-slate-200 pt-1">
                        <span>TOTAL:</span>
                        <span>R$ 77.00</span>
                      </div>
                    </div>
                  )}

                  {block.blockType === 'payment' && (
                    <div className="text-left text-[9px] text-slate-500 space-y-0.5">
                      <p className="font-bold uppercase">Pagamento: Dinheiro</p>
                    </div>
                  )}

                  {block.blockType === 'change' && (
                    <div className="text-left text-[9px] text-slate-500">
                      <p className="font-bold uppercase">Troco para: R$ 100,00</p>
                      <p className="font-bold uppercase">Troco: R$ 23,00</p>
                    </div>
                  )}

                  {block.blockType === 'footer' && block.customContent && (
                    <div className="pt-4">
                      <p className={cn('font-black italic uppercase leading-tight', getPreviewFontSize(block.fontSize))}>
                        {block.customContent}
                      </p>
                    </div>
                  )}

                  {block.blockType === 'qrcode' && (
                    <div className="flex justify-center">
                      <div className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center">
                        <QrCode size={32} className="text-slate-400" />
                      </div>
                    </div>
                  )}

                  {block.blockType.startsWith('custom_') && (
                    <div className="text-left text-[9px] text-slate-500 italic">
                      <p>{block.customContent || '[Conteúdo customizado]'}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer branding */}
          <div className="pt-6 mt-4 border-t border-dashed border-slate-200">
            <div className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em] text-center">
              KICARDAPIO@
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-50 to-transparent" />
        </div>

        <p className="text-[8px] font-bold text-slate-300 uppercase italic mt-4">
          * Layout meramente ilustrativo
        </p>
      </div>

      {/* Block Settings Modal */}
      {activeSettingsBlock && (
        <BlockSettingsPopover
          block={activeSettingsBlock}
          onClose={() => setActiveSettingsBlock(null)}
          onSave={handleSaveBlockSettings}
        />
      )}
    </div>
  );
};

export default PrintLayoutBlockEditor;
