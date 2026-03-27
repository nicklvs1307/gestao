import React from 'react';
import { Card } from '../ui/Card';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description }) => {
  return (
    <Card className="p-12 border-dashed border-slate-200 bg-slate-50/50">
      <div className="text-center">
        <Icon size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-black text-slate-900 uppercase italic">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-2">{description}</p>}
      </div>
    </Card>
  );
};
