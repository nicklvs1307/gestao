import React from 'react';
import { Star, Clock, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

interface RestaurantInfoProps {
    restaurant: {
        name: string;
        logoUrl: string | null;
        settings: {
            welcomeMessage: string | null;
        } | null;
    };
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ restaurant }) => {
    return (
        <motion.section 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-8 rounded-3xl overflow-hidden bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-white/10 shadow-2xl"
        >
            {/* Background Decorativo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center p-6 md:p-8 gap-6 relative z-10">
                <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="relative shrink-0"
                >
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white/10 shadow-xl overflow-hidden bg-black/50">
                        <img 
                            src={restaurant.logoUrl || 'https://via.placeholder.com/150'} 
                            alt={restaurant.name} 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                </motion.div>

                <div className="flex-1 text-center md:text-left space-y-3">
                    <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                        {restaurant.name}
                    </h2>
                    
                    <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
                        {restaurant.settings?.welcomeMessage || 'Bem-vindo! Experimente nossos pratos especiais.'}
                    </p>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-6 mt-4">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-sm text-yellow-400">
                            <Star size={16} fill="currentColor" />
                            <span className="font-semibold">4.8</span>
                            <span className="text-muted-foreground ml-1">(250+)</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-sm text-sky-400">
                            <Clock size={16} />
                            <span>30-45 min</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-sm text-emerald-400">
                            <DollarSign size={16} />
                            <span>Médio</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.section>
    );
};

export default RestaurantInfo;