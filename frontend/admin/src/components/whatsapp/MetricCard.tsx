import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'green' | 'purple' | 'blue' | 'orange' | 'red';
  loading?: boolean;
  className?: string;
}

const colorMap = {
  green: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    valueColor: 'text-emerald-800',
    labelColor: 'text-emerald-600',
  },
  purple: {
    bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50',
    border: 'border-violet-200',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    valueColor: 'text-violet-800',
    labelColor: 'text-violet-600',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    valueColor: 'text-blue-800',
    labelColor: 'text-blue-600',
  },
  orange: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    valueColor: 'text-amber-800',
    labelColor: 'text-amber-600',
  },
  red: {
    bg: 'bg-gradient-to-br from-red-50 to-red-100/50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    valueColor: 'text-red-800',
    labelColor: 'text-red-600',
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'blue',
  loading = false,
  className,
}) => {
  const colors = colorMap[color];

  if (loading) {
    return (
      <div className={cn('p-5 rounded-2xl border border-gray-100 bg-white animate-pulse', className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-10 w-10 bg-gray-200 rounded-xl" />
        </div>
        <div className="h-8 w-24 bg-gray-200 rounded mb-2" />
        <div className="h-3 w-32 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:shadow-black/5',
        colors.bg,
        colors.border,
        'hover:scale-[1.02] hover:-translate-y-0.5',
        className
      )}
    >
      {/* Decorative gradient overlay */}
      <div className={cn('absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500', colors.bg)} />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className={cn('text-xs font-bold uppercase tracking-wider', colors.labelColor)}>
            {title}
          </span>
          <div className={cn('p-2.5 rounded-xl shadow-sm', colors.iconBg)}>
            <div className={cn(colors.iconColor)}>
              {icon}
            </div>
          </div>
        </div>

        <div className={cn('text-3xl font-black tracking-tight', colors.valueColor)}>
          {value}
        </div>

        {(subtitle || trendValue) && (
          <div className="mt-2 flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  trend === 'up' && 'bg-emerald-100 text-emerald-700',
                  trend === 'down' && 'bg-red-100 text-red-700',
                  trend === 'neutral' && 'bg-gray-100 text-gray-600'
                )}
              >
                {trend === 'up' && '↑'}
                {trend === 'down' && '↓'}
                {trendValue}
              </span>
            )}
            {subtitle && (
              <span className="text-xs font-medium text-gray-500">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
