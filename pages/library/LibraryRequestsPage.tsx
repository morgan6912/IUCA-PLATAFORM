import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Download } from 'lucide-react';
import { listDocuments } from '../../services/libraryService';
import { useLibraryRequests } from '../../hooks/useLibraryRequests';
import { LibraryDocument, Role } from '../../types';
import { useAuth } from '../../hooks/useAuth';

const LibraryRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const { requests, loading, updateStatus } = useLibraryRequests();
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);

  useEffect(() => {
    listDocuments().then(setDocuments);
  }, []);

  const stats = useMemo(
    () => ({
      pending: requests.filter((request) => request.status === 'pending').length,
      approved: requests.filter((request) => request.status === 'approved').length,
      denied: requests.filter((request) => request.status === 'denied').length,
    }),
    [requests]
  );

  if (!user || user.role !== Role.BIBLIOTECARIO) {
    return null;
  }

  const getRelatedDoc = (id: string) => documents.find((doc) => doc.id === id);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-500">Autorizaciones</p>
              <h2 className="text-2xl font-semibold text-slate-900">Solicitudes de biblioteca</h2>
            </div>
          </div>
          <div className="flex gap-4 text-sm text-slate-500">
            <span>
              Pendientes: <strong className="text-emerald-600">{stats.pending}</strong>
            </span>
            <span>
              Aprobadas: <strong className="text-slate-900">{stats.approved}</strong>
            </span>
            <span>
              Rechazadas: <strong className="text-rose-600">{stats.denied}</strong>
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando solicitudes…</p>
        ) : !requests.length ? (
          <p className="text-sm text-slate-500">Aún no hay solicitudes para revisar.</p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const relatedDoc = getRelatedDoc(request.documentId);
              const statusLabel =
                request.status === 'approved'
                  ? 'Autorizado'
                  : request.status === 'denied'
                  ? 'Rechazado'
                  : 'Pendiente';
              return (
                <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {request.documentTitle}
                      </p>
                      <p className="text-xs text-slate-500">
                        {request.userName} · {new Date(request.requestedAt).toLocaleString('es-ES')}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-[0.3em] ${
                        request.status === 'pending'
                          ? 'text-amber-600'
                          : request.status === 'approved'
                          ? 'text-emerald-600'
                          : 'text-rose-500'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {request.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateStatus(request.id, 'approved')}
                          className="rounded-full border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
                        >
                          Autorizar
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(request.id, 'denied')}
                          className="rounded-full border border-rose-500 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                    {relatedDoc && relatedDoc.url && relatedDoc.url !== '#' && (
                      <a
                        href={relatedDoc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 flex items-center gap-1 hover:bg-slate-50"
                      >
                        <Download className="w-4 h-4" /> Abrir recurso
                      </a>
                    )}
                  </div>
                  {relatedDoc && (
                    <p className="mt-3 text-xs text-slate-500">
                      Categoría: {relatedDoc.category} · Autor: {relatedDoc.author}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default LibraryRequestsPage;
