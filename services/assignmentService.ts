import { CourseAssignment } from '../types';
import { mockCourses } from './mockApi';

const KEY = 'iuca-assignments';
const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const apiDelay = async <T,>(d: T, ms = 200): Promise<T> => new Promise((r) => setTimeout(() => r(d), ms));

const read = (): CourseAssignment[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CourseAssignment[]) : [];
  } catch {
    return [];
  }
};
const write = (arr: CourseAssignment[]) => localStorage.setItem(KEY, JSON.stringify(arr));

const mapApi = (row: any): CourseAssignment => ({
  id: String(row.id),
  courseId: row.course_id,
  title: row.title,
  dueDate: row.due_date || '',
  description: row.description || undefined,
});

export const listAssignmentsByCourse = async (courseId: string): Promise<CourseAssignment[]> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/assignments?courseId=${encodeURIComponent(courseId)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      return (data as any[]).map(mapApi);
    } catch (err) {
      console.error('Fallo listAssignmentsByCourse, uso local', err);
    }
  }
  return apiDelay(read().filter((a) => a.courseId === courseId));
};

export const createAssignment = async (
  courseId: string,
  title: string,
  dueDate: string,
  description?: string,
  teacherId?: string,
): Promise<CourseAssignment> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, title, dueDate, description, teacherId }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      return mapApi(data);
    } catch (err) {
      console.error('Fallo createAssignment, uso local', err);
    }
  }
  const arr = read();
  const item: CourseAssignment = {
    id: `as-${Date.now()}`,
    courseId,
    title: title.trim(),
    dueDate,
    description: description?.trim(),
  };
  arr.unshift(item);
  write(arr);
  return apiDelay(item);
};

export const deleteAssignment = async (id: string): Promise<void> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/assignments/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('fail');
      return;
    } catch (err) {
      console.error('Fallo deleteAssignment, uso local', err);
    }
  }
  write(read().filter((a) => a.id !== id));
  await apiDelay(undefined);
};

export const listAllAssignments = async (): Promise<CourseAssignment[]> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/assignments`, { credentials: 'include' });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      return (data as any[]).map(mapApi);
    } catch (err) {
      console.error('Fallo listAllAssignments, uso local', err);
    }
  }
  return apiDelay(read());
};

// Cursos del docente: se infiere por nombre del docente en mockCourses
export const listTeacherCourses = (teacherName: string) => {
  return mockCourses.filter((c) => c.teacher === teacherName);
};
