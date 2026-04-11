import { useEffect } from 'react';

export function useScrollLock(isLocked: boolean) {
    useEffect(() => {
        if (isLocked) {
            const scrollY = window.scrollY;
            document.body.style.overflow = 'hidden';
            document.body.style.marginTop = `${scrollY}px`;

            return () => {
                document.body.style.overflow = '';
                document.body.style.marginTop = '';
                window.scrollTo(0, scrollY);
            };
        }

        document.body.style.overflow = '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isLocked]);
}
