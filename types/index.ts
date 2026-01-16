
export enum Role {
  ESTUDIANTE = 'estudiante',
  DOCENTE = 'docente',
  ADMINISTRATIVO = 'administrativo',
  DIRECTIVO = 'directivo',
  BIBLIOTECARIO = 'bibliotecario',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string;
  matricula?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  teacher: string;
  credits: number;
  schedule: string;
  room?: string;
  enrolled: boolean;
  capacity: number;
  enrolledCount: number;
  prerequisites: string[];
}

export interface LibraryDocument {
  id: string;
  title: string;
  author: string;
  category: string;
  publishDate: string;
  url: string;
  fileName?: string;
  fileType?: string;
}

export type LibraryRequestStatus = 'pending' | 'approved' | 'denied';

export interface LibraryRequest {
  id: string;
  documentId: string;
  documentTitle: string;
  userId: string;
  userName: string;
  status: LibraryRequestStatus;
  requestedAt: string;
}

export interface ChatMessage {
    id: string | number;
    userId: string;
    userName: string;
    avatarUrl: string;
    text: string;
    timestamp: string;
    attachmentUrl?: string;
    attachmentName?: string;
    toUserId?: string;
    toUserName?: string;
}

// Nuevos tipos para ampliar funcionalidades
export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string; // ISO date
  author: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  dueDate: string; // ISO date
  status: 'pending' | 'submitted' | 'graded';
  grade?: number;
}

export interface Enrollment {
  userId: string;
  courseId: string;
  enrolledAt: string; // ISO date
}

// Definición de tarea creada por docente (plantilla)
export interface CourseAssignment {
  id: string;
  courseId: string;
  title: string;
  dueDate: string; // ISO date
  description?: string;
}

export interface WaitlistEntry {
  userId: string;
  courseId: string;
  requestedAt: string; // ISO date
}

export interface TaskSubmission {
  id: string;
  userId: string;
  title: string;
  submittedAt: string; // ISO date
  fileName?: string;
  fileUrl?: string;
  fileMime?: string;
  status: 'enviado' | 'calificado' | 'pendiente';
  grade?: number;
  assignmentId?: string;
  assignmentTitle?: string;
  assignmentDue?: string;
}
