import React, { useEffect, useMemo, useState } from 'react';
import { Course, User, Role } from '../types';
import { mockCourses } from '../services/mockApi';
import { listAdminCourses, createAdminCourse, deleteAdminCourse } from '../services/courseService';
import {
  listStudents,
} from '../services/teacherService';
import { panelClass } from '../components/shared/ui';
import { useToast } from '../components/shared/ToastProvider';
import {
  listModuleAssignments,
  createModuleAssignment,
  deleteModuleAssignment,
  updateModuleStudents,
  ModuleProfessorAssignment,
  ModuleScheduleDefinition,
} from '../services/moduleAssignmentService';
import { listUsers } from '../services/adminService';
import { listModulesCatalog, ModuleCatalogEntry } from '../services/moduleCatalogService';

type ModuleSubject = {
  clave: string;
  nombre: string;
  horas: number;
  titular: string;
  horario: Record<string, string>;
  modalidad: 'Presencial' | 'Mixta' | 'En línea';
  turno: 'Matutino' | 'Vespertino';
  grupo: string;
  semanas: number;
  observaciones?: string;
};

type Professor = {
  id: string;
  name: string;
  activo: boolean;
};

const MODULES_FORMATO13: Record<string, ModuleScheduleDefinition> = {
  FOT101: {
    codigo: 'FOT101',
    nombre: 'Fundamentos de Fotogrametría',
    periodo: { inicio: '2026-02-01', fin: '2026-04-30', semanas: 12, vacacional: '2026-03-25/2026-03-29' },
    materias: [
      {
        clave: 'FOT101',
        nombre: 'Fotogrametría Digital',
        horas: 30,
        titular: 'Por asignar',
        horario: { Lunes: '09:00-14:00', Martes: '09:00-13:00', Miércoles: '09:00-13:00' },
        modalidad: 'Presencial',
        turno: 'Matutino',
        grupo: 'A',
        semanas: 12,
        observaciones: 'Laboratorio semanal',
      },
      {
        clave: 'BDG102',
        nombre: 'Base de Datos Geográficas',
        horas: 24,
        titular: 'Por asignar',
        horario: { Jueves: '09:00-13:00', Viernes: '09:00-13:00' },
        modalidad: 'Mixta',
        turno: 'Matutino',
        grupo: 'A',
        semanas: 12,
      },
    ],
  },
  FOT201: {
    codigo: 'FOT201',
    nombre: 'Fotogrametría Avanzada',
    periodo: { inicio: '2026-05-05', fin: '2026-07-31', semanas: 12, regularizacion: '2026-07-25/2026-07-31' },
    materias: [
      {
        clave: 'FOT201',
        nombre: 'Fotogrametría Terrestre y Aérea',
        horas: 32,
        titular: 'Por asignar',
        horario: { Lunes: '09:00-14:00', Martes: '09:00-13:00', Miércoles: '09:00-13:00' },
        modalidad: 'Presencial',
        turno: 'Matutino',
        grupo: 'B',
        semanas: 12,
        observaciones: 'Incluye prácticas de campo',
      },
      {
        clave: 'GIS203',
        nombre: 'Sistemas de Información Geográfica',
        horas: 24,
        titular: 'Por asignar',
        horario: { Jueves: '09:00-13:00', Viernes: '09:00-13:00' },
        modalidad: 'Mixta',
        turno: 'Matutino',
        grupo: 'B',
        semanas: 12,
      },
      {
        clave: 'DEM301',
        nombre: 'Modelos Digitales de Elevación',
        horas: 20,
        titular: 'Por asignar',
        horario: { Viernes: '13:00-15:00' },
        modalidad: 'En línea',
        turno: 'Vespertino',
        grupo: 'B',
        semanas: 10,
      },
    ],
  },
  PROY300: {
    codigo: 'PROY300',
    nombre: 'Proyectos Integradores',
    periodo: { inicio: '2026-08-05', fin: '2026-11-01', semanas: 12 },
    materias: [
      {
        clave: 'PI302',
        nombre: 'Proyecto Integrador',
        horas: 30,
        titular: 'Por asignar',
        horario: { Lunes: '09:00-13:00', Miércoles: '09:00-13:00' },
        modalidad: 'Mixta',
        turno: 'Matutino',
        grupo: 'C',
        semanas: 12,
      },
      {
        clave: 'PF303',
        nombre: 'Proyecto Final',
        horas: 24,
        titular: 'Por asignar',
        horario: { Jueves: '09:00-13:00', Viernes: '09:00-13:00' },
        modalidad: 'Presencial',
        turno: 'Matutino',
        grupo: 'C',
        semanas: 12,
        observaciones: 'Presentación final en la semana 12',
      },
    ],
  },
};

