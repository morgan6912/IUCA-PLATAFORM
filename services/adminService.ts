import { Role, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

type AuditEvent = { id: string; when: string; action: string; detail?: string };

// Usuarios
export const listUsers = async (): Promise<User[]> => {
  if (!API_URL) throw new Error('VITE_API_URL no configurado');
  const res = await fetch(`${API_URL}/users`, { credentials: 'include' });
  if (!res.ok) throw new Error('No se pudo listar usuarios');
  return (await res.json()) as User[];
};

export const createUser = async (name: string, email: string, role: Role): Promise<User> => {
  if (!API_URL) throw new Error('VITE_API_URL no configurado');
  const body = { name, email, role };
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('No se pudo crear usuario');
  return (await res.json()) as User;
};

export const updateUser = async (userId: string, patch: Partial<User>): Promise<User> => {
  if (!API_URL) throw new Error('VITE_API_URL no configurado');
  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('No se pudo actualizar usuario');
  return (await res.json()) as User;
};

export const updateUserRole = async (userId: string, role: Role): Promise<User> => {
  return updateUser(userId, { role });
};

export const deleteUser = async (userId: string): Promise<void> => {
  if (!API_URL) throw new Error('VITE_API_URL no configurado');
  await fetch(`${API_URL}/users/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
};

// Auditoría
export const listAudit = async (): Promise<AuditEvent[]> => {
  if (!API_URL) throw new Error('VITE_API_URL no configurado');
  const res = await fetch(`${API_URL}/audit`, { credentials: 'include' });
  if (!res.ok) throw new Error('No se pudo obtener auditoría');
  return (await res.json()) as AuditEvent[];
};

export const appendAudit = async (action: string, detail?: string): Promise<AuditEvent> => {
  if (!API_URL) throw new Error('VITE_API_URL no configurado');
  const res = await fetch(`${API_URL}/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, detail }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('No se pudo registrar evento');
  return (await res.json()) as AuditEvent;
};
