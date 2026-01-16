import React from 'react';

interface SectionTitleProps {
  title: string;
  icon?: React.ReactNode;
  className?: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({ title, icon, className }) => (
  <h3 className={`flex items-center gap-2 text-emerald-700 font-semibold ${className ?? ''}`}>
    {icon}
    <span>{title}</span>
  </h3>
);

export default SectionTitle;

