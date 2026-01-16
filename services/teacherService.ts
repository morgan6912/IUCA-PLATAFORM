import { Course, Role, User } from '../types';
import { listUsers } from './adminService';
import { listModuleAssignments, updateModuleStudents } from './moduleAssignmentService';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export const listTeacherCourses = async (teacherName: string): Promise<Course[]> => {
  if (!API_URL) {
    console.error('VITE_API_URL no configurado; listTeacherCourses retorna []');
    return [];
  }
  const assignments = await listModuleAssignments();
  return assignments
    .filter((a) => a.profesorNombre === teacherName)
    .map((a) => ({
      id: a.id,
      code: a.modulo.codigo,
      name: a.modulo.nombre,
      teacher: a.profesorNombre,
      credits: Math.max(1, Math.round(a.modulo.materias.reduce((sum, m) => sum + m.horas, 0) / 10)),
      schedule: 'Horario según módulo asignado',
      capacity: 30,
      room: 'Por asignar',
      enrolled: false,
      enrolledCount: (a.studentIds || []).length,
      prerequisites: [],
    }));
};

export const listStudents = async (): Promise<User[]> => {
  const users = await listUsers();
  return users.filter((u) => u.role === Role.ESTUDIANTE);
};

export const getRoster = async (courseId: string): Promise<string[]> => {
  if (!API_URL) {
    console.error('VITE_API_URL no configurado; getRoster retorna []');
    return [];
  }
  const assignments = await listModuleAssignments();
  const assignment = assignments.find((a) => a.id === courseId);
  return assignment?.studentIds || [];
};

export const addStudentToRoster = async (courseId: string, studentId: string) => {
  if (!API_URL) {
    console.error('VITE_API_URL no configurado; addStudentToRoster omitido');
    return;
  }
  const assignments = await listModuleAssignments();
  const assignment = assignments.find((a) => a.id === courseId);
  if (!assignment) throw new Error('Asignación no encontrada');
  const set = new Set(assignment.studentIds || []);
  set.add(studentId);
  await updateModuleStudents(courseId, Array.from(set));
};

export const removeStudentFromRoster = async (courseId: string, studentId: string) => {
  if (!API_URL) {
    console.error('VITE_API_URL no configurado; removeStudentFromRoster omitido');
    return;
  }
  const assignments = await listModuleAssignments();
  const assignment = assignments.find((a) => a.id === courseId);
  if (!assignment) return;
  const filtered = (assignment.studentIds || []).filter((id) => id !== studentId);
  await updateModuleStudents(courseId, filtered);
};

export const setAttendance = async (courseId: string, dateISO: string, studentId: string, present: boolean) => {
  if (!API_URL) {
    console.error('VITE_API_URL no configurado; setAttendance omitido');
    return;
  }
  await fetch(`${API_URL}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId, studentId, date: dateISO, present }),
    credentials: 'include',
  });
};

export const getAttendanceForDate = async (courseId: string, dateISO: string): Promise<Record<string, boolean>> => {
  if (!API_URL) {
    console.error('VITE_API_URL no configurado; getAttendanceForDate retorna {}');
    return {};
  }
  const res = await fetch(
    `${API_URL}/attendance?courseId=${encodeURIComponent(courseId)}&date=${encodeURIComponent(dateISO)}`,
    { credentials: 'include' },
  );
  if (!res.ok) throw new Error('Error remoto');
  const rows = await res.json();
  const map: Record<string, boolean> = {};
  (rows as any[]).forEach((row) => {
    map[row.student_id] = !!row.present;
  });
  return map;
};

export const setAttendanceNote = async (courseId: string, dateISO: string, studentId: string, note: string) => {
  if (!API_URL) {
    console.error('VITE_API_URL no configurado; setAttendanceNote omitido');
    return;
  }
  await fetch(`${API_URL}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId, studentId, date: dateISO, present: true, note }),
    credentials: 'include',
  });
};

export const getAttendanceNotes = async (courseId: string, dateISO: string): Promise<Record<string, string>> => {
  if (!API_URL) {
    console.error('VITE_API_URL no configurado; getAttendanceNotes retorna {}');
    return {};
  }
  const res = await fetch(
    `${API_URL}/attendance?courseId=${encodeURIComponent(courseId)}&date=${encodeURIComponent(dateISO)}`,
    { credentials: 'include' },
  );
  if (!res.ok) throw new Error('Error remoto');
  const rows = await res.json();
  const map: Record<string, string> = {};
  (rows as any[]).forEach((row) => {
    if (row.note) map[row.student_id] = row.note;
  });
  return map;
};

export const getAttendanceAllDates = async (
  courseId: string,
): Promise<Record<string, Record<string, boolean>>> => {
  if (!API_URL) {
    console.error('VITE_API_URL no configurado; getAttendanceAllDates retorna {}');
    return {};
  }
  const res = await fetch(`${API_URL}/attendance?courseId=${encodeURIComponent(courseId)}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Error remoto');
  const rows = await res.json();
  const map: Record<string, Record<string, boolean>> = {};
  (rows as any[]).forEach((row) => {
    const d = row.date;
    map[d] = map[d] || {};
    map[d][row.student_id] = !!row.present;
  });
  return map;
};

export const listAttendanceDates = async (courseId: string): Promise<string[]> => {
  const all = await getAttendanceAllDates(courseId);
  return Object.keys(all).sort();
};
