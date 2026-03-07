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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                >
                    <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                <Calculator size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Contagem de Cédulas</h3>
                                <p className="text-xs text-slate-500 font-medium">Insira a quantidade de notas e moedas</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* CÉDULAS */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Banknote size={16} className="text-slate-400"/>
                                    <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Cédulas</h4>
                                </div>
                                {BILLS.map(bill => (
                                    <div key={bill} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                                        <span className="font-bold text-slate-700 w-24">R$ {bill},00</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-400">x</span>
                                            <input 
                                                type="number" 
                                                min="0"
                                                className="w-20 h-9 border border-slate-200 rounded-md text-center font-bold text-slate-900 focus:border-emerald-500 outline-none"
                                                value={counts[bill.toString()] || ''}
                                                onChange={(e) => handleCountChange(bill, e.target.value)}
                                                placeholder="0"
                                            />
                                            <span className="text-xs font-bold text-emerald-600 w-20 text-right">
                                                = R$ {((counts[bill.toString()] || 0) * bill).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* MOEDAS */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Coins size={16} className="text-slate-400"/>
                                    <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Moedas</h4>
                                </div>
                                {COINS.map(coin => (
                                    <div key={coin} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                                        <span className="font-bold text-slate-700 w-24">R$ {coin.toFixed(2)}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-400">x</span>
                                            <input 
                                                type="number" 
                                                min="0"
                                                className="w-20 h-9 border border-slate-200 rounded-md text-center font-bold text-slate-900 focus:border-amber-500 outline-none"
                                                value={counts[coin.toString()] || ''}
                                                onChange={(e) => handleCountChange(coin, e.target.value)}
                                                placeholder="0"
                                            />
                                            <span className="text-xs font-bold text-amber-600 w-20 text-right">
                                                = R$ {((counts[coin.toString()] || 0) * coin).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <footer className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Contado</p>
                            <p className="text-2xl font-bold text-emerald-600">R$ {getTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                            <Button onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8">
                                <Check size={18} className="mr-2"/> Confirmar Valor
                            </Button>
                        </div>
                    </footer>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default MoneyCounter;