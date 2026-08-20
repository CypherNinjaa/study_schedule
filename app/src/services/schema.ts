import type { AppData } from '@/types';
import { SCHEMA_VERSION } from '@/types';
import { createDefaultData, DEFAULT_SETTINGS, emptyStreaks } from '@/data/defaults';
import { ACHIEVEMENT_DEFS } from '@/data/achievements';

export interface ValidationResult {
  ok: boolean;
  data: AppData | null;
  errors: string[];
  /** non-fatal repairs applied while loading */
  warnings: string[];
  migratedFrom: number | null;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/**
 * Parses and repairs a loaded document. Unknown/missing sections are filled
 * from defaults rather than rejected, so a partially-written file still opens.
 * Only a structurally unusable document (not an object, no recognisable keys)
 * is treated as corrupted.
 */
export function validateAndMigrate(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObj(raw)) {
    return { ok: false, data: null, errors: ['File does not contain a JSON object.'], warnings, migratedFrom: null };
  }

  const looksLikeOurs =
    'version' in raw || 'profile' in raw || 'tasks' in raw || 'dailyLogs' in raw || 'settings' in raw;
  if (!looksLikeOurs) {
    return {
      ok: false,
      data: null,
      errors: ['File is valid JSON but is not a Productivity OS data file.'],
      warnings,
      migratedFrom: null,
    };
  }

  const incomingVersion = typeof raw.version === 'number' ? raw.version : 0;
  if (incomingVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      data: null,
      errors: [
        `This file was written by a newer version (v${incomingVersion}). This app supports up to v${SCHEMA_VERSION}.`,
      ],
      warnings,
      migratedFrom: null,
    };
  }

  const base = createDefaultData();
  const data: AppData = {
    ...base,
    version: SCHEMA_VERSION,
    profile: { ...base.profile, ...(isObj(raw.profile) ? raw.profile : {}) },
    settings: mergeSettings(raw.settings, warnings),
    schedule: mergeSchedule(raw.schedule, base, warnings),
    subjects: isObj(raw) && Array.isArray(raw.subjects) ? (raw.subjects as AppData['subjects']) : base.subjects,
    tasks: arr(raw.tasks),
    habits: Array.isArray(raw.habits) ? (raw.habits as AppData['habits']) : base.habits,
    dailyLogs: arr(raw.dailyLogs),
    studySessions: arr(raw.studySessions),
    xp: mergeXP(raw.xp),
    streaks: mergeStreaks(raw.streaks),
    achievements: mergeAchievements(raw.achievements),
    goals: arr(raw.goals),
    notes: arr(raw.notes),
    events: arr(raw.events),
    exams: arr(raw.exams),
    studyMaterials: arr(raw.studyMaterials),
    pomodoroLog: arr(raw.pomodoroLog),
    lastUpdated: typeof raw.lastUpdated === 'string' ? raw.lastUpdated : new Date().toISOString(),
  };

  // Drop obviously broken records instead of crashing the UI later.
  const beforeTasks = data.tasks.length;
  data.tasks = data.tasks.filter((t) => isObj(t) && typeof t.id === 'string' && typeof t.date === 'string');
  if (data.tasks.length !== beforeTasks) {
    warnings.push(`Skipped ${beforeTasks - data.tasks.length} malformed task(s).`);
  }

  const beforeLogs = data.dailyLogs.length;
  data.dailyLogs = data.dailyLogs.filter((l) => isObj(l) && typeof l.date === 'string');
  if (data.dailyLogs.length !== beforeLogs) {
    warnings.push(`Skipped ${beforeLogs - data.dailyLogs.length} malformed daily log(s).`);
  }

  const beforeSessions = data.studySessions.length;
  data.studySessions = data.studySessions.filter(
    (s) => isObj(s) && typeof s.date === 'string' && typeof s.minutes === 'number',
  );
  if (data.studySessions.length !== beforeSessions) {
    warnings.push(`Skipped ${beforeSessions - data.studySessions.length} malformed study session(s).`);
  }

  return {
    ok: true,
    data,
    errors,
    warnings,
    migratedFrom: incomingVersion !== SCHEMA_VERSION ? incomingVersion : null,
  };
}

