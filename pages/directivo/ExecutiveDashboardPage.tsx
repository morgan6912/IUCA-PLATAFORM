import React from 'react';

const kpis = [
  { title: 'Matricula total', value: '1,240' },
  { title: 'Retencion', value: '92%' },
  { title: 'Rendimiento promedio', value: '8.9' },
];

const enrollmentTrend = [
  { label: '2022-2', enrollment: 980, performance: '8.7' },
  { label: '2023-1', enrollment: 1120, performance: '8.8' },
  { label: '2023-2', enrollment: 1190, performance: '8.9' },
  { label: '2024-1', enrollment: 1240, performance: '9.0' },
];

const ExecutiveDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-4 border border-slate-100">
        <p className="text-sm text-slate-600">
          Panel ejecutivo anclado junto al menú. Selecciona cualquier sección y la vista aparecerá alineada sin espacios vacíos.
        </p>
      </div>

      <h1 className="text-3xl font-bold text-slate-800">Panel ejecutivo</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.title}
            className="bg-white p-6 rounded-xl shadow-md animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <p className="text-slate-500 text-sm">{kpi.title}</p>
            <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <h2 className="text-lg font-semibold">Tendencia por semestre</h2>
        <div className="space-y-3">
          {enrollmentTrend.map((row) => (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{row.label}</span>
                <span>{row.enrollment} estudiantes</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-iuca-blue-500"
                  style={{ width: `${Math.min(100, (row.enrollment / 1400) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">Rendimiento promedio: {row.performance}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <p className="text-slate-600 text-sm">
          Este panel muestra un resumen ejecutivo. Las graficas interactivas se reemplazaron por indicadores
          ligeros para evitar errores en navegadores antiguos. Exportaciones y comparativas avanzadas se
          encuentran en desarrollo.
        </p>
      </div>
    </div>
  );
};

export default ExecutiveDashboardPage;
