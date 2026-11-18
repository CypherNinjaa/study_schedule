import type { AppData, DailyLog } from '@/types';
import { runRollup } from './rollup';
import { todayISO } from '@/utils/date';

interface Timestamped {
  id: string;
  updatedAt?: string;
  completedAt?: string | null;
  createdAt?: string;
  startedAt?: string;
  addedAt?: string;
}

function itemTimestamp(item: Timestamped): number {
  const candidates = [item.updatedAt, item.completedAt, item.createdAt, item.startedAt, item.addedAt];
  let best = 0;
  for (const c of candidates) {
    if (!c) continue;
    const ms = Date.parse(c);
    if (Number.isFinite(ms) && ms > best) best = ms;
  }
  return best;
}

function mergeById<T extends Timestamped>(primary: T[], secondary: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of secondary) map.set(item.id, item);
  for (const item of primary) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      map.set(item.id, itemTimestamp(item) >= itemTimestamp(existing) ? item : existing);
    }
  }
  return Array.from(map.values());
}

function mergeDailyLogs(primary: DailyLog[], secondary: DailyLog[]): DailyLog[] {
  const map = new Map<string, DailyLog>();
  for (const log of secondary) map.set(log.date, log);

  for (const a of primary) {
    const b = map.get(a.date);
    if (!b) {
      map.set(a.date, a);
      continue;
    }

    const aRev = a.reviewedAt ? Date.parse(a.reviewedAt) : 0;
    const bRev = b.reviewedAt ? Date.parse(b.reviewedAt) : 0;
    const newer = aRev >= bRev ? a : b;
    const older = aRev >= bRev ? b : a;

    const habitsDone = Array.from(new Set([...a.habitsDone, ...b.habitsDone]));
    const habitsSkipped = Array.from(new Set([...a.habitsSkipped, ...b.habitsSkipped])).filter(
      (id) => !habitsDone.includes(id),
    );

    map.set(a.date, {
      ...newer,
      wokeAt: newer.wokeAt ?? older.wokeAt,
      sleptAt: newer.sleptAt ?? older.sleptAt,
      sleepMinutes: newer.sleepMinutes ?? older.sleepMinutes,
      mood: newer.mood ?? older.mood,
      energy: newer.energy ?? older.energy,
      note: newer.note || older.note,
      reviewWentWell: newer.reviewWentWell || older.reviewWentWell,
      reviewImprove: newer.reviewImprove || older.reviewImprove,
      reviewedAt: newer.reviewedAt ?? older.reviewedAt,
      habitsDone,
      habitsSkipped,
      minutes: {
        study: Math.max(a.minutes.study, b.minutes.study),
        coding: Math.max(a.minutes.coding, b.minutes.coding),
        college: Math.max(a.minutes.college, b.minutes.college),
        travel: Math.max(a.minutes.travel, b.minutes.travel),
        relationship: Math.max(a.minutes.relationship, b.minutes.relationship),
        exercise: Math.max(a.minutes.exercise, b.minutes.exercise),
        entertainment: Math.max(a.minutes.entertainment, b.minutes.entertainment),
        socialMedia: Math.max(a.minutes.socialMedia, b.minutes.socialMedia),
        other: Math.max(a.minutes.other, b.minutes.other),
      },
    });
  }

  return Array.from(map.values()).sort((x, y) => x.date.localeCompare(y.date));
}

/**
 * Merges two diverged AppData snapshots (e.g. offline laptop edits + online phone edits)
 * without dropping tasks, sessions, habits, or notes from either side.
 */
export function mergeAppData(local: AppData, remote: AppData, nowDate = todayISO()): AppData {
  const localMs = Date.parse(local.lastUpdated) || 0;
  const remoteMs = Date.parse(remote.lastUpdated) || 0;
  const primary = localMs >= remoteMs ? local : remote;
  const secondary = localMs >= remoteMs ? remote : local;

  const merged: AppData = {
    ...structuredClone(primary),
    profile: {
      ...primary.profile,
      avatar: primary.profile.avatar ?? secondary.profile.avatar ?? null,
      onboarded: primary.profile.onboarded || secondary.profile.onboarded,
    },
    schedule: {
      ...primary.schedule,
      holidays: Array.from(new Set([...primary.schedule.holidays, ...secondary.schedule.holidays])).sort(),
    },
    subjects: mergeById(primary.subjects, secondary.subjects),
    tasks: mergeById(primary.tasks, secondary.tasks),
    habits: mergeById(primary.habits, secondary.habits),
    dailyLogs: mergeDailyLogs(primary.dailyLogs, secondary.dailyLogs),
    studySessions: mergeById(primary.studySessions, secondary.studySessions),
    goals: mergeById(primary.goals, secondary.goals),
    notes: mergeById(primary.notes, secondary.notes),
    events: mergeById(primary.events, secondary.events),
    exams: mergeById(primary.exams, secondary.exams),
    studyMaterials: mergeById(primary.studyMaterials, secondary.studyMaterials),
    pomodoroLog: mergeById(primary.pomodoroLog, secondary.pomodoroLog),
    lastUpdated: new Date().toISOString(),
  };

  runRollup(merged, nowDate);
  return merged;
}
