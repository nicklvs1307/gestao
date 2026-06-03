import { useEffect } from 'react';

/**
 * Trava o scroll do body E de qualquer <main> scrollável
 * quando um modal/drawer está aberto.
 *
 * Usa position:fixed no body para preservar a posição do scroll,
 * e trava overflow no main para evitar scroll por trás do modal.
 */
export function useScrollLock(isLocked: boolean) {
    useEffect(() => {
        if (isLocked) {
            const scrollY = window.scrollY;
            const mainEl = document.querySelector<HTMLElement>('main');

            // Trava o body
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';

            // Trava o main scrollável (onde fica o conteúdo)
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
        }

        // Fallback se desbloquear
        document.body.style.overflow = '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isLocked]);
}
