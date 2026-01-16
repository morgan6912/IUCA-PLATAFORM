import React from 'react';
import { Download, Search } from 'lucide-react';
import { useLibrarySearch } from '../hooks/useLibrarySearch';

const LibraryPage: React.FC = () => {
  const { filteredDocuments, categories, loading, searchTerm, setSearchTerm, category, setCategory } = useLibrarySearch();
  const [sort, setSort] = React.useState<'title-asc' | 'date-desc'>('date-desc');
  const docs = React.useMemo(() => {
    const copy = [...filteredDocuments];
    if (sort === 'title-asc') copy.sort((a, b) => a.title.localeCompare(b.title));
    else copy.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
    return copy;
  }, [filteredDocuments, sort]);

  if (loading) return <div>Cargando documentos...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Biblioteca Digital</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
            type="text"
            placeholder="Buscar por título o autor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-10 border border-slate-300 rounded-md focus:ring-iuca-blue-500 focus:border-iuca-blue-500 transition"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-iuca-blue-500 focus:border-iuca-blue-500 transition"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'Todas las categorías' : cat}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-iuca-blue-500 focus:border-iuca-blue-500 transition"
          >
            <option value="date-desc">Más recientes</option>
            <option value="title-asc">Título (A-Z)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Título
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Autor
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoría
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Descargar</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {docs.map((doc, index) => (
              <tr
                key={doc.id}
                className="hover:bg-slate-50 transition-colors duration-200 opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                  <div className="text-sm text-gray-500">{doc.publishDate}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.author}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {doc.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <a href={doc.url} download className="text-iuca-blue-600 hover:text-iuca-blue-900 inline-flex items-center">
                    <Download className="w-4 h-4 mr-1" />
                    Descargar
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LibraryPage;