const PROFESSORS_FALLBACK: Professor[] = [
  { id: 'p1', name: 'Dr. Carlos Morales', activo: true },
  { id: 'p2', name: 'Mtra. Laura Díaz', activo: true },
  { id: 'p3', name: 'Ing. Ricardo Vega', activo: false },
  { id: 'p4', name: 'Dra. Sofía Ríos', activo: true },
];

const AdminCoursesPage: React.FC = () => {
  const { showToast } = useToast();
  const [adminCourses, setAdminCourses] = useState<Course[]>([]);
  const [moduleCatalog, setModuleCatalog] = useState<ModuleCatalogEntry[]>([]);
  const [moduleKey, setModuleKey] = useState<string>('');
  const [rosterCourse, setRosterCourse] = useState<string>('');
  const [roster, setRoster] = useState<User[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [moduleAssignments, setModuleAssignments] = useState<ModuleProfessorAssignment[]>([]);
  const rosterCourseOptions = useMemo(
    () =>
      moduleAssignments.map((assignment) => ({
        id: assignment.id,
        code: assignment.modulo.codigo,
        name: assignment.modulo.nombre,
      })),
    [moduleAssignments],
  );
  const [selectedProfessor, setSelectedProfessor] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [professors, setProfessors] = useState<Professor[]>([]);
  const normalizeAssignments = (entries: any[]): ModuleProfessorAssignment[] =>
    entries
      .filter((entry: any) => entry && entry.modulo)
      .map(
        (entry: any): ModuleProfessorAssignment => ({
          ...entry,
          id: entry.id ?? `${Date.now()}`,
          studentIds: Array.isArray(entry.studentIds) ? entry.studentIds : [],
        }),
      );

  const reloadAssignments = async () => {
    try {
      const data = await listModuleAssignments();
      setModuleAssignments(normalizeAssignments(data));
    } catch {
      /* noop */
    }
  };

  const reloadAdminCourses = () => listAdminCourses().then(setAdminCourses);
  const reloadStudents = () => listStudents().then(setAllStudents);
  const reloadProfessors = () =>
    listUsers()
      .then((users) =>
        users
          .filter((u) => u.role === Role.DOCENTE)
          .map((u) => ({ id: u.id, name: u.name, activo: true }) as Professor),
      )
      .then((arr) => setProfessors(arr.length ? arr : PROFESSORS_FALLBACK))
      .catch(() => setProfessors(PROFESSORS_FALLBACK));
  const reloadModuleCatalog = () =>
    listModulesCatalog()
      .then((mods) => {
        setModuleCatalog(mods);
        if (!moduleKey && mods.length) setModuleKey(mods[0].code);
        if (!selectedModule && mods.length) setSelectedModule(mods[0].code);
      })
      .catch(() => {});

  useEffect(() => {
    reloadAdminCourses();
    reloadStudents();
    reloadAssignments();
    reloadProfessors();
    reloadModuleCatalog();
  }, []);

  // Sincronizar roster desde asignaciones persistidas
  useEffect(() => {
    if (!rosterCourse) {
      setRoster([]);
      return;
    }
    const assignment = moduleAssignments.find((asign) => asign.id === rosterCourse);
    if (!assignment) {
      setRoster([]);
      return;
    }
    const ids = assignment.studentIds || [];
    setRoster(allStudents.filter((student) => ids.includes(student.id)));
  }, [rosterCourse, allStudents, moduleAssignments, rosterCourseOptions]);

  const availableForRoster = useMemo(
    () => allStudents.filter((student) => !roster.some((entry) => entry.id === student.id)),
    [allStudents, roster],
  );
  const studentLookup = useMemo(() => {
    const lookup: Record<string, User> = {};
    allStudents.forEach((student) => {
      lookup[student.id] = student;
    });
    return lookup;
  }, [allStudents]);
  const moduleSummary = useMemo(
    () =>
      moduleAssignments.map((assignment) => ({
        id: assignment.id,
        codigo: assignment.modulo.codigo,
        nombre: assignment.modulo.nombre,
        profesor: assignment.profesorNombre,
        materias: assignment.modulo.materias.length,
        horasTotales: assignment.modulo.materias.reduce((sum, materia) => sum + materia.horas, 0),
        periodo: `${assignment.modulo.periodo.inicio} → ${assignment.modulo.periodo.fin}`,
        estudiantes: assignment.studentIds.length,
      })),
    [moduleAssignments],
  );
  const syncModuleStudentMembership = async (courseId: string, studentId: string, action: 'add' | 'remove') => {
    const assignment = moduleAssignments.find((asign) => asign.id === courseId);
    if (!assignment) return;
    let updated: ModuleProfessorAssignment[] = [];
    setModuleAssignments((prev) => {
      updated = prev.map((assignment) => {
        if (assignment.id !== courseId) return assignment;
        const current = assignment.studentIds || [];
        const hasStudent = current.includes(studentId);
        if (action === 'add' && !hasStudent) {
          return { ...assignment, studentIds: [...current, studentId] };
        }
        if (action === 'remove' && hasStudent) {
          return { ...assignment, studentIds: current.filter((id) => id !== studentId) };
        }
        return assignment;
      });
      return updated;
    });
    const target = updated.find((assignment) => assignment.id === courseId);
    if (target) {
      try {
        await updateModuleStudents(target.id, target.studentIds || []);
      } catch (err: any) {
        // revert state if backend rechaza
        await reloadAssignments();
        showToast(err?.message || 'No se pudo guardar en la base de datos', 'error');
      }
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    await deleteAdminCourse(courseId);
    await reloadAdminCourses();
    showToast('Curso eliminado', 'info');
  };

  const handleAddModuleAsCourse = async () => {
    const module = moduleCatalog.find((m) => m.code === moduleKey);
    if (!module) {
      showToast('Selecciona un módulo del catálogo', 'error');
      return;
    }
    const alreadyExists = adminCourses.some((course) => course.code === module.code);
    if (alreadyExists) {
      showToast('Este módulo ya existe en el catálogo', 'info');
      return;
    }
    await createAdminCourse({
      id: module.code,
      code: module.code,
      name: module.name,
      teacher: module.teacherSuggested || 'Por asignar',
      credits: Math.max(1, Math.round((module.hours ?? 10) / 10)),
      schedule: module.schedule || 'Horario por definir',
      capacity: 30,
      room: 'Por asignar',
      enrolled: false,
      enrolledCount: 0,
      prerequisites: [],
    });
    await reloadAdminCourses();
    showToast(`Módulo ${module.code} agregado`, 'success');
  };

  const handleAddToRoster = async (studentId: string) => {
    if (!rosterCourse) return;
    const assignment = moduleAssignments.find((asign) => asign.id === rosterCourse);
    if (!assignment) {
      showToast('Primero asigna un profesor al módulo', 'error');
      return;
    }
    const added = allStudents.find((s) => s.id === studentId);
    if (added) setRoster((prev) => [...prev, added]);
    await syncModuleStudentMembership(rosterCourse, studentId, 'add');
    showToast('Estudiante agregado al curso', 'success');
  };

  const handleRemoveFromRoster = async (studentId: string) => {
    if (!rosterCourse) return;
    const assignment = moduleAssignments.find((asign) => asign.id === rosterCourse);
    if (!assignment) return;
    setRoster((prev) => prev.filter((s) => s.id !== studentId));
    await syncModuleStudentMembership(rosterCourse, studentId, 'remove');
    showToast('Estudiante eliminado del curso', 'info');
  };

  const obtenerDatosModulo = (codigo: string) => MODULES_FORMATO13[codigo];
  const obtenerModuloDeCatalogo = (code: string): ModuleScheduleDefinition | null => {
    const mod = moduleCatalog.find((m) => m.code === code);
    if (!mod) return null;
    return {
      codigo: mod.code,
      nombre: mod.name,
      periodo: { inicio: 'Por definir', fin: 'Por definir', semanas: 12 },
      materias: [
        {
          clave: mod.code,
          nombre: mod.name,
          horas: mod.hours ?? 10,
          titular: mod.teacherSuggested || 'Por asignar',
          horario: mod.schedule ? { Horario: mod.schedule } : { Horario: 'Por definir' },
          modalidad: 'Presencial',
          turno: 'Matutino',
          grupo: 'A',
          semanas: 12,
          observaciones: mod.description || '',
        },
      ],
    };
  };

  const generarHorario = (modulo: ModuleScheduleDefinition) =>
    modulo.materias.flatMap((materia) =>
      Object.entries(materia.horario).map(([dia, rango]) => ({
        dia,
        rango,
      })),
    );

  const validarTraslapes = (modulo: ModuleScheduleDefinition, profesorId: string) => {
    const existentes = moduleAssignments.filter((asign) => asign.profesorId === profesorId);
    const horarioNuevo = generarHorario(modulo);
    for (const asign of existentes) {
      const horarioExistente = generarHorario(asign.modulo);
      for (const nuevo of horarioNuevo) {
        for (const existente of horarioExistente) {
          if (nuevo.dia === existente.dia) {
            const [inicioNuevo, finNuevo] = nuevo.rango.split('-');
            const [inicioExistente, finExistente] = existente.rango.split('-');
            const toMinutes = (valor: string) => {
              const [h, m] = valor.split(':').map(Number);
              return h * 60 + m;
            };
            if (toMinutes(inicioNuevo) < toMinutes(finExistente) && toMinutes(inicioExistente) < toMinutes(finNuevo)) {
              return `Traslape detectado el ${nuevo.dia} (${nuevo.rango} vs ${existente.rango})`;
            }
          }
        }
      }
    }
    return null;
  };

  const insertarAsignaturaEnProfesor = async (profesorId: string, modulo: ModuleScheduleDefinition, profesorNombre: string) => {
    const created = await createModuleAssignment({ profesorId, profesorNombre, modulo, studentIds: [] });
    setModuleAssignments((prev) => [...prev, created]);
  };
  const handleRemoveAssignment = async (assignmentId: string) => {
    await deleteModuleAssignment(assignmentId);
    setModuleAssignments((prev) => prev.filter((assignment) => assignment.id !== assignmentId));
  };

  const cargarModuloProfesor = async () => {
    if (!selectedProfessor) {
      showToast('Selecciona un profesor', 'error');
      return;
    }
    const profesor = professors.find((prof) => prof.id === selectedProfessor);
    if (!profesor || !profesor.activo) {
      showToast('El profesor debe estar activo', 'error');
      return;
    }
    const modulo = obtenerModuloDeCatalogo(selectedModule) || obtenerDatosModulo(selectedModule);
    if (!modulo) {
      showToast('Módulo no encontrado', 'error');
      return;
    }
    if (moduleAssignments.some((asign) => asign.profesorId === profesor.id && asign.modulo.codigo === modulo.codigo)) {
      showToast('Este módulo ya está asignado a este profesor', 'error');
      return;
    }
    const conflicto = validarTraslapes(modulo, profesor.id);
    if (conflicto) {
      showToast(conflicto, 'error');
      return;
    }
    await insertarAsignaturaEnProfesor(profesor.id, modulo, profesor.name);
    showToast('Módulo asignado correctamente', 'success');
  };

  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-gradient-to-r from-iuca-blue-600 to-iuca-green-600 p-8 text-white shadow-xl">
        <p className="text-xs uppercase tracking-[0.4em] text-blue-100">IUCA · Gestión académica</p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de módulos</h1>
            <p className="text-slate-100 text-sm max-w-2xl">
              Diseña el catálogo modular institucional y controla qué estudiantes pertenecen a cada módulo.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex flex-col rounded-2xl bg-white/15 px-4 py-3 shadow-sm">
              <span className="text-xs text-white uppercase">Cursos activos</span>
              <strong className="text-2xl font-bold">{adminCourses.length}</strong>
            </div>
            <div className="flex flex-col rounded-2xl bg-white/15 px-4 py-3 shadow-sm">
              <span className="text-xs text-white uppercase">Estudiantes registrados</span>
              <strong className="text-2xl font-bold">{allStudents.length}</strong>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">

        <article className="space-y-4 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Agregar módulo referencial</h2>
              <p className="text-sm text-slate-500">Utiliza el catálogo FORMATO 13 para crear un módulo operativo.</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm text-slate-700">
              Selecciona módulo
              <select
                value={moduleKey}
                onChange={(e) => setModuleKey(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              >
                {moduleCatalog.map((mod) => (
                  <option key={mod.code} value={mod.code}>
                    {mod.code} - {mod.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
              {(() => {
                const mod = moduleCatalog.find((m) => m.code === moduleKey);
                if (!mod) {
                  return <p className="text-xs text-slate-500">Selecciona un modulo del catalogo.</p>;
                }
                return (
                  <>
                    <p className="font-semibold text-slate-900">{mod.name}</p>
                    <p>{mod.description}</p>
                    <p className="text-xs mt-2">
                      Horario: {mod.schedule || 'Por definir'} - Horas: {mod.hours ?? 'N/A'} - Docente sugerido: {mod.teacherSuggested || 'Por asignar'}
                    </p>
                  </>
                );
              })()}
            </div>
            <button
              onClick={handleAddModuleAsCourse}
              className="rounded-2xl bg-gradient-to-r from-iuca-blue-600 to-iuca-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
            >
              Agregar módulo al catálogo
            </button>
          </div>
        </article>

        <aside className="space-y-4 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Indicadores rápidos</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <span>Cursos visibles</span>
              <strong className="text-slate-900">{adminCourses.length}</strong>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <span>Capacidad total</span>
              <strong className="text-slate-900">{adminCourses.reduce((sum, c) => sum + c.capacity, 0)}</strong>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <span>Estudiantes registrados</span>
              <strong className="text-slate-900">{allStudents.length}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Módulos operativos</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {adminCourses.map((course) => (
            <article key={course.id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-iuca-blue-50 px-3 py-1 text-xs font-semibold text-iuca-blue-600">
                  {course.code}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {course.capacity} cupos
                </span>
              </div>
              <h3 className="mt-3 text-xl font-semibold text-slate-900">{course.name}</h3>
              <p className="text-sm text-slate-500">{course.teacher || 'Docente pendiente'}</p>
              <p className="mt-2 text-sm text-slate-500">{course.schedule}</p>
              <div className="mt-5 flex items-center justify-between">
                <button
                  className="text-rose-600 hover:text-rose-900 text-xs font-semibold"
                  onClick={() => handleDeleteCourse(course.id)}
                >
                  Eliminar
                </button>
                <span className="text-xs text-slate-400">Créditos: {course.credits}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${panelClass} space-y-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Asignar módulo a profesor</h2>
            <p className="text-sm text-slate-500">
              Selecciona un módulo académico y un profesor activo; el sistema cargará materias, horarios y periodo automáticamente.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col text-sm text-slate-700">
            Profesor activo
            <select
              value={selectedProfessor}
              onChange={(e) => setSelectedProfessor(e.target.value)}
              className="mt-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Selecciona profesor...</option>
              {professors.map((prof) => (
                <option key={prof.id} value={prof.id} disabled={!prof.activo}>
                  {prof.name} {prof.activo ? '' : '(Receso)'}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm text-slate-700">
            Módulo académico
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="mt-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            >
              {moduleCatalog.map((mod) => (
                <option key={mod.code} value={mod.code}>
                  {mod.code} · {mod.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              onClick={cargarModuloProfesor}
              className="w-full rounded-2xl bg-gradient-to-r from-iuca-blue-600 to-iuca-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
            >
              Cargar módulo al profesor
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          {(() => {
            const mod = moduleCatalog.find((m) => m.code === selectedModule);
            if (!mod) return <p className="text-xs text-slate-500">Selecciona un módulo para ver detalles.</p>;
            return (
              <>
                <p className="font-semibold text-slate-900">{mod.name}</p>
                <p className="text-xs text-slate-500">{mod.description}</p>
                <p className="text-xs text-slate-500">
                  Horario: {mod.schedule || 'Por definir'} · Horas: {mod.hours ?? 'N/A'} · Docente sugerido:{' '}
                  {mod.teacherSuggested || 'Por asignar'}
                </p>
              </>
            );
          })()}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Módulos asignados</h3>
          {moduleAssignments.length === 0 && (
            <p className="text-sm text-slate-500">No hay módulos asignados todavía.</p>
          )}
          {moduleAssignments.map((asignacion) => {
            const studentIds = asignacion.studentIds || [];
            const studentNames = studentIds.map((id) => studentLookup[id]?.name ?? `ID ${id}`);
            const highlighted = studentNames.slice(0, 4);
            const remaining = studentNames.length - highlighted.length;
            return (
              <div key={asignacion.id} className="rounded-2xl border border-slate-100 bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {asignacion.modulo.codigo} · {asignacion.modulo.nombre}
                    </p>
                    <p className="text-xs text-slate-500">Profesor: {asignacion.profesorNombre}</p>
                    <p className="text-xs text-slate-500">
                      Periodo: {asignacion.modulo.periodo.inicio} · {asignacion.modulo.periodo.fin}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-slate-400">{asignacion.modulo.periodo.semanas} semanas</span>
                    <button
                      onClick={() => handleRemoveAssignment(asignacion.id)}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-800"
                    >
                      Quitar módulo
                    </button>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                  {asignacion.modulo.materias.map((materia) => (
                    <div key={`${asignacion.id}-${materia.clave}`} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
                      <strong>{materia.clave}</strong> · {materia.nombre}
                      <div className="text-[11px] text-slate-500">
                        {Object.entries(materia.horario).map(([dia, horario]) => `${dia}: ${horario}`).join(' · ')}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <p className="font-semibold text-slate-700">
                    {studentIds.length} {studentIds.length === 1 ? 'estudiante' : 'estudiantes'} asignados
                  </p>
                  {studentIds.length === 0 ? (
                    <p className="text-slate-500">Aún no hay alumnos en este módulo.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {highlighted.map((name) => (
                        <span key={`${asignacion.id}-${name}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          {name}
                        </span>
                      ))}
                      {remaining > 0 && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600">
                          +{remaining} más
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Resumen ejecutivo</h2>
            <p className="text-sm text-slate-500">Horas totales, materias y matrícula por módulo asignado.</p>
          </div>
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{moduleSummary.length} módulos</span>
        </div>
        {moduleSummary.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay módulos asignados; registra uno para ver estadísticas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Módulo</th>
                  <th className="px-3 py-2 text-left font-semibold">Profesor</th>
                  <th className="px-3 py-2 text-left font-semibold">Materias</th>
                  <th className="px-3 py-2 text-left font-semibold">Horas</th>
                  <th className="px-3 py-2 text-left font-semibold">Estudiantes</th>
                  <th className="px-3 py-2 text-left font-semibold">Periodo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {moduleSummary.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-800">
                      <div className="font-semibold">{row.codigo}</div>
                      <div className="text-xs text-slate-500">{row.nombre}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{row.profesor}</td>
                    <td className="px-3 py-2 text-slate-600">{row.materias}</td>
                    <td className="px-3 py-2 text-slate-600">{row.horasTotales}h</td>
                    <td className="px-3 py-2 text-slate-600">{row.estudiantes}</td>
                    <td className="px-3 py-2 text-slate-500">{row.periodo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`${panelClass} space-y-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Asignar estudiantes a módulo</h2>
            <p className="text-sm text-slate-500">
              Selecciona un módulo activo y administra qué alumnos pertenecen a él.
            </p>
          </div>
          <select
            value={rosterCourse}
            onChange={(e) => setRosterCourse(e.target.value)}
            className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm focus:outline-none focus:border-iuca-blue-500"
          >
            <option value="">Selecciona un módulo...</option>
            {rosterCourseOptions.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} – {course.name}
              </option>
            ))}
          </select>
        </div>

        {rosterCourse ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{roster.length} estudiantes inscritos</p>
            <div className="flex flex-wrap gap-2">
              {roster.map((student) => (
                <span
                  key={student.id}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs"
                >
                  {student.name}
                  <button
                    type="button"
                    className="text-rose-500 hover:text-rose-700"
                    onClick={() => handleRemoveFromRoster(student.id)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-500">Agregar estudiante:</span>
              <select
                value=""
                onChange={(e) => {
                  handleAddToRoster(e.target.value);
                  e.target.value = '';
                }}
                className="border border-slate-300 rounded-full px-3 py-1 text-sm"
              >
                <option value="">Escoge estudiante...</option>
                {availableForRoster.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} — {student.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Selecciona un módulo para empezar a gestionar su matrícula.</p>
        )}
      </section>
    </div>
  );
};

export default AdminCoursesPage;

