import { useCallback, useEffect, useState } from 'react';
import { Role, User } from '../types';
import { listUsers, updateUserRole } from '../services/adminService';

export const useAdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listUsers();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setRole = useCallback(async (userId: string, role: Role) => {
    await updateUserRole(userId, role);
    await load();
  }, [load]);

  return { users, loading, setRole };
};

