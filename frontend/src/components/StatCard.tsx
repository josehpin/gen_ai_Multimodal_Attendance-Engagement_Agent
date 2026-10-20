import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    neutral?: boolean;
  };
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  highlight = false,
}) => {
  return (
    <div className={`
      p-5 rounded-xl border bg-white shadow-subtle transition-all duration-200 hover:shadow-card
      ${highlight ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          {title}
        </span>
        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">
          {value}
        </div>
        {trend && (
          <span className={`text-xs font-semibold ${
            trend.neutral 
              ? 'text-slate-600' 
              : trend.isPositive 
                ? 'text-emerald-600' 
                : 'text-amber-600'
          }`}>
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1.5 text-xs text-slate-600 line-clamp-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};
