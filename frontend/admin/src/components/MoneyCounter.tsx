import React, { useState, useEffect } from 'react';
import { Banknote, Coins, X, Check, Calculator } from 'lucide-react';
import { Button } from './ui/Button';
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

const MoneyCounter: React.FC<MoneyCounterProps> = ({ isOpen, onClose, onConfirm, initialDetails }) => {
    const [counts, setCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        if (isOpen && initialDetails) {
            setCounts(initialDetails);
        } else if (isOpen) {
            setCounts({});
        }
    }, [isOpen, initialDetails]);

    const handleCountChange = (value: number, count: string) => {
        const qty = parseInt(count) || 0;
        setCounts(prev => ({ ...prev, [value.toString()]: qty }));
    };

    const getTotal = () => {
        let total = 0;
        Object.entries(counts).forEach(([val, qty]) => {
            total += parseFloat(val) * qty;
        });
        return total;
    };

    const handleConfirm = () => {
        onConfirm(getTotal(), counts);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border border-slate-200"
                >
                    <header className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-sm">
                                <Calculator size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Contagem de Numerário</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Conferência Física de Caixa</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"><X size={20}/></button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
                        <div className="space-y-6">
                            {/* CÉDULAS */}
                            <section>
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <Banknote size={14} className="text-emerald-600 font-bold"/>
                                    <h4 className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Cédulas (Papel Moeda)</h4>
                                    <div className="flex-1 h-px bg-slate-200 ml-2"></div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {BILLS.map(bill => (
                                        <div key={bill} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm hover:border-emerald-500 transition-all flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">Valor</span>
                                                <span className="text-xs font-bold text-slate-900">R$ {bill},00</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    className="flex-1 h-8 bg-slate-50 border border-slate-200 rounded text-center text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                                                    value={counts[bill.toString()] || ''}
                                                    onChange={(e) => handleCountChange(bill, e.target.value)}
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Subtotal</span>
                                                <span className="text-[11px] font-bold text-emerald-600">
                                                    R$ {((counts[bill.toString()] || 0) * bill).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* MOEDAS */}
                            <section>
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <Coins size={14} className="text-amber-600 font-bold"/>
                                    <h4 className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Moedas (Metálicas)</h4>
                                    <div className="flex-1 h-px bg-slate-200 ml-2"></div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {COINS.map(coin => (
                                        <div key={coin} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm hover:border-amber-500 transition-all flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">Valor</span>
                                                <span className="text-xs font-bold text-slate-900">R$ {coin.toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    className="flex-1 h-8 bg-slate-50 border border-slate-200 rounded text-center text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 outline-none transition-all"
                                                    value={counts[coin.toString()] || ''}
                                                    onChange={(e) => handleCountChange(coin, e.target.value)}
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Subtotal</span>
                                                <span className="text-[11px] font-bold text-amber-600">
                                                    R$ {((counts[coin.toString()] || 0) * coin).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>

                    <footer className="p-4 border-t border-slate-100 bg-white shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
                                <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-1">Total em Espécie</p>
                                <p className="text-2xl font-black text-emerald-600 leading-none">R$ {getTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="hidden md:block">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total de Itens</p>
                                <p className="text-sm font-bold text-slate-600">{Object.values(counts).reduce((a, b) => a + (b || 0), 0)} unidades</p>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none h-11 px-6 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Cancelar</Button>
                            <Button onClick={handleConfirm} className="flex-1 sm:flex-none h-11 px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200">
                                <Check size={16} className="mr-2"/> Confirmar Contagem
                            </Button>
                        </div>
                    </footer>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default MoneyCounter;