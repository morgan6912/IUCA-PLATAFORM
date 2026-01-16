import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, className }) => (
  <div className={`bg-white p-6 rounded-xl shadow-md flex items-center gap-4 border border-black/5 ${className ?? ''}`}>
    {icon && <div className="bg-emerald-100 text-emerald-700 p-3 rounded-full">{icon}</div>}
    <div>
      <p className="text-slate-500 text-sm">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

export default StatCard;

