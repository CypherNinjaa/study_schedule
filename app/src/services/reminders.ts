import type { AppData } from '@/types';
import { addDaysISO, hhmmToMinutes, todayISO, weekdayOf } from '@/utils/date';

/**
 * A reminder the app would show right now. Everything is derived from the
 * user's own schedule, tasks, streaks and goals — nothing is invented, and
 * nothing leaves the device. `key` is stable per (thing, day) so the caller
 * can fire each reminder exactly once.
 */
export interface DueReminder {
  key: string;
  title: string;
  body: string;
}

const HHMM_RE = /^\d{2}:\d{2}$/;

function minutesNow(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Return the reminders whose moment has arrived. A timed reminder (class,
 * task) becomes due `leadMinutes` before its start and stays due until the
 * start passes, so a caller that misses a tick still fires it once. All-day
 * reminders (streak, goal) use a fixed time of day.
 */
export function computeDueReminders(data: AppData, now: Date): DueReminder[] {
  const n = data.settings.notifications;
  if (!n.enabled) return [];

  const today = todayISO(now);
  const nowMin = minutesNow(now);
  const lead = Math.max(0, n.leadMinutes);
  const out: DueReminder[] = [];

  /* Upcoming classes ------------------------------------------------ */
  if (n.upcomingClass && !data.schedule.holidays.includes(today)) {
    const sem = data.schedule.semesters.find((s) => s.id === data.schedule.activeSemesterId);
    const inTerm = sem && today >= sem.startDate && today <= sem.endDate;
    if (sem && inTerm) {
      const weekday = weekdayOf(today);
      for (const slot of sem.slots) {
        if (slot.day !== weekday || !HHMM_RE.test(slot.start)) continue;
        const startMin = hhmmToMinutes(slot.start);
        if (nowMin >= startMin - lead && nowMin < startMin) {
          const label = slot.title || subjectName(data, slot.subjectId) || 'Class';
          const where = slot.room ? ` in ${slot.room}` : '';
          out.push({
            key: `class:${slot.id}:${today}`,
            title: `${label} at ${slot.start}`,
            body: `Starts in ${startMin - nowMin} min${where}.`,
          });
        }
      }
    }
  }

  /* Upcoming tasks -------------------------------------------------- */
  if (n.upcomingTask) {
    for (const t of data.tasks) {
      if (t.date !== today || t.status !== 'todo' && t.status !== 'in_progress') continue;
      if (!t.start || !HHMM_RE.test(t.start)) continue;
      const startMin = hhmmToMinutes(t.start);
      if (nowMin >= startMin - lead && nowMin < startMin) {
        out.push({
          key: `task:${t.id}:${today}`,
          title: t.title,
          body: `Scheduled for ${t.start} — starts in ${startMin - nowMin} min.`,
        });
      }
    }
  }

  /* Streak reminder — one evening nudge if a live streak is at risk -- */
  if (n.streakReminder && nowMin >= 20 * 60) {
    const atRisk = Object.values(data.streaks.streaks).filter(
      (s) => s.current > 0 && (s.lastQualifiedDate === null || s.lastQualifiedDate < today),
    );
    if (atRisk.length > 0) {
      const longest = atRisk.reduce((a, b) => (b.current > a.current ? b : a));
      out.push({
        key: `streak:${today}`,
        title: atRisk.length === 1 ? 'Keep your streak alive' : `${atRisk.length} streaks at risk`,
        body:
          atRisk.length === 1
            ? `Your ${longest.key} streak (${longest.current} days) hasn't been kept today.`
            : `Your longest is ${longest.current} days. A little counts before midnight.`,
      });
    }
  }

  /* Goal reminder — morning nudge for goals due today or tomorrow ---- */
  if (n.goalReminder && nowMin >= 8 * 60) {
    const tomorrow = addDaysISO(today, 1);
    for (const g of data.goals) {
      if (g.status !== 'active' || !g.deadline) continue;
      if (g.deadline !== today && g.deadline !== tomorrow) continue;
      const when = g.deadline === today ? 'today' : 'tomorrow';
      out.push({
        key: `goal:${g.id}:${today}`,
        title: `Goal due ${when}`,
        body: `${g.title} — ${Math.round((g.current / Math.max(1, g.target)) * 100)}% done.`,
      });
    }
  }

  return out;
}

function subjectName(data: AppData, subjectId: string | null): string | null {
  if (!subjectId) return null;
  return data.subjects.find((s) => s.id === subjectId)?.name ?? null;
}