function mergeSettings(raw: unknown, warnings: string[]): AppData['settings'] {
  if (!isObj(raw)) {
    warnings.push('Settings were missing and have been reset to defaults.');
    return structuredClone(DEFAULT_SETTINGS);
  }
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    targets: { ...DEFAULT_SETTINGS.targets, ...(isObj(raw.targets) ? raw.targets : {}) },
    pomodoro: { ...DEFAULT_SETTINGS.pomodoro, ...(isObj(raw.pomodoro) ? raw.pomodoro : {}) },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(isObj(raw.notifications) ? raw.notifications : {}) },
  } as AppData['settings'];
}

function mergeSchedule(raw: unknown, base: AppData, warnings: string[]): AppData['schedule'] {
  if (!isObj(raw) || !Array.isArray(raw.semesters) || raw.semesters.length === 0) {
    warnings.push('No timetable found in file; the seeded BCA-V timetable was used.');
    return base.schedule;
  }
  const semesters = raw.semesters as AppData['schedule']['semesters'];
  const activeId =
    typeof raw.activeSemesterId === 'string' && semesters.some((s) => s?.id === raw.activeSemesterId)
      ? raw.activeSemesterId
      : (semesters[0]?.id ?? base.schedule.activeSemesterId);
  return {
    activeSemesterId: activeId,
    semesters: semesters.map((s) => ({ ...s, slots: Array.isArray(s?.slots) ? s.slots : [] })),
    holidays: Array.isArray(raw.holidays) ? (raw.holidays as string[]) : [],
  };
}

function mergeXP(raw: unknown): AppData['xp'] {
  if (!isObj(raw)) return { total: 0, entries: [], awarded: {} };
  const entries = arr<AppData['xp']['entries'][number]>(raw.entries);
  const awarded = isObj(raw.awarded) ? (raw.awarded as Record<string, number>) : {};
  // Recompute the total from the ledger so it can never drift out of sync.
  const total = entries.reduce((a, e) => a + (typeof e?.amount === 'number' ? e.amount : 0), 0);
  return { total, entries, awarded };
}

function mergeStreaks(raw: unknown): AppData['streaks'] {
  const empty = emptyStreaks();
  if (!isObj(raw) || !isObj(raw.streaks)) return empty;
  const incoming = raw.streaks as Record<string, unknown>;
  for (const key of Object.keys(empty.streaks) as (keyof typeof empty.streaks)[]) {
    const s = incoming[key];
    if (isObj(s)) {
      empty.streaks[key] = {
        ...empty.streaks[key],
        ...s,
        freezesUsed: Array.isArray(s.freezesUsed) ? (s.freezesUsed as { date: string }[]) : [],
      };
    }
  }
  return empty;
}

/** Achievement definitions live in code; the file only stores unlock state. */
function mergeAchievements(raw: unknown): AppData['achievements'] {
  const saved = new Map<string, { unlockedAt: string | null; progress: number }>();
  for (const a of arr<Record<string, unknown>>(raw)) {
    if (isObj(a) && typeof a.id === 'string') {
      saved.set(a.id, {
        unlockedAt: typeof a.unlockedAt === 'string' ? a.unlockedAt : null,
        progress: typeof a.progress === 'number' ? a.progress : 0,
      });
    }
  }
  return ACHIEVEMENT_DEFS.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    icon: d.icon,
    tier: d.tier,
    unlockedAt: saved.get(d.id)?.unlockedAt ?? null,
    progress: saved.get(d.id)?.progress ?? 0,
  }));
}

export function serialize(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function parseJSON(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
  }
}
