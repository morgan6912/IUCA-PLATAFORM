import { useCallback, useEffect, useMemo, useState } from 'react';
import { Course } from '../types';
import { enroll, getCourses, unenroll, isWaitlisted, leaveWaitlist, waitlistPosition, MAX_CREDITS } from '../services/courseService';
import { createEnrollmentReceipt, EnrollmentReceipt } from '../services/enrollmentReceiptService';
import { useAuth } from './useAuth';

export const useCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? '';

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const data = await getCourses(userId);
    setCourses(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const myCourses = useMemo(() => courses.filter((c) => c.enrolled), [courses]);
  const isOnWaitlist = useCallback((courseId: string) => {
    if (!userId) return false;
    return isWaitlisted(userId, courseId);
  }, [userId]);

  const waitPos = useCallback((courseId: string) => {
    if (!userId) return null;
    return waitlistPosition(userId, courseId);
  }, [userId]);

  const visibleCourses = useMemo(() => {
    return onlyOpen ? courses.filter((c) => c.enrolledCount < c.capacity) : courses;
  }, [courses, onlyOpen]);

  const enrollCourse = useCallback(
    async (courseId: string): Promise<EnrollmentReceipt | null> => {
      if (!userId) return null;
      setError(null);
      try {
        await enroll(userId, courseId);
        let receipt: EnrollmentReceipt | null = null;
        const targetCourse = courses.find((course) => course.id === courseId);
        if (targetCourse) {
          receipt = createEnrollmentReceipt(userId, targetCourse);
        }
        await load();
        return receipt;
      } catch (e: any) {
        setError(e?.message || 'No se pudo inscribir');
        return null;
      }
    },
    [userId, load, courses]
  );

  const unenrollCourse = useCallback(
    async (courseId: string) => {
      if (!userId) return;
      setError(null);
      try {
        await unenroll(userId, courseId);
        await load();
      } catch (e: any) {
        setError(e?.message || 'No se pudo desinscribir');
      }
    },
    [userId, load]
  );

  const clearError = () => setError(null);

  const leaveWait = useCallback(async (courseId: string) => {
    if (!userId) return;
    await leaveWaitlist(userId, courseId);
  }, [userId]);

  const currentCredits = useMemo(() => myCourses.reduce((acc, c) => acc + c.credits, 0), [myCourses]);

  return { courses: visibleCourses, myCourses, loading, onlyOpen, setOnlyOpen, enrollCourse, unenrollCourse, error, clearError, isOnWaitlist, leaveWait, waitPos, currentCredits, maxCredits: MAX_CREDITS };
};
