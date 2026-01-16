
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCourses } from '../hooks/useCourses';
import { getGPA } from '../services/academicService';
import { Role, TaskSubmission } from '../types';
import { listTasksByUser } from '../services/taskService';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { currentCredits } = useCourses();
  const [gpa, setGpa] = React.useState<number | null>(null);
  const [mySubmissions, setMySubmissions] = React.useState<TaskSubmission[]>([]);
  const isStudent = user?.role === Role.ESTUDIANTE;

  const timeline = React.useMemo(() => {
    const events: { title: string; date: string; status: string }[] = [];
    const submissionsSorted = [...mySubmissions].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
    if (submissionsSorted[0]) {
      events.push({
        title: 'Última entrega',
        date: new Date(submissionsSorted[0].submittedAt).toLocaleString(),
        status: submissionsSorted[0].title,
      });
    }
    const graded = submissionsSorted.find((s) => s.status === 'calificado');
    if (graded) {
      events.push({
        title: 'Última calificación',
        date: new Date(graded.submittedAt).toLocaleString(),
        status: `Nota: ${graded.grade ?? '--'}`,
      });
    }
    events.push({
      title: 'Rol en IUCA',
      date: new Date().toLocaleDateString(),
      status: user?.role || '---',
    });
    return events;
  }, [mySubmissions, user?.role]);

  const bio = React.useMemo(
    () => 'Perfil verificado. Datos cargados desde tu sesión y entregas registradas.',
    [],
  );

  React.useEffect(() => {
    if (!user || !isStudent) return;
    getGPA(user.id).then(setGpa);
  }, [user, isStudent]);

  React.useEffect(() => {
    if (!user) return;
    listTasksByUser(user.id)
      .then(setMySubmissions)
      .catch(() => setMySubmissions([]));
  }, [user]);

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">Perfil</h1>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-slate-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  const personalInfo = [
    { label: 'Nombre completo', value: user.name },
    { label: 'Correo', value: user.email },
    { label: 'Rol', value: user.role },
    { label: 'Matricula', value: user.matricula ?? 'No asignada' },
  ];

  const tasksTotal = mySubmissions.length;
  const tasksPending = mySubmissions.filter((s) => s.status !== 'calificado').length;
  const tasksGraded = mySubmissions.filter((s) => s.status === 'calificado').length;

  const quickSummary = [
    { label: 'Créditos activos', value: currentCredits ?? '---', accent: 'text-iuca-green-700' },
    {
      label: 'Promedio general',
      value: isStudent ? (gpa !== null ? gpa.toFixed(2) : '---') : 'Privado',
      accent: 'text-iuca-blue-700',
    },
    { label: 'Tareas enviadas', value: tasksTotal || 0, accent: 'text-iuca-blue-600' },
    { label: 'Pendientes de calificar', value: tasksPending || 0, accent: 'text-amber-600' },
    { label: 'Calificaciones registradas', value: tasksGraded || 0, accent: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-iuca-green-600 via-iuca-blue-600 to-iuca-blue-500 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">Perfil academico</p>
            <h1 className="text-3xl font-bold text-white">{user.name}</h1>
            <p className="text-sm text-white/80">{user.email}</p>
            <p className="text-sm text-white/80 mt-3 max-w-xl">{bio}</p>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col items-center justify-center px-4 py-3 bg-white/15 rounded-2xl">
              <span className="text-xs uppercase tracking-wide text-white/70">Matricula</span>
              <span className="text-lg font-semibold">{user.matricula ?? 'No asignada'}</span>
            </div>
            <div className="flex flex-col items-center justify-center px-4 py-3 bg-white/15 rounded-2xl">
              <span className="text-xs uppercase tracking-wide text-white/70">Rol</span>
              <span className="text-lg font-semibold">{user.role}</span>
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.4em] text-white/60">Informacion en modo lectura</p>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <section className="bg-white p-6 rounded-xl shadow-md space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Tu informacion</h2>
            <p className="text-sm text-slate-500">Datos principales de tu cuenta IUCA.</p>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {personalInfo.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs uppercase tracking-[0.3em] text-slate-500">{item.label}</dt>
                <dd className="text-base font-semibold text-slate-800 break-words">{item.value}</dd>
              </div>
            ))}
          </dl>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
            Este perfil es informativo; los datos institucionales se actualizan automaticamente desde la Administracion IUCA.
          </div>
        </section>

        <section className="space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Resumen rapido</h2>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-500">
              {quickSummary.map((item) => (
                <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs uppercase tracking-wider">{item.label}</p>
                  <p className={`text-2xl font-semibold ${item.accent}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Actividad registrada</h2>
            <ul className="space-y-3">
              {timeline.map((item) => (
                <li key={item.title} className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.status}</p>
                  </div>
                  <span className="text-xs text-slate-400">{item.date}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
