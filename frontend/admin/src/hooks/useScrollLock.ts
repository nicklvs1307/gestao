import { useEffect } from 'react';

export function useScrollLock(isLocked: boolean) {
    useEffect(() => {
        if (isLocked) {
            const scrollY = window.scrollY;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.width = '100%';

            return () => {
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.left = '';
                document.body.style.right = '';
                document.body.style.width = '';
                window.scrollTo(0, scrollY);
            };
        }

        document.body.style.overflow = '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isLocked]);
}
