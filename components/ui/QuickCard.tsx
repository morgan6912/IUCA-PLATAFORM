import React from 'react';
import { useNavigate } from 'react-router-dom';

interface QuickCardProps {
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const QuickCard: React.FC<QuickCardProps> = ({ to, title, description, icon }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="text-left bg-white border border-black/5 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    >
      <div className="mb-4">{icon}</div>
      <h4 className="text-slate-900 font-semibold text-base mb-1">{title}</h4>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
    </button>
  );
};

export default QuickCard;

