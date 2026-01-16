import React from 'react';
import { listUsers } from '../../services/userService';
import { Role, User } from '../../types';

const roleLabels: Record<Role, string> = {
  [Role.ESTUDIANTE]: 'Estudiantes',
  [Role.DOCENTE]: 'Docentes',
  [Role.ADMINISTRATIVO]: 'Administrativos',
  [Role.DIRECTIVO]: 'Directivos',
  [Role.BIBLIOTECARIO]: 'Bibliotecarios',
};

const normalizeRoleValue = (value: string | Role): Role => {
  const normalized = String(value ?? '').trim().toLowerCase();
  const roleValues = Object.values(Role) as Role[];
  return roleValues.includes(normalized as Role) ? (normalized as Role) : Role.ESTUDIANTE;
};

const ExecutiveDashboardPage: React.FC = () => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let isMounted = true;
    listUsers()
      .then((data) => {
        if (!isMounted) return;
        setUsers(data);
        setError('');
      })
      .catch(() => {
        if (!isMounted) return;
        setError('No se pudo cargar la informacion institucional.');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = React.useMemo(() => {
    const byRole = users.reduce(
      (acc, user) => {
        const normalizedRole = normalizeRoleValue(user.role);
        acc[normalizedRole] = (acc[normalizedRole] ?? 0) + 1;
        return acc;
      },
      {} as Record<Role, number>,
    );

    const students = users.filter((user) => normalizeRoleValue(user.role) === Role.ESTUDIANTE);
    const withMatricula = students.filter((student) => Boolean(student.matricula)).length;
    const pendingMatricula = students.length - withMatricula;
    const progress = students.length ? Math.round((withMatricula / students.length) * 100) : 0;

    return {
      byRole,
      students,
      withMatricula,
      pendingMatricula,
      progress,
    };
  }, [users]);

  const recentStudents = summary.students.slice(0, 6);
  const recentUsers = [...users]
    .sort((a, b) => (b.matricula ? 1 : 0) - (a.matricula ? 1 : 0))
    .slice(0, 10);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">Panel Ejecutivo</h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Cargando informacion institucional...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Rol directivo - IUCA</p>
        <h1 className="text-3xl font-bold text-slate-800">Panel Ejecutivo</h1>
        <p className="text-sm text-slate-500 max-w-3xl">
          Este panel resume la informacion real de las cuentas registradas en la plataforma IUCA. Las cifras se actualizan cada vez que se
          crea o modifica un usuario desde los procesos administrativos.
        </p>
        {error && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">{error}</p>}
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Usuarios totales</p>
          <p className="text-3xl font-bold text-slate-800">{users.length}</p>
          <p className="text-sm text-slate-500">Cuentas activas en el sistema</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Alumnos inscritos</p>
          <p className="text-3xl font-bold text-slate-800">{summary.students.length}</p>
          <p className="text-sm text-slate-500">{summary.pendingMatricula} sin matricula emitida</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Avance de matriculas</p>
          <p className="text-3xl font-bold text-iuca-blue-700">{summary.progress}%</p>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-iuca-blue-600" style={{ width: `${summary.progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">Meta: 100% de alumnos con matricula</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Roles operativos</p>
          <p className="text-3xl font-bold text-slate-800">
            {(summary.byRole[Role.ADMINISTRATIVO] ?? 0) + (summary.byRole[Role.DOCENTE] ?? 0) + (summary.byRole[Role.BIBLIOTECARIO] ?? 0)}
          </p>
          <p className="text-sm text-slate-500">Administrativos, docentes y biblioteca</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Distribucion por rol</p>
            <h2 className="text-2xl font-semibold text-slate-800">Roles registrados</h2>
          </div>
          <span className="text-xs text-slate-500">Actualizado en tiempo real</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {(Object.values(Role) as Role[]).map((role) => (
            <div key={role} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{roleLabels[role]}</p>
              <p className="text-2xl font-bold text-slate-800">{summary.byRole[role] ?? 0}</p>
              <p className="text-xs text-slate-500">{role === Role.ESTUDIANTE ? 'Usuarios finales' : 'Personal interno'}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Muestra reciente</p>
              <h2 className="text-2xl font-semibold text-slate-800">Alumnos inscritos</h2>
            </div>
            <span className="text-xs text-slate-500">{recentStudents.length} mostrados</span>
          </div>
          <div className="mt-4 space-y-3">
            {recentStudents.length === 0 ? (
              <p className="text-sm text-slate-500">No hay alumnos registrados todavia.</p>
            ) : (
              recentStudents.map((student) => (
                <div key={student.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.email}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p className="uppercase tracking-[0.3em]">Matricula</p>
                      <p className="text-sm font-semibold text-slate-800">{student.matricula ?? 'Pendiente'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Validacion</p>
              <h2 className="text-xl font-semibold text-slate-800">Pendientes por matricula</h2>
            </div>
            <span className="text-xs text-slate-500">{summary.pendingMatricula} alumnos</span>
          </div>
          {summary.pendingMatricula === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Todos los estudiantes cuentan con matricula asignada.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {summary.students
                .filter((student) => !student.matricula)
                .slice(0, 6)
                .map((student) => (
                  <li key={student.id} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-900">{student.name}</p>
                    <p className="text-xs text-amber-700">{student.email}</p>
                    <p className="text-xs text-amber-700 mt-1">Accion sugerida: confirmar datos y emitir matricula.</p>
                  </li>
                ))}
            </ul>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Directorio completo</p>
            <h2 className="text-2xl font-semibold text-slate-800">Usuarios registrados</h2>
          </div>
          <span className="text-xs text-slate-500">Total: {users.length}</span>
        </div>
        <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.3em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Matricula</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{user.name}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600">{roleLabels[normalizeRoleValue(user.role)]}</td>
                  <td className="px-4 py-3 text-slate-600">{user.matricula ?? 'Pendiente'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ExecutiveDashboardPage;
