import React from 'react';
import { Calendar } from 'lucide-react';
import { formatSP } from '@/lib/timezone';

interface DateFilterProps {
  startDate: string;
  endDate: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  iconColor?: string;
}

export const DateFilter: React.FC<DateFilterProps> = ({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  iconColor = 'text-orange-500',
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-sm">
        <Calendar size={14} className={iconColor} />
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartChange(e.target.value)}
          className="bg-transparent border-none font-black text-[11px] uppercase outline-none text-slate-600 cursor-pointer"
        />
      </div>
      <span className="text-slate-300">→</span>
      <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-sm">
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndChange(e.target.value)}
          className="bg-transparent border-none font-black text-[11px] uppercase outline-none text-slate-600 cursor-pointer"
        />
      </div>
    </div>
  );
};

export const getDefaultDateRange = (days = 30) => ({
  start: formatSP(new Date().setDate(new Date().getDate() - days), 'yyyy-MM-dd'),
  end: formatSP(new Date(), 'yyyy-MM-dd'),
});
