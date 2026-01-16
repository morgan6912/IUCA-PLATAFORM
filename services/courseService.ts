import { Course, Enrollment, WaitlistEntry } from '../types';
import { mockCourses } from './mockApi';
import { getAcademicHistory } from './academicService';

const ENROLLMENTS_KEY = 'iuca-enrollments';
const WAITLIST_KEY = 'iuca-waitlist';
const ADMIN_COURSES_KEY = 'iuca-admin-courses';
const TEACHER_ASSIGNMENTS_KEY = 'iuca-teacher-assignments';
export const MAX_CREDITS = 20;

const apiDelay = async <T,>(data: T, ms = 300): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

const readEnrollments = (): Enrollment[] => {
  try {
    const raw = localStorage.getItem(ENROLLMENTS_KEY);
    return raw ? (JSON.parse(raw) as Enrollment[]) : [];
  } catch {
    return [];
  }
};

const writeEnrollments = (items: Enrollment[]) => {
  localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(items));
};

const readWaitlist = (): WaitlistEntry[] => {
  try {
    const raw = localStorage.getItem(WAITLIST_KEY);
    return raw ? (JSON.parse(raw) as WaitlistEntry[]) : [];
  } catch {
    return [];
  }
};

const writeWaitlist = (items: WaitlistEntry[]) => {
  localStorage.setItem(WAITLIST_KEY, JSON.stringify(items));
};

const readAdminCourses = (): Course[] => {
  try {
    const raw = localStorage.getItem(ADMIN_COURSES_KEY);
    return raw ? (JSON.parse(raw) as Course[]) : [];
  } catch {
    return [];
  }
};

const writeAdminCourses = (items: Course[]) => {
  localStorage.setItem(ADMIN_COURSES_KEY, JSON.stringify(items));
};

const readTeacherAssignments = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(TEACHER_ASSIGNMENTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
};

const writeTeacherAssignments = (map: Record<string, string>) => {
  localStorage.setItem(TEACHER_ASSIGNMENTS_KEY, JSON.stringify(map));
};

const ensurePrerequisites = (course: Course): Course => ({
  ...course,
  prerequisites: course.prerequisites ?? [],
});

const getLocalCourseSet = (): Course[] => [...mockCourses, ...readAdminCourses()].map(ensurePrerequisites);

export const listAdminCourses = async (): Promise<Course[]> => {
  const courses = readAdminCourses().map(ensurePrerequisites);
  return apiDelay(courses);
};

export const listAllCourses = async (): Promise<Course[]> => {
  const admin = readAdminCourses().map(ensurePrerequisites);
  return apiDelay([...mockCourses, ...admin]);
};

export const assignTeacherToCourse = async (courseId: string, teacherName: string): Promise<void> => {
  const assignments = readTeacherAssignments();
  assignments[courseId] = teacherName;
  writeTeacherAssignments(assignments);
  return apiDelay(undefined);
};

export const listTeacherAssignments = async (): Promise<Record<string, string>> => {
  return apiDelay(readTeacherAssignments());
};

export const createAdminCourse = async (
  data: Omit<Course, 'id' | 'enrolled' | 'enrolledCount'>,
): Promise<Course> => {
  const existing = readAdminCourses();
  const course: Course = {
    ...data,
    id: `adm-${Date.now()}`,
    enrolled: false,
    enrolledCount: 0,
    prerequisites: data.prerequisites ?? [],
  };
  writeAdminCourses([...existing, course]);
  return apiDelay(course);
};

export const deleteAdminCourse = async (courseId: string): Promise<void> => {
  const existing = readAdminCourses();
  writeAdminCourses(existing.filter((course) => course.id !== courseId));
  return apiDelay(undefined);
};

export const getCourses = async (userId: string): Promise<Course[]> => {
  const enrollments = readEnrollments().filter((item) => item.userId === userId);
  const enrolledSet = new Set(enrollments.map((item) => item.courseId));
  const result = getLocalCourseSet().map((course) => ({
    ...course,
    enrolled: enrolledSet.has(course.id),
  }));
  return apiDelay(result);
};

