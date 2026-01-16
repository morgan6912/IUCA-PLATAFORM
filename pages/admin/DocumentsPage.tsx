import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '../../types';
import { EnrollmentDocument, EnrollmentDocumentStatus, listEnrollmentDocuments, updateEnrollmentDocumentStatus } from '../../services/inscriptionService';
import { useToast } from '../../components/shared/ToastProvider';

const formatStatusLabel = (status: EnrollmentDocumentStatus) => {
  switch (status) {
    case 'aprobado':
      return 'Aprobado';
    case 'rechazado':
      return 'Rechazado';
    default:
      return 'Pendiente';
  }
};

const statusBadgeClass = (status: EnrollmentDocumentStatus) => {
  switch (status) {
    case 'aprobado':
      return 'text-emerald-600 bg-emerald-50 border border-emerald-200';
    case 'rechazado':
      return 'text-rose-600 bg-rose-50 border border-rose-200';
    default:
      return 'text-amber-600 bg-amber-50 border border-amber-200';
  }
};

const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<EnrollmentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<EnrollmentDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EnrollmentDocumentStatus>('all');
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    const list = await listEnrollmentDocuments();
    setDocuments(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const stats = useMemo(
    () => ({
      total: documents.length,
      pending: documents.filter((doc) => doc.status === 'pendiente').length,
      approved: documents.filter((doc) => doc.status === 'aprobado').length,
      denied: documents.filter((doc) => doc.status === 'rechazado').length,
    }),
    [documents]
  );

  const filteredDocuments = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return documents
      .filter((doc) => (statusFilter === 'all' ? true : doc.status === statusFilter))
      .filter(
        (doc) =>
          !normalized ||
          doc.userName.toLowerCase().includes(normalized) ||
          doc.fileName.toLowerCase().includes(normalized)
      )
      .sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
  }, [documents, statusFilter, searchTerm]);

  const handleDocumentStatus = useCallback(
    async (documentId: string, status: EnrollmentDocumentStatus) => {
      if (!user) return;
      const remark = remarks[documentId];
      const updated = await updateEnrollmentDocumentStatus(documentId, status, user.id, user.name, remark);
      if (updated) {
        showToast(`Documento ${status === 'aprobado' ? 'aprobado' : 'rechazado'}.`, 'success');
        setRemarks((prev) => {
          const next = { ...prev };
          delete next[documentId];
          return next;
        });
        await loadDocuments();
      }
    },
    [user, loadDocuments, showToast, remarks]
  );

  const handleDownload = (doc: EnrollmentDocument) => {
    const url = (doc as any).download_url || doc.downloadUrl || doc.dataUrl;
    if (!url) {
      showToast('No hay archivo disponible para descargar.', 'info');
      return;
    }
    // Abrir en nueva pestaña para revisión rápida (evita popups bloqueados).
    const newTab = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newTab) {
      // Fallback a descarga directa
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName || 'documento';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    }
  };

  if (!user || (user.role !== Role.ADMINISTRATIVO && user.role !== Role.DIRECTIVO)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-500">Revisión de documentos</p>
            <h1 className="text-2xl font-semibold text-slate-900">Documentos de inscripción</h1>
            <p className="text-sm text-slate-500">Aprobar o rechazar los archivos de matrícula cargados por los estudiantes.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
            <span>
              Pendientes: <strong className="text-amber-600">{stats.pending}</strong>
            </span>
            <span>
              Aprobados: <strong className="text-emerald-600">{stats.approved}</strong>
            </span>
            <span>
              Rechazados: <strong className="text-rose-600">{stats.denied}</strong>
            </span>
            <span>
              Total: <strong className="text-slate-900">{stats.total}</strong>
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando documentos…</p>
        ) : !documents.length ? (
          <p className="text-sm text-slate-500">No hay documentos guardados todavía.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-2 items-center">
                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Filtro</label>
                {(['all', 'pendiente', 'aprobado', 'rechazado'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusFilter === value ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                  >
                    {value === 'all' ? 'Todos' : formatStatusLabel(value)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar estudiante o archivo"
                  className="text-sm border border-slate-200 rounded-full px-3 py-1 focus:border-emerald-500 focus:outline-none"
                />
                <Download className="h-4 w-4 text-slate-400" />
              </div>
            </div>
            {filteredDocuments.length ? (
              <div className="space-y-4">
                {filteredDocuments.map((doc) => (
                  <article key={doc.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{doc.fileName}</p>
                        <p className="text-xs text-slate-500">
                          Enviado por <span className="font-semibold text-slate-800">{doc.userName}</span> el{' '}
                          {new Date(doc.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] rounded-full border ${statusBadgeClass(doc.status)}`}>
                        {formatStatusLabel(doc.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {doc.status === 'pendiente' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDocumentStatus(doc.id, 'aprobado')}
                            className="rounded-full border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDocumentStatus(doc.id, 'rechazado')}
                            className="rounded-full border border-rose-500 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        title={`Archivo de ${doc.userName}`}
                      >
                        Descargar ({doc.userName})
                      </button>
                      {doc.type && (
                        <span className="text-xs text-slate-500">Tipo: {doc.type}</span>
                      )}
                      {doc.size && (
                        <span className="text-xs text-slate-500">Tamaño: {(doc.size / 1024).toFixed(2)} KB</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Ver detalle
                      </button>
                    </div>
                    <div className="mt-3">
                      <label className="text-xs text-slate-500">Observación (opcional)</label>
                      <textarea
                        rows={2}
                        value={remarks[doc.id] || ''}
                        onChange={(e) =>
                          setRemarks((prev) => ({
                            ...prev,
                            [doc.id]: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        placeholder="Ej. Falta firma, documento ilegible, etc."
                      />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No hay documentos que coincidan con el filtro seleccionado.</p>
            )}
          </>
        )}
      </section>

      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {previewDoc.userName} · {formatStatusLabel(previewDoc.status)}
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
    </div>
  );
};

export default DocumentsPage;
