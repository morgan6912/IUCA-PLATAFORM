import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/shared/ToastProvider';
import {
  listStudents,
  getRoster,
  addStudentToRoster,
  removeStudentFromRoster,
  getAttendanceForDate,
  setAttendance,
  listAttendanceDates,
  setAttendanceNote,
  getAttendanceNotes,
  getAttendanceAllDates,
} from '../../services/teacherService';
import { User } from '../../types';
import { listModuleAssignments } from '../../services/moduleAssignmentService';

type AssignedModule = {
  id: string;
  profesorId: string;
  profesorNombre: string;
  modulo: {
    codigo: string;
    nombre: string;
    materias: Array<{
      clave: string;
      nombre: string;
      horario: Record<string, string>; // Lunes: '09:00-14:00'
    }>;
  };
  studentIds?: string[];
};

type ScheduleEntry = {
  courseId: string;
  title: string;
  code: string;
  days: string[];
  time: string;
  room?: string;
};

const DAY_ORDER = ['L', 'M', 'X', 'J', 'V', 'S'];
const DAY_LABEL: Record<string, string> = {
  L: 'Lunes',
  M: 'Martes',
  X: 'Miércoles',
  J: 'Jueves',
  V: 'Viernes',
  S: 'Sábado',
};

const MODULE_ASSIGN_KEY = 'iuca-module-professors';

const TeacherAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [assignedModules, setAssignedModules] = React.useState<AssignedModule[]>([]);
  const [selectedCourse, setSelectedCourse] = React.useState<string>('');
  const [students, setStudents] = React.useState<User[]>([]);
  const [roster, setRoster] = React.useState<string[]>([]);
  const [attendance, setAttendanceState] = React.useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = React.useState<string>(new Date().toISOString().slice(0, 10));
  const [attendanceNotes, setAttendanceNotes] = React.useState<Record<string, string>>({});
  const [dateHistory, setDateHistory] = React.useState<string[]>([]);
  const [filter, setFilter] = React.useState<'all' | 'present' | 'absent'>('all');
  const [allAttendance, setAllAttendance] = React.useState<Record<string, Record<string, boolean>>>({});

  React.useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const alumnos = await listStudents();
      setStudents(alumnos);
      try {
        const assignments = await listModuleAssignments();
        const matchesTeacher = (assignment: any) => {
          if (!user) return false;
          if (assignment.profesorId === user.id) return true;
          if (!assignment.profesorNombre || !user.name) return false;
          return assignment.profesorNombre.trim().toLowerCase() === user.name.trim().toLowerCase();
        };
        const normalized: AssignedModule[] = assignments
          .filter(matchesTeacher)
          .map((a: any) => ({
            id: a.id,
            profesorId: a.profesorId,
            profesorNombre: a.profesorNombre,
            modulo: a.modulo,
            studentIds: Array.isArray(a.studentIds) ? a.studentIds : [],
          }));
        setAssignedModules(normalized);
        setSelectedCourse((prev) => {
          if (prev && normalized.some((mod) => mod.id === prev)) return prev;
          return normalized[0]?.id ?? '';
        });
      } catch {
        setAssignedModules([]);
        setSelectedCourse('');
      }
      setLoading(false);
    };
    load();
  }, [user]);

  React.useEffect(() => {
    const loadRoster = async () => {
      if (!selectedCourse) return;
      const r = await getRoster(selectedCourse);
      setRoster(r);
      const att = await getAttendanceForDate(selectedCourse, selectedDate);
      setAttendanceState(att);
      const notes = await getAttendanceNotes(selectedCourse, selectedDate);
      setAttendanceNotes(notes);
      const history = await listAttendanceDates(selectedCourse);
      setDateHistory(history);
      const allAtt = await getAttendanceAllDates(selectedCourse);
      setAllAttendance(allAtt);
    };
    loadRoster();
  }, [selectedCourse, selectedDate]);

  const rosterUsers = React.useMemo(() => students.filter((s) => roster.includes(s.id)), [students, roster]);
  const nonRosterUsers = React.useMemo(() => students.filter((s) => !roster.includes(s.id)), [students, roster]);
  const filteredRoster = React.useMemo(() => {
    switch (filter) {
      case 'present':
        return rosterUsers.filter((student) => attendance[student.id]);
      case 'absent':
        return rosterUsers.filter((student) => !attendance[student.id]);
      default:
        return rosterUsers;
    }
  }, [filter, rosterUsers, attendance]);

  const presentCount = React.useMemo(() => rosterUsers.filter((student) => attendance[student.id]).length, [rosterUsers, attendance]);
  const attendanceRate = rosterUsers.length ? Math.round((presentCount / rosterUsers.length) * 100) : 0;

  const summaryByStudent = React.useMemo(() => {
    const summary: Record<
      string,
      {
        present: number;
        absent: number;
        total: number;
      }
    > = {};
    Object.entries(allAttendance).forEach(([date, records]) => {
      Object.entries(records).forEach(([studentId, present]) => {
        if (!summary[studentId]) summary[studentId] = { present: 0, absent: 0, total: 0 };
        summary[studentId].total += 1;
        if (present) summary[studentId].present += 1;
        else summary[studentId].absent += 1;
      });
    });
    return summary;
  }, [allAttendance]);

  const currentLabel = React.useMemo(() => {
    const mod = assignedModules.find((m) => m.id === selectedCourse);
    if (mod) return mod.modulo.codigo;
    return '';
  }, [selectedCourse, assignedModules]);

  const markAll = async (present: boolean) => {
    if (!selectedCourse || rosterUsers.length === 0) return;
    const next = { ...attendance };
    await Promise.all(
      rosterUsers.map(async (student) => {
        await setAttendance(selectedCourse, selectedDate, student.id, present);
        next[student.id] = present;
      }),
    );
    setAttendanceState(next);
  };

  const scheduleEntries = React.useMemo<ScheduleEntry[]>(() => {
    const result: ScheduleEntry[] = [];
    // módulos asignados: convertir horario de materias
    assignedModules.forEach((mod) => {
      mod.modulo.materias.forEach((m) => {
        Object.entries(m.horario).forEach(([dia, rango]) => {
          const dayKey = dia.slice(0, 1).toUpperCase();
          const time = rango;
          result.push({
            courseId: mod.id,
            title: m.nombre,
            code: `${mod.modulo.codigo}-${m.clave}`,
            days: [dayKey],
            time,
            room: undefined,
          });
        });
      });
    });
    return result;
  }, [assignedModules]);

  const scheduleByDay = React.useMemo(() => {
    const map: Record<string, ScheduleEntry[]> = {};
    DAY_ORDER.forEach((day) => {
      map[day] = [];
    });
    scheduleEntries.forEach((entry) => {
      entry.days.forEach((day) => {
        const key = day.toUpperCase();
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push(entry);
      });
    });
    return map;
  }, [scheduleEntries]);

  const togglePresent = async (studentId: string, present: boolean) => {
    if (!selectedCourse) return;
    const next = { ...attendance, [studentId]: present };
    setAttendanceState(next);
    await setAttendance(selectedCourse, selectedDate, studentId, present);
  };

  const handleNote = React.useCallback(
    async (studentId: string, value: string) => {
      if (!selectedCourse) return;
      await setAttendanceNote(selectedCourse, selectedDate, studentId, value);
      setAttendanceNotes((prev) => ({ ...prev, [studentId]: value }));
    },
    [selectedCourse, selectedDate],
  );

  const exportCsv = () => {
    const header = ['studentId', 'name', 'email', 'present', 'date'];
    const rows = rosterUsers.map((s) => [s.id, s.name, s.email, attendance[s.id] ? '1' : '0', selectedDate]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => '"' + String(v).replace('"', '""') + '"').join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const code = currentLabel || 'curso';
    a.download = `asistencia_${code}_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div>Cargando asistencia...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Control de Asistencia</h1>
      <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Asistencia del día</p>
            <p className="text-2xl font-semibold text-slate-800">
              {presentCount}/{rosterUsers.length} ({attendanceRate}%)
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => markAll(true)} className="px-3 py-2 bg-iuca-green-600 text-white rounded-md text-xs font-semibold hover:bg-iuca-green-700">
              Marcar todos presentes
            </button>
            <button onClick={() => markAll(false)} className="px-3 py-2 bg-slate-50 text-slate-700 rounded-md text-xs font-semibold border border-slate-200 hover:bg-slate-100">
              Marcar todos ausentes
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="border border-slate-300 rounded-md p-2">
            <option value="">Selecciona módulo</option>
            {assignedModules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.modulo.codigo} - {m.modulo.nombre}
              </option>
            ))}
          </select>
          {selectedCourse && (
            <>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border border-slate-300 rounded-md p-2" />
              <button type="button" onClick={exportCsv} className="px-3 py-2 rounded-md bg-iuca-green-600 text-white hover:bg-iuca-green-700">
                Exportar CSV
              </button>
            </>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold mb-4">Horario de clases</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DAY_ORDER.map((day) => (
              <div key={day} className="border border-slate-100 rounded-2xl p-3 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-600 mb-2">{DAY_LABEL[day]}</h3>
                {scheduleByDay[day].length === 0 ? (
                  <p className="text-xs text-slate-500">Sin clases programadas</p>
                ) : (
                  scheduleByDay[day].map((entry) => (
                    <div key={`${entry.courseId}-${day}`} className="mb-2">
                      <p className="text-sm font-semibold text-slate-800">{entry.code}</p>
                      <p className="text-xs text-slate-500">{entry.time}</p>
                      <p className="text-xs text-slate-500">{entry.title}</p>
                      {entry.room && <p className="text-[11px] text-slate-400">Aula {entry.room}</p>}
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedCourse && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md space-y-3">
            <h2 className="text-lg font-semibold">Lista de estudiantes</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="border border-slate-300 rounded-md p-2 flex-1"
                onChange={async (e) => {
                  const id = e.target.value;
                  if (!id) return;
                  await addStudentToRoster(selectedCourse, id);
                  setRoster(await getRoster(selectedCourse));
                  showToast('Estudiante agregado', 'success');
                  e.currentTarget.value = '';
                }}
              >
                <option value="">Agregar estudiante...</option>
                {nonRosterUsers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.email}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">{rosterUsers.length} inscritos</span>
            </div>
            <div className="divide-y">
              {rosterUsers.map((s) => (
                <div key={s.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={s.avatarUrl} alt={s.name} className="w-8 h-8 rounded-full" />
                    <div>
                      <div className="text-slate-800 font-medium">{s.name}</div>
                      <div className="text-slate-500 text-xs">{s.email}</div>
                    </div>
                  </div>
                  <button
                    className="text-sm text-red-600 hover:underline"
                    onClick={async () => {
                      await removeStudentFromRoster(selectedCourse, s.id);
                      setRoster(await getRoster(selectedCourse));
                      showToast('Estudiante removido', 'info');
                    }}
                  >
                    Quitar
                  </button>
                </div>
              ))}
              {rosterUsers.length === 0 && <p className="text-slate-500 text-sm py-2">Sin estudiantes aún.</p>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">Asistencia</h2>
                <p className="text-xs text-slate-500">
                  {selectedDate} · {currentLabel || 'sin seleccion'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => markAll(true)} className="px-3 py-2 bg-iuca-green-600 text-white rounded-md text-xs font-semibold hover:bg-iuca-green-700">
                  Marcar todos presentes
                </button>
                <button onClick={() => markAll(false)} className="px-3 py-2 bg-slate-50 text-slate-700 rounded-md text-xs font-semibold border border-slate-200 hover:bg-slate-100">
                  Marcar todos ausentes
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'present', 'absent'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    filter === value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {value === 'present' ? 'Presentes' : value === 'absent' ? 'Ausentes' : 'Todos'}
                </button>
              ))}
            </div>
            {dateHistory.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {dateHistory.map((date) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`px-3 py-1 rounded-full text-xs border ${
                      selectedDate === date ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>
            )}
            <ul className="divide-y">
              {filteredRoster.map((s) => (
                <li key={s.id} className="py-3 flex flex-col gap-2 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <img src={s.avatarUrl} alt={s.name} className="w-8 h-8 rounded-full" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.email}</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={!!attendance[s.id]} onChange={(e) => togglePresent(s.id, e.target.checked)} />
                      Presente
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nota (permiso, retardo, observación)"
                      value={attendanceNotes[s.id] || ''}
                      onChange={(e) => handleNote(s.id, e.target.value)}
                      className="flex-1 border border-slate-200 rounded-full px-3 py-1 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                    />
                    {attendanceNotes[s.id] && <span className="text-[11px] text-emerald-600">Nota guardada</span>}
                  </div>
                </li>
              ))}
            </ul>
            {filteredRoster.length === 0 && <p className="text-slate-500 text-sm">No hay estudiantes que coincidan con ese filtro.</p>}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md space-y-3">
            <h2 className="text-lg font-semibold">Histórico de asistencias</h2>
            <p className="text-xs text-slate-500">Resumen de presentes/ausentes por alumno en este módulo.</p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left">Alumno</th>
                    <th className="px-2 py-2 text-left">Presentes</th>
                    <th className="px-2 py-2 text-left">Ausentes</th>
                    <th className="px-2 py-2 text-left">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rosterUsers.map((s) => {
                    const sum = summaryByStudent[s.id] || { present: 0, absent: 0, total: 0 };
                    return (
                      <tr key={s.id}>
                        <td className="px-2 py-2">
                          <div className="font-semibold text-slate-800">{s.name}</div>
                          <div className="text-xs text-slate-500">{s.email}</div>
                        </td>
                        <td className="px-2 py-2 text-emerald-700 font-semibold">{sum.present}</td>
                        <td className="px-2 py-2 text-rose-600 font-semibold">{sum.absent}</td>
                        <td className="px-2 py-2 text-slate-700">{sum.total}</td>
                      </tr>
                    );
                  })}
                  {rosterUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-2 py-3 text-sm text-slate-500">
                        Sin estudiantes en este módulo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendancePage;
