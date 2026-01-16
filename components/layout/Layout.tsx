
import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../shared/ToastProvider';
import Sidebar from './Sidebar';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import iucaColibri from '../../assets/iuca-colibri.png';
import NotificationBell from '../shared/NotificationBell';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogout = () => {
    logout();
    showToast('Sesión cerrada', 'info');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur shadow-sm border-b border-slate-200">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center justify-center gap-4">
              <img src={iucaColibri} alt="IUCA colibrí" className="h-14 w-auto drop-shadow-md" />
              <div className="leading-tight text-center">
                <p className="text-[11px] uppercase tracking-[0.35em] text-iuca-green-700">IUCA</p>
                <p className="text-sm sm:text-base font-semibold text-slate-800">Instituto Universitario de Ciencias Ambientales</p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <NotificationBell role={user?.role || null} />
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1">
                <img
                  src={user?.avatarUrl}
                  alt={user?.name || 'Usuario'}
                  className="h-8 w-8 rounded-full object-cover bg-slate-100"
                />
                <div className="leading-tight hidden sm:block">
                  <p className="text-sm font-semibold text-slate-800">{user?.name || 'Usuario'}</p>
                  <p className="text-xs text-slate-500">{user?.role || 'Invitado'}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-100"
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </button>
              </div>
            </div>
          </div>
          <Sidebar />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-8">
        <div className="content-wrapper">
          <div className="content-surface">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
