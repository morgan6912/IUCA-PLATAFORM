import React from 'react';
import { listAllSubmissions, gradeSubmission } from '../../services/taskService';
import { listUsers } from '../../services/userService';
import { TaskSubmission, User } from '../../types';
import { useToast } from '../../components/shared/ToastProvider';

type FilterStatus = 'all' | 'enviado' | 'calificado';

const TaskGradesControl: React.FC = () => {
  const { showToast } = useToast();
  const [submissions, setSubmissions] = React.useState<TaskSubmission[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [grading, setGrading] = React.useState<{ id: string; value: string }>({ id: '', value: '' });
  const [saving, setSaving] = React.useState(false);

  const loadSubmissions = React.useCallback(() => {
    setLoading(true);
    listAllSubmissions()
      .then((data) => setSubmissions(data))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadSubmissions();
    listUsers().then(setUsers);
  }, [loadSubmissions]);

  const getUserName = React.useCallback(
    (userId: string) => users.find((u) => u.id === userId)?.name || 'Usuario',
    [users],
  );

  const stats = React.useMemo(() => {
    const total = submissions.length;
    const graded = submissions.filter((s) => s.status === 'calificado').length;
    const pending = total - graded;
    const avgGrade =
      graded > 0
        ? (
            submissions
              .filter((s) => typeof s.grade === 'number')
              .reduce((acc, curr) => acc + (curr.grade || 0), 0) / graded
          ).toFixed(1)
        : '--';
    return { total, graded, pending, avgGrade };
  }, [submissions]);

  const filtered = React.useMemo(() => {
    const search = searchTerm.toLowerCase();
    return submissions
      .filter((submission) => {
        const matchesStatus = filterStatus === 'all' || submission.status === filterStatus;
        const matchesSearch =
          !search ||
          submission.title?.toLowerCase().includes(search) ||
          submission.assignmentTitle?.toLowerCase().includes(search) ||
          getUserName(submission.userId).toLowerCase().includes(search);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [submissions, filterStatus, searchTerm, getUserName]);

  const startGrading = (submission: TaskSubmission) => {
    setGrading({ id: submission.id, value: submission.grade?.toString() || '' });
  };

  const cancelGrading = () => setGrading({ id: '', value: '' });

  const submitGrade = async () => {
    if (!grading.id) return;
    const numeric = Number(grading.value);
    if (Number.isNaN(numeric) || numeric < 0 || numeric > 10) {
      showToast('Ingresa una calificación entre 0 y 10.', 'error');
      return;
    }
    setSaving(true);
    try {
      await gradeSubmission(grading.id, numeric);
      showToast('Calificación guardada.', 'success');
      setGrading({ id: '', value: '' });
      loadSubmissions();
    } catch {
      showToast('No se pudo guardar la calificación.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Docentes y Administrativos</p>
        <h1 className="text-3xl font-bold text-slate-800">Control de calificaciones de tareas</h1>
        <p className="text-sm text-slate-500">
          Supervisa el estado de entrega, asigna calificaciones y detecta tareas pendientes por revisar.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total de envíos', value: stats.total, accent: 'text-iuca-blue-700' },
          { label: 'Calificados', value: stats.graded, accent: 'text-emerald-600' },
          { label: 'Pendientes', value: stats.pending, accent: 'text-amber-600' },
          { label: 'Promedio general', value: stats.avgGrade, accent: 'text-slate-700' },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{card.label}</p>
            <p className={`text-3xl font-semibold ${card.accent}`}>{card.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Buscar por título, alumno o asignación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-iuca-blue-500 focus:ring-2 focus:ring-iuca-blue-200"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-iuca-blue-500 focus:ring-2 focus:ring-iuca-blue-200"
          >
            <option value="all">Todos</option>
            <option value="enviado">Enviados</option>
            <option value="calificado">Calificados</option>
          </select>
          <button
            type="button"
            onClick={loadSubmissions}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-iuca-blue-400"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando tareas...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">No hay tareas que coincidan con la búsqueda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600">
              <thead className="text-xs uppercase tracking-[0.3em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Alumno</th>
                  <th className="px-4 py-3 text-left">Tarea</th>
                  <th className="px-4 py-3 text-left">Archivo</th>
                  <th className="px-4 py-3 text-left">Fecha envío</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Calificación</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((submission) => (
                  <tr key={submission.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{getUserName(submission.userId)}</p>
                      <p className="text-xs text-slate-400">ID: {submission.userId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{submission.assignmentTitle || submission.title}</p>
                      {submission.assignmentDue && (
                        <p className="text-xs text-slate-400">Vence: {new Date(submission.assignmentDue).toLocaleDateString()}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {submission.fileUrl ? (
                        <button
                          type="button"
                          onClick={() => window.open(submission.fileUrl, '_blank', 'noopener,noreferrer')}
                          className="text-iuca-blue-600 hover:text-iuca-blue-500 font-semibold underline"
                        >
                          {submission.fileName || 'Ver archivo'}
                        </button>
                      ) : (
                        <span className="text-slate-400">Sin archivo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(submission.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                          submission.status === 'calificado'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {submission.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {grading.id === submission.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.1}
                            value={grading.value}
                            onChange={(e) => setGrading((prev) => ({ ...prev, value: e.target.value }))}
                            className="w-24 rounded-xl border border-slate-200 px-2 py-1 text-sm focus:border-iuca-blue-500 focus:ring-2 focus:ring-iuca-blue-200"
                          />
                          <button
                            type="button"
                            onClick={submitGrade}
                            disabled={saving}
                            className="rounded-full bg-gradient-to-r from-iuca-green-600 to-iuca-blue-600 px-3 py-1 text-xs font-semibold text-white shadow"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={cancelGrading}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-700">
                            {typeof submission.grade === 'number' ? submission.grade : '--'}
                          </span>
                          <button
                            type="button"
                            onClick={() => startGrading(submission)}
                            className="text-xs font-semibold text-iuca-blue-600 hover:text-iuca-blue-500"
                          >
                            {submission.status === 'calificado' ? 'Editar' : 'Calificar'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default TaskGradesControl;

