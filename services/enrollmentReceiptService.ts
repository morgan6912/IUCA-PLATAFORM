import { Course } from '../types';

const RECEIPTS_KEY = 'iuca-enrollment-receipts';

export type EnrollmentReceipt = {
  id: string;
  userId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  teacher: string;
  schedule: string;
  credits: number;
  generatedAt: string;
  status: 'confirmado';
};

const readReceipts = (): EnrollmentReceipt[] => {
  try {
    const raw = localStorage.getItem(RECEIPTS_KEY);
    return raw ? (JSON.parse(raw) as EnrollmentReceipt[]) : [];
  } catch {
    return [];
  }
};

const writeReceipts = (items: EnrollmentReceipt[]) => {
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(items));
};

export const createEnrollmentReceipt = (userId: string, course: Course): EnrollmentReceipt => {
  const newReceipt: EnrollmentReceipt = {
    id: `rc-${Date.now()}`,
    userId,
    courseId: course.id,
    courseCode: course.code,
    courseName: course.name,
    teacher: course.teacher,
    schedule: course.schedule,
    credits: course.credits,
    generatedAt: new Date().toISOString(),
    status: 'confirmado',
  };
  const current = readReceipts();
  current.unshift(newReceipt);
  writeReceipts(current);
  return newReceipt;
};

export const listReceiptsByUser = async (userId: string): Promise<EnrollmentReceipt[]> => {
  const receipts = readReceipts().filter((receipt) => receipt.userId === userId);
  return receipts.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
};

export const getReceiptById = (receiptId: string): EnrollmentReceipt | undefined => {
  return readReceipts().find((receipt) => receipt.id === receiptId);
};
