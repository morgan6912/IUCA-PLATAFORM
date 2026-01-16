const FAV_KEY = 'iuca-lib-favs';

const read = (): string[] => {
  try { const raw = localStorage.getItem(FAV_KEY); return raw ? JSON.parse(raw) as string[] : []; } catch { return []; }
};

const write = (ids: string[]) => localStorage.setItem(FAV_KEY, JSON.stringify(ids));

export const getFavorites = (): string[] => read();
export const isFavorite = (id: string) => read().includes(id);
export const toggleFavorite = (id: string): boolean => {
  const set = new Set(read());
  if (set.has(id)) set.delete(id); else set.add(id);
  const arr = Array.from(set);
  write(arr);
  return set.has(id);
};

