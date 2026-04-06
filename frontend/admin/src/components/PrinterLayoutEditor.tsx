import React from 'react';
import { cn } from '../lib/utils';
import { Type, Image as ImageIcon, AlignLeft, LayoutPanelTop, LayoutPanelLeft, Hash, Printer, Scissors } from 'lucide-react';

export interface ReceiptLayout {
    showLogo: boolean;
    showAddress: boolean;
    showOrderDate: boolean;
    fontSize: 'small' | 'medium' | 'large';
    headerText: string;
    footerText: string;
    itemSpacing: number; // 0 a 10
    paperFeed: number; // Linhas para avançar antes do corte (0-10)
    useInit: boolean; // Usar comando INIT ao iniciar impressão
}

interface Props {
    layout: ReceiptLayout;
    onChange: (layout: ReceiptLayout) => void;
    restaurantName?: string;
    restaurantLogo?: string;
    restaurantAddress?: string;
}

const PrinterLayoutEditor: React.FC<Props> = ({ layout, onChange, restaurantName, restaurantLogo, restaurantAddress }) => {
    
    const updateField = (field: keyof ReceiptLayout, value: any) => {
        onChange({ ...layout, [field]: value });
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-6 border-t border-slate-100 pt-8 italic">
            {/* CONTROLES */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-2 mb-4">
                        <LayoutPanelTop size={14} className="text-orange-500" /> Personalização Visual
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Toggle Logo */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ImageIcon size={16} className="text-slate-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Exibir Logotipo</span>
                            </div>
                            <button 
                                onClick={() => updateField('showLogo', !layout.showLogo)}
                                className={cn("w-10 h-5 rounded-full relative transition-all", layout.showLogo ? "bg-orange-500" : "bg-slate-300")}
                            >
                                <div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", layout.showLogo ? "left-6" : "left-1")} />
                            </button>
                        </div>

                        {/* Toggle Endereço */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlignLeft size={16} className="text-slate-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Exibir Endereço</span>
                            </div>
                            <button 
                                onClick={() => updateField('showAddress', !layout.showAddress)}
                                className={cn("w-10 h-5 rounded-full relative transition-all", layout.showAddress ? "bg-orange-500" : "bg-slate-300")}
                            >
                                <div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", layout.showAddress ? "left-6" : "left-1")} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-2">
                        <Type size={14} className="text-orange-500" /> Tipografia e Textos
                    </h3>
                    
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tamanho da Fonte Geral</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                                {(['small', 'medium', 'large'] as const).map(size => (
                                    <button 
                                        key={size}
                                        onClick={() => updateField('fontSize', size)}
                                        className={cn(
                                            "flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                                            layout.fontSize === size ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {size === 'small' ? 'Pequena' : size === 'medium' ? 'Média' : 'Grande'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-orange-600 leading-none">Texto de Cabeçalho (Opcional)</label>
                            <textarea 
                                className="w-full h-20 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-bold focus:border-orange-500 outline-none resize-none"
                                placeholder="Ex: SEJA BEM VINDO AO NOSSO RESTAURANTE!"
                                value={layout.headerText}
                                onChange={e => updateField('headerText', e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-orange-600 leading-none">Texto de Rodapé / Agradecimento</label>
                            <textarea 
                                className="w-full h-20 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-bold focus:border-orange-500 outline-none resize-none"
                                placeholder="Ex: OBRIGADO PELA PREFERÊNCIA! VOLTE SEMPRE."
                                value={layout.footerText}
                                onChange={e => updateField('footerText', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-2">
                        <Hash size={14} className="text-orange-500" /> Espaçamentos
                    </h3>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex justify-between mb-2">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Espaçamento entre Itens</label>
                            <span className="text-[10px] font-black text-orange-600 italic">{layout.itemSpacing}px</span>
                        </div>
                        <input 
                            type="range" min="0" max="10" step="1"
                            className="w-full accent-orange-500"
                            value={layout.itemSpacing}
                            onChange={e => updateField('itemSpacing', parseInt(e.target.value))}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-2">
                        <Printer size={14} className="text-orange-500" /> Configurações da Impressora
                    </h3>
                    
                    <div className="space-y-3">
                        {/* Toggle INIT */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <Printer size={16} className="text-slate-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Comando INIT</span>
                                </div>
                                <button 
                                    onClick={() => updateField('useInit', !layout.useInit)}
                                    className={cn("w-10 h-5 rounded-full relative transition-all", layout.useInit ? "bg-orange-500" : "bg-slate-300")}
                                >
                                    <div className={cn("absolute w-3 h-3 bg-white rounded-full top-1 transition-all shadow-sm", layout.useInit ? "left-6" : "left-1")} />
                                </button>
                            </div>
                            <p className="text-[8px] font-bold text-slate-400 leading-relaxed">
                                {layout.useInit 
                                    ? 'Ativado: Reseta a impressora antes de cada impressão. Pode causar avanço excessivo em alguns modelos.'
                                    : 'Desativado: Recomendado para evitar desperdício de papel na maioria das impressoras.'
                                }
                            </p>
                        </div>

                        {/* Paper Feed Slider */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Scissors size={14} className="text-slate-400" />
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Linhas antes do Corte</label>
                                </div>
                                <span className="text-[10px] font-black text-orange-600 italic">{layout.paperFeed} linhas</span>
                            </div>
                            <input 
                                type="range" min="0" max="10" step="1"
                                className="w-full accent-orange-500"
                                value={layout.paperFeed}
                                onChange={e => updateField('paperFeed', parseInt(e.target.value))}
                            />
                            <p className="text-[8px] font-bold text-slate-400 mt-2 leading-relaxed">
                                {layout.paperFeed === 0 
                                    ? 'Sem avanço. Corte imediato após o conteúdo.'
                                    : layout.paperFeed <= 3
                                    ? 'Avanço mínimo. Ideal para a maioria das impressoras.'
                                    : 'Avanço maior. Use apenas se sua impressora precisar de mais espaço.'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* PREVIEW / SIMULADOR */}
            <div className="flex flex-col items-center">
                <div className="mb-4">
                    <h3 className="text-[11px] font-black uppercase text-slate-900 italic flex items-center gap-2">
                        <LayoutPanelLeft size={14} className="text-orange-500" /> Simulador de Cupom (80mm)
                    </h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Prévia aproximada do layout impresso</p>
                </div>

                <div className="w-[320px] bg-white shadow-2xl rounded-sm p-6 border-t-[10px] border-slate-200 border-dashed relative overflow-hidden font-mono min-h-[500px]">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 transform rotate-45 translate-x-12 -translate-y-12" />
                    
                    {/* Conteúdo do Cupom */}
                    <div className="space-y-4 text-center">
                        {layout.showLogo && restaurantLogo && (
                            <div className="flex justify-center mb-4">
                                <img src={restaurantLogo} alt="Logo" className="h-16 w-auto grayscale opacity-80" />
                            </div>
                        )}

                        <div className="space-y-1">
                            <h4 className="text-sm font-black uppercase leading-tight">{restaurantName || 'SEU RESTAURANTE'}</h4>
                            {layout.showAddress && restaurantAddress && (
                                <p className="text-[9px] text-slate-500 leading-tight uppercase px-4">{restaurantAddress}</p>
                            )}
                        </div>

                        {layout.headerText && (
                            <div className="border-y border-dashed border-slate-300 py-2">
                                <p className="text-[10px] font-black italic uppercase leading-tight">{layout.headerText}</p>
                            </div>
                        )}

                        <div className="text-left py-2 space-y-1">
                            <div className="flex justify-between text-[11px] font-black border-b border-slate-100 pb-1">
                                <span>MESA 05</span>
                                <span>#1234</span>
                            </div>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Atendente: Lucas N.</p>
                        </div>

                        {/* Lista de Itens Simulada */}
                        <div className="text-left space-y-2 border-b border-dashed border-slate-300 pb-4">
                            {[
                                { qty: 2, name: 'Hambúrguer Gourmet', price: '70.00' },
                                { qty: 1, name: 'Coca-Cola 350ml', price: '7.00' }
                            ].map((item, i) => (
                                <div key={i} style={{ marginBottom: `${layout.itemSpacing}px` }}>
                                    <div className="flex justify-between items-start">
                                        <span className={cn(
                                            "font-black uppercase leading-none",
                                            layout.fontSize === 'small' ? 'text-[10px]' : layout.fontSize === 'medium' ? 'text-[12px]' : 'text-[14px]'
                                        )}>
                                            {item.qty}x {item.name}
                                        </span>
                                        <span className="text-[10px] font-bold">{item.price}</span>
                                    </div>
                                    <p className="text-[8px] font-bold text-slate-500 italic ml-4 leading-tight uppercase tracking-tight">(!) SEM CEBOLA E COM BACON EXTRA</p>
                                </div>
                            ))}
                        </div>

                        {/* Totais */}
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

                        {/* Rodapé */}
                        <div className="pt-6 space-y-2">
                            {layout.footerText && (
                                <p className="text-[10px] font-black italic uppercase leading-tight">{layout.footerText}</p>
                            )}
                            <div className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em]">
                                KICARDAPIO@
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-50 to-transparent" />
                </div>
                
                <p className="text-[8px] font-bold text-slate-300 uppercase italic mt-4">* Layout meramente ilustrativo</p>
            </div>
        </div>
    );
};

export default PrinterLayoutEditor;
