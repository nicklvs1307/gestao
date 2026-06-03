import React, { useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
  isOpen?: boolean;
}

/**
 * Portal que renderiza filhos no document.body, escapando de qualquer
 * ancestors com filter/transform/backdrop-filter que quebram position:fixed.
 *
 * Também aplica scroll-lock no body E no <main> scrollável para trás.
 */
export function ModalPortal({ children, isOpen = true }: ModalPortalProps) {
  // Scroll lock robusto: trava body + main scrollável
  useLayoutEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const mainEl = document.querySelector('main');

    // Lock body
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    // Lock main scrollável (onde o kanban/lista fica)
    if (mainEl) {
      mainEl.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';

      if (mainEl) {
        mainEl.style.overflow = '';
      }

      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(children, document.body);
}
