import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import TopbarAdmin from './TopbarAdmin';
import NavigationLauncher from './NavigationLauncher';
import GlobalOrderMonitor from './GlobalOrderMonitor';
import { cn } from '../lib/utils';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isWaiter = user?.role === 'waiter';

    // Rota Fullscreen (como KDS)
    const isFullscreenPage = location.pathname === '/kds';

    if (isWaiter) {
        return (
            <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
                <GlobalOrderMonitor />
                <main className="flex-1 overflow-hidden">
                    {children}
                </main>
            </div>
        );
    }

    if (isFullscreenPage) {
        return (
            <div className="h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
                {children}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-[#f8fafc] text-foreground overflow-hidden font-sans">
            <GlobalOrderMonitor />
            
            <NavigationLauncher 
                isOpen={isMenuOpen} 
                onClose={() => setMenuOpen(false)} 
            />

            <TopbarAdmin 
                title={title} 
                onMenuClick={() => setMenuOpen(true)}
            />

            <main className={cn(
                "flex-1 overflow-y-auto scroll-smooth transition-all duration-500 ease-in-out custom-scrollbar p-4 md:p-6",
                isMenuOpen ? "opacity-50 scale-[0.98] blur-[2px]" : "opacity-100 scale-100 blur-0"
            )}>
                <div className="w-full h-full animate-in fade-in duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;