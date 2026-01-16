import { useCallback, useEffect, useState } from 'react';
import { TaskSubmission } from '../types';
import { listTasksByUser, submitTask } from '../services/taskService';
import { useAuth } from './useAuth';

export const useTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await listTasksByUser(user.id);
    setTasks(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const submit = useCallback(
    async (
      title: string,
      fileName?: string,
      fileUrl?: string,
      fileMime?: string,
      assignmentId?: string,
      assignmentTitle?: string,
      assignmentDue?: string,
    ) => {
    if (!user) return;
    await submitTask(user.id, title, fileName, fileUrl, fileMime, assignmentId, assignmentTitle, assignmentDue);
    await load();
  }, [user, load]);

  return { tasks, loading, submit };
};
