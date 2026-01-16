import React from 'react';
import { listModuleAssignments, ModuleProfessorAssignment } from '../../services/moduleAssignmentService';

const fmtHorario = (mod: ModuleProfessorAssignment) => {
  const bloques: string[] = [];
  mod.modulo.materias.forEach((m) => {
    const horas = Object.entries(m.horario)
      .map(([dia, rango]) => `${dia}: ${rango}`)
      .join(' - ');
    bloques.push(`${m.clave} ${m.nombre} (${horas})`);
  });
  return bloques.join(' | ');
};

const TeacherReportsPage: React.FC = () => {
  const [modules, setModules] = React.useState<ModuleProfessorAssignment[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await listModuleAssignments();
        setModules(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalModules = modules.length;
  const totalStudents = modules.reduce((acc, mod) => acc + (mod.studentIds?.length || 0), 0);
  const avgStudents = totalModules ? Math.round(totalStudents / totalModules) : 0;
  const topByStudents = [...modules]
    .sort((a, b) => (b.studentIds?.length || 0) - (a.studentIds?.length || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
          Docentes | Instituto Universitario de Ciencias Ambientales
        </p>
        <h1 className="text-3xl font-bold text-slate-800">Reportes de modulos</h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Datos en vivo desde la base de datos: modulos asignados, docentes responsables y estudiantes inscritos.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Modulos activos</p>
          <p className="text-3xl font-bold text-slate-900">{loading ? '...' : totalModules}</p>
          <p className="text-sm text-slate-500">Asignaciones registradas</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Estudiantes vinculados</p>
          <p className="text-3xl font-bold text-emerald-700">{loading ? '...' : totalStudents}</p>
          <p className="text-sm text-slate-500">Suma de inscritos por modulo</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Promedio por modulo</p>
          <p className="text-3xl font-bold text-blue-700">{loading ? '...' : avgStudents}</p>
          <p className="text-sm text-slate-500">Estudiantes promedio por modulo</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Top inscripcion</p>
              <h2 className="text-2xl font-semibold text-slate-800">Modulos con mas estudiantes</h2>
            </div>
            <span className="text-xs text-slate-500">{topByStudents.length} modulos</span>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Cargando...</p>
          ) : topByStudents.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No hay modulos registrados.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {topByStudents.map((mod) => (
                <article key={mod.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{mod.modulo.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {mod.modulo.codigo} - {mod.profesorNombre}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p className="uppercase tracking-[0.3em]">Inscritos</p>
                      <p className="text-sm font-semibold text-slate-800">{(mod.studentIds || []).length}</p>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{fmtHorario(mod)}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Docentes</p>
              <h2 className="text-xl font-semibold text-slate-800">Carga por profesor</h2>
            </div>
            <span className="text-xs text-slate-500">Datos reales</span>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Cargando...</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {Object.entries(
                modules.reduce<Record<string, { count: number; students: number }>>((acc, mod) => {
                  if (!acc[mod.profesorNombre]) acc[mod.profesorNombre] = { count: 0, students: 0 };
                  acc[mod.profesorNombre].count += 1;
                  acc[mod.profesorNombre].students += mod.studentIds?.length || 0;
                  return acc;
                }, {})
              )
                .sort((a, b) => b[1].count - a[1].count)
                .map(([prof, stats]) => (
                  <li key={prof} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">{prof || 'Sin nombre'}</p>
                    <p className="text-xs text-slate-600">Modulos: {stats.count} - Estudiantes: {stats.students}</p>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Listado completo</p>
            <h2 className="text-xl font-semibold text-slate-800">Modulos registrados</h2>
          </div>
          <span className="text-xs text-slate-500">Total: {loading ? '...' : totalModules}</span>
        </div>
        <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border border-slate-100">
          {loading ? (
            <p className="p-4 text-sm text-slate-500">Cargando...</p>
          ) : modules.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No hay modulos en la base de datos.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.3em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Modulo</th>
                  <th className="px-4 py-3">Docente</th>
                  <th className="px-4 py-3">Inscritos</th>
                  <th className="px-4 py-3">Horario</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((mod) => (
                  <tr key={mod.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <div>{mod.modulo.nombre}</div>
                      <p className="text-xs text-slate-500">{mod.modulo.codigo}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{mod.profesorNombre}</td>
                    <td className="px-4 py-3 text-slate-600">{(mod.studentIds || []).length}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtHorario(mod)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};

export default TeacherReportsPage;
