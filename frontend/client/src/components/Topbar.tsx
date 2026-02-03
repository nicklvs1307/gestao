import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandPaper, faSearch } from '@fortawesome/free-solid-svg-icons';

interface TopbarProps {
  tableNumber: string | undefined;
  cartCount: number;
  onCartClick: () => void;
  onAccountClick: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  restaurantName?: string;
}

const Topbar: React.FC<TopbarProps> = ({ tableNumber, onAccountClick, restaurantName }) => {
  return (
    <header className="bg-card/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex justify-between items-center border-b border-border">
      <div>
        <h1 className="text-2xl font-black tracking-tighter italic text-foreground">
          {restaurantName?.toUpperCase() || 'CARDÁPIO'}<span className="text-primary">DIGITAL</span>
        </h1>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Seja bem-vindo à <span className="text-foreground font-black">Mesa {tableNumber}</span>
        </p>
      </div>
      <div className="flex gap-3">
        {/* <button className="bg-primary text-white px-4 py-2 rounded-2xl font-bold text-xs shadow-lg shadow-blue-200/50 active:bg-blue-700 transition-colors flex items-center gap-2">
            <FontAwesomeIcon icon={faHandPaper} />
             CHAMAR GARÇOM
        </button> */}
         <button 
            className="bg-foreground text-background px-4 py-2 rounded-2xl font-bold text-xs shadow-lg active:scale-95 transition-all uppercase"
            onClick={onAccountClick}
         >
             Minha Conta
         </button>
      </div>
    </header>
  );
};

export default Topbar;