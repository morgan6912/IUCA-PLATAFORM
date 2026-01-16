import React from 'react';
import { Bookmark, Download, Filter, Search } from 'lucide-react';
import { useLibrarySearch } from '../hooks/useLibrarySearch';
import { panelClass } from '../components/shared/ui';
import { LibraryDocument, Role } from '../types';
import { useAuth } from '../hooks/useAuth';
import { addDocument, getDocumentDownloadUrl } from '../services/libraryService';
import { useLibraryRequests } from '../hooks/useLibraryRequests';

const coverClassFor = (category: string): string => {
  const c = category.toLowerCase();
  if (c.includes('cambio') || c.includes('clim')) return 'bg-gradient-to-br from-cyan-600 to-cyan-400';
  if (c.includes('gest') || c.includes('admin')) return 'bg-gradient-to-br from-sky-700 to-sky-400';
  if (c.includes('conserv') || c.includes('eco')) return 'bg-gradient-to-br from-emerald-700 to-emerald-400';
  if (c.includes('tesis')) return 'bg-gradient-to-br from-amber-600 to-amber-400';
  return 'bg-gradient-to-br from-emerald-700 to-cyan-600';
};

const LibraryPage: React.FC = () => {
  const {
    filteredDocuments,
    documents,
    paginated,
    total,
    totalPages,
    page,
    setPage,
    categories,
    loading,
    searchTerm,
    setSearchTerm,
    category,
    setCategory,
    favoritesOnly,
    setFavoritesOnly,
    toggleFav,
    isFav,
    refreshDocuments,
  } = useLibrarySearch();
  const { user } = useAuth();
  const isLibrarian = user?.role === Role.BIBLIOTECARIO;
  const isStudent = user?.role === Role.ESTUDIANTE;

  const [addingDocument, setAddingDocument] = React.useState(false);
  const [newDocument, setNewDocument] = React.useState({
    title: '',
    author: '',
    category: '',
    publishDate: '',
    url: '',
  });
  const [addMessage, setAddMessage] = React.useState<string>('');
  const [addStatus, setAddStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [pdfMeta, setPdfMeta] = React.useState<{ name: string; dataUrl: string } | null>(null);
  const [fileError, setFileError] = React.useState('');
  const [fileLoading, setFileLoading] = React.useState(false);
  const [fileInputKey, setFileInputKey] = React.useState(0);
  const [requestMessage, setRequestMessage] = React.useState('');
  const [requestingDocId, setRequestingDocId] = React.useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = React.useState<LibraryDocument | null>(null);
  const { requests, createRequest, updateStatus } = useLibraryRequests();
  const [moderatingId, setModeratingId] = React.useState<string | null>(null);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  const handleAddDocument = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newDocument.title.trim() || !newDocument.author.trim() || !newDocument.category.trim()) {
      setAddStatus('error');
      setAddMessage('Completa título, autor y categoría antes de guardar.');
      return;
    }

    setAddingDocument(true);
    setAddStatus('idle');
    setAddMessage('');

    const finalUrl = pdfMeta?.dataUrl || newDocument.url.trim() || '#';
    const payload = {
      title: newDocument.title.trim(),
      author: newDocument.author.trim(),
      category: newDocument.category.trim(),
      publishDate: newDocument.publishDate
        ? new Date(newDocument.publishDate).toISOString()
        : new Date().toISOString(),
      url: finalUrl,
      fileName: pdfMeta?.name,
      fileType: pdfMeta ? 'application/pdf' : undefined,
    };
    try {
      const savedDoc = await addDocument(payload);
      setAddStatus('success');
      setAddMessage('Libro agregado correctamente.');
      setNewDocument({
        title: '',
        author: '',
        category: '',
        publishDate: '',
        url: '',
      });
      resetPdfInput();
      setPreviewDoc(savedDoc);
      await refreshDocuments();
    } catch (error) {
      console.error(error);
      setAddStatus('error');
      setAddMessage('No se pudo guardar el libro. Intenta de nuevo.');
    } finally {
      setAddingDocument(false);
    }
  };

  const resetPdfInput = () => {
    setPdfMeta(null);
    setFileError('');
    setFileLoading(false);
    setFileInputKey((prev) => prev + 1);
  };

  const handlePdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      resetPdfInput();
      return;
    }
    if (file.type !== 'application/pdf') {
      setFileError('Solo se pueden subir archivos PDF.');
      setPdfMeta(null);
      setFileLoading(false);
      setFileInputKey((prev) => prev + 1);
      return;
    }
    setFileLoading(true);
    setFileError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPdfMeta({ name: file.name, dataUrl: reader.result });
        setFileLoading(false);
      }
    };
    reader.onerror = () => {
      setFileError('No se pudo leer el PDF.');
      setFileLoading(false);
      setPdfMeta(null);
      setFileInputKey((prev) => prev + 1);
    };
    reader.readAsDataURL(file);
  };

  const handleRequestDoc = React.useCallback(
    async (doc: LibraryDocument) => {
      if (!user) return;
      const existing = requests.find((request) => request.documentId === doc.id && request.userId === user.id);
      if (existing) {
        // Solo bloqueamos si ya hay una pendiente; si fue aprobada/denegada, permitimos reintentar
        if (existing.status === 'pending') {
          setRequestMessage('Tu solicitud ya está en revisión.');
          return;
        }
      }
      setRequestMessage('');
      setRequestingDocId(doc.id);
      try {
        await createRequest(doc, user);
        setRequestMessage('Solicitud enviada. Espera respuesta del bibliotecario.');
      } catch (error) {
        console.error(error);
        setRequestMessage('No se pudo enviar la solicitud. Intenta más tarde.');
      } finally {
        setRequestingDocId(null);
      }
    },
    [requests, user, createRequest]
  );

  const handleModerate = async (id: string, status: 'approved' | 'denied') => {
    setModeratingId(id);
    try {
      await updateStatus(id, status);
    } catch (err) {
      console.error(err);
    } finally {
      setModeratingId(null);
    }
  };

  const handleDownload = async (doc: LibraryDocument, canDownload: boolean) => {
    if (!canDownload) return;
    const hasAttachment = Boolean(doc.url && doc.url !== '#');
    if (!hasAttachment) return;

    // Abrimos ventana adelantada para evitar bloqueadores de popups
    const newTab = window.open('about:blank', '_blank');
    if (newTab) {
      newTab.document.title = 'Generando descarga...';
      newTab.document.body.innerHTML = '<p style="font-family:sans-serif;padding:16px">Generando enlace seguro...</p>';
    } else {
      setRequestMessage('Permite las ventanas emergentes para descargar.');
    }

    setDownloadingId(doc.id);
    try {
      if (doc.fileName) {
        const freshUrl = await getDocumentDownloadUrl(doc.id);
        if (freshUrl) {
          if (newTab) {
            newTab.location.href = freshUrl;
          } else {
            window.location.href = freshUrl;
          }
        } else {
          setRequestMessage('No se pudo generar el enlace de descarga.');
          newTab?.close();
        }
      } else if (doc.url && doc.url !== '#') {
        if (newTab) {
          newTab.location.href = doc.url;
        } else {
          window.location.href = doc.url;
        }
      }
    } catch (err) {
      console.error(err);
      setRequestMessage('No se pudo abrir el archivo.');
      newTab?.close();
    } finally {
      setDownloadingId(null);
    }
  };

  const [assistantPrompt, setAssistantPrompt] = React.useState('');
  const [assistantResults, setAssistantResults] = React.useState<LibraryDocument[]>([]);
  const [assistantLoading, setAssistantLoading] = React.useState(false);

  const handleAssistantSearch = () => {
    if (!assistantPrompt.trim()) return;
    setAssistantLoading(true);
    setTimeout(() => {
      const keywords = assistantPrompt.toLowerCase().split(/\W+/).filter(Boolean);
      const scored = documents
        .map((doc) => {
          const text = `${doc.title} ${doc.author} ${doc.category}`.toLowerCase();
          const score = keywords.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
          return { score, doc };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title))
        .map(({ doc }) => doc)
        .slice(0, 3);
      setAssistantResults(scored.length ? scored : documents.slice(0, 3));
      setAssistantLoading(false);
    }, 400);
  };

  const [sort, setSort] = React.useState<'title-asc' | 'date-desc'>('date-desc');
  const docs = React.useMemo(() => {
    const copy = [...filteredDocuments];
    if (sort === 'title-asc') copy.sort((a, b) => a.title.localeCompare(b.title));
    else copy.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
    return copy;
  }, [filteredDocuments, sort]);

  const authors = React.useMemo(() => new Set(filteredDocuments.map((d) => d.author)).size, [filteredDocuments]);

      if (loading) return <div className="p-6">Cargando biblioteca...</div>;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl p-8 text-white shadow-md bg-gradient-to-r from-emerald-700 to-sky-700">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Biblioteca Digital IUCA</h1>
            <p>Accede a miles de recursos académicos y materiales de estudio.</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center bg-white/15 backdrop-blur rounded-xl px-6 py-3 min-w-[120px]">
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs opacity-90">Documentos</p>
            </div>
            <div className="text-center bg-white/15 backdrop-blur rounded-xl px-6 py-3 min-w-[120px]">
              <p className="text-2xl font-bold">{authors}</p>
              <p className="text-xs opacity-90">Autores</p>
            </div>
            <div className="text-center bg-white/15 backdrop-blur rounded-xl px-6 py-3 min-w-[120px]">
              <p className="text-2xl font-bold">{Math.max(0, categories.length - 1)}</p>
              <p className="text-xs opacity-90">Categorías</p>
            </div>
          </div>
        </div>
      </section>

      {previewDoc && (
        <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-500">Vista previa</p>
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{previewDoc.title}</h3>
                <p className="text-sm text-slate-500">{previewDoc.author}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  {previewDoc.fileName
                    ? 'PDF cargado'
                    : previewDoc.url && previewDoc.url !== '#'
                    ? 'Enlace externo'
                    : 'Sin archivo'}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-500"
                >
                  Cerrar vista previa
                </button>
              </div>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Detalles</p>
              <p className="text-sm font-semibold text-slate-800">{previewDoc.category}</p>
              <p className="text-xs text-slate-500">Publicado: {new Date(previewDoc.publishDate).toLocaleDateString('es-ES')}</p>
              <p className="text-xs text-slate-500">ID: {previewDoc.id}</p>
              {previewDoc.fileName && <p className="text-xs text-slate-500">Archivo: {previewDoc.fileName}</p>}
              {!previewDoc.url || previewDoc.url === '#' ? (
                <p className="text-xs text-rose-500">No hay archivo disponible aún.</p>
              ) : previewDoc.fileName ? (
                <p className="text-xs text-slate-500">Enlace interno (PDF)</p>
              ) : (
                <p className="text-xs text-slate-500">Enlace externo disponible</p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 h-[320px]">
              {(() => {
                const url = previewDoc.url;
                const isPdfPreview =
                  previewDoc.fileType === 'application/pdf' || url?.startsWith('data:application/pdf');
                if (isPdfPreview && url) {
                  return (
                    <object
                      data={url}
                      type="application/pdf"
                      className="w-full h-full"
                      aria-label={`PDF preview ${previewDoc.title}`}
                    >
                      <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <p className="text-sm font-semibold text-slate-900">El navegador no puede mostrar el PDF.</p>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-600 underline mt-2"
                        >
                          Abrir documento en nueva pestaña
                        </a>
                      </div>
                    </object>
                  );
                }
                if (url && url !== '#') {
                  return (
                    <div className="flex flex-col items-center justify-center text-center h-full px-6">
                      <p className="text-sm font-semibold text-slate-900">Vista previa no disponible para enlaces externos.</p>
                      <a href={url} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 underline mt-2">
                        Abrir recurso
                      </a>
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col items-center justify-center text-center h-full px-6">
                    <p className="text-sm font-semibold text-slate-900">Sube un PDF para ver la vista previa.</p>
                    <p className="text-xs text-slate-500">Solo los archivos PDF se renderizan directamente.</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      )}
      {requestMessage && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {requestMessage}
        </div>
      )}
      {isLibrarian && (
        <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-500">Solicitudes de estudiantes</p>
              <h3 className="text-lg font-semibold text-slate-900">Revisar y autorizar</h3>
            </div>
            <span className="text-sm text-slate-500">Total: {requests.length}</span>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-slate-500">No hay solicitudes pendientes.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {requests.map((req) => (
                <article key={req.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Doc</p>
                      <h4 className="text-sm font-semibold text-slate-900">{req.documentTitle}</h4>
                      <p className="text-xs text-slate-500">Usuario: {req.userName}</p>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Solicitado: {new Date(req.requestedAt).toLocaleString('es-ES')}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleModerate(req.id, 'approved')}
                      disabled={moderatingId === req.id}
                      className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModerate(req.id, 'denied')}
                      disabled={moderatingId === req.id}
                      className="flex-1 rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                    >
                      Rechazar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      <section className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar libros, artículos, autores, temas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 pl-10 border border-slate-200 rounded-xl shadow-sm focus:ring-emerald-600 focus:border-emerald-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={
                'inline-flex items-center gap-2 px-4 py-3 rounded-xl border shadow-sm ' +
                (favoritesOnly ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200')
              }
            >
              <Bookmark className="w-4 h-4" /> {favoritesOnly ? 'Solo favoritos' : 'Todos'}
            </button>
            <span className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border bg-white border-slate-200 text-slate-700 shadow-sm">
              <Filter className="w-4 h-4" /> Filtros
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'title-asc' | 'date-desc')}
              className="px-3 py-2 rounded-xl border bg-white border-slate-200 text-slate-700 shadow-sm"
            >
              <option value="date-desc">Más recientes</option>
              <option value="title-asc">Título (A-Z)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={
                'inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm shadow-sm transition ' +
                (category === cat
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-400 text-white border-emerald-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-600 hover:text-emerald-700')
              }
            >
              {cat === 'all' ? 'Todos' : cat}
            </button>
          ))}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Asistente bibliotecaria</p>
              <h3 className="text-lg font-semibold text-slate-800">Descríbeme tus necesidades</h3>
            </div>
            <p className="text-sm text-slate-500 max-w-sm">
              Dime si buscas libros específicos, temas, autores o formatos y recibirás recomendaciones instantáneas.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <textarea
              rows={2}
              value={assistantPrompt}
              onChange={(e) => setAssistantPrompt(e.target.value)}
              placeholder="Ej: Necesito libros sobre conservación del agua con muchos gráficos y datos"
              className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAssistantSearch}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-iuca-green-600 to-iuca-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-50"
                disabled={assistantLoading || !assistantPrompt.trim()}
              >
                {assistantLoading ? 'Buscando...' : 'Preguntar'}
              </button>
              <span className="text-xs text-slate-500">
                No uses datos sensibles. Esta asistente sugiere títulos que ya están en la biblioteca.
              </span>
            </div>
          </div>
          {assistantResults.length > 0 && (
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {assistantResults.map((doc) => (
                <article key={doc.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{doc.category}</p>
                  <h4 className="mt-2 text-sm font-semibold text-slate-900">{doc.title}</h4>
                  <p className="text-xs text-slate-500">{doc.author}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(doc.publishDate).getFullYear()}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {isLibrarian && (
        <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-500">Bibliotecaria IUCA</p>
              <h3 className="text-lg font-semibold text-slate-900">Agrega un libro o documento nuevo</h3>
            </div>
            <span
              className={
                'text-sm font-medium ' +
                (addStatus === 'success'
                  ? 'text-emerald-600'
                  : addStatus === 'error'
                  ? 'text-rose-500'
                  : 'text-slate-500')
              }
            >
              {addStatus === 'success'
                ? 'Recurso guardado'
                : addStatus === 'error'
                ? 'Hay un problema'
                : 'Completa los campos y presiona guardar'}
            </span>
          </div>
          <form onSubmit={handleAddDocument} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Título"
                value={newDocument.title}
                onChange={(event) => setNewDocument((prev) => ({ ...prev, title: event.target.value }))}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                required
              />
              <input
                type="text"
                placeholder="Autor"
                value={newDocument.author}
                onChange={(event) => setNewDocument((prev) => ({ ...prev, author: event.target.value }))}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                required
              />
              <input
                type="text"
                placeholder="Categoría"
                value={newDocument.category}
                onChange={(event) => setNewDocument((prev) => ({ ...prev, category: event.target.value }))}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                required
              />
              <input
                type="date"
                placeholder="Fecha de publicación"
                value={newDocument.publishDate}
                onChange={(event) => setNewDocument((prev) => ({ ...prev, publishDate: event.target.value }))}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
              />
            </div>
            <input
              type="url"
              placeholder="URL del archivo (opcional)"
              value={newDocument.url}
              onChange={(event) => setNewDocument((prev) => ({ ...prev, url: event.target.value }))}
              disabled={!!pdfMeta}
              title={pdfMeta ? 'Ya hay un archivo PDF cargado' : 'Ingresa un enlace público'}
              className={`w-full rounded-2xl border px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 ${
                pdfMeta
                  ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            />
            <p className="text-xs text-slate-500">
              El campo URL se ignora cuando se sube un PDF. Deja el archivo en blanco si quieres enlazar un recurso externo.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Adjuntar PDF</label>
              <input
                key={fileInputKey}
                type="file"
                accept="application/pdf"
                onChange={handlePdfChange}
                className="w-full text-sm text-slate-600 file:cursor-pointer file:rounded-2xl file:border file:border-slate-300 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-600 file:bg-white"
              />
              {fileLoading && <p className="text-xs text-slate-500">Procesando PDF...</p>}
              {fileError && <p className="text-xs text-rose-600">{fileError}</p>}
              {pdfMeta && (
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span className="truncate">{pdfMeta.name}</span>
                  <button type="button" onClick={resetPdfInput} className="text-slate-900 font-semibold underline">
                    Cambiar
                  </button>
                </div>
              )}
            </div>
            {addMessage && (
              <p className={`text-sm ${addStatus === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>{addMessage}</p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addingDocument}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-60"
              >
                {addingDocument ? 'Guardando...' : 'Guardar en la biblioteca'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-emerald-700 font-semibold">Recursos Destacados</h3>
          <div className="text-emerald-700 font-semibold text-sm cursor-pointer">Ver todos →</div>
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${panelClass} p-6`}>
          {docs.slice(0, 4).map((doc) => {
            const hasAttachment = Boolean((doc.url && doc.url !== '#') || doc.fileName);
            const docRequests = isStudent ? requests.filter((request) => request.documentId === doc.id) : [];
            const userRequest =
              isStudent && user ? docRequests.find((request) => request.userId === user.id) : undefined;
            const pendingCount = isStudent ? docRequests.filter((request) => request.status === 'pending').length : 0;
            const isSubmitting = isStudent && requestingDocId === doc.id;
            const isDownloading = downloadingId === doc.id;
            const requestLabel = isStudent
              ? isSubmitting
                ? 'Enviando...'
                : userRequest
                ? userRequest.status === 'approved'
                  ? 'Solicitud aprobada'
                  : userRequest.status === 'pending'
                  ? 'Solicitud pendiente'
                  : 'Solicitud rechazada'
                : 'Solicitar autorizacion'
              : '';
            const canDownload = hasAttachment && (!isStudent || userRequest?.status === 'approved');
            const statusLabel = isStudent
              ? userRequest
                ? userRequest.status === 'approved'
                  ? 'Autorizado'
                  : userRequest.status === 'pending'
                  ? 'Solicitar libro'
                  : 'Solicitud rechazada'
                : 'Solicitar libro'
              : hasAttachment
              ? 'Descarga directa'
              : 'Recurso pendiente';
            const statusClass = isStudent
              ? userRequest?.status === 'approved'
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : userRequest?.status === 'pending' || !userRequest
                ? 'bg-amber-100 text-amber-700 border-amber-200'
                : 'bg-rose-100 text-rose-700 border-rose-200'
              : hasAttachment
              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
              : 'bg-amber-100 text-amber-700 border-amber-200';
            return (
              <div key={doc.id} className="bg-white rounded-2xl overflow-hidden border border-black/5 shadow-sm hover:shadow-lg transition">
                <div className={'h-40 flex items-center justify-center relative ' + coverClassFor(doc.category)}>
                  <div className="absolute inset-0 bg-black/10" />
                  <svg className="w-16 h-16 text-white drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                  </svg>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-block text-[11px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">
                      {doc.category}
                    </span>
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 border ${statusClass}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <h4 className="text-slate-900 font-semibold leading-snug line-clamp-2">{doc.title}</h4>
                  <p className="text-slate-600 text-sm">{doc.author}</p>
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={!hasAttachment || !canDownload || isDownloading}
                        onClick={() => hasAttachment && handleDownload(doc, canDownload)}
                        className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-semibold ${
                          hasAttachment && canDownload
                            ? 'text-white bg-gradient-to-r from-emerald-700 to-emerald-500 hover:shadow-md'
                            : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Download className="w-4 h-4" />
                        {isDownloading
                          ? 'Generando enlace...'
                          : hasAttachment
                          ? canDownload
                            ? 'Descargar PDF'
                            : 'Solicitar autorizacion'
                          : 'Sin archivo disponible'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 text-left underline"
                      >
                        Ver vista previa
                      </button>
                    </div>
                    {isStudent && (
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => handleRequestDoc(doc)}
                          disabled={Boolean(userRequest && userRequest.status === 'pending') || isSubmitting}
                          className={`w-full rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                            userRequest && userRequest.status === 'approved'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          {isSubmitting ? 'Enviando...' : requestLabel}
                        </button>
                        {userRequest && (
                          <p className="text-xs text-slate-500">
                            {userRequest.status === 'pending'
                              ? 'Tu solicitud está en revisión.'
                              : userRequest.status === 'approved'
                              ? 'Bibliotecario autorizado.'
                              : 'Tu solicitud fue rechazada.'}
                          </p>
                        )}
                        {pendingCount > 0 && (
                          <p className="text-xs text-slate-500">
                            {pendingCount} solicitud{pendingCount === 1 ? '' : 'es'} pendientes para este documento.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {doc.fileName ? (
                    <p className="text-xs text-slate-500">Archivo: {doc.fileName}</p>
                  ) : hasAttachment ? (
                    <p className="text-xs text-slate-500">Enlace externo</p>
                  ) : (
                    <p className="text-xs text-rose-500">Recurso pendiente</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Biblioteca por categoría</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            {categories
              .filter((cat) => cat !== 'all')
              .slice(0, 6)
              .map((cat) => (
                <li key={cat} className="flex justify-between">
                  <span>{cat}</span>
                  <span>{filteredDocuments.filter((doc) => doc.category === cat).length}</span>
                </li>
              ))}
          </ul>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Lecturas destacadas</h3>
          <p className="text-sm text-slate-500">
            Explora resúmenes, descargas y recursos complementarios para profundizar tus conocimientos en ciencias ambientales.
          </p>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Resultados ({docs.length})</h3>
          <div className="text-xs text-slate-500">Página {page} de {totalPages}</div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {paginated.map((doc) => (
            <div key={doc.id} className="border border-slate-100 rounded-2xl p-4 flex gap-4">
              <div className={'w-12 h-12 rounded-xl flex items-center justify-center text-white ' + coverClassFor(doc.category)}>
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{doc.title}</p>
                <p className="text-xs text-slate-500">{doc.author}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{doc.category}</span>
                  <button onClick={() => toggleFav(doc.id)} className="underline">
                    {isFav(doc.id) ? 'Eliminar favorito' : 'Agregar favorito'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <button onClick={() => setPage(Math.max(1, page - 1))} className="px-3 py-2 border rounded-full">Anterior</button>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} className="px-3 py-2 border rounded-full">Siguiente</button>
        </div>
      </section>
    </div>
  );
};

export default LibraryPage;
