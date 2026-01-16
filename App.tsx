
import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardPage from './pages/DashboardV2';
const LoginPage = lazy(() => import('./pages/LoginPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const LibraryRequestsPage = lazy(() => import('./pages/library/LibraryRequestsPage'));
const DocumentsPage = lazy(() => import('./pages/admin/DocumentsPage'));
const CreateUserPage = lazy(() => import('./pages/admin/CreateUserPage'));
const CommunicationPage = lazy(() => import('./pages/CommunicationPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AdminCoursesPage = lazy(() => import('./pages/AdminCoursesPage'));
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/shared/ProtectedRoute';
import { Role } from './types';
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const StudentHistoryPage = lazy(() => import('./pages/student/HistoryPage'));
const StudentGradesPage = lazy(() => import('./pages/student/GradesPage'));
const StudentSchedulePage = lazy(() => import('./pages/student/SchedulePage'));
const StudentModulesPage = lazy(() => import('./pages/student/ModulesPage'));
const StudentCertificatesPage = lazy(() => import('./pages/student/CertificatesPage'));
const StudentTasksPage = lazy(() => import('./pages/student/TasksPage'));
const TeacherAttendancePage = lazy(() => import('./pages/teacher/AttendancePage'));
const TeacherReportsPage = lazy(() => import('./pages/teacher/ReportsPage'));
const TeacherAssignmentsPage = lazy(() => import('./pages/teacher/AssignmentsPage'));
const ExecutiveDashboardPage = lazy(() => import('./pages/directivo/ExecutiveDashboardV2'));
const TaskGradesControlPage = lazy(() => import('./pages/shared/TaskGradesControl'));
import { ToastProvider } from './components/shared/ToastProvider';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <HashRouter>
        <Suspense fallback={<div className="p-8">Cargando…</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route
              path="matricula"
              element={
                <ProtectedRoute>
                  <CoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="cursos"
              element={
                <ProtectedRoute>
                  <CoursesPage />
                </ProtectedRoute>
              }
            />
            <Route path="biblioteca" element={<LibraryPage />} />
            <Route
              path="biblioteca/solicitudes"
              element={
                <ProtectedRoute roles={[Role.BIBLIOTECARIO]}>
                  <LibraryRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route path="comunicacion" element={<CommunicationPage />} />
            {/* Perfil (todos los roles) */}
            <Route path="perfil" element={<ProfilePage />} />

            {/* Estudiante */}
            <Route
              path="historial"
              element={
                <ProtectedRoute roles={[Role.ESTUDIANTE]}>
                  <Navigate to="/cursos" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="calificaciones"
              element={
                <ProtectedRoute roles={[Role.ESTUDIANTE]}>
                  <Navigate to="/cursos" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="horario"
              element={
                <ProtectedRoute roles={[Role.ESTUDIANTE]}>
                  <StudentSchedulePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="modulos"
              element={
                <ProtectedRoute roles={[Role.ESTUDIANTE]}>
                  <StudentModulesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="constancias"
              element={
                <ProtectedRoute roles={[Role.ESTUDIANTE]}>
                  <StudentCertificatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="tareas"
              element={
                <ProtectedRoute roles={[Role.ESTUDIANTE]}>
                  <StudentTasksPage />
                </ProtectedRoute>
              }
            />

            {/* Docente */}
            <Route
              path="asistencia"
              element={
                <ProtectedRoute roles={[Role.DOCENTE]}>
                  <TeacherAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="reportes-docente"
              element={
                <ProtectedRoute roles={[Role.DOCENTE]}>
                  <TeacherReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="doc-tareas"
              element={
                <ProtectedRoute roles={[Role.DOCENTE]}>
                  <TeacherAssignmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="control-tareas"
              element={
                <ProtectedRoute roles={[Role.DOCENTE, Role.ADMINISTRATIVO]}>
                  <TaskGradesControlPage />
                </ProtectedRoute>
              }
            />

            {/* Directivo */}
            <Route
              path="ejecutivo"
              element={
                <ProtectedRoute roles={[Role.DIRECTIVO]}>
                  <ExecutiveDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route 
              path="admin" 
              element={
                <ProtectedRoute roles={[Role.ADMINISTRATIVO, Role.DIRECTIVO]}>
                  <AdminPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="admin/cursos" 
              element={
                <ProtectedRoute roles={[Role.ADMINISTRATIVO, Role.DIRECTIVO]}>
                  <AdminCoursesPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="admin/documentos"
              element={
                <ProtectedRoute roles={[Role.ADMINISTRATIVO, Role.DIRECTIVO]}>
                  <DocumentsPage />
                </ProtectedRoute>
              }
            />
            <Route 
              path="admin/usuarios"
              element={
                <ProtectedRoute roles={[Role.ADMINISTRATIVO]}>
                  <CreateUserPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </Suspense>
      </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

