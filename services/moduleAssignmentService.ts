export type ModuleSubject = {
  clave: string;
  nombre: string;
  horas: number;
  titular: string;
  horario: Record<string, string>;
  modalidad: 'Presencial' | 'Mixta' | 'En línea';
  turno: 'Matutino' | 'Vespertino';
  grupo: string;
  semanas: number;
  observaciones?: string;
};

export type ModuleScheduleDefinition = {
  codigo: string;
  nombre: string;
  periodo: { inicio: string; fin: string; semanas: number; vacacional?: string; regularizacion?: string };
  materias: ModuleSubject[];
};

export type ModuleProfessorAssignment = {
  id: string;
  profesorId: string;
  profesorNombre: string;
  modulo: ModuleScheduleDefinition;
  studentIds: string[];
};

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const mapApi = (row: any): ModuleProfessorAssignment => ({
  id: String(row.id),
  profesorId: row.profesor_id,
  profesorNombre: row.profesor_nombre,
  modulo: row.modulo,
  studentIds: Array.isArray(row.student_ids) ? row.student_ids : [],
});

export const listModuleAssignments = async (): Promise<ModuleProfessorAssignment[]> => {
  if (!API_URL) {
    console.error('API_URL no configurada; listModuleAssignments retorna []');
    return [];
  }
  try {
    const res = await fetch(`${API_URL}/module-assignments`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Error remoto al listar módulos (${res.status})`);
    const data = await res.json();
    return (data as any[]).map(mapApi);
  } catch (err) {
    console.error('No se pudieron obtener módulos asignados', err);
    return [];
  }
};

export const createModuleAssignment = async (
  assignment: Omit<ModuleProfessorAssignment, 'id'>,
): Promise<ModuleProfessorAssignment> => {
  if (!API_URL) throw new Error('API_URL no configurada');
  const res = await fetch(`${API_URL}/module-assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profesorId: assignment.profesorId,
      profesorNombre: assignment.profesorNombre,
      modulo: assignment.modulo,
      studentIds: assignment.studentIds,
    }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Error remoto al crear módulo');
  const data = await res.json();
  return mapApi(data);
};

export const deleteModuleAssignment = async (id: string): Promise<void> => {
  if (!API_URL) throw new Error('API_URL no configurada');
  const res = await fetch(`${API_URL}/module-assignments/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Error remoto al eliminar módulo');
};

export const updateModuleStudents = async (id: string, studentIds: string[]): Promise<void> => {
  if (!API_URL) throw new Error('API_URL no configurada');
  const res = await fetch(`${API_URL}/module-assignments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentIds }),
    credentials: 'include',
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Error remoto al actualizar alumnos${msg ? `: ${msg}` : ''}`);
  }
};
