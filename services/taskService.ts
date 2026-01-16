import { TaskSubmission } from '../types';

const TASKS_KEY = 'iuca-tasks';
const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const apiDelay = async <T,>(d: T, ms = 200): Promise<T> => new Promise((r) => setTimeout(() => r(d), ms));

const read = (): TaskSubmission[] => {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? (JSON.parse(raw) as TaskSubmission[]) : [];
  } catch {
    return [];
  }
};

const write = (arr: TaskSubmission[]) => localStorage.setItem(TASKS_KEY, JSON.stringify(arr));

const mapApi = (row: any): TaskSubmission => ({
  id: String(row.id),
  userId: row.user_id,
  title: row.title,
  submittedAt: row.submitted_at || new Date().toISOString(),
  fileName: row.file_name || undefined,
  fileUrl: row.file_url || undefined,
  fileMime: row.file_mime || undefined,
  status: row.status || 'enviado',
  grade: row.grade ?? undefined,
  assignmentId: row.assignment_id || undefined,
  assignmentTitle: row.assignment_title || undefined,
  assignmentDue: row.assignment_due || undefined,
});

export const listTasksByUser = async (userId: string) => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/submissions?userId=${encodeURIComponent(userId)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      return (data as any[]).map(mapApi);
    } catch (err) {
      console.error('Fallo listTasksByUser, uso local', err);
    }
  }
  const all = read();
  return apiDelay(all.filter((t) => t.userId === userId));
};

export const submitTask = async (
  userId: string,
  title: string,
  fileName?: string,
  fileUrl?: string,
  fileMime?: string,
  assignmentId?: string,
  assignmentTitle?: string,
  assignmentDue?: string,
): Promise<TaskSubmission> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title,
          fileName,
          fileUrl,
          fileMime,
          assignmentId,
          assignmentTitle,
          assignmentDue,
        }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      return mapApi(data);
    } catch (err) {
      console.error('Fallo submitTask, uso local', err);
    }
  }
  const all = read();
  const item: TaskSubmission = {
    id: `t${Date.now()}`,
    userId,
    title: title.trim(),
    submittedAt: new Date().toISOString(),
    fileName,
    fileUrl,
    fileMime,
    status: 'enviado',
    assignmentId,
    assignmentTitle,
    assignmentDue,
  };
  all.unshift(item);
  write(all);
  return apiDelay(item);
};

export const listAllSubmissions = async (): Promise<TaskSubmission[]> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/submissions`, { credentials: 'include' });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      return (data as any[]).map(mapApi);
    } catch (err) {
      console.error('Fallo listAllSubmissions, uso local', err);
    }
  }
  return apiDelay(read());
};

export const listSubmissionsByTitle = async (title: string): Promise<TaskSubmission[]> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/submissions?title=${encodeURIComponent(title)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      return (data as any[]).map(mapApi);
    } catch (err) {
      console.error('Fallo listSubmissionsByTitle, uso local', err);
    }
  }
  const all = read();
  return apiDelay(all.filter((t) => t.title === title));
};

export const gradeSubmission = async (id: string, grade: number): Promise<TaskSubmission | undefined> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/submissions/${id}/grade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      return mapApi(data);
    } catch (err) {
      console.error('Fallo gradeSubmission, uso local', err);
    }
  }
  const all = read();
  const idx = all.findIndex((t) => t.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], status: 'calificado', grade };
    write(all);
    return apiDelay(all[idx]);
  }
  return apiDelay(undefined);
};
