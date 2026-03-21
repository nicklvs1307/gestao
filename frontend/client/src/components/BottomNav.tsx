import React from 'react';
import { Home, Search, ClipboardList, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface BottomNavProps {
  activeTab: 'home' | 'search' | 'orders' | 'profile';
  onTabChange: (tab: 'home' | 'search' | 'orders' | 'profile') => void;
  hasOrders?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, hasOrders }) => {
  const tabs = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'search', label: 'Busca', icon: Search },
    { id: 'orders', label: 'Pedidos', icon: ClipboardList, badge: hasOrders },
    { id: 'profile', label: 'Perfil', icon: User },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 px-6 py-3 pb-6 z-[100] md:hidden">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center gap-1 group"
            >
              <motion.div
                animate={isActive ? { scale: 1.2, y: -2 } : { scale: 1, y: 0 }}
                className={`${isActive ? 'text-primary' : 'text-slate-400'} transition-colors duration-300`}
              >
                <Icon size={22} strokeWidth={isActive ? 3 : 2} />
              </motion.div>
              
              <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                {tab.label}
              </span>

              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute -top-3 w-1 h-1 bg-primary rounded-full"
                />
              )}

              {tab.badge && !isActive && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
