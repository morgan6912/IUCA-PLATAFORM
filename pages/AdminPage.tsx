import React from 'react';
import { Role, User } from '../types';
import { Edit, Trash2, UserPlus, FileDown, Save } from 'lucide-react';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { useAuth } from '../hooks/useAuth';
import { createUser, updateUser, deleteUser, listAudit } from '../services/adminService';
import {
  EnrollmentDocument,
  EnrollmentDocumentStatus,
  listEnrollmentDocuments,
  updateEnrollmentDocumentStatus,
} from '../services/inscriptionService';
import { useToast } from '../components/shared/ToastProvider';
import { listModuleAssignments, ModuleProfessorAssignment } from '../services/moduleAssignmentService';

const AdminPage: React.FC = () => {
  const { users, loading, setRole } = useAdminUsers();
  const { showToast } = useToast();
  const [query, setQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<'all' | Role>('all');
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newEmail, setNewEmail] = React.useState('');
  const [newRole, setNewRole] = React.useState<Role>(Role.ESTUDIANTE);
  const [sortKey, setSortKey] = React.useState<'name'|'email'|'role'>('name');
  const [sortDir, setSortDir] = React.useState<'asc'|'desc'>('asc');
  const [page, setPage] = React.useState(1);
  const perPage = 8;
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [audit, setAudit] = React.useState<{id:string;when:string;action:string;detail?:string}[]>([]);
  const [bulkPayload, setBulkPayload] = React.useState('');
  const [accessProfiles, setAccessProfiles] = React.useState({
    administrativo: true,
    docente: true,
    directivo: true,
  });
  const { user: adminUser } = useAuth();
  const [inscriptionDocs, setInscriptionDocs] = React.useState<EnrollmentDocument[]>([]);
  const [previewDoc, setPreviewDoc] = React.useState<EnrollmentDocument | null>(null);
  const isAdmin = adminUser?.role === Role.ADMINISTRATIVO;
  const isDirectivo = adminUser?.role === Role.DIRECTIVO;

  const reloadInscriptionDocs = () => {
    const docs = listEnrollmentDocuments();
    setInscriptionDocs(Array.isArray(docs) ? docs : []);
  };

  React.useEffect(()=>{ listAudit().then(setAudit); }, []);
  React.useEffect(() => { reloadInscriptionDocs(); }, []);
  const roleSummary = React.useMemo(() => {
    const summary: Record<Role, number> = {
      [Role.ESTUDIANTE]: 0,
      [Role.DOCENTE]: 0,
      [Role.ADMINISTRATIVO]: 0,
      [Role.DIRECTIVO]: 0,
    };
    users.forEach((user) => {
      summary[user.role] = (summary[user.role] || 0) + 1;
    });
    return summary;
  }, [users]);

  const normalizedDocs = React.useMemo(() => (Array.isArray(inscriptionDocs) ? inscriptionDocs : []), [inscriptionDocs]);

  const documentStats = React.useMemo(() => {
    const breakdown: Record<EnrollmentDocumentStatus, number> = {
      pendiente: 0,
      aprobado: 0,
      rechazado: 0,
    };
    normalizedDocs.forEach((doc) => {
      breakdown[doc.status] = (breakdown[doc.status] || 0) + 1;
    });
    return {
      total: normalizedDocs.length,
      breakdown,
    };
  }, [normalizedDocs]);

  const latestAudit = React.useMemo(() => audit.slice(0, 3), [audit]);
  const [eventRoleFilter, setEventRoleFilter] = React.useState<'all' | Role>('all');
  const [eventAction, setEventAction] = React.useState('');
  const [eventDetail, setEventDetail] = React.useState('');
  const [eventTargetRole, setEventTargetRole] = React.useState<Role>(Role.ADMINISTRATIVO);
  const filteredEvents = React.useMemo(() => {
    if (eventRoleFilter === 'all') return audit;
    return audit.filter((entry) => entry.detail?.includes(eventRoleFilter) || entry.action?.includes(eventRoleFilter));
  }, [audit, eventRoleFilter]);

  const [moduleMetrics, setModuleMetrics] = React.useState<{
    id: string;
    code: string;
    name: string;
    teacher: string;
    schedule: string;
    enrolledCount: number;
    capacity: number;
    occupancy: number;
    alert: 'lleno' | 'casi lleno' | 'abierto';
  }[]>([]);
  const [loadingModules, setLoadingModules] = React.useState(false);

  React.useEffect(() => {
    const loadModules = async () => {
      setLoadingModules(true);
      try {
        const data = await listModuleAssignments();
        const mapped = data.map((mod: ModuleProfessorAssignment) => {
          const enrolledCount = Array.isArray(mod.studentIds) ? mod.studentIds.length : 0;
          const capacity = 30; // referencia; ajusta según tu cupo real
          const occupancy = capacity ? Math.min(100, Math.round((enrolledCount / capacity) * 100)) : 0;
          let alert: 'lleno' | 'casi lleno' | 'abierto' = 'abierto';
          if (enrolledCount >= capacity) alert = 'lleno';
          else if (occupancy >= 80) alert = 'casi lleno';
          const schedule = mod.modulo.materias
            .map((m) => Object.entries(m.horario).map(([d, h]) => `${d}: ${h}`).join(' | '))
            .filter(Boolean)
            .join(' · ');
          return {
            id: mod.id,
            code: mod.modulo.codigo,
            name: mod.modulo.nombre,
            teacher: mod.profesorNombre,
            schedule,
            enrolledCount,
            capacity,
            occupancy,
            alert,
          };
        });
        setModuleMetrics(mapped);
      } finally {
        setLoadingModules(false);
      }
    };
    loadModules();
  }, []);

  const getBadgeStyles = (alert: 'lleno' | 'casi lleno' | 'abierto') => {
    switch (alert) {
      case 'lleno':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'casi lleno':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
  };

  const courseAlertCount = moduleMetrics.filter((course) => course.alert !== 'abierto').length;
  const averageOccupancy = moduleMetrics.length
    ? Math.round(moduleMetrics.reduce((total, course) => total + course.occupancy, 0) / moduleMetrics.length)
    : 0;
  const latestEventSnippet = latestAudit[0]
    ? `${latestAudit[0].action} · ${new Date(latestAudit[0].when).toLocaleTimeString()}`
    : 'Sin eventos recientes';

  const adminSummary = [
    {
      title: 'Usuarios activos',
      value: users.length,
      detail: `Estudiantes ${roleSummary[Role.ESTUDIANTE]} · Docentes ${roleSummary[Role.DOCENTE]} · Administrativos ${roleSummary[Role.ADMINISTRATIVO]} · Directivos ${roleSummary[Role.DIRECTIVO]}`
    },
    {
      title: 'Documentos en cola',
      value: documentStats.total,
      detail: `Pendientes ${documentStats.breakdown.pendiente} · Aprobados ${documentStats.breakdown.aprobado} · Rechazados ${documentStats.breakdown.rechazado}`
    },
    {
      title: 'Auditoría reciente',
      value: latestAudit.length,
      detail: latestEventSnippet
    },
  ];

  const directivoSummary = [
    {
      title: 'Eventos en foco',
      value: filteredEvents.length,
      detail: filteredEvents.length ? `Mostrando ${Math.min(filteredEvents.length, 6)} de ${audit.length}` : 'Sin eventos por revisar'
    },
    {
      title: 'Alertas críticas',
      value: courseAlertCount,
      detail: `Cursos ${courseAlertCount} con ocupación >= 80%`
    },
    {
      title: 'Ocupación promedio',
      value: `${averageOccupancy}%`,
      detail: `${moduleMetrics.length} cursos monitoreados`
    },
  ];

  const summaryCards = isAdmin ? adminSummary : directivoSummary;

  const pendingDocuments = React.useMemo(
    () => normalizedDocs.filter((doc) => doc.status === 'pendiente'),
    [normalizedDocs],
  );

  const handleDocumentStatus = (documentId: string, status: EnrollmentDocumentStatus) => {
    if (!adminUser) return;
    const updated = updateEnrollmentDocumentStatus(documentId, status, adminUser.id, adminUser.name);
    if (updated) {
      reloadInscriptionDocs();
      showToast(`Documento ${status === 'aprobado' ? 'aprobado' : 'rechazado'}.`, 'success');
    }
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventAction.trim() || !eventDetail.trim()) {
      showToast('Agrega acción y detalle', 'error');
      return;
    }
    const entry = {
      id: `${Date.now()}`,
      when: new Date().toISOString(),
      action: eventAction,
      detail: `${eventDetail} · ${eventTargetRole}`,
    };
    setAudit((prev) => [entry, ...prev]);
    setEventAction('');
    setEventDetail('');
    setEventTargetRole(Role.ADMINISTRATIVO);
    showToast('Evento registrado', 'success');
  };

  const getStatusBadge = (status: EnrollmentDocumentStatus) => {
    switch (status) {
      case 'aprobado':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-300';
      case 'rechazado':
        return 'bg-rose-100 text-rose-700 border border-rose-300';
      default:
        return 'bg-amber-100 text-amber-700 border border-amber-300';
    }
  };

  const getStatusLabel = (status: EnrollmentDocumentStatus) => {
    switch (status) {
      case 'aprobado':
        return 'Aprobado';
      case 'rechazado':
        return 'Rechazado';
      default:
        return 'Pendiente';
    }
  };

  const filtered = React.useMemo(() => {
    return users.filter((u) => {
      const q = query.trim().toLowerCase();
      const matchesQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesR = roleFilter === 'all' || u.role === roleFilter;
      return matchesQ && matchesR;
    });
  }, [users, query, roleFilter]);

  const sorted = React.useMemo(()=>{
    const arr = [...filtered];
    arr.sort((a,b)=>{
      const va = String(a[sortKey]).toLowerCase();
      const vb = String(b[sortKey]).toLowerCase();
      const cmp = va.localeCompare(vb);
      return sortDir==='asc'? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageItems = React.useMemo(()=>{
    const start = (page-1)*perPage;
    return sorted.slice(start, start+perPage);
  }, [sorted, page]);

  const getRoleClass = (role: Role) => {
    switch (role) {
      case Role.ESTUDIANTE:
        return 'bg-blue-100 text-blue-800';
      case Role.DOCENTE:
        return 'bg-green-100 text-green-800';
      case Role.ADMINISTRATIVO:
        return 'bg-purple-100 text-purple-800';
      case Role.DIRECTIVO:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const exportCsv = () => {
    const header = ['id', 'name', 'email', 'role'];
    const rows = filtered.map((u) => [u.id, u.name, u.email, u.role]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => '"' + String(v).replace('"', '""') + '"').join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div>Cargando datos administrativos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Panel de Administración</h1>
          <p className="text-sm text-slate-500">Monitorea usuarios, cursos y documentos críticos desde un solo lugar.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setAdding(!adding)} className="flex items-center gap-2 py-2 px-4 bg-gradient-to-r from-iuca-green-600 to-iuca-green-700 text-white rounded-lg shadow-md hover:opacity-90 transition-transform transform hover:scale-105 duration-200">
            <UserPlus className="w-5 h-5" />
            {adding ? 'Cancelar' : 'Añadir Usuario'}
          </button>
          <button onClick={exportCsv} className="flex items-center gap-2 py-2 px-4 bg-iuca-blue-600 text-white rounded-lg shadow-md hover:bg-iuca-blue-700 transition-transform transform hover:scale-105 duration-200">
            <FileDown className="w-5 h-5" />
            Exportar CSV
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{card.title}</p>
            <h2 className="text-2xl font-bold text-slate-800 mt-2">{card.value}</h2>
            <p className="text-xs text-slate-500 mt-2">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Eventos recientes</h2>
            <p className="text-sm text-slate-500">Filtra por rol para enfocarte en acciones críticas.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {['all', Role.ADMINISTRATIVO, Role.DOCENTE, Role.DIRECTIVO].map((role) => (
              <button
                key={role}
                onClick={() => setEventRoleFilter(role as 'all' | Role)}
                className={`rounded-full px-3 py-1.5 transition text-xs ${
                  eventRoleFilter === role
                    ? 'bg-iuca-green-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {role === 'all' ? 'Todos' : role}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {adminUser?.role === Role.DIRECTIVO && (
            <form onSubmit={handleAddEvent} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Registrar evento</p>
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  value={eventAction}
                  onChange={(e) => setEventAction(e.target.value)}
                  placeholder="Acción (ej. 'Aprobó plan de estudios')"
                  className="border border-slate-200 rounded-2xl px-3 py-2 text-sm"
                />
                <input
                  value={eventDetail}
                  onChange={(e) => setEventDetail(e.target.value)}
                  placeholder="Detalle para registro y auditoría"
                  className="border border-slate-200 rounded-2xl px-3 py-2 text-sm md:col-span-2"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Rol afectado</label>
                <select
                  value={eventTargetRole}
                  onChange={(e) => setEventTargetRole(e.target.value as Role)}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value={Role.ADMINISTRATIVO}>Administrativo</option>
                  <option value={Role.DOCENTE}>Docente</option>
                  <option value={Role.DIRECTIVO}>Directivo</option>
                </select>
                <button
                  type="submit"
                  className="rounded-2xl bg-iuca-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-iuca-blue-700"
                >
                  Registrar evento
                </button>
              </div>
            </form>
          )}
          {filteredEvents.slice(0, 6).map((entry) => (
            <article key={entry.id} className="flex flex-col gap-1 rounded-2xl border border-slate-100 px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{entry.action}</p>
                <span className="text-[11px] uppercase tracking-widest text-slate-400">
                  {new Date(entry.when).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-500">{entry.detail}</p>
            </article>
          ))}
          {filteredEvents.length > 6 && (
            <p className="text-xs text-slate-500">Mostrando los 6 eventos más recientes.</p>
          )}
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Panel de matrículas por curso</h2>
            <p className="text-sm text-slate-500">Alertas en tiempo real sobre cupos y ocupación.</p>
          </div>
          <span className="text-xs uppercase tracking-[0.4em] text-slate-400">
            {moduleMetrics.filter((c) => c.alert !== 'abierto').length} cursos con alerta
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {loadingModules ? (
            <p className="text-sm text-slate-500">Cargando métricas de módulos...</p>
          ) : moduleMetrics.length === 0 ? (
            <p className="text-sm text-slate-500">No hay módulos registrados para calcular alertas.</p>
          ) : (
            moduleMetrics.map((course) => (
              <article key={course.id} className="space-y-2 rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{course.code}</p>
                    <h3 className="text-base font-semibold text-slate-900">{course.name}</h3>
                  </div>
                  <span className={`px-3 py-1 text-[11px] font-semibold rounded-full ${getBadgeStyles(course.alert)}`}>
                    {course.alert.replace('casi ', 'Casi ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{course.teacher}</p>
                <p className="text-xs text-slate-500">{course.schedule || 'Sin horario registrado'}</p>
                <div className="pt-3">
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className={`h-2 rounded-full ${
                        course.alert === 'lleno' ? 'bg-rose-500' : course.alert === 'casi lleno' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${course.occupancy}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{course.enrolledCount}/{course.capacity} inscritos</span>
                    <span>{course.occupancy}% ocupación</span>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {previewDoc.userName} · {previewDoc.status}
                </p>
                <h3 className="text-xl font-semibold text-slate-800">{previewDoc.fileName}</h3>
              </div>
              <button
                className="text-slate-500 hover:text-slate-700"
                onClick={() => setPreviewDoc(null)}
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>
                Subido el {new Date(previewDoc.uploadedAt).toLocaleString()} por {previewDoc.userName}
              </p>
              <p>Tipo: {previewDoc.type}</p>
              <p>Tamaño aproximado: {(previewDoc.size / 1024).toFixed(2)} KB</p>
              {previewDoc.reviewerRemark && (
                <p className="text-slate-500">
                  Nota previa: {previewDoc.reviewerRemark}
                </p>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  handleDocumentStatus(previewDoc.id, 'aprobado');
                  setPreviewDoc(null);
                }}
                className="flex-1 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
              >
                Aprobar y cerrar
              </button>
              <button
                onClick={() => {
                  handleDocumentStatus(previewDoc.id, 'rechazado');
                  setPreviewDoc(null);
                }}
                className="flex-1 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
              >
                Rechazar y cerrar
              </button>
            </div>
          </div>
        </div>
      )}




      {isAdmin ? (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 p-4 border-b">Gestión de Usuarios</h2>
          {adding && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await createUser(newName.trim(), newEmail.trim(), newRole);
                setNewName(''); setNewEmail(''); setNewRole(Role.ESTUDIANTE); setAdding(false);
                showToast('Usuario creado', 'success');
              }}
              className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 border-b"
            >
              <input value={newName} onChange={(e)=>setNewName(e.target.value)} placeholder="Nombre" className="border border-slate-300 rounded-md p-2" required />
              <input type="email" value={newEmail} onChange={(e)=>setNewEmail(e.target.value)} placeholder="Email" className="border border-slate-300 rounded-md p-2" required />
              <select value={newRole} onChange={(e)=>setNewRole(e.target.value as Role)} className="border border-slate-300 rounded-md p-2">
                <option value={Role.ESTUDIANTE}>Estudiante</option>
                <option value={Role.DOCENTE}>Docente</option>
                <option value={Role.ADMINISTRATIVO}>Administrativo</option>
                <option value={Role.DIRECTIVO}>Directivo</option>
              </select>
              <button className="bg-iuca-blue-600 text-white rounded-md px-4 py-2 hover:bg-iuca-blue-700 flex items-center justify-center gap-2"><Save className="w-4 h-4"/>Guardar</button>
            </form>
          )}
          <div className="px-4 py-3 flex flex-wrap gap-3 items-center border-b">
            <div className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1">Total: {users.length}</div>
            <div className="ml-auto flex items-center gap-2">
              <select value={sortKey} onChange={(e)=>{setSortKey(e.target.value as any); setPage(1);} } className="border rounded p-1 text-sm">
                <option value="name">Nombre</option>
                <option value="email">Email</option>
                <option value="role">Rol</option>
              </select>
              <select value={sortDir} onChange={(e)=>{setSortDir(e.target.value as any); setPage(1);} } className="border rounded p-1 text-sm">
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
            </div>
          </div>
          <div className="p-4 flex flex-col md:flex-row gap-2 md:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o email"
              className="border border-slate-300 rounded-md p-2 flex-1"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="border border-slate-300 rounded-md p-2 w-full md:w-56"
            >
              <option value="all">Todos los roles</option>
              <option value={Role.ESTUDIANTE}>Estudiante</option>
              <option value={Role.DOCENTE}>Docente</option>
              <option value={Role.ADMINISTRATIVO}>Administrativo</option>
              <option value={Role.DIRECTIVO}>Directivo</option>
            </select>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pageItems.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors duration-200">
                  <td className="px-3 py-4"><input type="checkbox" checked={selected.has(user.id)} onChange={()=>{ const set = new Set(selected); if (set.has(user.id)) set.delete(user.id); else set.add(user.id); setSelected(set); }} /></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt={user.name} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      className="text-iuca-blue-600 hover:text-iuca-blue-900 p-1 rounded-md hover:bg-blue-100 transition-transform duration-200 transform hover:scale-125"
                      onClick={async () => {
                        const name = window.prompt('Nombre', user.name) || user.name;
                        const email = window.prompt('Email', user.email) || user.email;
                        await updateUser(user.id, { name, email });
                        showToast('Usuario actualizado', 'success');
                      }}
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <select
                      value={user.role}
                      onChange={async (e) => { await setRole(user.id, e.target.value as Role); showToast('Rol actualizado', 'success'); }}
                      className="border border-slate-300 rounded-md p-1 text-sm"
                    >
                      <option value={Role.ESTUDIANTE}>Estudiante</option>
                      <option value={Role.DOCENTE}>Docente</option>
                      <option value={Role.ADMINISTRATIVO}>Administrativo</option>
                      <option value={Role.DIRECTIVO}>Directivo</option>
                    </select>
                    <button
                      className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-100 transition-transform duration-200 transform hover:scale-125"
                      onClick={async () => {
                        if (confirm('¿Eliminar usuario?')) {
                          await deleteUser(user.id);
                          showToast('Usuario eliminado', 'info');
                        }
                      }}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Gestión de usuarios</p>
              <h2 className="text-lg font-semibold text-slate-900">Acceso restringido</h2>
              <p className="text-sm text-slate-500 max-w-2xl">
                El equipo administrativo mantiene control directo de altas y cambios de rol. Puedes solicitar acompañamiento para casos puntuales.
              </p>
            </div>
            <span className="rounded-full bg-amber-50 text-amber-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] border border-amber-100">
              Solo administrativo
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Revisa las métricas y eventos anteriores; si necesitas modificar usuarios, usa el canal oficial de soporte o crea un incidente.
          </p>
        </section>
      )}
    </div>
  );
};

export default AdminPage;
