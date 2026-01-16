import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <section className="rounded-2xl p-6 text-white shadow-md bg-gradient-to-r from-emerald-700 to-sky-700">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
          {subtitle && <p className="opacity-95 text-sm">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>
    </section>
  );
};

export default PageHeader;

