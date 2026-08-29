/**
 * Bookshelf productivity integration actions.
 *
 * Bridges the bookshelf module with the main Study Schedule data:
 * - Log reading sessions as study sessions
 * - Link books to subjects/goals
 * - Award XP for reading
 */
import { useDataStore } from './useDataStore';
import type { StudyMethod } from '@/types';

const mutate = (fn: (d: import('@/types').AppData) => void) =>
  useDataStore.getState().mutate(fn);

/**
 * Logs a reading session as a study session in the main app data.
 * This makes reading time count toward study goals, analytics, and XP.
 */
export function logReadingAsStudySession(
  bookId: string,
  bookTitle: string,
  minutes: number,
  subjectId: string | null,
): void {
  if (minutes < 1) return;

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const id = `ss-read-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  mutate((d) => {
    d.studySessions.push({
      id,
      date: today,
      subjectId,
      topicId: null,
      topic: `Reading: ${bookTitle}`,
      start: null,
      end: null,
      minutes,
      method: 'reading' as StudyMethod,
      concentration: 3,
      difficulty: 2,
      notes: `Auto-logged from reading "${bookTitle}" (Book ID: ${bookId})`,
      taskId: null,
      fromPomodoro: false,
      createdAt: now,
    });
  });
}

/**
 * Get total reading hours for a specific subject.
 */
export function getReadingHoursForSubject(subjectId: string): number {
  const data = useDataStore.getState().data;
  if (!data) return 0;

  const readingSessions = data.studySessions.filter(
    (s) => s.subjectId === subjectId && s.topic.startsWith('Reading:'),
  );

  return readingSessions.reduce((sum, s) => sum + s.minutes, 0) / 60;
}

/**
 * Get reading statistics for the analytics dashboard.
 */
export function getReadingStats() {
  const data = useDataStore.getState().data;
  if (!data) return { totalMinutes: 0, sessionsCount: 0, thisWeekMinutes: 0 };

  const readingSessions = data.studySessions.filter((s) =>
    s.topic.startsWith('Reading:'),
  );

  const totalMinutes = readingSessions.reduce((sum, s) => sum + s.minutes, 0);

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekISO = weekStart.toISOString().slice(0, 10);

  const thisWeekMinutes = readingSessions
    .filter((s) => s.date >= weekISO)
    .reduce((sum, s) => sum + s.minutes, 0);

  return {
    totalMinutes,
    sessionsCount: readingSessions.length,
    thisWeekMinutes,
  };
}
