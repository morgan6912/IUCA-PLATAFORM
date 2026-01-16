import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTasks } from '../../hooks/useTasks';
import { useToast } from '../../components/shared/ToastProvider';
import { CourseAssignment, TaskSubmission } from '../../types';
import { listAllAssignments } from '../../services/assignmentService';
import { getMyCourses } from '../../services/courseService';
import { getRoster } from '../../services/teacherService';
import { listModuleAssignments } from '../../services/moduleAssignmentService';
import { panelClass, primaryButtonClass, primaryGradient, secondaryButtonClass } from '../../components/shared/ui';

const STATUS_DESCRIPTIONS: Record<string, string> = {
  enviado: 'Tu entrega ya fue registrada y está en revisión.',
  calificado: 'Ya tiene calificación del docente.',
  pendiente: 'Por enviar o en espera de comentario.',
};

const statusClassName = (status: 'enviado' | 'calificado' | 'pendiente') => {
  switch (status) {
    case 'calificado':
      return 'bg-iuca-green-100 text-iuca-green-700';
    case 'pendiente':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-blue-100 text-blue-700';
  }
};

const StudentTasksPage: React.FC = () => {
  const { user } = useAuth();
  const { tasks, loading, submit } = useTasks();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<'all' | 'enviado' | 'calificado' | 'pendiente'>('all');
  const [search, setSearch] = useState('');
  const [availableAssignments, setAvailableAssignments] = useState<CourseAssignment[]>([]);
  const [myCourseIds, setMyCourseIds] = useState<string[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<CourseAssignment | null>(null);
  const [moduleCourseIds, setModuleCourseIds] = useState<string[]>([]);
  const [moduleLabels, setModuleLabels] = useState<Record<string, string>>({});
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');
  const [fileMime, setFileMime] = useState<string>('');
  const [previewTask, setPreviewTask] = useState<TaskSubmission | null>(null);

  useEffect(() => {
    listAllAssignments().then(setAvailableAssignments);
  }, []);

  useEffect(() => {
    if (!user) {
      setMyCourseIds([]);
      return;
    }
    getMyCourses(user.id).then((courses) => setMyCourseIds(courses.map((course) => course.id)));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setModuleCourseIds([]);
      setModuleLabels({});
      return;
    }
    const loadModules = async () => {
      try {
        const assignments = await listModuleAssignments();
        const ids: string[] = [];
        const labels: Record<string, string> = {};
        for (const mod of assignments) {
          const label = `${mod.modulo?.codigo ?? mod.id} - ${mod.modulo?.nombre ?? 'Modulo'}`;
          const register = () => {
            if (!ids.includes(mod.id)) {
              ids.push(mod.id);
              labels[mod.id] = label;
            }
          };
          if (Array.isArray(mod.studentIds) && mod.studentIds.includes(user.id)) {
            register();
            continue;
          }
        }
        setModuleCourseIds(ids);
        setModuleLabels(labels);
      } catch {
        setModuleCourseIds([]);
        setModuleLabels({});
      }
    };
    loadModules();
  }, [user]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filter !== 'all' && task.status !== filter) return false;
      if (search.trim() && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filter, search]);

  const assignmentMembership = useMemo(
    () => new Set<string>([...myCourseIds, ...moduleCourseIds]),
    [myCourseIds, moduleCourseIds],
  );
  const upcomingAssignments = useMemo(() => {
    if (assignmentMembership.size === 0) return [];
    const filtered = availableAssignments.filter((assignment) => assignmentMembership.has(assignment.courseId));
    return filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [availableAssignments, assignmentMembership]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === 'pendiente').length;
    const graded = tasks.filter((t) => t.status === 'calificado').length;
    const lastGrade = tasks
      .filter((t) => typeof t.grade === 'number')
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0]?.grade;
    return { total, pending, graded, lastGrade };
  }, [tasks]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      showToast('Agrega un título para la entrega', 'error');
      return;
    }
    if (selectedFile && selectedFile.type !== 'application/pdf') {
      showToast('Por ahora solo se permiten archivos PDF para visualizar en línea', 'error');
      return;
    }
    const fileName = selectedFile?.name;
    await submit(
      title,
      fileName,
      filePreviewUrl || undefined,
      fileMime || undefined,
      selectedAssignment?.id,
      selectedAssignment?.title,
      selectedAssignment?.dueDate,
    );
    showToast('Entrega registrada', 'success');
    setTitle('');
    handleFileSelection(null);
    setSelectedAssignment(null);
  };

  const courseMap = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(moduleLabels).forEach(([id, label]) => map.set(id, label));
    return map;
  }, [moduleLabels]);

  const handleFileSelection = (file: File | null) => {
    setSelectedFile(file);
    if (!file) {
      setFilePreviewUrl('');
      setFileMime('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreviewUrl(typeof reader.result === 'string' ? reader.result : '');
      setFileMime(file.type || 'application/pdf');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">Ciencias Ambientales · Estudiantes</p>
        <h1 className="text-3xl font-bold text-slate-800">Tareas, entregas y retroalimentación</h1>
        <p className="text-slate-600 mt-1">
          Lleva un control claro de tus proyectos: visualiza las tareas que publica tu docente, adjunta archivos y sigue el estado.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <article className={`${panelClass} space-y-2`}>
          <p className="text-xs uppercase text-slate-400 tracking-wide">Entregas totales</p>
          <p className="text-2xl font-semibold text-slate-800">{stats.total}</p>
          <p className="text-sm text-slate-500">Organizadas por fecha y estado</p>
        </article>
        <article className={`${panelClass} space-y-2`}>
          <p className="text-xs uppercase text-slate-400 tracking-wide">Pendientes</p>
          <p className="text-2xl font-semibold text-orange-500">{stats.pending}</p>
          <p className="text-sm text-slate-500">Por enviar o corregir</p>
        </article>
        <article className={`${panelClass} space-y-2`}>
          <p className="text-xs uppercase text-slate-400 tracking-wide">Calificadas</p>
          <p className="text-2xl font-semibold text-iuca-green-600">{stats.graded}</p>
          <p className="text-sm text-slate-500">Con comentarios docentes</p>
        </article>
        <article className={`${panelClass} space-y-1`}>
          <p className="text-xs uppercase text-slate-400 tracking-wide">Última nota</p>
          <p className="text-2xl font-semibold text-slate-800">{stats.lastGrade ?? '--'}</p>
          <p className="text-sm text-slate-500">
            {stats.lastGrade ? 'Basado en la entrega más reciente' : 'Sin calificaciones aún'}
          </p>
        </article>
      </section>

      <section className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 text-sm">
            {(['all', 'enviado', 'calificado', 'pendiente'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  filter === status
                    ? 'bg-iuca-blue-600 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status === 'all' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título..."
            className="text-sm border border-slate-200 rounded-full px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-iuca-blue-500"
          />
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-[3fr_2fr] gap-3">
          <div className="border border-slate-200 rounded-xl px-4 py-3 space-y-2">
            <label className="text-sm font-medium text-slate-600">Título de la entrega</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-iuca-blue-500"
              placeholder="Ej. Informe de laboratorio #4"
              required
            />
            {selectedAssignment && (
              <p className="text-xs text-slate-500">
                Dirigido a: {selectedAssignment.title} · vence {new Date(selectedAssignment.dueDate).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="border border-slate-200 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <label htmlFor="task-file" className="text-sm font-medium text-slate-600">
                Adjuntar archivo
              </label>
              {selectedFile && <span className="text-xs text-slate-400">{selectedFile.name}</span>}
            </div>
            <input
              id="task-file"
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFileSelection(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-iuca-green-600 file:text-white hover:file:bg-iuca-green-700"
            />
          </div>
          <button type="submit" className={`${primaryButtonClass} ${primaryGradient} md:col-span-2 py-3`}>
            Enviar entrega
          </button>
        </form>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <article className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">Tareas publicadas por tus docentes</h2>
            <p className="text-xs text-slate-400">{upcomingAssignments.length} disponibles</p>
          </div>
          {upcomingAssignments.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aún no hay tareas nuevas para tus cursos. Revisa comunicados o habla con tus docentes.
            </p>
          ) : (
            <ul className="space-y-3">
              {upcomingAssignments.map((assignment) => {
                const courseName = courseMap.get(assignment.courseId);
                return (
                  <li
                    key={assignment.id}
                    className="border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{assignment.title}</p>
                      <p className="text-sm text-slate-500">
                        {courseName ? `${courseName}` : 'Curso general'} · vence{' '}
                        {new Date(assignment.dueDate).toLocaleDateString()}
                      </p>
                      {assignment.description && <p className="text-xs text-slate-400 mt-1">{assignment.description}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setTitle(assignment.title);
                        showToast(`Preparando entrega para ${assignment.title}`, 'info');
                      }}
                      className="text-sm font-semibold text-iuca-blue-600 hover:text-iuca-blue-500"
                    >
                      Enviar ahora
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">Historial de entregas</h2>
            <p className="text-xs text-slate-400">Últimos {filteredTasks.length} registros</p>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Cargando tareas…</p>
          ) : filteredTasks.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no has entregado tareas.</p>
          ) : (
            <ul className="space-y-3">
              {filteredTasks.map((task) => (
                <li
                  key={task.id}
                  className="border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4 justify-between"
                >
                  <div>
                    <p className="text-lg font-semibold text-slate-800">{task.title}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(task.submittedAt).toLocaleString()} · {task.fileName || 'Sin archivo'}
                    </p>
                    {task.assignmentTitle && (
                      <p className="text-xs text-slate-400 mt-1">
                        Asignación: {task.assignmentTitle}{' '}
                        {task.assignmentDue ? `· vence ${new Date(task.assignmentDue).toLocaleDateString()}` : ''}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{STATUS_DESCRIPTIONS[task.status]}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusClassName(task.status)}`}>
                      {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </span>
                    {typeof task.grade === 'number' && (
                      <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                        {task.grade}/10
                      </span>
                    )}
                    {task.fileUrl && (
                      <button
                        type="button"
                        className="text-xs text-iuca-blue-600 font-semibold hover:underline"
                        onClick={() => setPreviewTask(task)}
                      >
                        Ver archivo
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-xs text-iuca-blue-600 font-semibold hover:underline"
                      onClick={() => showToast('Pronto podrás consultar retroalimentación extendida.', 'info')}
                    >
                      Ver comentarios
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {previewTask && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 px-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Vista rápida</p>
                <h3 className="text-lg font-semibold text-slate-800">{previewTask.fileName ?? 'Archivo adjunto'}</h3>
              </div>
              <div className="flex items-center gap-2">
                {previewTask.fileUrl && (
                  <a
                    href={previewTask.fileUrl}
                    download={previewTask.fileName || 'archivo.pdf'}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Descargar
                  </a>
                )}
                <button
                  onClick={() => setPreviewTask(null)}
                  className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="max-h-[75vh] overflow-auto px-6 py-4">
              {previewTask.fileUrl ? (
                previewTask.fileMime?.includes('pdf') || previewTask.fileName?.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    title="Vista previa del archivo"
                    src={previewTask.fileUrl}
                    className="h-[70vh] w-full rounded-lg border border-slate-200"
                  />
                ) : (
                  <p className="text-sm text-slate-600">
                    Este tipo de archivo no se puede visualizar aquí. Usa el botón Descargar para abrirlo localmente.
                  </p>
                )
              ) : (
                <p className="text-sm text-slate-600">Este envío no cuenta con archivo adjunto.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTasksPage;
