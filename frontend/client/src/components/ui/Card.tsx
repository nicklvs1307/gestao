import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  hoverEffect?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  noPadding = false,
  hoverEffect = false,
  onClick
}) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        'bg-card text-card-foreground rounded-2xl border border-border shadow-sm overflow-hidden',
        hoverEffect && 'transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer',
        !noPadding && 'p-5',
        className
      )}
    >
      {children}
    </div>
  );
};
