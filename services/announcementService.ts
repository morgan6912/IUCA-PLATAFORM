import { Announcement, Role, User } from '../types';

const ANNOUNCEMENTS_KEY = 'iuca-announcements';

const seed: Announcement[] = [
  { id: 'a1', title: 'Entrega CA-101', body: 'Recordatorio: la entrega del proyecto es este viernes.', date: new Date().toISOString(), author: 'Dr. Carlos Morales' },
  { id: 'a2', title: 'Calendario Académico', body: 'Se publica el calendario actualizado del semestre.', date: new Date().toISOString(), author: 'Dirección Académica' },
];

const apiDelay = async <T,>(data: T, ms = 200): Promise<T> => new Promise(r => setTimeout(() => r(data), ms));

const read = (): Announcement[] => {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_KEY);
    if (!raw) {
      localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as Announcement[];
  } catch {
    return seed;
  }
};

const write = (arr: Announcement[]) => localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(arr));

export const listAnnouncements = async (): Promise<Announcement[]> => apiDelay(read());

export const createAnnouncement = async (user: User, title: string, body: string): Promise<Announcement> => {
  const arr = read();
  const item: Announcement = {
    id: `a${Date.now()}`,
    title: title.trim(),
    body: body.trim(),
    date: new Date().toISOString(),
    author: user.name,
  };
  arr.unshift(item);
  write(arr);
  return apiDelay(item);
};

export const canPostAnnouncement = (role: Role) => {
  return role === Role.DOCENTE || role === Role.ADMINISTRATIVO || role === Role.DIRECTIVO;
};

