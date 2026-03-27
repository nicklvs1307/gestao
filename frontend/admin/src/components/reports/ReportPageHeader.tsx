import React from 'react';

interface ReportPageHeaderProps {
  icon: React.ElementType;
  iconBg?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
}

export const ReportPageHeader: React.FC<ReportPageHeaderProps> = ({
  icon: Icon,
  iconBg = 'from-orange-500 to-orange-600',
  title,
  subtitle,
  actions,
  filters,
}) => {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${iconBg} text-white rounded-2xl flex items-center justify-center shadow-lg`}>
          <Icon size={22} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{title}</h1>
          {subtitle && (
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {(filters || actions) && (
        <div className="flex flex-wrap items-center gap-2">
          {filters}
          {actions}
        </div>
      )}
    </div>
  );
};
