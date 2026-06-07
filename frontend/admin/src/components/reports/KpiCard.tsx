import React from 'react';
import { Card } from '../ui/Card';

interface KpiCardProps {
  icon: React.ElementType;
  iconColor?: string;
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: 'dark' | 'light' | 'accent';
  accentColor?: string;
  span?: number;
}

const variantStyles: Record<string, string> = {
  dark: 'bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none',
  light: 'bg-white border border-slate-200',
  accent: 'bg-white border border-slate-200',
};

export const KpiCard: React.FC<KpiCardProps> = ({
  icon: Icon,
  iconColor = 'text-orange-400',
  label,
  value,
  subtitle,
  variant = 'light',
  accentColor,
  span,
}) => {
  const valueColor = variant === 'dark' ? '' : accentColor ? accentColor : 'text-slate-900';

  return (
    <Card className={`p-4 ${variantStyles[variant]} ${span ? `md:col-span-${span}` : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={iconColor} />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <p className={`text-xl font-black italic tracking-tighter ${valueColor}`}>{value}</p>
      {subtitle && (
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-[11px] font-medium uppercase ${variant === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{subtitle}</span>
        </div>
      )}
    </Card>
  );
};
