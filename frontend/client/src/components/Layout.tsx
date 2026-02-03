import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className }) => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Background simplificado para respeitar o tema */}
      <div className="fixed inset-0 bg-background -z-10" />
      
      {/* Efeito sutil de luz/gradiente opcional para dar profundidade, mas respeitando o tema claro */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn("container mx-auto px-4 py-6 md:py-10 max-w-7xl relative z-10", className)}
      >
        {children}
      </motion.main>
    </div>
  );
};

export default Layout;
