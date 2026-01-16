import { LibraryDocument } from '../types';
import { mockDocuments } from './mockApi';

const LIBRARY_DOCS_KEY = 'iuca-library-documents';
const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const apiDelay = async <T,>(data: T, ms = 250): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

const readLocalDocuments = (): LibraryDocument[] => {
  try {
    const raw = localStorage.getItem(LIBRARY_DOCS_KEY);
    if (raw) return JSON.parse(raw) as LibraryDocument[];
  } catch {
    // fall through to seed data
  }
  const seed = mockDocuments.map((doc) => ({ ...doc }));
  localStorage.setItem(LIBRARY_DOCS_KEY, JSON.stringify(seed));
  return seed;
};

const writeLocalDocuments = (items: LibraryDocument[]) => {
  localStorage.setItem(LIBRARY_DOCS_KEY, JSON.stringify(items));
};

// Mapear item de API -> LibraryDocument (UI)
const mapApiItemToDoc = (item: any): LibraryDocument => ({
  id: String(item.id),
  title: item.title || 'Recurso sin título',
  author: item.author || 'Desconocido',
  category: item.category || 'General',
  publishDate: item.created_at || new Date().toISOString(),
  url: item.file_download_url || '#',
  fileName: item.file_storage_path ? String(item.file_storage_path).split('/').pop() : undefined,
  fileType: item.file_download_url ? 'application/pdf' : undefined,
});

export const listDocuments = async (): Promise<LibraryDocument[]> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/library/items`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error remoto');
      const data = await res.json();
      return (data as any[]).map(mapApiItemToDoc);
    } catch (err) {
      console.error('Fallo listando biblioteca en API, uso local', err);
    }
  }
  const docs = readLocalDocuments();
  return apiDelay(docs);
};

export const getCategories = async (): Promise<string[]> => {
  const docs = await listDocuments();
  const cats = Array.from(new Set(docs.map((d) => d.category)));
  return cats;
};

export const addDocument = async (payload: Omit<LibraryDocument, 'id'>): Promise<LibraryDocument> => {
  if (API_URL) {
    try {
      const body: any = {
        title: payload.title,
        author: payload.author,
        category: payload.category,
        description: null,
        copies: 1,
      };
      if (payload.fileName && payload.url?.startsWith('data:')) {
        body.file = {
          name: payload.fileName,
          dataUrl: payload.url,
          type: payload.fileType || 'application/pdf',
        };
      } else if (payload.url && payload.url !== '#') {
        // Guardamos como enlace externo en file_download_url (sin storage)
        body.file_download_url = payload.url;
      }
      const res = await fetch(`${API_URL}/library/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error remoto');
      const data = await res.json();
      return mapApiItemToDoc(data);
    } catch (err) {
      console.error('Fallo guardando en API, uso local', err);
    }
  }

  // Fallback local
  const docs = readLocalDocuments();
  const next: LibraryDocument = {
    ...payload,
    id: `doc-${Date.now()}`,
  };
  writeLocalDocuments([next, ...docs]);
  return apiDelay(next);
};

export const searchDocuments = async (
  query: string,
  category: string | 'all' = 'all'
): Promise<LibraryDocument[]> => {
  const q = query.trim().toLowerCase();
  const docs = await listDocuments();
  const filtered = docs.filter((d) => {
    const matchesQ = !q || d.title.toLowerCase().includes(q) || d.author.toLowerCase().includes(q);
    const matchesC = category === 'all' || d.category === category;
    return matchesQ && matchesC;
  });
  return filtered;
};

export const getDocumentDownloadUrl = async (id: string): Promise<string | null> => {
  if (API_URL) {
    try {
      // Probar ruta principal; si falla, probar alias /library/download/:id
      let res = await fetch(`${API_URL}/library/items/${id}/download`, { credentials: 'include' });
      if (!res.ok) {
        res = await fetch(`${API_URL}/library/download/${id}`, { credentials: 'include' });
      }
      if (!res.ok) throw new Error(`API devolvió ${res.status}`);
      const data = await res.json();
      return data?.url || null;
    } catch (err) {
      console.error('Fallo obteniendo URL de descarga en API', err);
      throw err;
    }
  }

  const docs = readLocalDocuments();
  const found = docs.find((d) => d.id === id);
  return found?.url ?? null;
};
