import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Role } from '../../types';
import { fetchNotifications, NotificationAlert } from '../../services/notificationService';

interface NotificationBellProps {
  role: Role | null;
}

const severityColor: Record<NotificationAlert['type'], string> = {
  info: 'text-sky-600 bg-sky-100',
  warning: 'text-amber-600 bg-amber-100',
  critical: 'text-rose-600 bg-rose-100',
};

const NotificationBell: React.FC<NotificationBellProps> = ({ role }) => {
  const [notifications, setNotifications] = useState<NotificationAlert[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!role) {
      setNotifications([]);
      return;
    }
    fetchNotifications(role).then(setNotifications);
  }, [role]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!dropdownOpen || !container.current) return;
      if (!container.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [dropdownOpen]);

  const unreadCount = notifications.length;

  return (
    <div className="relative inline-flex" ref={container}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="relative inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:text-slate-800 focus:outline-none"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[11px] text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Alertas recientes</p>
          <div className="mt-2 space-y-2 max-h-72 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-500">No hay alertas para tu rol.</p>
            ) : (
              notifications.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{alert.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] ${severityColor[alert.type]}`}>
                      {alert.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{alert.body}</p>
                  <p className="mt-2 text-[11px] text-slate-400">{new Date(alert.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
