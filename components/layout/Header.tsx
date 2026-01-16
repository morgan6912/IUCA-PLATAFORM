import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useToast } from '../shared/ToastProvider';
import NotificationBell from '../shared/NotificationBell';
import iucaFullLogo from '../../assets/iuca-full-logo.png';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { showToast } = useToast();

  const trigger = useRef<HTMLButtonElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!dropdown.current) return;
      if (
        !dropdownOpen ||
        dropdown.current.contains(target as Node) ||
        (trigger.current && trigger.current.contains(target as Node))
      )
        return;
      setDropdownOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [dropdownOpen]);


  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    showToast('Sesión cerrada', 'info');
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 bg-white border-b border-slate-200 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 -mb-px">
          {/* Header: Left side */}
          <div className="flex items-center gap-4">
            {/* Hamburger button */}
            <button
              className="text-slate-500 hover:text-slate-600 lg:hidden"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              onClick={(e) => { e.stopPropagation(); setSidebarOpen(!sidebarOpen); }}
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="16" height="2" />
                <rect x="4" y="11" width="16" height="2" />
                <rect x="4" y="17" width="16" height="2" />
              </svg>
            </button>
            <div className="hidden lg:flex items-center gap-3">
              <img src={iucaFullLogo} alt="Instituto Universitario de Ciencias Ambientales" className="h-10 w-auto drop-shadow-sm" />
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">IUCA</p>
                <p className="text-xs font-semibold text-slate-600">Instituto Universitario de Ciencias Ambientales</p>
              </div>
            </div>
          </div>

          {/* Header: Right side */}
          <div className="flex items-center space-x-3">
            <div className="relative inline-flex">
              <button
                ref={trigger}
                className="inline-flex justify-center items-center group"
                aria-haspopup="true"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
              >
                <img className="w-8 h-8 rounded-full" src={user?.avatarUrl} width="32" height="32" alt={user?.name || 'User'} />
                <div className="flex items-center truncate">
                  <span className="truncate ml-2 text-sm font-medium text-slate-700 group-hover:text-slate-800">{user?.name}</span>
                  <svg className="w-3 h-3 shrink-0 ml-1 fill-current text-slate-400" viewBox="0 0 12 12">
                    <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                  </svg>
                </div>
              </button>
              {dropdownOpen && (
                <div
                  ref={dropdown}
                  className="origin-top-right z-10 absolute top-full right-0 min-w-44 bg-white border border-slate-200 py-1.5 rounded shadow-lg overflow-hidden mt-1"
                >
                  <div className="pt-0.5 pb-2 px-3 mb-1 border-b border-slate-200">
                    <div className="font-medium text-slate-800">{user?.name}</div>
                    <div className="text-xs text-slate-500 italic">{user?.role}</div>
                  </div>
                  <ul>
                    <li>
                      <button
                        className="font-medium text-sm text-red-500 hover:text-red-600 flex items-center py-1 px-3 w-full"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
            <NotificationBell role={user?.role || null} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

