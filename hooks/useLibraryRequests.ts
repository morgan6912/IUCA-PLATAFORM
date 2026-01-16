import { useCallback, useEffect, useState } from 'react';
import { LibraryDocument, LibraryRequest, LibraryRequestStatus, User } from '../types';
import {
  createLibraryRequest,
  listLibraryRequests,
  updateLibraryRequestStatus,
} from '../services/libraryRequests';

export const useLibraryRequests = () => {
  const [requests, setRequests] = useState<LibraryRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await listLibraryRequests();
    setRequests(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createRequest = useCallback(
    async (document: LibraryDocument, user: User) => {
      const next = await createLibraryRequest({
        documentId: document.id,
        documentTitle: document.title,
        userId: user.id,
        userName: user.name,
      });
      await refresh();
      return next;
    },
    [refresh]
  );

  const updateStatus = useCallback(
    async (id: string, status: LibraryRequestStatus) => {
      const next = await updateLibraryRequestStatus(id, status);
      await refresh();
      return next;
    },
    [refresh]
  );

  return {
    requests,
    loading,
    refresh,
    createRequest,
    updateStatus,
  };
};
