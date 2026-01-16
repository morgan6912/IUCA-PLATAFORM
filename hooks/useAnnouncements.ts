import { useCallback, useEffect, useState } from 'react';
import { Announcement } from '../types';
import { createAnnouncement, listAnnouncements } from '../services/announcementService';
import { useAuth } from './useAuth';

export const useAnnouncements = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listAnnouncements();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const post = useCallback(async (title: string, body: string) => {
    if (!user) return;
    await createAnnouncement(user, title, body);
    await load();
  }, [user, load]);

  return { items, loading, post };
};

