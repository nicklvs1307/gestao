import React from 'react';
import { Card } from '../ui/Card';

interface Column {
  label: string;
  align?: 'left' | 'center' | 'right';
}

interface ReportTableProps {
  title: string;
  icon: React.ElementType;
  iconColor?: string;
  columns: Column[];
  rows: React.ReactNode;
  totalCount?: number;
  showingCount?: number;
  emptyState?: React.ReactNode;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  title,
  icon: Icon,
  iconColor = 'text-orange-500',
  columns,
  rows,
  totalCount,
  showingCount,
  emptyState,
}) => {
  return (
    <Card className="p-0 overflow-hidden border-slate-200 shadow-xl bg-white">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h4 className="font-black text-slate-900 uppercase italic text-xs tracking-widest flex items-center gap-2">
          <Icon size={16} className={iconColor} /> {title}
        </h4>
        {totalCount !== undefined && (
          <span className="text-[9px] font-bold text-slate-400">{totalCount} registros</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 bg-slate-50/30">
              {columns.map((col, i) => (
                <th key={i} className={`px-4 py-3 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-900">
            {rows}
          </tbody>
        </table>
      </div>
      {showingCount !== undefined && totalCount !== undefined && showingCount < totalCount && (
        <div className="p-3 text-center border-t border-slate-100">
          <span className="text-[9px] font-bold text-slate-400">Exibindo {showingCount} de {totalCount} registros</span>
        </div>
      )}
      {emptyState}
    </Card>
  );
};
