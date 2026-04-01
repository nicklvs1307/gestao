import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, History, ShoppingCart, Bell, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { usePermission } from '../hooks/usePermission';
import { NAV_CATEGORIES, NavCategory, NavItem } from '../config/navigation';

interface NavItem {
    label: string;
    path: string;
    icon: any;
    color?: string;
}

interface NavCategory {
    title: string;
    icon: any;
    items: NavItem[];
}

interface NavigationLauncherProps {
    isOpen: boolean;
    onClose: () => void;
}

const NavigationLauncher: React.FC<NavigationLauncherProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const { hasPermission, isSuperAdmin } = usePermission();

    const categories = useMemo(() => {
        return NAV_CATEGORIES.map(cat => {
            let items = cat.items;

            // Super Admin - mostra todos os itens
            if (cat.title === "Super Admin") {
                if (!isSuperAdmin) return { ...cat, items: [] };
                return cat;
            }

            // Franquia - verifica permissão específica
            if (cat.title === "Gestão de Franquia") {
                items = items.filter(item => !item.permission || hasPermission(item.permission));
                return { ...cat, items };
            }

            // Demais categorias - filtra por permissão
            items = items.filter(item => !item.permission || hasPermission(item.permission));
            return { ...cat, items };
        }).filter(cat => cat.items.length > 0);
    }, [hasPermission, isSuperAdmin]);

    const handleNavigate = (path: string) => {
        navigate(path);
        onClose();
    };

    const filteredCategories = useMemo(() => {
        return categories.map(cat => ({
            ...cat,
            items: cat.items.filter((item: NavItem) =>
                item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cat.title.toLowerCase().includes(searchQuery.toLowerCase())
            )
        })).filter(cat => cat.items.length > 0);
    }, [categories, searchQuery]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[999] overflow-hidden flex items-center justify-center p-4 sm:p-8">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                    />

                    {/* Central Menu Container */}
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: "spring", damping: 30, stiffness: 400 }}
                        className="relative w-full max-w-6xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border"
                    >
                        {/* Top Barra de Busca e Header */}
                        <div className="p-6 border-b border-border flex flex-col sm:flex-row items-center gap-4 bg-background/50">
                            <div className="flex-1 w-full relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Procurar ferramenta..." 
                                    className="ui-input w-full pl-12 h-12"
                                    autoFocus
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="p-3 bg-white border border-border rounded-xl text-muted-foreground hover:text-primary transition-all shadow-sm">
                                    <Bell size={20} />
                                </button>
                                <button 
                                    onClick={onClose}
                                    className="p-3 bg-slate-900 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Corpo do Menu - Grid de Categorias */}
                        <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-10 gap-y-12">
                                
                                {/* Coluna Especial: Favoritos & Histórico */}
                                {searchQuery === '' && (
                                    <div className="space-y-10">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-primary">
                                                <Star size={16} className="fill-current" />
                                                <h3 className="text-[10px] font-black uppercase tracking-widest">Favoritos</h3>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-muted-foreground italic">Seus atalhos.</p>
                                                <button className="text-[10px] font-black uppercase text-primary hover:underline">+ Adicionar</button>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-border">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <History size={16} />
                                                <h3 className="text-[10px] font-black uppercase tracking-widest">Histórico</h3>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">Pedidos Recentes<br/>Caixa Aberto</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {filteredCategories.map((cat, idx) => (
                                    <div key={idx} className="space-y-4">
                                        <div className="flex items-center gap-2 text-foreground border-b border-border pb-3">
                                            <div className="p-1.5 bg-muted rounded text-foreground/60">
                                                <cat.icon size={16} />
                                            </div>
                                            <h3 className="text-[10px] font-black uppercase tracking-widest">
                                                {cat.title}
                                            </h3>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            {cat.items.map((item, iIdx) => (
                                                <button
                                                    key={iIdx}
                                                    onClick={() => handleNavigate(item.path)}
                                                    className="group flex items-center gap-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-all text-left"
                                                >
                                                    <div className="w-1 h-1 rounded-full bg-border group-hover:bg-primary group-hover:scale-125 transition-all" />
                                                    <span className="group-hover:translate-x-1 transition-transform">
                                                        {item.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer / Info */}
                        <div className="px-10 py-4 bg-background border-t border-border flex items-center justify-between">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <ShoppingCart size={12} className="text-primary" /> Kicardapio v2.5.0
                            </p>
                            <div className="flex gap-4">
                                <button className="text-[9px] font-black uppercase text-muted-foreground hover:text-primary transition-colors">Suporte</button>
                                <button className="text-[9px] font-black uppercase text-muted-foreground hover:text-primary transition-colors">Docs</button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NavigationLauncher;