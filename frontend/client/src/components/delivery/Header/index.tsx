import React from 'react';
import { Utensils, Search, User } from 'lucide-react';

interface HeaderProps {
    restaurantName: string;
}

const Header: React.FC<HeaderProps> = ({ restaurantName }) => {
    return (
        <header className="bg-primary text-primary-foreground py-4 px-5 sticky top-0 z-[var(--z-overlay)] shadow-md">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="text-2xl font-bold flex items-center gap-2.5">
                    <Utensils size={24} />
                    {restaurantName}
                </div>
                <div className="flex items-center gap-5">
                    <a href="#" className="text-primary-foreground hover:opacity-80 transition-opacity"><Search size={20} /></a>
                    <a href="#" className="text-primary-foreground hover:opacity-80 transition-opacity"><User size={20} /></a>
                </div>
            </div>
        </header>
    );
};

export default Header;
