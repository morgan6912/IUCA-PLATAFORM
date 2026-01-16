import { Course } from '../types';
import { mockCourses } from './mockApi';
import { readFileSync } from 'fs';

export interface HistoryRecord {
  id: string;
  courseId: string;
  code: string;
  name: string;
  semester: string;
  credits: number;
  grade: number;
  status: 'aprobado' | 'reprobado';
}

const apiDelay = async <T,>(data: T, ms = 200): Promise<T> => new Promise(r => setTimeout(() => r(data), ms));

// Datos de ejemplo derivados del mock de cursos
export const getAcademicHistory = async (userId: string): Promise<HistoryRecord[]> => {
  const base = mockCourses.slice(0, 4).map((c, idx) => ({
    id: `${userId}-${c.id}`,
    courseId: c.id,
    code: c.code,
    name: c.name,
    semester: `202${idx}-S${(idx % 2) + 1}`,
    credits: c.credits,
    grade: 8 + (idx % 3) * 0.5,
    status: 'aprobado' as const,
  }));
  return apiDelay(base);
};

export const getGPA = async (userId: string): Promise<number> => {
  const hist = await getAcademicHistory(userId);
  const sum = hist.reduce((acc, r) => acc + r.grade * r.credits, 0);
  const credits = hist.reduce((acc, r) => acc + r.credits, 0);
  return apiDelay(Number((sum / credits).toFixed(2)));
};