export const enroll = async (userId: string, courseId: string): Promise<void> => {
  if (!userId) return;
  const enrollments = readEnrollments();
  const exists = enrollments.some((item) => item.userId === userId && item.courseId === courseId);
  if (exists) return apiDelay(undefined);
  const allCourses = getLocalCourseSet();
  const course = allCourses.find((item) => item.id === courseId);
  if (!course) throw new Error('Curso no encontrado');
  if (course.enrolledCount >= course.capacity) {
    const wl = readWaitlist();
    const alreadyWaitlisted = wl.some((entry) => entry.userId === userId && entry.courseId === courseId);
    if (alreadyWaitlisted) throw new Error('Ya estás en la lista de espera');
    wl.push({ userId, courseId, requestedAt: new Date().toISOString() });
    writeWaitlist(wl);
    throw new Error('Curso lleno: fuiste agregado a la lista de espera');
  }

  const current = allCourses.filter((item) =>
    enrollments.some((e) => e.userId === userId && e.courseId === item.id),
  );
  const currCredits = current.reduce((acc, c) => acc + c.credits, 0);
  if (currCredits + course.credits > MAX_CREDITS) {
    throw new Error(`Excede el límite de ${MAX_CREDITS} créditos`);
  }
  const conflict = current.some((item) => item.schedule === course.schedule);
  if (conflict) {
    throw new Error('Conflicto de horario con otra asignatura');
  }
  const history = await getAcademicHistory(userId);
  const approved = new Set(history.map((record) => record.code));
  const missing = (course.prerequisites || []).filter((pre) => !approved.has(pre));
  if (missing.length > 0) {
    throw new Error(`Faltan prerrequisitos: ${missing.join(', ')}`);
  }

  const nextEnrollments = [...enrollments, { userId, courseId, enrolledAt: new Date().toISOString() }];
  writeEnrollments(nextEnrollments);
  return apiDelay(undefined);
};

export const unenroll = async (userId: string, courseId: string): Promise<void> => {
  if (!userId) return;
  const items = readEnrollments();
  const next = items.filter((item) => !(item.userId === userId && item.courseId === courseId));
  writeEnrollments(next);
  const wl = readWaitlist();
  const queue = wl.filter((entry) => entry.courseId === courseId);
  if (queue.length) {
    const nextInLine = queue[0];
    const removeIndex = wl.findIndex(
      (entry) =>
        entry.userId === nextInLine.userId &&
        entry.courseId === courseId &&
        entry.requestedAt === nextInLine.requestedAt,
    );
    const remaining = removeIndex === -1 ? wl : [...wl.slice(0, removeIndex), ...wl.slice(removeIndex + 1)];
    writeWaitlist(remaining);
    const updatedEnrollments = readEnrollments();
    updatedEnrollments.push({ userId: nextInLine.userId, courseId, enrolledAt: new Date().toISOString() });
    writeEnrollments(updatedEnrollments);
  }
  return apiDelay(undefined);
};

export const getMyCourses = async (userId: string): Promise<Course[]> => {
  const all = await getCourses(userId);
  return all.filter((course) => course.enrolled);
};

export const isWaitlisted = (userId: string, courseId: string): boolean => {
  return readWaitlist().some((entry) => entry.userId === userId && entry.courseId === courseId);
};

export const leaveWaitlist = async (userId: string, courseId: string) => {
  const wl = readWaitlist().filter((entry) => !(entry.userId === userId && entry.courseId === courseId));
  writeWaitlist(wl);
  return apiDelay(undefined);
};

export const waitlistPosition = (userId: string, courseId: string): number | null => {
  const wl = readWaitlist().filter((entry) => entry.courseId === courseId);
  const idx = wl.findIndex((entry) => entry.userId === userId);
  return idx >= 0 ? idx + 1 : null;
};
