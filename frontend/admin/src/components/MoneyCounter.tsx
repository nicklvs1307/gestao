import React, { useState, useEffect, memo, useCallback } from 'react';
import { Banknote, Coins, X, Check, Calculator, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MoneyCounterProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (total: number, details: Record<string, number>) => void;
    initialDetails?: Record<string, number>;
}

const BILLS = [200, 100, 50, 20, 10, 5, 2];
const COINS = [1, 0.50, 0.25, 0.10, 0.05];

const MoneyCounter: React.FC<MoneyCounterProps> = memo(({ isOpen, onClose, onConfirm, initialDetails }) => {
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [confirmData, setConfirmData] = useState<{open: boolean, title: string, message: string, onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});

    useEffect(() => {
        if (isOpen && initialDetails) {
            setCounts(initialDetails);
        } else if (isOpen) {
            setCounts({});
        }
    }, [isOpen, initialDetails]);

    const handleCountChange = useCallback((value: number, count: string) => {
        const qty = parseInt(count) || 0;
        setCounts(prev => ({ ...prev, [value.toString()]: qty }));
    }, []);

    const getTotal = useCallback(() => {
        let total = 0;
        Object.entries(counts).forEach(([val, qty]) => {
            total += parseFloat(val) * qty;
        });
        return total;
    }, [counts]);

    const handleConfirm = useCallback(() => {
        onConfirm(getTotal(), counts);
        onClose();
    }, [onConfirm, getTotal, counts, onClose]);

    const clearAll = useCallback(() => {
        setConfirmData({open: true, title: 'Confirmar', message: 'Limpar toda a contagem?', onConfirm: () => {
            setCounts({});
            setConfirmData(prev => ({...prev, open: false}));
        }});
    }, []);

    const handleCloseClick = useCallback(() => onClose(), [onClose]);
    const handleClearClick = useCallback(() => clearAll(), [clearAll]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200"
                >
                    {/* HEADER */}
                    <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg">
                                <Calculator size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter italic">Conferência de Numerário</h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none mt-1">Contagem física de cédulas e moedas</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleClearClick} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Limpar Tudo"><Trash2 size={18}/></button>
                            <button onClick={handleCloseClick} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"><X size={22}/></button>
                        </div>
                    </header>

                    {/* CONTEÚDO */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            
                            {/* CÉDULAS */}
                            <section className="space-y-2">
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Banknote size={16}/></div>
                                    <h4 className="text-[11px] font-black uppercase text-slate-600 tracking-widest italic">Cédulas</h4>
                                    <div className="flex-1 h-px bg-slate-200 ml-2"></div>
                                </div>
                                
                                <div className="space-y-2">
                                    {BILLS.map(bill => (
                                        <div key={bill} className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition-all">
                                            <div className="flex items-center gap-2 w-24">
                                                <span className="text-xs font-black text-slate-900">R$ {bill},00</span>
                                            </div>
                                            
                                            <div className="flex-1 max-w-[80px]">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg text-center text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                                    value={counts[bill.toString()] || ''}
                                                    onChange={(e) => handleCountChange(bill, e.target.value)}
                                                    placeholder="0"
                                                />
                                            </div>

                                            <div className="w-20 text-right">
                                                <p className="text-xs font-bold text-emerald-600">
                                                    R$ {((counts[bill.toString()] || 0) * bill).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* MOEDAS */}
                            <section className="space-y-2">
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><Coins size={16}/></div>
                                    <h4 className="text-[11px] font-black uppercase text-slate-600 tracking-widest italic">Moedas</h4>
                                    <div className="flex-1 h-px bg-slate-200 ml-2"></div>
                                </div>
                                
                                <div className="space-y-2">
                                    {COINS.map(coin => (
                                        <div key={coin} className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-amber-300 transition-all">
                                            <div className="flex items-center gap-2 w-24">
                                                <span className="text-xs font-black text-slate-900">R$ {coin.toFixed(2)}</span>
                                            </div>
                                            
                                            <div className="flex-1 max-w-[80px]">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg text-center text-sm font-bold text-slate-900 focus:bg-white focus:border-amber-500 outline-none transition-all"
                                                    value={counts[coin.toString()] || ''}
                                                    onChange={(e) => handleCountChange(coin, e.target.value)}
                                                    placeholder="0"
                                                />
                                            </div>

                                            <div className="w-20 text-right">
                                                <p className="text-xs font-bold text-amber-600">
                                                    R$ {((counts[coin.toString()] || 0) * coin).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                        
                        {/* RESUMO */}
                        <div className="mt-6 p-4 bg-slate-900 rounded-xl text-white">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total de Unidades</p>
                                    <p className="text-lg font-black">{Object.values(counts).reduce((a, b) => a + (b || 0), 0)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase">Valor Total</p>
                                    <p className="text-2xl font-black text-emerald-400">R$ {getTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                            <Button onClick={handleConfirm} fullWidth className="h-11 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-lg">
                                <Check size={18} className="mr-2"/> Confirmar
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>

            <ConfirmDialog
                isOpen={confirmData.open}
                onClose={() => setConfirmData(prev => ({...prev, open: false}))}
                onConfirm={confirmData.onConfirm}
                title={confirmData.title}
                message={confirmData.message}
                variant="warning"
            />
        </AnimatePresence>
    );
});

MoneyCounter.displayName = 'MoneyCounter';
export default MoneyCounter;