import React from 'react';

interface ProgressCircleProps {
  percent: number; // 0..100
  label?: string;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({ percent, label = 'Completado' }) => {
  const pct = Math.max(0, Math.min(100, percent));
  const conic = {
    backgroundImage: `conic-gradient(var(--iuca-green,#2E7D32) 0% ${pct}%, #E5E7EB ${pct}% 100%)`,
  } as React.CSSProperties;
  return (
    <div className="w-44 h-44 mx-auto mb-4" style={conic}>
      <div className="w-full h-full rounded-full flex items-center justify-center">
        <div className="w-36 h-36 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
          <p className="text-3xl font-bold text-emerald-700">{pct}%</p>
          <p className="text-xs text-slate-600">{label}</p>
        </div>
      </div>
    </div>
  );
};

export default ProgressCircle;

