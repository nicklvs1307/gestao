import React, { useState } from 'react';
import TopbarAdmin from './TopbarAdmin';
import SidebarAdmin from './SidebarAdmin';
import GlobalOrderMonitor from './GlobalOrderMonitor';
import { cn } from '../lib/utils';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isWaiter = user?.role === 'waiter';

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

    return (
        <div className="flex h-screen bg-[#f8fafc] text-foreground overflow-hidden font-sans">
            <GlobalOrderMonitor />
            
            {/* Sidebar Fixa (Desktop) e Drawer (Mobile) */}
            <SidebarAdmin 
                isOpen={isSidebarOpen} 
                onClose={() => setSidebarOpen(false)} 
            />
            
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Topbar sempre presente */}
                <TopbarAdmin 
                    title={title} 
                    onMenuClick={() => setSidebarOpen(true)}
                />
                
                {/* Conteúdo Principal */}
                <main className={cn(
                    "flex-1 overflow-y-auto scroll-smooth p-4 md:p-8 custom-scrollbar transition-all duration-300",
                    isSidebarOpen ? "lg:ml-0" : ""
                )}>
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;