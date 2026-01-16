import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { createAssignment, listAssignmentsByCourse, deleteAssignment } from '../../services/assignmentService';
import { listTeacherCourses, addStudentToRoster, removeStudentFromRoster, getRoster } from '../../services/teacherService';
import { listSubmissionsByTitle, listAllSubmissions, gradeSubmission } from '../../services/taskService';
import { Role, TaskSubmission } from '../../types';
import { useToast } from '../../components/shared/ToastProvider';
import { listUsers } from '../../services/userService';
import { listModuleAssignments } from '../../services/moduleAssignmentService';

const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isTeacher = user?.role === Role.DOCENTE;
  const [teacherCourses, setTeacherCourses] = React.useState<{ id: string; code: string; name: string }[]>([]);

  React.useEffect(() => {
    if (!user) return;
    listTeacherCourses(user.name).then((courses) =>
      setTeacherCourses(courses.map((course) => ({ id: course.id, code: course.code, name: course.name }))),
    );
  }, [user]);
  const [assignments, setAssignments] = React.useState<any[]>([]);
  const [title, setTitle] = React.useState('');
  const [due, setDue] = React.useState<string>('');
  const [desc, setDesc] = React.useState('');
  const [selectedAssignment, setSelectedAssignment] = React.useState<string>('');
  const [submissions, setSubmissions] = React.useState<any[]>([]);
  const [allSubmissions, setAllSubmissions] = React.useState<TaskSubmission[]>([]);
  type AssignedModule = {
    id: string;
    profesorId: string;
    profesorNombre: string;
    modulo: {
      codigo: string;
      nombre: string;
      periodo: { inicio: string; fin: string; semanas: number; vacacional?: string; regularizacion?: string };
      materias: Array<{
        clave: string;
        nombre: string;
        horas: number;
        horario: Record<string, string>;
        observaciones?: string;
        modalidad: string;
        turno: string;
        grupo: string;
        semanas: number;
      }>;
    };
    studentIds?: string[];
  };
  const [assignedModules, setAssignedModules] = React.useState<AssignedModule[]>([]);
  type ModuleGrade = { moduleId: string; studentId: string; studentName: string; grade: number; remark?: string };
  const MODULE_GRADES_KEY = 'iuca-module-grades';
  const [moduleGrades, setModuleGrades] = React.useState<ModuleGrade[]>([]);
  const [students, setStudents] = React.useState<{ id: string; name: string; email?: string }[]>([]);
  const [selectedModuleGrade, setSelectedModuleGrade] = React.useState<string>('');
  const [selectedStudent, setSelectedStudent] = React.useState<string>('');
  const [gradeValue, setGradeValue] = React.useState<number | ''>('');
  const [gradeRemark, setGradeRemark] = React.useState<string>('');
  const [moduleRosters, setModuleRosters] = React.useState<Record<string, string[]>>({});
  const [selectedModuleRoster, setSelectedModuleRoster] = React.useState<string>('');
  const [selectedStudentForModule, setSelectedStudentForModule] = React.useState<string>('');
  const [selectedModuleForAssignment, setSelectedModuleForAssignment] = React.useState<string>('');
  const [previewSubmission, setPreviewSubmission] = React.useState<TaskSubmission | null>(null);

  React.useEffect(() => {
    if (!selectedModuleForAssignment) {
      setAssignments([]);
      return;
    }
    listAssignmentsByCourse(selectedModuleForAssignment).then(setAssignments);
  }, [selectedModuleForAssignment]);

  React.useEffect(() => {
    if (!selectedAssignment) {
      setSubmissions([]);
      return;
    }
    listSubmissionsByTitle(selectedAssignment).then(setSubmissions);
  }, [selectedAssignment]);

  React.useEffect(() => {
    listAllSubmissions().then(setAllSubmissions);
  }, []);

  React.useEffect(() => {
    // cargar estudiantes (para calificar modulos)
    listUsers()
      .then((users) =>
        setStudents(users.filter((u) => u.role === Role.ESTUDIANTE).map((u) => ({ id: u.id, name: u.name, email: u.email }))),
      )
      .catch(() => setStudents([]));
  }, []);

  React.useEffect(() => {
    if (!user) return;
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(MODULE_ASSIGN_KEY) : null;
      const parsed: AssignedModule[] = raw ? (JSON.parse(raw) as AssignedModule[]) : [];
      const normalized = parsed.map((entry) => ({
        ...entry,
        studentIds: Array.isArray((entry as any).studentIds) ? (entry as any).studentIds : [],
      }));
      const matchesTeacher = (assignment: AssignedModule) => {
        if (!user) return false;
        if (assignment.profesorId === user.id) return true;
        if (!assignment.profesorNombre || !user.name) return false;
        return assignment.profesorNombre.trim().toLowerCase() === user.name.trim().toLowerCase();
      };
      setAssignedModules(normalized.filter(matchesTeacher));
    } catch {
      setAssignedModules([]);
    }
  }, [user]);

  React.useEffect(() => {
    if (!assignedModules.length) {
      setSelectedModuleForAssignment('');
      return;
    }
    if (!selectedModuleForAssignment || !assignedModules.some((mod) => mod.id === selectedModuleForAssignment)) {
      setSelectedModuleForAssignment(assignedModules[0].id);
    }
  }, [assignedModules, selectedModuleForAssignment]);

  React.useEffect(() => {
    if (!user) return;
    const loadModules = async () => {
      try {
        const data = await listModuleAssignments();
        const matchesTeacher = data.filter((assignment) => {
          if (assignment.profesorId === user.id) return true;
          if (!assignment.profesorNombre || !user.name) return false;
          return assignment.profesorNombre.trim().toLowerCase() === user.name.trim().toLowerCase();
        });
        setAssignedModules(matchesTeacher);
      } catch {
        setAssignedModules([]);
      }
    };
    loadModules();
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(MODULE_GRADES_KEY) : null;
      const parsed: ModuleGrade[] = raw ? (JSON.parse(raw) as ModuleGrade[]) : [];
      setModuleGrades(parsed);
    } catch {
      setModuleGrades([]);
    }
  }, [user]);

  React.useEffect(() => {
    const loadRosters = async () => {
      if (!assignedModules.length) {
        setModuleRosters({});
        setSelectedModuleRoster('');
        return;
      }
      const entries = await Promise.all(
        assignedModules.map(async (mod) => [mod.id, await getRoster(mod.id)] as const),
      );
      const map: Record<string, string[]> = {};
      entries.forEach(([id, roster]) => {
        map[id] = roster;
      });
      setModuleRosters(map);
      if (!selectedModuleRoster && entries.length) {
        setSelectedModuleRoster(entries[0][0]);
      }
    };
    loadRosters();
  }, [assignedModules, selectedModuleRoster]);

  const teacherAssignmentIds = React.useMemo(() => new Set(assignments.map((assignment) => assignment.id)), [assignments]);
  const teacherSubmissions = React.useMemo(
    () => allSubmissions.filter((submission) => submission.assignmentId && teacherAssignmentIds.has(submission.assignmentId)),
    [allSubmissions, teacherAssignmentIds],
  );

  const assignmentStats = React.useMemo(() => {
    const pending = teacherSubmissions.filter((s) => s.status === 'enviado').length;
    const graded = teacherSubmissions.filter((s) => s.status === 'calificado').length;
    const grades = teacherSubmissions.filter((s) => typeof s.grade === 'number').map((s) => s.grade as number);
    const average = grades.length ? Number((grades.reduce((acc, curr) => acc + curr, 0) / grades.length).toFixed(2)) : null;
    const upcoming = [...assignments]
      .map((assignment) => ({ ...assignment, dueDateObj: new Date(assignment.dueDate) }))
      .filter((assignment) => !Number.isNaN(assignment.dueDateObj.getTime()))
      .sort((a, b) => a.dueDateObj.getTime() - b.dueDateObj.getTime())
      .slice(0, 3);
    return {
      totalAssignments: assignments.length,
      totalSubmissions: teacherSubmissions.length,
      pending,
      graded,
      average,
      upcoming,
    };
  }, [assignments, teacherSubmissions]);

  const moduleCount = assignedModules.length;
  const saveModuleGrades = (grades: ModuleGrade[]) => {
    setModuleGrades(grades);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MODULE_GRADES_KEY, JSON.stringify(grades));
    }
  };
  const handleAddStudentToModule = async () => {
    if (!selectedModuleRoster || !selectedStudentForModule) {
      showToast('Selecciona m��dulo y estudiante', 'error');
      return;
    }
    await addStudentToRoster(selectedModuleRoster, selectedStudentForModule);
    const updated = await getRoster(selectedModuleRoster);
    setModuleRosters((prev) => ({ ...prev, [selectedModuleRoster]: updated }));
    setSelectedStudentForModule('');
    showToast('Estudiante agregado al m��dulo', 'success');
  };

  const handleRemoveStudentFromModule = async (studentId: string) => {
    if (!selectedModuleRoster) return;
    await removeStudentFromRoster(selectedModuleRoster, studentId);
    const updated = await getRoster(selectedModuleRoster);
    setModuleRosters((prev) => ({ ...prev, [selectedModuleRoster]: updated }));
    showToast('Estudiante removido del m��dulo', 'info');
  };

  // Horario docente basado en modulos asignados (similar al horario de estudiantes)
  type DayCode = 'L' | 'M' | 'X' | 'J' | 'V';
  const dayNames: Record<DayCode, string> = { L: 'Lunes', M: 'Martes', X: 'Miercoles', J: 'Jueves', V: 'Viernes' };
  const dayMap: Record<string, DayCode> = {
    Lunes: 'L',
    Martes: 'M',
    Miércoles: 'X',
    Miercoles: 'X',
    Jueves: 'J',
    Viernes: 'V',
  };
  const STEP = 30;
  const toMinutes24 = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const moduleEvents = React.useMemo(() => {
    const evs: { day: DayCode; code: string; name: string; start: number; end: number; startRow: number; endRow: number; rows: number }[] = [];
    assignedModules.forEach((mod) => {
      mod.modulo.materias.forEach((m) => {
        Object.entries(m.horario).forEach(([dia, rango]) => {
          const d = dayMap[dia];
          if (!d) return;
          const [startStr, endStr] = rango.split('-');
          if (!startStr || !endStr) return;
          const start = toMinutes24(startStr);
          const end = toMinutes24(endStr);
          const startRow = Math.floor(start / STEP) * STEP;
          const endRow = Math.ceil(end / STEP) * STEP;
          const rows = Math.max(1, (endRow - startRow) / STEP);
          evs.push({ day: d, code: m.clave, name: m.nombre, start, end, startRow, endRow, rows });
        });
      });
    });
    return evs;
  }, [assignedModules]);

  const [minTime, maxTime] = React.useMemo(() => {
    const defaultRange: [number, number] = [8 * 60, 20 * 60];
    if (moduleEvents.length === 0) return defaultRange;
    let min = Math.min(...moduleEvents.map((e) => e.start));
    let max = Math.max(...moduleEvents.map((e) => e.end));
    min = Math.max(8 * 60, Math.floor(min / STEP) * STEP);
    max = Math.min(21 * 60, Math.ceil(max / STEP) * STEP);
    return [min, max];
  }, [moduleEvents]);

  const hours: number[] = React.useMemo(() => {
    const arr: number[] = [];
    for (let t = minTime; t <= maxTime; t += STEP) arr.push(t);
    return arr;
  }, [minTime, maxTime]);

  const fmtHour = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = ((h + 11) % 12) + 1;
    const mm = m.toString().padStart(2, '0');
    return `${h12}:${mm}${ampm}`;
  };

  const eventsByStart = React.useMemo(() => {
    const map = new Map<string, (typeof moduleEvents)[number]>();
    moduleEvents.forEach((ev) => map.set(`${ev.day}-${ev.startRow}`, ev));
    return map;
  }, [moduleEvents]);

  const occupied = React.useMemo(() => {
    const set = new Set<string>();
    moduleEvents.forEach((ev) => {
      for (let t = ev.startRow + STEP; t < ev.endRow; t += STEP) {
        set.add(`${ev.day}-${t}`);
      }
    });
    return set;
  }, [moduleEvents]);

  const colorFor = (code: string) => {
    const palette = [
      'bg-emerald-100 text-emerald-800 border-emerald-300',
      'bg-sky-100 text-sky-800 border-sky-300',
      'bg-amber-100 text-amber-800 border-amber-300',
      'bg-violet-100 text-violet-800 border-violet-300',
      'bg-rose-100 text-rose-800 border-rose-300',
      'bg-teal-100 text-teal-800 border-teal-300',
    ];
    let h = 0;
    for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  };
  const currentModuleRosterIds = selectedModuleRoster ? moduleRosters[selectedModuleRoster] || [] : [];
  const currentModuleRoster = currentModuleRosterIds
    .map((id) => students.find((s) => s.id === id))
    .filter(Boolean) as { id: string; name: string; email?: string }[];
  const availableStudentsForModule = students.filter((s) => !currentModuleRosterIds.includes(s.id));
  const selectedModuleInfo = assignedModules.find((m) => m.id === selectedModuleRoster);
  if (!isTeacher) return <div>Acceso restringido al rol Docente.</div>;

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestion de modulos y tareas</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Administra tus cursos, publica tareas y monitorea entregas en tiempo real desde el panel docente.
          </p>
        </div>
        <span className="text-sm text-slate-500">Selecciona un curso y mantén tu ritmo académico.</span>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <article className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Cursos</p>
          <p className="text-3xl font-semibold text-slate-800">{teacherCourses.length}</p>
          <p className="text-xs text-slate-500 mt-1">Cursos a tu cargo</p>
        </article>
        <article className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Modulos asignados</p>
          <p className="text-3xl font-semibold text-slate-800">{moduleCount}</p>
          <p className="text-xs text-slate-500 mt-1">De acuerdo a FORMATO 13</p>
        </article>
        <article className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Tareas publicadas</p>
          <p className="text-3xl font-semibold text-slate-800">{assignmentStats.totalAssignments}</p>
          <p className="text-xs text-slate-500 mt-1">Con fechas activas</p>
        </article>
        <article className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Entregas pendientes</p>
          <p className="text-3xl font-semibold text-orange-500">{assignmentStats.pending}</p>
          <p className="text-xs text-slate-500 mt-1">Esperando revisión</p>
        </article>
        <article className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Promedio</p>
          <p className="text-3xl font-semibold text-iuca-green-600">{assignmentStats.average ?? '---'}</p>
          <p className="text-xs text-slate-500 mt-1">Basado en calificaciones</p>
        </article>
      </section>

      {/* Modulos asignados (lectura de FORMATO 13) */}
      <section className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Modulos</p>
            <h2 className="text-xl font-semibold text-slate-800">Modulos academicos asignados</h2>
            <p className="text-sm text-slate-500">Carga automatica de clave, horas, horario por dia y periodo.</p>
          </div>
          <span className="text-xs text-slate-500">{moduleCount} modulo(s)</span>
        </div>
        {moduleCount === 0 ? (
          <p className="text-sm text-slate-600">Aun no tienes modulos asignados.</p>
        ) : (
          <div className="space-y-3">
            {assignedModules.map((mod) => (
              <div key={mod.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Profesor</p>
                    <p className="text-sm font-semibold text-slate-800">{mod.profesorNombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">{mod.modulo.codigo} · {mod.modulo.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {mod.modulo.periodo.inicio} → {mod.modulo.periodo.fin} · {mod.modulo.periodo.semanas} semanas
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {mod.modulo.materias.map((m) => (
                    <div key={`${mod.id}-${m.clave}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{m.clave} · {m.nombre}</span>
                        <span className="text-xs text-slate-500">{m.horas} h</span>
                      </div>
                      <p className="text-xs text-slate-500">Modalidad: {m.modalidad} · Turno: {m.turno} · Grupo: {m.grupo} · Semanas: {m.semanas}</p>
                      <p className="text-xs text-slate-500">
                        {Object.entries(m.horario).map(([d, h]) => `${d}: ${h}`).join(' · ')}
                      </p>
                      {m.observaciones && <p className="text-xs text-amber-700">Obs: {m.observaciones}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Calificaciones por módulo y estudiante */}
      <section className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Evaluación de módulos</p>
            <h2 className="text-xl font-semibold text-slate-800">Calificar estudiantes por módulo</h2>
            <p className="text-sm text-slate-500">Selecciona módulo y estudiante, asigna calificación y guarda.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col text-sm text-slate-700">
            Módulo
            <select
              value={selectedModuleGrade}
              onChange={(e) => setSelectedModuleGrade(e.target.value)}
              className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Elige módulo</option>
              {assignedModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.modulo.codigo} · {m.modulo.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm text-slate-700">
            Estudiante
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Elige estudiante</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm text-slate-700">
            Calificación
            <input
              type="number"
              min={0}
              max={100}
              value={gradeValue}
              onChange={(e) => setGradeValue(e.target.value ? Number(e.target.value) : '')}
              className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="0 - 100"
            />
          </label>
        </div>
        <label className="flex flex-col text-sm text-slate-700">
          Observaciones
          <textarea
            value={gradeRemark}
            onChange={(e) => setGradeRemark(e.target.value)}
            className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Comentarios opcionales"
          />
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!selectedModuleGrade || !selectedStudent || gradeValue === '') {
                showToast('Selecciona módulo, estudiante y calificación', 'error');
                return;
              }
              const stu = students.find((s) => s.id === selectedStudent);
              if (!stu) {
                showToast('Estudiante no encontrado', 'error');
                return;
              }
              const next = moduleGrades.filter(
                (g) => !(g.moduleId === selectedModuleGrade && g.studentId === selectedStudent),
              );
              next.push({
                moduleId: selectedModuleGrade,
                studentId: selectedStudent,
                studentName: stu.name,
                grade: Number(gradeValue),
                remark: gradeRemark.trim() || undefined,
              });
              saveModuleGrades(next);
              showToast('Calificación guardada', 'success');
            }}
            className="rounded-xl bg-iuca-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-iuca-blue-700"
          >
            Guardar calificación
          </button>
          <button
            onClick={() => {
              setSelectedModuleGrade('');
              setSelectedStudent('');
              setGradeValue('');
              setGradeRemark('');
            }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Limpiar
          </button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-800">Calificaciones registradas</p>
          {moduleGrades.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no hay calificaciones.</p>
          ) : (
            <div className="space-y-1 text-sm text-slate-700">
              {moduleGrades.map((g) => {
                const mod = assignedModules.find((m) => m.id === g.moduleId);
                return (
                  <div key={`${g.moduleId}-${g.studentId}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{mod ? `${mod.modulo.codigo} · ${mod.modulo.nombre}` : g.moduleId}</span>
                      <span className="text-xs text-slate-500">{g.grade}</span>
                    </div>
                    <p className="text-xs text-slate-600">Alumno: {g.studentName}</p>
                    {g.remark && <p className="text-xs text-slate-500">Obs: {g.remark}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Horario semanal de los módulos asignados */}
      <section className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Horario</p>
          <h2 className="text-xl font-semibold text-slate-800">Bloques semanales (modulos)</h2>
          <p className="text-sm text-slate-500">Vista similar al horario de estudiantes, construida con los modulos asignados.</p>
        </div>
        {moduleEvents.length === 0 ? (
          <p className="text-sm text-slate-600">Aun no hay horarios de modulos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {(['L','M','X','J','V'] as DayCode[]).map((d) => (
                    <th key={d} className="px-3 py-2 text-left text-slate-600">{dayNames[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {hours.map((h) => (
                  <tr key={h}>
                    {(['L','M','X','J','V'] as DayCode[]).map((d) => {
                      const key = `${d}-${h}`;
                      const ev = eventsByStart.get(key);
                      if (ev) {
                        return (
                          <td key={key} className="px-3 py-2 align-top" rowSpan={ev.rows}>
                            <div className={`border rounded p-2 ${colorFor(ev.code)}`}>
                              <div className="text-xs uppercase tracking-wide">{ev.code}</div>
                              <div className="text-sm font-semibold">{ev.name}</div>
                              <div className="text-xs text-slate-700">{fmtHour(ev.start)} - {fmtHour(ev.end)}</div>
                            </div>
                          </td>
                        );
                      }
                      if (occupied.has(key)) return null;
                      return <td key={key} className="px-3 py-2 align-top"></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Tareas por módulo</p>
                <h2 className="text-xl font-semibold text-slate-800">Crear y enviar al módulo seleccionado</h2>
                <p className="text-sm text-slate-500">Selecciona un módulo asignado y publica la tarea para que llegue a sus estudiantes.</p>
              </div>
              <select
                value={selectedModuleForAssignment}
                onChange={(e) => {
                  setSelectedModuleForAssignment(e.target.value);
                  setSelectedAssignment('');
                }}
                className="border border-slate-200 rounded-full px-4 py-2 text-sm"
              >
                <option value="">Elige un módulo...</option>
                {assignedModules.map((mod) => (
                  <option key={mod.id} value={mod.id}>
                    {mod.modulo.codigo} - {mod.modulo.nombre}
                  </option>
                ))}
              </select>
            </div>
            {assignedModules.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no tienes módulos asignados. Solicita al administrador para empezar a publicar tareas.</p>
            ) : (
              <form
                className="grid grid-cols-1 md:grid-cols-4 gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedModuleForAssignment || !title.trim() || !due) {
                    showToast('Completa módulo, título y fecha', 'error');
                    return;
                  }
                  await createAssignment(selectedModuleForAssignment, title, due, desc);
                  setTitle('');
                  setDue('');
                  setDesc('');
                  setAssignments(await listAssignmentsByCourse(selectedModuleForAssignment));
                  showToast('Tarea publicada para el módulo seleccionado', 'success');
                }}
              >
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título"
                  className="border rounded-md p-2"
                  required
                />
                <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="border rounded-md p-2" required />
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Descripción (opcional)"
                  className="border rounded-md p-2 md:col-span-2"
                />
                <div className="md:col-span-4">
                  <button className="w-full bg-gradient-to-r from-iuca-green-600 to-iuca-blue-600 text-white px-4 py-2 rounded-md font-semibold">
                    Publicar tarea
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Próximas tareas</h3>
              <span className="text-xs text-slate-500">{assignmentStats.upcoming.length} próximas</span>
            </div>
            {assignmentStats.upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">No hay tareas próximas programadas.</p>
            ) : (
              <ul className="space-y-3">
                {assignmentStats.upcoming.map((assignment) => (
                  <li key={assignment.id} className="rounded-2xl border border-slate-100 p-3">
                    <p className="text-sm font-semibold text-slate-800">{assignment.title}</p>
                    <p className="text-xs text-slate-500">Vence: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-400">{assignment.description || 'Sin descripción'}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold mb-3">Tareas publicadas</h2>
            {assignments.length === 0 ? (
              <p className="text-slate-600">Aún no publicas tareas.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {assignments.map((assignment) => (
                  <li key={assignment.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{assignment.title}</p>
                      <p className="text-sm text-slate-500">
                        Vence: {new Date(assignment.dueDate).toLocaleDateString()}
                        {assignment.description ? ` · ${assignment.description}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedAssignment(assignment.title)}
                        className="text-iuca-blue-600 hover:underline text-sm font-semibold"
                      >
                        Ver entregas
                      </button>
                      <button
                        onClick={async () => {
                          await deleteAssignment(assignment.id);
                          setAssignments(await listAssignmentsByCourse(selectedModuleForAssignment));
                          if (selectedAssignment === assignment.title) setSelectedAssignment('');
                          showToast('Tarea eliminada', 'info');
                        }}
                        className="text-red-600 hover:underline text-sm font-semibold"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-800">
                Entregas {selectedAssignment && <span className="text-slate-500 text-sm">({selectedAssignment})</span>}
              </h2>
              <span className="text-xs text-slate-500">{assignmentStats.totalSubmissions} entregas registradas</span>
            </div>
            {!selectedAssignment ? (
              <p className="text-slate-600">Selecciona una tarea para revisar entregas.</p>
            ) : submissions.length === 0 ? (
              <p className="text-slate-600">No hay entregas aún.</p>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2">Estudiante</th>
                      <th className="text-left px-3 py-2">Archivo</th>
                      <th className="text-left px-3 py-2">Fecha</th>
                      <th className="text-left px-3 py-2">Calificación</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {submissions.map((submission) => (
                      <tr key={submission.id}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800">{submission.userId}</p>
                          <p className="text-xs text-slate-400">Estado: {submission.status}</p>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span>{submission.fileName || '-'}</span>
                            {submission.fileUrl && (
                              <button
                                type="button"
                                className="text-xs text-iuca-blue-600 font-semibold hover:underline"
                                onClick={() => setPreviewSubmission(submission)}
                              >
                                Ver
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">{new Date(submission.submittedAt).toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={10}
                            defaultValue={submission.grade ?? ''}
                            className="w-20 border rounded p-1"
                            id={`grade-${submission.id}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={async () => {
                              const val = (document.getElementById(`grade-${submission.id}`) as HTMLInputElement).value;
                              const num = Number(val);
                              if (isNaN(num)) return;
                              await gradeSubmission(submission.id, num);
                              setSubmissions(await listSubmissionsByTitle(selectedAssignment));
                              showToast('Calificación guardada', 'success');
                            }}
                            className="text-iuca-green-700 hover:underline text-sm font-semibold"
                          >
                            Guardar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 text-xs text-slate-500">
              {assignmentStats.average !== null
                ? `Promedio de entregas calificadas: ${assignmentStats.average}`
                : 'Aún no hay calificaciones registradas.'}
            </div>
          </div>
        </div>
      </div>
    </div>

      {previewSubmission && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 px-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Archivo recibido</p>
                <h3 className="text-lg font-semibold text-slate-800">{previewSubmission.fileName ?? 'Adjunto'}</h3>
              </div>
              <div className="flex items-center gap-2">
                {previewSubmission.fileUrl && (
                  <a
                    href={previewSubmission.fileUrl}
                    download={previewSubmission.fileName || 'archivo.pdf'}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Descargar
                  </a>
                )}
                <button
                  onClick={() => setPreviewSubmission(null)}
                  className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="max-h-[75vh] overflow-auto px-6 py-4">
              {previewSubmission.fileUrl ? (
                (previewSubmission.fileMime?.includes('pdf') ||
                  previewSubmission.fileName?.toLowerCase().endsWith('.pdf')) ? (
                  <iframe
                    title="Vista previa del trabajo"
                    src={previewSubmission.fileUrl}
                    className="h-[70vh] w-full rounded-lg border border-slate-200"
                  />
                ) : (
                  <p className="text-sm text-slate-600">
                    Este formato no se puede mostrar aquí; utiliza Descargar para revisarlo.
                  </p>
                )
              ) : (
                <p className="text-sm text-slate-600">El estudiante no adjuntó archivos.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AssignmentsPage;


