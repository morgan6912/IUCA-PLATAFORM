import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/shared/ToastProvider';
import { panelClass, primaryButtonClass } from '../../components/shared/ui';
import {
  EnrollmentDocument,
  addEnrollmentDocumentsForUser,
  listEnrollmentDocumentsByUser,
  removeEnrollmentDocument,
  EnrollmentDocumentStatus,
} from '../../services/inscriptionService';

const formatSize = (bytes: number) => `${(bytes / 1024).toFixed(2)} KB`;
const statusLabel = (status: EnrollmentDocumentStatus) => {
  switch (status) {
    case 'aprobado':
      return 'Aprobado';
    case 'rechazado':
      return 'Rechazado';
    default:
      return 'Pendiente';
  }
};

const statusBadge = (status: EnrollmentDocumentStatus) => {
  switch (status) {
    case 'aprobado':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-300';
    case 'rechazado':
      return 'bg-rose-100 text-rose-700 border border-rose-300';
    default:
      return 'bg-amber-100 text-amber-700 border border-amber-300';
  }
};

const REQUIRED_TYPES = ['Acta de Nacimiento', 'Certificado de Estudios', 'Fotografía'];

const StudentCertificatesPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const requiredFileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<EnrollmentDocument[]>([]);
  const [dragging, setDragging] = useState(false);
  const [documentFilter, setDocumentFilter] = useState<'todos' | EnrollmentDocumentStatus>('todos');
  const [requiredUploadType, setRequiredUploadType] = useState<string | null>(null);

  const loadDocuments = React.useCallback(async () => {
    if (!user) {
      setDocuments([]);
      return;
    }
    const docs = await listEnrollmentDocumentsByUser(user.id);
    setDocuments(docs);
  }, [user]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const documentStats = useMemo(() => {
    const pending = documents.filter((doc) => doc.status === 'pendiente').length;
    const approved = documents.filter((doc) => doc.status === 'aprobado').length;
    const rejected = documents.filter((doc) => doc.status === 'rechazado').length;
    return { total: documents.length, pending, approved, rejected };
  }, [documents]);

  type CertificateType = 'inscripcion' | 'documentos' | 'avance';

  const certificateOptions: { id: CertificateType; title: string; description: string }[] = [
    {
      id: 'inscripcion',
      title: 'Constancia de Inscripción',
      description: 'Confirma tu matrícula formal en el periodo académico vigente.',
    },
    {
      id: 'documentos',
      title: 'Resumen de Documentos',
      description: 'Incluye el estado actual de todos los comprobantes que has subido.',
    },
    {
      id: 'avance',
      title: 'Constancia de Avance Académico',
      description: 'Repasa tus entregas, pendientes y últimas acciones del periodo.',
    },
  ];

  const buildCertificateText = (type: CertificateType) => {
    if (!user) return '';
    const today = new Date().toLocaleDateString();
    switch (type) {
      case 'documentos':
        return `Instituto Universitario de Ciencias Ambientales\n\nResumen de Documentos Adjuntos\n\nEstudiante: ${user.name} (ID: ${user.id})\nDocumentos registrados: ${documentStats.total}\nPendientes: ${documentStats.pending}\nAprobados: ${documentStats.approved}\nRechazados: ${documentStats.rejected}\n\nFecha de emisión: ${today}\n`;
      case 'avance':
        return `Instituto Universitario de Ciencias Ambientales\n\nConstancia de Avance Académico\n\nEstudiante: ${user.name} (ID: ${user.id})\nDocumentos revisados: ${documentStats.approved}\nDocumentos pendientes: ${documentStats.pending}\nEstado general: ${documentStats.pending ? 'En revisión' : 'En regla'}\n\nFecha de emisión: ${today}\n`;
      default:
        return `Instituto Universitario de Ciencias Ambientales\n\nConstancia de Inscripción\n\nSe certifica que ${user.name} (ID: ${user.id}) se encuentra inscrito/a en el periodo académico vigente.\nDocumentos pendientes: ${documentStats.pending}\n\nFecha de emisión: ${today}\n`;
    }
  };

  const handleGenerateCertificate = (type: CertificateType) => {
    if (!user) return;
    const text = buildCertificateText(type);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `constancia-${type}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Constancia generada correctamente', 'success');
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!user || !files?.length) return;
    try {
      const meta = await Promise.all(
        Array.from(files).map(
          (file) =>
            new Promise<{ name: string; size: number; type: string; dataUrl?: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  name: file.name,
                  size: file.size,
                  type: file.type || 'Documento',
                  dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
                });
              reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
              reader.readAsDataURL(file);
            }),
        ),
      );
      if (!meta.length) return;
      const updated = await addEnrollmentDocumentsForUser(user.id, user.name, meta);
      setDocuments(updated);
      showToast('Documentos agregados al proceso de inscripción.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'No se pudieron cargar los archivos.', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setDragging(false);
    }
  };

  const handleRequiredFilesSelected = async (files: FileList | null) => {
    if (!user || !files?.length || !requiredUploadType) return;
    try {
      const meta = await Promise.all(
        Array.from(files).map(
          (file) =>
            new Promise<{ name: string; size: number; type: string; dataUrl?: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  name: `${requiredUploadType} - ${file.name}`,
                  size: file.size,
                  type: file.type || requiredUploadType,
                  dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
                });
              reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
              reader.readAsDataURL(file);
            }),
        ),
      );
      const updated = await addEnrollmentDocumentsForUser(user.id, user.name, meta);
      setDocuments(updated);
      showToast(`Documento cargado: ${requiredUploadType}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'No se pudo cargar el archivo.', 'error');
    } finally {
      setRequiredUploadType(null);
      if (requiredFileInputRef.current) requiredFileInputRef.current.value = '';
    }
  };

  const latestDocForType = (label: string) => {
    return documents
      .filter((doc) => doc.fileName?.startsWith(label))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFilesSelected(event.dataTransfer.files);
  };

  const handleSubmitDocuments = () => {
    if (!documents.length) {
      showToast('Añade al menos un archivo antes de enviar.', 'error');
      return;
    }
    showToast('Documentos enviados para validación.', 'success');
  };

  const handleRemoveDocument = async (doc: EnrollmentDocument) => {
    if (!user) return;
    if (doc.status !== 'pendiente') {
      showToast('Sólo puedes eliminar documentos pendientes.', 'info');
      return;
    }
    await removeEnrollmentDocument(doc.id, user.id);
    await loadDocuments();
    showToast('Documento eliminado.', 'info');
  };

  const pendingCount = documentStats.pending;

  const filteredDocuments =
    documentFilter === 'todos' ? documents : documents.filter((doc) => doc.status === documentFilter);

  const filterOptions: { label: string; value: 'todos' | EnrollmentDocumentStatus }[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Pendientes', value: 'pendiente' },
    { label: 'Aprobados', value: 'aprobado' },
    { label: 'Rechazados', value: 'rechazado' },
  ];

  if (!user) return <div>Inicia sesión.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Documentos académicos</h1>
      <div className="bg-white p-6 rounded-xl shadow-md space-y-3">
        <p className="text-slate-600">Descarga constancias y certificados académicos.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {certificateOptions.map((option) => (
            <div key={option.id} className="rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-400">Documento</p>
                  <p className="text-lg font-semibold text-slate-800">{option.title}</p>
                </div>
                <span className="text-xs font-semibold text-iuca-blue-600">Instantánea</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{option.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {option.id === 'documentos' && `${documentStats.total} archivo(s)`}
                  {option.id === 'avance' && `${documentStats.approved} aprobados`}
                  {option.id === 'inscripcion' && `${pendingCount} pendientes`}
                </span>
                <button
                  type="button"
                  onClick={() => handleGenerateCertificate(option.id)}
                  className="rounded-full bg-gradient-to-r from-iuca-blue-600 to-iuca-green-600 px-3 py-1 text-xs font-semibold text-white shadow-sm shadow-slate-300 transition hover:opacity-90"
                >
                  Descargar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className={`${panelClass} space-y-5`}>
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-800">Documentos del proceso de inscripción</p>
            <p className="text-sm text-slate-500">
              Adjunta los comprobantes, formularios o autorizaciones requeridas para tu matrícula. La administración validará los
              archivos y te notificará el estado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`${primaryButtonClass} bg-iuca-green-600 hover:bg-iuca-green-700`}
          >
            Seleccionar archivos
          </button>
        </header>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => handleFilesSelected(event.target.files)}
        />
        <input
          ref={requiredFileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(event) => handleRequiredFilesSelected(event.target.files)}
        />

        <div className="grid gap-3 md:grid-cols-3">
          {REQUIRED_TYPES.map((label) => {
            const latest = latestDocForType(label);
            return (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">{label}</p>
                <p className="text-xs text-slate-500">
                  {label === 'Fotografía' ? 'Imagen reciente en fondo claro.' : 'Sube un archivo claro y legible.'}
                </p>
                {latest && (
                  <p className="text-xs text-slate-500">
                    Último: {latest.fileName} ({new Date(latest.uploadedAt).toLocaleDateString()})
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setRequiredUploadType(label);
                    requiredFileInputRef.current?.click();
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-iuca-green-600 to-iuca-blue-600 px-3 py-2 text-xs font-semibold text-white shadow hover:opacity-90"
                >
                  Subir {label.toLowerCase()}
                </button>
              </div>
            );
          })}
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 p-6 transition ${dragging ? 'border-iuca-green-500 bg-iuca-green-50' : 'border-dashed border-slate-200 bg-slate-50'}`}
        >
          <p className="text-sm text-slate-500">Arrastra tus archivos aquí o usa el botón superior.</p>
          <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel o imágenes (máx. 5 MB por archivo).</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs uppercase text-slate-400">Documentos cargados</p>
            <p className="text-2xl font-semibold text-slate-800">{documentStats.total}</p>
            <p className="text-sm text-slate-500">archivos en el historial</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs uppercase text-slate-400">Pendientes</p>
            <p className="text-2xl font-semibold text-amber-600">{documentStats.pending}</p>
            <p className="text-sm text-slate-500">bajo revisión</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs uppercase text-slate-400">Aprobados</p>
            <p className="text-2xl font-semibold text-emerald-600">{documentStats.approved}</p>
            <p className="text-sm text-slate-500">listos para la administración</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDocumentFilter(option.value)}
              className={`rounded-full border px-3 py-1 transition ${
                documentFilter === option.value
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {filteredDocuments.length > 0 ? (
          <ul className="space-y-3">
            {filteredDocuments.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{doc.fileName}</p>
                  <p className="text-xs text-slate-500">
                    {formatSize(doc.size)} · {doc.type} · {new Date(doc.uploadedAt).toLocaleString()}
                  </p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 mt-2 text-xs font-semibold ${statusBadge(doc.status)}`}>
                    {statusLabel(doc.status)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(doc)}
                    className="px-3 py-1 rounded-full border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 transition disabled:opacity-50 disabled:pointer-events-none"
                    disabled={doc.status !== 'pendiente'}
                  >
                    Eliminar
                  </button>
                  {doc.status !== 'pendiente' && doc.reviewerName && (
                    <p className="text-xs text-slate-400">
                      Revisado por {doc.reviewerName} {doc.reviewedAt ? `el ${new Date(doc.reviewedAt).toLocaleString()}` : ''}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            {documentFilter === 'todos'
              ? 'Todavía no has agregado archivos.'
              : 'No hay archivos registrados con ese estado.'}
          </p>
        )}

        <div className="text-right">
          <button
            type="button"
            onClick={handleSubmitDocuments}
            className="inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition"
          >
            Guardar documentos
          </button>
        </div>
      </section>
    </div>
  );
};

export default StudentCertificatesPage;
