const CREDENTIALS_KEY = 'iuca-user-credentials';
const DEFAULT_SAMPLE_PASSWORD = 'password';

const hasLocalStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

type CredentialRecord = {
  userId: string;
  hashedPassword: string;
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

export const hashValue = async (value: string): Promise<string> => {
  // Prefiere crypto.subtle; si no está disponible (contexto inseguro), usa un hash simple de fallback.
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(value);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // fallback abajo
  }
  // Fallback no criptográfico para no bloquear creación de cuentas en entornos sin crypto.subtle.
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `fallback-${Math.abs(hash)}`;
};

export const persistPassword = async (userId: string, email: string, password: string): Promise<void> => {
  const hash = await hashValue(password);
  const records = readCredentials().filter((record) => record.userId !== userId);
  records.push({ userId, hashedPassword: hash });
  writeCredentials(records);
};

let defaultPasswordHashPromise: Promise<string> | null = null;
const getDefaultPasswordHash = () => {
  if (!defaultPasswordHashPromise) {
    defaultPasswordHashPromise = hashValue(DEFAULT_SAMPLE_PASSWORD);
  }
  return defaultPasswordHashPromise;
};

export const verifyPassword = async (userId: string, email: string, password: string): Promise<boolean> => {
  const hash = await hashValue(password);
  const records = readCredentials();
  const stored = records.find((record) => record.userId === userId);
  if (stored) {
    return stored.hashedPassword === hash;
  }
  const defaultHash = await getDefaultPasswordHash();
  return hash === defaultHash;
};
