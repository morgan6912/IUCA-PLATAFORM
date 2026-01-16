import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Book, CheckCircle, Clock, Users, FileDown, MessageSquare } from 'lucide-react';
import { Role } from '../types';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { useCourses } from '../hooks/useCourses';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/shared/ToastProvider';
import { panelClass } from '../components/shared/ui';
import { useTasks } from '../hooks/useTasks';
import { listAllAssignments } from '../services/assignmentService';
import { listModuleAssignments, ModuleProfessorAssignment } from '../services/moduleAssignmentService';
import { listUsers } from '../services/adminService';
import { listEnrollmentDocuments } from '../services/inscriptionService';
import { listAllSubmissions } from '../services/taskService';
import { listDocuments } from '../services/libraryService';
import { listLibraryRequests } from '../services/libraryRequests';

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  style?: React.CSSProperties;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, style }) => (
  <div
    className={`${panelClass} flex items-center space-x-4 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl animate-fade-in-up`}
    style={style}
  >
    <div className="bg-iuca-green-100 p-3 rounded-full">{icon}</div>
    <div>
      <p className="text-slate-500 text-sm">{title}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { items: announcements } = useAnnouncements();
  const { myCourses } = useCourses();
  const { tasks } = useTasks();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [moduleAssignmentsCount, setModuleAssignmentsCount] = React.useState(0);
  const [moduleStudentsCount, setModuleStudentsCount] = React.useState(0);
  const [assignmentsCount, setAssignmentsCount] = React.useState(0);
  const [pendingDocs, setPendingDocs] = React.useState(0);
  const [userCount, setUserCount] = React.useState(0);
  const [studentCount, setStudentCount] = React.useState(0);
  const [pendingSubmissions, setPendingSubmissions] = React.useState(0);
  const [studentModules, setStudentModules] = React.useState<ModuleProfessorAssignment[]>([]);
  const [libraryStats, setLibraryStats] = React.useState<{ total: number; requests: number }>({ total: 0, requests: 0 });

  React.useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [modules, docs, usersAll, subs, assignments, libraryItems, libraryReqs] = await Promise.all([
          listModuleAssignments(),
          listEnrollmentDocuments(),
          listUsers(),
          listAllSubmissions(),
          listAllAssignments(),
          listDocuments(),
          listLibraryRequests(),
        ]);
        setLibraryStats({ total: libraryItems.length, requests: libraryReqs.length });
        if (user.role === Role.DOCENTE) {
          const mine = modules.filter(
            (m) =>
              m.profesorId === user.id ||
              (m.profesorNombre && user.name && m.profesorNombre.trim().toLowerCase() === user.name.trim().toLowerCase()),
          );
          setModuleAssignmentsCount(mine.length);
          setModuleStudentsCount(mine.reduce((acc, m) => acc + (Array.isArray(m.studentIds) ? m.studentIds.length : 0), 0));
          const teacherAssignments = assignments.filter((a) => mine.some((m) => m.id === a.courseId));
          const pending = subs.filter(
            (s) => teacherAssignments.some((a) => a.id === s.assignmentId) && s.status !== 'calificado',
          );
          setPendingSubmissions(pending.length);
        } else if (user.role === Role.ADMINISTRATIVO) {
          setPendingDocs(docs.filter((d) => d.status === 'pendiente').length);
          setUserCount(usersAll.length);
          setModuleAssignmentsCount(modules.length);
        } else if (user.role === Role.DIRECTIVO) {
          setUserCount(usersAll.length);
          setStudentCount(usersAll.filter((u) => u.role === Role.ESTUDIANTE).length);
          setModuleAssignmentsCount(modules.length);
        } else if (user.role === Role.ESTUDIANTE) {
          const membership = new Set<string>([
            ...myCourses.map((c) => c.id),
            ...modules.filter((m) => Array.isArray(m.studentIds) && m.studentIds.includes(user.id)).map((m) => m.id),
          ]);
          setStudentModules(modules.filter((m) => Array.isArray(m.studentIds) && m.studentIds.includes(user.id)));
          setAssignmentsCount(assignments.filter((a) => membership.has(a.courseId)).length);
        }
      } catch (err) {
        console.error('No se pudieron cargar métricas del dashboard', err);
      }
    };
    load();
  }, [user, myCourses]);

  const stats = React.useMemo(() => {
    switch (user?.role) {
      case Role.ESTUDIANTE:
        return [
          { title: 'Cursos inscritos', value: myCourses.length.toString(), icon: <Book className="h-6 w-6 text-iuca-green-600" /> },
          { title: 'Tareas pendientes', value: String(tasks.filter((t) => t.status === 'pendiente').length), icon: <Clock className="h-6 w-6 text-iuca-green-600" /> },
          { title: 'Tareas publicadas', value: String(assignmentsCount), icon: <CheckCircle className="h-6 w-6 text-iuca-green-600" /> },
        ];
      case Role.DOCENTE:
        return [
          { title: 'Módulos asignados', value: String(moduleAssignmentsCount), icon: <Book className="h-6 w-6 text-iuca-green-600" /> },
          { title: 'Estudiantes vinculados', value: String(moduleStudentsCount), icon: <Users className="h-6 w-6 text-iuca-green-600" /> },
          { title: 'Tareas por calificar', value: String(pendingSubmissions), icon: <CheckCircle className="h-6 w-6 text-iuca-green-600" /> },
        ];
      case Role.ADMINISTRATIVO:
        return [
          { title: 'Matriculas pendientes', value: String(pendingDocs), icon: <FileDown className="h-6 w-6 text-iuca-green-600" /> },
          { title: 'Usuarios activos', value: String(userCount), icon: <Users className="h-6 w-6 text-iuca-green-600" /> },
          { title: 'Comunicados', value: String(announcements.length), icon: <MessageSquare className="h-6 w-6 text-iuca-green-600" /> },
        ];
      case Role.DIRECTIVO:
        return [
          { title: 'Estudiantes activos', value: String(studentCount), icon: <Users className="h-6 w-6 text-iuca-green-600" /> },
          { title: 'Módulos activos', value: String(moduleAssignmentsCount), icon: <Book className="h-6 w-6 text-iuca-green-600" /> },
          { title: 'Usuarios totales', value: String(userCount), icon: <CheckCircle className="h-6 w-6 text-iuca-green-600" /> },
        ];
      default:
        return [];
    }
  }, [user?.role, announcements.length, myCourses.length, tasks, assignmentsCount, moduleAssignmentsCount, moduleStudentsCount, pendingDocs, userCount, studentCount, pendingSubmissions]);

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-md p-4 border border-slate-100">
        <p className="text-sm text-slate-600">
          Accede a cualquier función desde la barra izquierda. Este panel se mantiene pegado al menú, sin espacios
          vacíos: si no ves información, elige una opción del menú para cargarla.
        </p>
      </div>

      <div className="relative bg-gradient-to-r from-iuca-blue-700 to-iuca-green-600 p-6 rounded-xl shadow-lg overflow-hidden animate-fade-in">
        <div className="absolute right-0 top-0 -mt-4 -mr-16 w-48 h-48 bg-iuca-blue-800 rounded-full opacity-50" />
        <div className="relative">
          <h1 className="text-2xl md:text-3xl text-white font-bold mb-2">
            Hola {user?.name.split(' ')[0] ?? 'estudiante'}
          </h1>
          <p className="text-white/80">Resumen rapido de tu actividad academica.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            style={{ animationDelay: `${100 + index * 100}ms` }}
          />
        ))}
      </div>

      {user?.role === Role.ESTUDIANTE && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`${panelClass} px-6 py-6 animate-fade-in-up`} style={{ animationDelay: '400ms' }}>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Progreso académico</h2>
            <div className="space-y-2 text-sm text-slate-700">
              <p>Total entregas: {tasks.length}</p>
              <p>Pendientes: {tasks.filter((t) => t.status === 'pendiente').length}</p>
              <p>Calificadas: {tasks.filter((t) => t.status === 'calificado').length}</p>
              <p>
                Promedio tareas calificadas:{' '}
                {(() => {
                  const graded = tasks.filter((t) => typeof t.grade === 'number') as { grade: number }[];
                  if (!graded.length) return '—';
                  const avg = graded.reduce((a, b) => a + (b.grade || 0), 0) / graded.length;
                  return avg.toFixed(1);
                })()}
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Datos basados en tus entregas registradas en la plataforma.
            </p>
          </div>

          <div className={`${panelClass} px-6 py-6 animate-fade-in-up`} style={{ animationDelay: '500ms' }}>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Anuncios recientes</h2>
            <ul className="space-y-4">
              {announcements.slice(0, 4).map((a) => (
                <li
                  key={a.id}
                  className="flex items-start space-x-3 cursor-pointer hover:bg-slate-50 rounded-md p-2"
                  onClick={() => { navigate('/comunicacion'); showToast('Abriendo comunicados.', 'info'); }}
                >
                  <div className="bg-iuca-blue-100 text-iuca-blue-600 font-bold rounded-full h-8 w-8 flex items-center justify-center text-sm flex-shrink-0">
                    {a.author.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-slate-800 font-semibold">{a.title}</p>
                    <p className="text-slate-600 text-sm">{a.body}</p>
                  </div>
                </li>
              ))}
              {announcements.length === 0 && <p className="text-slate-500 text-sm">No hay comunicados nuevos.</p>}
            </ul>
          </div>

          <div className={`${panelClass} px-6 py-6 animate-fade-in-up`} style={{ animationDelay: '600ms' }}>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Mis módulos</h2>
            {studentModules.length === 0 ? (
              <p className="text-slate-600">Aún no tienes módulos asignados.</p>
            ) : (
              <ul className="space-y-2">
                {studentModules.slice(0, 5).map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-md p-2"
                    onClick={() => navigate('/modulos')}
                  >
                    <span className="text-slate-800">
                      {m.modulo.codigo} - {m.modulo.nombre}
                    </span>
                    <span className="text-xs text-slate-500">
                      {m.modulo.materias
                        .map((mat) => Object.entries(mat.horario).map(([d, h]) => `${d}: ${h}`).join(' | '))
                        .join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {user?.role === Role.ESTUDIANTE && (myCourses.length > 0 || studentModules.length > 0) && (
        <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Calendario académico</h2>
            <span className="text-xs text-slate-500">{myCourses.length} cursos activos</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myCourses.slice(0, 4).map((course) => (
              <div key={course.id} className="border border-slate-100 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{course.code}</p>
                  <p className="text-xs text-slate-500">{course.name}</p>
                </div>
                <span className="text-xs text-slate-500">{course.schedule}</span>
              </div>
            ))}
            {studentModules.slice(0, 2).map((m) => (
              <div key={m.id} className="border border-slate-100 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{m.modulo.codigo}</p>
                  <p className="text-xs text-slate-500">{m.modulo.nombre}</p>
                </div>
                <span className="text-xs text-slate-500">
                  {m.modulo.materias
                    .map((mat) => Object.entries(mat.horario).map(([d, h]) => `${d}: ${h}`).join(' | '))
                    .join(' · ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {user?.role === Role.DOCENTE && (
        <div className={`${panelClass} p-6`}>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Panel docente</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Módulos</p>
              <p className="text-xl font-bold text-slate-800">{moduleAssignmentsCount}</p>
              <p className="text-xs text-slate-500">Asignados a tu nombre</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Estudiantes</p>
              <p className="text-xl font-bold text-slate-800">{moduleStudentsCount}</p>
              <p className="text-xs text-slate-500">Vinculados a tus módulos</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pendientes</p>
              <p className="text-xl font-bold text-slate-800">{pendingSubmissions}</p>
              <p className="text-xs text-slate-500">Entregas por calificar</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 text-sm">
            <button
              onClick={() => navigate('/docente/tareas')}
              className="rounded-full bg-iuca-blue-600 px-4 py-2 font-semibold text-white hover:bg-iuca-blue-700"
            >
              Ir a tareas de mis módulos
            </button>
            <button
              onClick={() => navigate('/docente/asistencias')}
              className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Pasar asistencia
            </button>
          </div>
        </div>
      )}

      {user?.role === Role.ADMINISTRATIVO && (
        <div className={`${panelClass} p-6`}>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Resumen administrativo</h2>
          <p className="text-sm text-slate-600">
            Documentos pendientes: {pendingDocs} · Usuarios activos: {userCount} · Módulos activos: {moduleAssignmentsCount}
          </p>
          <div className="flex flex-wrap gap-2 mt-3 text-sm">
            <button
              onClick={() => navigate('/documentos')}
              className="rounded-full bg-iuca-green-600 px-4 py-2 font-semibold text-white hover:bg-iuca-green-700"
            >
              Revisar documentos
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Gestionar usuarios
            </button>
          </div>
        </div>
      )}

      {user?.role === Role.DIRECTIVO && (
        <div className={`${panelClass} p-6`}>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Resumen directivo</h2>
          <p className="text-sm text-slate-600">
            Estudiantes activos: {studentCount} · Usuarios totales: {userCount} · Módulos activos: {moduleAssignmentsCount}
          </p>
          <button
            onClick={() => navigate('/reportes')}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-iuca-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-iuca-blue-700"
          >
            Ver reportes
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
