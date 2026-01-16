import { useCallback, useEffect, useMemo, useState } from 'react';
import { LibraryDocument } from '../types';
import { getCategories, listDocuments } from '../services/libraryService';
import { getFavorites, toggleFavorite, isFavorite } from '../services/libraryFavorites';

export const useLibrarySearch = () => {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<'all' | string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 8;

  const refreshDocuments = useCallback(async () => {
    setLoading(true);
    const [docs, cats] = await Promise.all([listDocuments(), getCategories()]);
    setDocuments(docs);
    setCategories(['all', ...cats]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  const filteredDocuments = useMemo(() => {
    const q = searchTerm.toLowerCase();
    const favSet = new Set(getFavorites());
    return documents.filter((d) => {
      const matchesQ = d.title.toLowerCase().includes(q) || d.author.toLowerCase().includes(q);
      const matchesC = category === 'all' || d.category === category;
      const matchesF = !favoritesOnly || favSet.has(d.id);
      return matchesQ && matchesC && matchesF;
    });
  }, [documents, searchTerm, category, favoritesOnly]);

  const total = filteredDocuments.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredDocuments.slice(start, start + perPage);
  }, [filteredDocuments, page]);

  const toggleFav = (id: string) => toggleFavorite(id);
  const isFav = (id: string) => isFavorite(id);

  return {
    documents,
    filteredDocuments,
    page,
    setPage,
    perPage,
    total,
    totalPages,
    paginated,
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
  };
};
