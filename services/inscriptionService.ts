export type EnrollmentDocumentStatus = 'pendiente' | 'aprobado' | 'rechazado';

export type EnrollmentDocument = {
  id: string;
  userId: string;
  userName: string;
  fileName: string;
  size: number;
  type: string;
  dataUrl?: string;
  storagePath?: string;
  downloadUrl?: string;
  status: EnrollmentDocumentStatus;
  uploadedAt: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewerRemark?: string;
  reviewedAt?: string;
};

const STORAGE_KEY = 'iuca_inscription_documents';
const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readStorage = (): EnrollmentDocument[] => {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as EnrollmentDocument[];
  } catch {
    return [];
  }
};

const writeStorage = (documents: EnrollmentDocument[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
};

const sortLocalDocuments = (docs: EnrollmentDocument[]) =>
  [...docs].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );

export const listEnrollmentDocuments = async (): Promise<EnrollmentDocument[]> => {
  if (API_URL) {
    const response = await fetch(`${API_URL}/inscriptions/documents`, { credentials: 'include' });
    if (!response.ok) throw new Error('No se pudo obtener documentos');
    return (await response.json()) as EnrollmentDocument[];
  }
  return Promise.resolve(sortLocalDocuments(readStorage()));
};

export const listEnrollmentDocumentsByUser = async (userId: string): Promise<EnrollmentDocument[]> => {
  if (API_URL) {
    const response = await fetch(`${API_URL}/inscriptions/documents?userId=${encodeURIComponent(userId)}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('No se pudo obtener documentos del usuario');
    return (await response.json()) as EnrollmentDocument[];
  }
  return Promise.resolve(sortLocalDocuments(readStorage()).filter((doc) => doc.userId === userId));
};

const buildLocalEntries = (
  userId: string,
  userName: string,
  files: { name: string; size: number; type: string; dataUrl?: string }[],
): EnrollmentDocument[] => {
  const now = new Date().toISOString();
  const existing = readStorage();
  const additions = files.map((file, index) => ({
    id: `${userId}-${Date.now()}-${index}`,
    userId,
    userName,
    fileName: file.name,
    size: file.size,
    type: file.type || 'Documento',
    dataUrl: file.dataUrl,
    status: 'pendiente' as EnrollmentDocumentStatus,
    uploadedAt: now,
  }));
  const updated = [...existing, ...additions];
  writeStorage(updated);
  return updated.filter((doc) => doc.userId === userId);
};

export const addEnrollmentDocumentsForUser = async (
  userId: string,
  userName: string,
  files: { name: string; size: number; type: string; dataUrl?: string }[],
): Promise<EnrollmentDocument[]> => {
  if (API_URL) {
    const response = await fetch(`${API_URL}/inscriptions/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userName, files }),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('No se pudo guardar el documento en el servidor');
    }
    const remote = (await response.json()) as EnrollmentDocument[];
    return remote;
  }
  if (!files.length) {
    return listEnrollmentDocumentsByUser(userId);
  }
  return Promise.resolve(buildLocalEntries(userId, userName, files));
};

export const removeEnrollmentDocument = async (
  documentId: string,
  userId?: string,
): Promise<EnrollmentDocument[]> => {
  if (API_URL) {
    await fetch(`${API_URL}/inscriptions/documents/${documentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
      credentials: 'include',
    });
    if (userId) {
      return listEnrollmentDocumentsByUser(userId);
    }
    return listEnrollmentDocuments();
  }
  const existing = readStorage();
  const filtered = existing.filter((doc) => doc.id !== documentId || (userId && doc.userId !== userId));
  writeStorage(filtered);
  return Promise.resolve(sortLocalDocuments(filtered));
};

export const updateEnrollmentDocumentStatus = async (
  documentId: string,
  status: EnrollmentDocumentStatus,
  reviewerId: string,
  reviewerName: string,
  remark?: string,
): Promise<EnrollmentDocument | null> => {
  if (API_URL) {
    const response = await fetch(`${API_URL}/inscriptions/documents/${documentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewerId, reviewerName, remark }),
      credentials: 'include',
    });
    if (!response.ok) return null;
    const updated = (await response.json()) as EnrollmentDocument;
    return updated;
  }
  const existing = readStorage();
  const entry = existing.find((doc) => doc.id === documentId);
  if (!entry) return null;
  entry.status = status;
  entry.reviewerId = reviewerId;
  entry.reviewerName = reviewerName;
  entry.reviewerRemark = remark;
  entry.reviewedAt = new Date().toISOString();
  writeStorage(existing);
  return Promise.resolve(entry);
};
