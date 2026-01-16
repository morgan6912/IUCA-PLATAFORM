import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '../../types';
import {
  BookOpen,
  LayoutDashboard,
  MessageSquare,
  GraduationCap,
  UserCog,
  Briefcase,
  Calendar,
  FileDown,
  ClipboardList,
  BarChart2,
  CheckSquare,
  LineChart,
  UserPlus,
} from 'lucide-react';
import iucaSymbol from '../../assets/iuca-symbol.svg';

const Sidebar: React.FC = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const getNavLinks = () => {
    const commonLinks = [
      { path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
      { path: '/biblioteca', icon: <BookOpen className="w-5 h-5" />, label: 'Biblioteca' },
      { path: '/comunicacion', icon: <MessageSquare className="w-5 h-5" />, label: 'Comunicación' },
      { path: '/perfil', icon: <UserCog className="w-5 h-5" />, label: 'Perfil' },
    ];

    switch (user?.role) {
      case Role.ESTUDIANTE:
        return [
          ...commonLinks,
          { path: '/modulos', icon: <Briefcase className="w-5 h-5" />, label: 'Módulos' },
          { path: '/horario', icon: <Calendar className="w-5 h-5" />, label: 'Horario' },
          { path: '/constancias', icon: <FileDown className="w-5 h-5" />, label: 'Documentos' },
          { path: '/tareas', icon: <ClipboardList className="w-5 h-5" />, label: 'Tareas' },
        ];
      case Role.DOCENTE:
        return [
          ...commonLinks,
          { path: '/asistencia', icon: <CheckSquare className="w-5 h-5" />, label: 'Asistencia' },
          { path: '/doc-tareas', icon: <ClipboardList className="w-5 h-5" />, label: 'Tareas' },
          { path: '/control-tareas', icon: <BarChart2 className="w-5 h-5" />, label: 'Control Tareas' },
          { path: '/reportes-docente', icon: <BarChart2 className="w-5 h-5" />, label: 'Reportes' },
        ];
      case Role.ADMINISTRATIVO:
        return [
          ...commonLinks,
          { path: '/admin/cursos', icon: <BookOpen className="w-5 h-5" />, label: 'Gestión de módulos' },
          { path: '/admin', icon: <UserCog className="w-5 h-5" />, label: 'Administración' },
          { path: '/admin/documentos', icon: <ClipboardList className="w-5 h-5" />, label: 'Documentos' },
          { path: '/admin/usuarios', icon: <UserPlus className="w-5 h-5" />, label: 'Nuevo usuario' },
        ];
      case Role.BIBLIOTECARIO:
        return [
          ...commonLinks,
          { path: '/biblioteca/solicitudes', icon: <ClipboardList className="w-5 h-5" />, label: 'Autorizaciones' },
        ];
      case Role.DIRECTIVO:
        return [
          ...commonLinks,
          { path: '/admin/cursos', icon: <BookOpen className="w-5 h-5" />, label: 'Gestión de módulos' },
          { path: '/admin', icon: <UserCog className="w-5 h-5" />, label: 'Administración' },
          { path: '/ejecutivo', icon: <LineChart className="w-5 h-5" />, label: 'Ejecutivo' },
          { path: '/admin/documentos', icon: <ClipboardList className="w-5 h-5" />, label: 'Documentos' },
        ];
      default:
        return commonLinks;
    }
  };

  return (
    <nav className="max-w-5xl mx-auto w-full rounded-2xl bg-iuca-green-900 text-white shadow-md border border-iuca-green-800/60 px-4 py-3">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar text-[12px] justify-center">
        <ul className="flex items-center gap-2 sm:gap-3 justify-center">
          {getNavLinks().map((link) => {
            const isActive = pathname === link.path || pathname.startsWith(link.path + '/');
            return (
              <li key={link.path} className="flex-shrink-0">
                <NavLink
                  end
                  to={link.path}
                  className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg font-semibold transition-colors ${
                    isActive ? 'bg-white text-slate-900 shadow' : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="mb-0.5">{link.icon}</span>
                  <span className="whitespace-nowrap">{link.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default Sidebar;
