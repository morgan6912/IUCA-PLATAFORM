import { User } from '../types';
import { mockUsers } from './mockApi';
import { hashValue } from './authService';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const USERS_KEY = 'iuca-users';
const CREDENTIALS_KEY = 'iuca-user-credentials';
const DEFAULT_SAMPLE_PASSWORD = 'password';

const apiDelay = async <T,>(data: T, ms = 200): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

const hasLocalStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

type CredentialRecord = {
  userId: string;
  hashedPassword: string;
};

const readUsers = (): User[] => {
  if (!hasLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as User[]) : [];
  } catch {
    return [];
  }
};

const writeUsers = (users: User[]) => {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const readCredentials = (): CredentialRecord[] => {
  if (!hasLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(CREDENTIALS_KEY);
    return raw ? (JSON.parse(raw) as CredentialRecord[]) : [];
  } catch {
    return [];
  }
};

const writeCredentials = (records: CredentialRecord[]) => {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(records));
};

const ensureSeedUsers = (): User[] => {
  const stored = readUsers();
  if (stored.length) return stored;
  const seed = mockUsers.map((user) => ({ ...user }));
  writeUsers(seed);
  return seed;
};

let defaultPasswordHash: Promise<string> | null = null;
const getDefaultPasswordHash = () => {
  if (!defaultPasswordHash) {
    defaultPasswordHash = hashValue(DEFAULT_SAMPLE_PASSWORD);
  }
  return defaultPasswordHash;
};

const ensureDefaultCredentials = async (users: User[]) => {
  const credentials = readCredentials();
  const missing = users.filter((user) => !credentials.some((record) => record.userId === user.id));
  if (!missing.length) return;
  const hash = await getDefaultPasswordHash();
  writeCredentials([
    ...credentials,
    ...missing.map((user) => ({ userId: user.id, hashedPassword: hash })),
  ]);
};

export const listUsers = async (): Promise<User[]> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/users`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error remoto');
      const data = (await res.json()) as User[];
      await ensureDefaultCredentials(data);
      return data;
    } catch {
      // fallback local
    }
  }
  const users = ensureSeedUsers();
  await ensureDefaultCredentials(users);
  return apiDelay([...users]);
};

export const createUserRecord = async (user: User): Promise<User> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error remoto');
      const data = (await res.json()) as User;
      return data;
    } catch {
      // fallback local
    }
  }
  const users = ensureSeedUsers();
  const nextUsers = [user, ...users.filter((existing) => existing.id !== user.id)];
  writeUsers(nextUsers);
  return apiDelay(user);
};
