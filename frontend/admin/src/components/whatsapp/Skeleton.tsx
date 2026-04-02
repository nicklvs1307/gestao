import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
}) => {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 bg-[length:200%_100%]',
        variantClasses[variant],
        className
      )}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
    />
  );
};

// Pre-defined skeleton patterns for common use cases

export const ConnectionCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
    <div className="p-6 bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <Skeleton variant="circular" width={64} height={64} />
        <Skeleton width={120} height={24} />
        <Skeleton width={180} height={16} />
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width={12} height={12} />
          <Skeleton width={80} height={14} />
        </div>
      </div>
    </div>
    <div className="p-4 space-y-3">
      <Skeleton height={48} />
      <Skeleton height={48} />
    </div>
  </div>
);

export const MetricCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5">
    <div className="flex items-center justify-between mb-4">
      <Skeleton width={60} height={14} />
      <Skeleton variant="circular" width={40} height={40} />
    </div>
    <Skeleton width={80} height={32} className="mb-2" />
    <Skeleton width={100} height={12} />
  </div>
);

export const MetricsGridSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <MetricCardSkeleton />
    <MetricCardSkeleton />
    <MetricCardSkeleton />
    <MetricCardSkeleton />
  </div>
);

export const SettingsCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
    <div className="p-6 border-b border-gray-100 bg-gray-50">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2">
          <Skeleton width={150} height={18} />
          <Skeleton width={200} height={12} />
        </div>
      </div>
    </div>
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <Skeleton width={100} height={12} />
        <Skeleton height={40} />
      </div>
      <div className="space-y-2">
        <Skeleton width={150} height={12} />
        <Skeleton height={80} />
      </div>
    </div>
    <div className="p-4 border-t border-gray-100">
      <div className="flex justify-end">
        <Skeleton width={180} height={44} />
      </div>
    </div>
  </div>
);

export const KnowledgeBaseSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
    <div className="p-6 border-b border-gray-100 bg-gray-50">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2">
          <Skeleton width={180} height={18} />
          <Skeleton width={250} height={12} />
        </div>
      </div>
    </div>
    <div className="p-6 space-y-4 border-b border-gray-100">
      <div className="grid grid-cols-2 gap-4">
        <Skeleton height={44} />
        <Skeleton height={44} />
      </div>
      <Skeleton height={80} />
      <Skeleton width={160} height={44} />
    </div>
    <div className="p-6 space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 border border-gray-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton width={60} height={18} />
            <Skeleton width={150} height={16} />
          </div>
          <Skeleton height={14} />
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;
