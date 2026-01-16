export type ModuleCatalogEntry = {
  id?: string;
  code: string;
  name: string;
  schedule?: string | null;
  hours?: number | null;
  teacherSuggested?: string | null;
  description?: string | null;
};

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const fallbackModules: ModuleCatalogEntry[] = [
  {
    code: 'FOT101',
    name: 'Fundamentos de Fotogrametría',
    schedule: 'Lu-Mi-Vi 09:00-13:00',
    hours: 30,
    teacherSuggested: 'Ing. Salgado',
    description: 'Base de la fotogrametría digital con prácticas guiadas.',
  },
  {
    code: 'GIS203',
    name: 'Sistemas de Información Geográfica',
    schedule: 'Ma-Ju 10:00-13:00',
    hours: 24,
    teacherSuggested: 'Mtra. Juárez',
    description: 'Integración y análisis de datos geoespaciales aplicados.',
  },
  {
    code: 'PROY300',
    name: 'Módulo Proyectos Integradores',
    schedule: 'Lu-Mi 15:00-18:00',
    hours: 36,
    teacherSuggested: 'Equipo multidisciplinario',
    description: 'Desarrollo colaborativo de proyectos finales.',
  },
];

export const listModulesCatalog = async (): Promise<ModuleCatalogEntry[]> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/modules`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error remoto');
      const data = await res.json();
      return (data as any[]).map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        schedule: row.schedule,
        hours: row.hours,
        teacherSuggested: row.teacher_suggested,
        description: row.description,
      }));
    } catch (err) {
      console.error('Fallo obteniendo módulos de API, uso fallback', err);
    }
  }
  return fallbackModules;
};

export const createModuleCatalog = async (entry: Omit<ModuleCatalogEntry, 'id'>): Promise<ModuleCatalogEntry> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: entry.code,
          name: entry.name,
          schedule: entry.schedule,
          hours: entry.hours,
          teacher_suggested: entry.teacherSuggested,
          description: entry.description,
        }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error remoto');
      const data = await res.json();
      return {
        id: data.id,
        code: data.code,
        name: data.name,
        schedule: data.schedule,
        hours: data.hours,
        teacherSuggested: data.teacher_suggested,
        description: data.description,
      };
    } catch (err) {
      console.error('Fallo creando módulo en API, uso fallback', err);
    }
  }
  // Fallback: no persiste, solo devuelve el objeto
  return { ...entry, id: `tmp-${Date.now()}` };
};

