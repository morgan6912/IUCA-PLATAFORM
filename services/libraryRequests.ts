import { LibraryRequest, LibraryRequestStatus } from '../types';

const REQUESTS_KEY = 'iuca-library-requests';
const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const apiDelay = async <T,>(data: T, ms = 200): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

const hasLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readRequests = (): LibraryRequest[] => {
  if (!hasLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(REQUESTS_KEY);
    return raw ? (JSON.parse(raw) as LibraryRequest[]) : [];
  } catch {
    return [];
  }
};

const writeRequests = (items: LibraryRequest[]) => {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(REQUESTS_KEY, JSON.stringify(items));
};

const toFrontStatus = (status: string): LibraryRequestStatus => {
  const s = status.toLowerCase();
  if (s === 'pendiente' || s === 'pending') return 'pending';
  if (s === 'aprobado' || s === 'approved') return 'approved';
  if (s === 'devuelto') return 'approved';
  return 'denied';
};

const toApiStatus = (status: LibraryRequestStatus): string => {
  if (status === 'pending') return 'pendiente';
  if (status === 'approved') return 'aprobado';
  return 'rechazado';
};

const mapApiRequest = (item: any): LibraryRequest => ({
  id: String(item.id),
  documentId: String(item.item_id || item.documentId || ''),
  documentTitle: item.documentTitle || item.document_title || 'Documento',
  userId: String(item.user_id || item.userId || ''),
  userName: item.user_name || item.userName || 'Usuario',
  status: toFrontStatus(item.status || 'pending'),
  requestedAt: item.requested_at || new Date().toISOString(),
});

const mergeRequests = (apiItems: LibraryRequest[], localItems: LibraryRequest[]): LibraryRequest[] => {
  const map = new Map<string, LibraryRequest>();
  [...apiItems, ...localItems].forEach((req) => {
    if (!map.has(req.id)) map.set(req.id, req);
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
};

export const listLibraryRequests = async (): Promise<LibraryRequest[]> => {
  const localRequests = readRequests();
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/library/requests`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error remoto');
      const data = await res.json();
      const mapped = (data as any[]).map(mapApiRequest);
      return mergeRequests(mapped, localRequests);
    } catch (err) {
      console.error('Fallo listando solicitudes en API, uso local', err);
    }
  }
  const ordered = localRequests.sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
  return apiDelay([...ordered]);
};

export const createLibraryRequest = async (
  payload: Omit<LibraryRequest, 'id' | 'status' | 'requestedAt'>
 ): Promise<LibraryRequest> => {
  if (API_URL) {
    try {
      const body = {
        userId: payload.userId,
        itemId: payload.documentId,
        userName: payload.userName,
      };
      const res = await fetch(`${API_URL}/library/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error remoto');
      const data = await res.json();
      return mapApiRequest(data);
    } catch (err) {
      console.error('Fallo creando solicitud en API, uso local', err);
    }
  }
  const requests = readRequests();
  const next: LibraryRequest = {
    ...payload,
    id: `req-${Date.now()}`,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };
  writeRequests([next, ...requests]);
  return apiDelay(next);
};

export const updateLibraryRequestStatus = async (
  id: string,
  status: LibraryRequestStatus
 ): Promise<LibraryRequest | undefined> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/library/requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toApiStatus(status) }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error remoto');
      const data = await res.json();
      return mapApiRequest(data);
    } catch (err) {
      console.error('Fallo actualizando solicitud en API, uso local', err);
    }
  }
  const requests = readRequests();
  const next = requests.map((request) =>
    request.id === id ? { ...request, status } : request
  );
  writeRequests(next);
  return apiDelay(next.find((request) => request.id === id));
};
