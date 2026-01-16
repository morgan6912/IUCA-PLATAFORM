import React from 'react';
import { Course, Role } from '../types';
import { Check, PlusCircle, X, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCourses } from '../hooks/useCourses';
import { useToast } from '../components/shared/ToastProvider';
import { getAcademicHistory, getGPA, HistoryRecord } from '../services/academicService';
import { EnrollmentReceipt, listReceiptsByUser } from '../services/enrollmentReceiptService';

const CourseCard: React.FC<{
  course: Course;
  onToggle: (course: Course) => void;
  style?: React.CSSProperties;
  waitLabel?: string;
}> = ({ course, onToggle, style, waitLabel }) => {
  const statusLabel = course.enrolled
    ? 'Inscrito'
    : course.enrolledCount >= course.capacity
    ? 'Lleno'
    : 'Cupo disponible';
  const statusColor = course.enrolled
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : course.enrolledCount >= course.capacity
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-iuca-blue-600 bg-iuca-blue-50 border-iuca-blue-200';
  return (
    <div
      style={style}
      className="bg-white rounded-xl shadow-md p-6 flex flex-col justify-between opacity-0 animate-fade-in-up transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-2"
    >
      <div>
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold bg-iuca-blue-100 text-iuca-blue-700 py-1 px-2 rounded-full">{course.code}</span>
          <div className={`flex items-center text-sm ${course.enrolledCount >= course.capacity ? 'text-red-500' : 'text-slate-500'}`}>
            <Users className="w-4 h-4 mr-1" />
            {course.enrolledCount}/{course.capacity}
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mt-2">{course.name}</h3>
        <p className="text-sm text-slate-500">Prof. {course.teacher}</p>
        <p className="text-sm text-slate-500 mt-2">{course.schedule}</p>
      {course.prerequisites.length > 0 && (
        <p className="text-xs text-slate-400 mt-2">Requisitos: {course.prerequisites.join(', ')}</p>
      )}
    </div>
    <div className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide">
      <span className={`rounded-full border ${statusColor} px-2 py-1 text-xs font-semibold`}>{statusLabel}</span>
      {!course.prerequisites.length && course.enrolledCount < course.capacity && !course.enrolled && (
        <Check className="w-4 h-4 text-emerald-500" />
      )}
    </div>
    <div className="mt-4">
      {course.enrolled ? (
        <button onClick={() => onToggle(course)} className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-transform transform hover:scale-105">
          <X className="w-4 h-4 mr-2" /> Desinscribir
        </button>
      ) : course.enrolledCount >= course.capacity ? (
        <div className="space-y-2">
          <button onClick={() => onToggle(course)} className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 transition-transform transform hover:scale-105">
            <PlusCircle className="w-4 h-4 mr-2" /> {waitLabel || 'Lista de espera'}
          </button>
          {waitLabel && <p className="text-xs text-slate-500 text-center">{waitLabel}</p>}
        </div>
      ) : (
        <button onClick={() => onToggle(course)} className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-iuca-blue-500 to-iuca-blue-600 hover:from-iuca-blue-600 hover:to-iuca-blue-700 transition-transform transform hover:scale-105">
          <PlusCircle className="w-4 h-4 mr-2" /> Inscribir
        </button>
      )}
    </div>
  </div>
  );
};

const CoursesPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { courses, loading, onlyOpen, setOnlyOpen, enrollCourse, unenrollCourse, error, clearError, isOnWaitlist, leaveWait, waitPos, currentCredits, maxCredits } = useCourses();
  const [tab, setTab] = React.useState<'inscripcion' | 'calificaciones' | 'historial'>('inscripcion');
  const [history, setHistory] = React.useState<HistoryRecord[]>([]);
  const [gpa, setGpa] = React.useState<number | null>(null);
  const [semesterFilter, setSemesterFilter] = React.useState<string>('');
  const [courseSearch, setCourseSearch] = React.useState('');
  const [receipts, setReceipts] = React.useState<EnrollmentReceipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = React.useState<EnrollmentReceipt | null>(null);

  const isStudent = user?.role === Role.ESTUDIANTE;

  React.useEffect(() => {
    if (isStudent && (tab === 'calificaciones' || tab === 'historial') && user) {
      getAcademicHistory(user.id).then(setHistory);
      getGPA(user.id).then(setGpa);
    }
  }, [user, tab, isStudent]);

  const loadReceipts = React.useCallback(() => {
    if (!user || user.role !== Role.ESTUDIANTE) {
      setReceipts([]);
      return;
    }
    listReceiptsByUser(user.id).then(setReceipts);
  }, [user]);

  React.useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const availableSlots = courses.filter((c) => c.enrolledCount < c.capacity).length;
  const fullCourses = courses.filter((c) => c.enrolledCount >= c.capacity).length;
  const totalCourses = courses.length;
  const waitlistCount = courses.filter((course) => isOnWaitlist(course.id)).length;
  const enrolledCount = courses.filter((course) => course.enrolled).length;
  const [statusFilter, setStatusFilter] = React.useState<'todos' | 'abiertos' | 'completos' | 'inscritos'>('todos');
  const filteredCourses = courses.filter((course) => {
    if (courseSearch.trim()) {
      const search = courseSearch.toLowerCase();
      const matchesText =
        course.name.toLowerCase().includes(search) ||
        course.teacher.toLowerCase().includes(search) ||
        course.code.toLowerCase().includes(search) ||
        course.schedule.toLowerCase().includes(search);
      if (!matchesText) return false;
    }
    if (onlyOpen && course.enrolledCount >= course.capacity) return false;
    if (statusFilter === 'abiertos' && course.enrolledCount >= course.capacity) return false;
    if (statusFilter === 'completos' && course.enrolledCount < course.capacity) return false;
    if (statusFilter === 'inscritos' && !course.enrolled) return false;
    return true;
  });

  if (loading) return <div>Cargando cursos...</div>;

  const pageTitle = isStudent ? 'Matrícula en Línea' : 'Gestión de Cursos';

  // Renderización especial para estudiante cuando elige Calificaciones o Historial dentro de Matrícula
  const gradeMetrics = {
    total: history.length,
    aprovado: history.filter((h) => h.status === 'Aprobado').length,
    reprobado: history.filter((h) => h.status === 'Reprobado').length,
    pending: history.filter((h) => h.status === 'Pendiente').length,
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString();

  const downloadReceipt = (receipt: EnrollmentReceipt) => {
    const content = [
      'Comprobante digital de inscripción',
      'Instituto Universitario de Ciencias Ambientales',
      `Folio: ${receipt.id}`,
      `Fecha de generación: ${formatDate(receipt.generatedAt)}`,
      '',
      `Estudiante: ${user?.name || '---'}`,
      `Curso: ${receipt.courseCode} - ${receipt.courseName}`,
      `Docente asignado: ${receipt.teacher}`,
      `Horario: ${receipt.schedule}`,
      `Créditos: ${receipt.credits}`,
      `Estado: ${receipt.status.toUpperCase()}`,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprobante_${receipt.courseCode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCourseAction = async (course: Course) => {
    if (!user) return;
    if (course.enrolled) {
      await unenrollCourse(course.id);
      showToast('Te desinscribiste del curso', 'info');
      loadReceipts();
      return;
    }
    if (course.enrolledCount >= course.capacity) {
      if (isOnWaitlist(course.id)) {
        await leaveWait(course.id);
        showToast('Saliste de la lista de espera', 'info');
      } else {
        await enrollCourse(course.id);
        showToast('Solicitada inscripción (lista de espera si no hay cupo)', 'info');
      }
      return;
    }
    const receipt = await enrollCourse(course.id);
    if (receipt) {
      showToast('Inscripción confirmada', 'success');
      loadReceipts();
      setSelectedReceipt(receipt);
    }
  };

  const heroInfo = (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-slate-500">IUCA · Matrícula y Gestión</p>
          <h1 className="text-3xl font-bold text-slate-800">{pageTitle}</h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Revisa tu progreso académico, encuentra nuevas materias y mantente al día con las notificaciones del campus.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-right lg:grid-cols-5">
          <div>
            <p className="text-xs text-slate-500">Cursos disponibles</p>
            <p className="text-2xl font-semibold text-slate-800">{totalCourses}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Cupos abiertos</p>
            <p className="text-2xl font-semibold text-iuca-green-600">{availableSlots}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Cursos llenos</p>
            <p className="text-2xl font-semibold text-orange-500">{fullCourses}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Mis cursos</p>
            <p className="text-2xl font-semibold text-iuca-green-600">{enrolledCount}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Lista de espera</p>
            <p className="text-2xl font-semibold text-amber-500">{waitlistCount}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          value={courseSearch}
          onChange={(e) => setCourseSearch(e.target.value)}
          placeholder="Buscar materias, docentes o horarios..."
          className="flex-1 min-w-[220px] rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-iuca-blue-500 focus:ring-2 focus:ring-iuca-blue-200"
        />
        <button
          type="button"
          onClick={() => setCourseSearch('')}
          className="px-4 py-2 rounded-full border border-slate-200 text-sm text-slate-600 hover:border-slate-400"
        >
          Limpiar filtros
        </button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase">
        {[
          { label: 'Todo', value: 'todos' },
          { label: 'Con cupo', value: 'abiertos' },
          { label: 'Llenos', value: 'completos' },
          { label: 'Mis cursos', value: 'inscritos' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatusFilter(option.value as typeof statusFilter)}
            className={`rounded-full border px-3 py-1 transition ${
              statusFilter === option.value
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      {heroInfo}
      {isStudent && receipts.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Comprobantes digitales</p>
              <h2 className="text-xl font-semibold text-slate-800">Historial de matrículas confirmadas</h2>
              <p className="text-sm text-slate-500">Descarga o consulta tus comprobantes oficiales cuando lo necesites.</p>
            </div>
            <span className="text-xs text-slate-500">{receipts.length} registro(s)</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {receipts.slice(0, 6).map((receipt) => (
              <article
                key={receipt.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 shadow-sm hover:bg-slate-100 cursor-pointer transition"
                onClick={() => setSelectedReceipt(receipt)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{receipt.courseCode}</p>
                    <p className="text-sm font-semibold text-slate-800">{receipt.courseName}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-1">
                    {receipt.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">{formatDate(receipt.generatedAt)}</p>
                <p className="text-xs text-slate-500">{receipt.schedule}</p>
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800 animate-fade-in">{pageTitle}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Créditos actuales: <strong>{currentCredits}</strong> / {maxCredits}</span>
          <label className="text-sm text-slate-600 flex items-center gap-2">
            <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
            Solo cursos con cupo
          </label>
        </div>
      </div>

      {isStudent && (
        <div className="bg-white rounded-xl shadow-md p-2">
          <div className="flex gap-2">
            <button onClick={() => setTab('inscripcion')} className={`px-3 py-2 rounded-md text-sm ${tab==='inscripcion' ? 'bg-iuca-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Inscripción</button>
            <button onClick={() => setTab('calificaciones')} className={`px-3 py-2 rounded-md text-sm ${tab==='calificaciones' ? 'bg-iuca-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Calificaciones</button>
            <button onClick={() => setTab('historial')} className={`px-3 py-2 rounded-md text-sm ${tab==='historial' ? 'bg-iuca-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Historial</button>
          </div>
        </div>
      )}

      {tab==='inscripcion' && (
        <></>
      )}

      {tab==='inscripcion' && error && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="text-sm underline">Cerrar</button>
          </div>
        </div>
      )}

      {tab==='calificaciones' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Calificaciones</p>
                <h2 className="text-2xl font-semibold text-slate-800">Resumen académico</h2>
              </div>
              <div className="text-sm text-slate-500">
                {history.length} {history.length === 1 ? 'registro' : 'registros'} disponibles
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Promedio</p>
                <p className="text-3xl font-bold text-slate-800">{gpa !== null ? gpa : '--'}</p>
                <p className="text-xs text-slate-500">GPA general</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Aprobados</p>
                <p className="text-3xl font-bold text-iuca-green-600">{gradeMetrics.aprovado}</p>
                <p className="text-xs text-slate-500">materias completadas</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pendientes</p>
                <p className="text-3xl font-bold text-amber-500">{gradeMetrics.pending}</p>
                <p className="text-xs text-slate-500">en revisión</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {history.slice(0, 12).map((h) => (
              <div key={h.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{h.code}</p>
                    <p className="text-sm text-slate-500">{h.name}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{h.semester}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{h.grade}</p>
                    <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{h.status}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{h.credits} créditos</span>
                  <span className="font-semibold text-slate-700">Revisar</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='historial' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Historial académico</p>
                <h2 className="text-2xl font-semibold text-slate-800">Registro completo</h2>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={semesterFilter}
                  onChange={(e) => setSemesterFilter(e.target.value)}
                  placeholder="Filtrar por semestre (ej. 2023-2)"
                  className="w-[220px] rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-iuca-blue-500 focus:ring-2 focus:ring-iuca-blue-200"
                />
                <button
                  className="rounded-full bg-iuca-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-iuca-green-700 transition"
                  onClick={() => {
                    const header = ['Código','Asignatura','Semestre','Créditos','Nota','Estado'];
                    const rows = history
                      .filter((h) => !semesterFilter || h.semester.includes(semesterFilter))
                      .map((h) => [h.code, h.name, h.semester, String(h.credits), String(h.grade), h.status]);
                    const csv = [header, ...rows]
                      .map((r) => r.map((v) => '"' + String(v).replace('"', '""') + '"').join(','))
                      .join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'historial_academico.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Exportar CSV
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {history
              .filter((h) => !semesterFilter || h.semester.includes(semesterFilter))
              .map((h) => (
                <div key={h.id} className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{h.semester}</p>
                      <p className="text-sm font-semibold text-slate-800">{h.code}</p>
                      <p className="text-sm text-slate-500">{h.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{h.grade}</p>
                      <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{h.status}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{h.credits} créditos</span>
                    <span className="font-semibold text-slate-700 group-hover:text-iuca-blue-600">Ver detalle</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCourses.map((course, index) => (
          <CourseCard
            key={course.id}
            course={course}
            onToggle={handleCourseAction}
            waitLabel={course.enrolledCount >= course.capacity ? (isOnWaitlist(course.id) ? `En lista de espera (#${waitPos(course.id)}) - salir` : 'Unirse a lista de espera') : undefined}
            style={{ animationDelay: `${index * 50}ms` }}
          />
        ))}
      </div>

      {selectedReceipt && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Comprobante de inscripción</p>
                <h3 className="text-lg font-semibold text-slate-800">
                  {selectedReceipt.courseCode} · {selectedReceipt.courseName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadReceipt(selectedReceipt)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Descargar
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="px-6 py-4 space-y-3 text-sm text-slate-600">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Folio</p>
                  <p className="text-base font-semibold text-slate-800">{selectedReceipt.id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Generado</p>
                  <p className="text-base font-semibold text-slate-800">{formatDate(selectedReceipt.generatedAt)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Docente</p>
                  <p className="text-base font-semibold text-slate-800">{selectedReceipt.teacher}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Créditos</p>
                  <p className="text-base font-semibold text-slate-800">{selectedReceipt.credits}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Horario</p>
                <p className="font-semibold text-slate-800">{selectedReceipt.schedule}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-emerald-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Estado</p>
                <p className="font-semibold text-emerald-800">{selectedReceipt.status.toUpperCase()}</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Guarda este comprobante para cualquier aclaración o trámite académico.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;

