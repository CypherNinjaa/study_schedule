import type { AppData, DailyLog, ISODate, Settings, StreakKey, StreakState } from '@/types';
import { SCHEMA_VERSION } from '@/types';
import { buildSeedSubjects } from './subjects';
import { buildSeedSemester } from './timetable';
import { buildSeedHabits } from './habits';
import { buildSeedAchievements } from './achievements';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  wakeTime: '05:00',
  sleepTime: '00:00',
  targets: {
    study: 180,
    coding: 90,
    exercise: 30,
    relationship: 60,
    socialMediaLimit: 45,
    sleep: 420,
  },
  travelMinutesToCollege: 60,
  travelMinutesFromCollege: 60,
  weekStartsOn: 1,
  pomodoro: {
    focusMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    roundsBeforeLongBreak: 4,
    autoStartNext: false,
    soundEnabled: true,
  },
  notifications: {
    enabled: false,
    upcomingClass: true,
    upcomingTask: true,
    streakReminder: true,
    goalReminder: true,
    leadMinutes: 10,
  },
  reduceMotion: false,
  streakFreezesPerWeek: 1,
  autosaveDebounceMs: 800,
};

const STREAK_KEYS: StreakKey[] = ['study', 'coding', 'exercise', 'earlyWake', 'tasks', 'habits'];

export function emptyStreaks(): StreakState {
  const streaks = {} as StreakState['streaks'];
  for (const key of STREAK_KEYS) {
    streaks[key] = { key, current: 0, best: 0, totalDays: 0, lastQualifiedDate: null, freezesUsed: [] };
  }
  return { streaks };
}

export function emptyDailyLog(date: ISODate): DailyLog {
  return {
    date,
    wokeAt: null,
    sleptAt: null,
    sleepMinutes: null,
    minutes: {
      study: 0,
      coding: 0,
      college: 0,
      travel: 0,
      relationship: 0,
      exercise: 0,
      entertainment: 0,
      socialMedia: 0,
      other: 0,
    },
    relationshipDayMinutes: 0,
    relationshipNightMinutes: 0,
    habitsDone: [],
    habitsSkipped: [],
    mood: null,
    energy: null,
    note: '',
    reviewWentWell: '',
    reviewImprove: '',
    reviewedAt: null,
    score: null,
    xpEarned: 0,
  };
}

export function createDefaultData(now: string = new Date().toISOString()): AppData {
  const semester = buildSeedSemester();
  return {
    version: SCHEMA_VERSION,
    profile: {
      name: '',
      college: 'Amity Institute of Information Technology, Amity University Patna',
      course: 'BCA-V (A)',
      batch: '2024-2028',
      classTeacher: 'Dr. Priyadarshani',
      room: '201',
      createdAt: now,
      onboarded: false,
    },
    settings: structuredClone(DEFAULT_SETTINGS),
    schedule: {
      activeSemesterId: semester.id,
      semesters: [semester],
      holidays: [],
    },
    subjects: buildSeedSubjects(),
    tasks: [],
    habits: buildSeedHabits(now),
    dailyLogs: [],
    studySessions: [],
    xp: { total: 0, entries: [], awarded: {} },
    streaks: emptyStreaks(),
    achievements: buildSeedAchievements(),
    goals: [],
    notes: [],
    events: [],
    pomodoroLog: [],
    lastUpdated: now,
  };
}
