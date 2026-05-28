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
        'bg-card text-card-foreground rounded-lg border border-border shadow-sm overflow-hidden',
        hoverEffect && 'transition-all duration-200 hover:shadow-md cursor-pointer',
        !noPadding && 'p-4',
        className
      )}
    >
      {children}
    </div>
  );
};
