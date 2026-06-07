import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X } from 'lucide-react';
import { Button } from './ui/Button';

interface ConsentBannerProps {
  isVisible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const ConsentBanner: React.FC<ConsentBannerProps> = ({ isVisible, onAccept, onDecline }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
        >
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl max-w-2xl mx-auto">
            <div className="p-5 md:p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <Cookie size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
                    Cookies e Rastreamento
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Utilizamos cookies para melhorar sua experiência e rastrear conversões
                    (Meta Pixel e Google Analytics). Ao aceitar, você concorda com o uso
                    de cookies de rastreamento conforme a{' '}
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">LGPD</span>.
                  </p>
                </div>
                <button
                  onClick={onDecline}
                  className="flex-shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex gap-3 mt-4 ml-14">
                <Button
                  onClick={onDecline}
                  variant="ghost"
                  size="sm"
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 h-9 px-4 text-xs"
                >
                  Recusar
                </Button>
                <Button
                  onClick={onAccept}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white h-9 px-6 text-xs font-medium"
                >
                  Aceitar
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConsentBanner;
