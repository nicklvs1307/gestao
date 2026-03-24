import React, { useState, useEffect } from 'react';
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

const MoneyCounter: React.FC<MoneyCounterProps> = ({ isOpen, onClose, onConfirm, initialDetails }) => {
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [confirmData, setConfirmData] = useState<{open: boolean, title: string, message: string, onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}});

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

    const clearAll = () => {
        setConfirmData({open: true, title: 'Confirmar', message: 'Limpar toda a contagem?', onConfirm: () => {
            setCounts({});
            setConfirmData(prev => ({...prev, open: false}));
        }});
    };

    if (!isOpen) return null;

    return (
        <>
            <AnimatePresence>
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200"
                >
                    {/* HEADER COMPACTO */}
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
                            <button onClick={clearAll} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Limpar Tudo"><Trash2 size={18}/></button>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"><X size={22}/></button>
                        </div>
                    </header>

                    {/* CONTEÚDO EM DUAS COLUNAS DENSAS */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* COLUNA CÉDULAS */}
                        <section className="space-y-3">
                            <div className="flex items-center gap-3 mb-4 px-1">
                                <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Banknote size={16}/></div>
                                <h4 className="text-[11px] font-black uppercase text-slate-600 tracking-widest italic">Cédulas (Papel)</h4>
                                <div className="flex-1 h-px bg-slate-200 ml-2"></div>
                            </div>
                            
                            <div className="space-y-1.5">
                                {BILLS.map(bill => (
                                    <div key={bill} className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition-all">
                                        <div className="flex items-center gap-3 w-28">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Valor</span>
                                            <span className="text-sm font-black text-slate-900 italic">R$ {bill},00</span>
                                        </div>
                                        
                                        <div className="flex-1 max-w-[100px] relative">
                                            <input 
                                                type="number" 
                                                min="0"
                                                className="w-full h-10 bg-slate-50 border-2 border-slate-100 rounded-xl text-center text-sm font-black text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                                                value={counts[bill.toString()] || ''}
                                                onChange={(e) => handleCountChange(bill, e.target.value)}
                                                placeholder="0"
                                            />
                                            <div className="absolute -top-2 -right-1 bg-slate-900 text-white text-[8px] px-1.5 rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity">QTD</div>
                                        </div>

                                        <div className="w-28 text-right">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Subtotal</p>
                                            <p className="text-xs font-black text-emerald-600 italic leading-none">
                                                R$ {((counts[bill.toString()] || 0) * bill).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* COLUNA MOEDAS */}
                        <section className="space-y-3">
                            <div className="flex items-center gap-3 mb-4 px-1">
                                <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><Coins size={16}/></div>
                                <h4 className="text-[11px] font-black uppercase text-slate-600 tracking-widest italic">Moedas (Metal)</h4>
                                <div className="flex-1 h-px bg-slate-200 ml-2"></div>
                            </div>
                            
                            <div className="space-y-1.5">
                                {COINS.map(coin => (
                                    <div key={coin} className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-amber-300 transition-all">
                                        <div className="flex items-center gap-3 w-28">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Valor</span>
                                            <span className="text-sm font-black text-slate-900 italic">R$ {coin.toFixed(2)}</span>
                                        </div>
                                        
                                        <div className="flex-1 max-w-[100px] relative">
                                            <input 
                                                type="number" 
                                                min="0"
                                                className="w-full h-10 bg-slate-50 border-2 border-slate-100 rounded-xl text-center text-sm font-black text-slate-900 focus:bg-white focus:border-amber-500 outline-none transition-all placeholder:text-slate-300"
                                                value={counts[coin.toString()] || ''}
                                                onChange={(e) => handleCountChange(coin, e.target.value)}
                                                placeholder="0"
                                            />
                                            <div className="absolute -top-2 -right-1 bg-slate-900 text-white text-[8px] px-1.5 rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity">QTD</div>
                                        </div>

                                        <div className="w-28 text-right">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Subtotal</p>
                                            <p className="text-xs font-black text-amber-600 italic leading-none">
                                                R$ {((counts[coin.toString()] || 0) * coin).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* MINI RESUMO DA CONTAGEM */}
                            <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white shadow-2xl space-y-4">
                                <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2">Total de Unidades</p>
                                        <p className="text-xl font-black italic leading-none">{Object.values(counts).reduce((a, b) => a + (b || 0), 0)} <span className="text-[10px] text-slate-400 not-italic">PEÇAS</span></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-2">Valor Total</p>
                                        <p className="text-3xl font-black italic leading-none tracking-tighter text-emerald-400">R$ {getTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                                <Button onClick={handleConfirm} className="w-full h-14 bg-white hover:bg-slate-100 text-slate-900 font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-xl transition-all">
                                    <Check size={18} className="mr-2"/> Confirmar e Salvar
                                </Button>
                            </div>
                        </section>
                    </div>
                </motion.div>
            </div>
            </AnimatePresence>

            <ConfirmDialog
                isOpen={confirmData.open}
                onClose={() => setConfirmData(prev => ({...prev, open: false}))}
                onConfirm={confirmData.onConfirm}
                title={confirmData.title}
                message={confirmData.message}
                variant="warning"
            />
        </>
    );
};

export default MoneyCounter;