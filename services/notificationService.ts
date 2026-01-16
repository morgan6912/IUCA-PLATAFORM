import { Role } from '../types';

export type NotificationAlert = {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'critical';
  target: Role[] | 'todos';
  createdAt: string;
  action?: string;
};

const notifications: NotificationAlert[] = [
  {
    id: 'n1',
    title: 'Documentos pendientes',
    body: '3 estudiantes faltan completar la documentación de inscripción.',
    type: 'warning',
    target: [Role.ADMINISTRATIVO, Role.DIRECTIVO],
    createdAt: '2025-11-12T08:34:00Z',
    action: 'Revisar validación',
  },
  {
    id: 'n2',
    title: 'Tareas críticas',
    body: 'El 22% de la clase CA-101 no ha entregado el proyecto final.',
    type: 'critical',
    target: [Role.DOCENTE],
    createdAt: '2025-11-12T07:20:00Z',
    action: 'Enviar recordatorio',
  },
  {
    id: 'n3',
    title: 'Informe ejecutivo',
    body: 'Las últimas métricas de matrícula están disponibles para revisión.',
    type: 'info',
    target: [Role.DIRECTIVO],
    createdAt: '2025-11-11T20:15:00Z',
    action: 'Ver reporte ejecutivo',
  },
  {
    id: 'n4',
    title: 'Encuesta de clima',
    body: 'La encuesta sobre clima institucional cierra en 3 días.',
    type: 'info',
    target: 'todos',
    createdAt: '2025-11-10T09:12:00Z',
    action: 'Participar',
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchNotifications = async (role: Role | null): Promise<NotificationAlert[]> => {
  await delay(250);
  if (!role) return [];
  return notifications.filter(
    (notification) =>
      notification.target === 'todos' || notification.target.includes(role),
  );
};
