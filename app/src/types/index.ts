/**
 * Core domain types for the Productivity OS.
 * All dates are ISO strings: `YYYY-MM-DD` for days, full ISO-8601 for instants.
 * Times of day are `HH:mm` in 24-hour local time.
 */

export type ISODate = string; // YYYY-MM-DD
export type ISOInstant = string; // 2026-08-09T10:15:00.000Z
export type HHMM = string; // 08:30

export const SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Profile & settings                                                  */
/* ------------------------------------------------------------------ */

export interface Profile {
  name: string;
  college: string;
  course: string;
  batch: string;
  classTeacher: string;
  room: string;
  createdAt: ISOInstant;
  onboarded: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Targets {
  /** minutes per day */
  study: number;
  coding: number;
  exercise: number;
  relationship: number;
  /** minutes per day, treated as a ceiling not a floor */
  socialMediaLimit: number;
  sleep: number;
}

export interface Settings {
  theme: ThemeMode;
  wakeTime: HHMM;
  sleepTime: HHMM;
  targets: Targets;
  travelMinutesToCollege: number;
  travelMinutesFromCollege: number;
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  pomodoro: PomodoroSettings;
  notifications: NotificationSettings;
  reduceMotion: boolean;
  /** allowed streak freezes granted per ISO week */
  streakFreezesPerWeek: number;
  autosaveDebounceMs: number;
}

export interface PomodoroSettings {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  roundsBeforeLongBreak: number;
  autoStartNext: boolean;
  soundEnabled: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  upcomingClass: boolean;
  upcomingTask: boolean;
  streakReminder: boolean;
  goalReminder: boolean;
  /** minutes before an event to notify */
  leadMinutes: number;
}

/* ------------------------------------------------------------------ */
/* Timetable / schedule                                                */
/* ------------------------------------------------------------------ */

/** 0 = Sunday … 6 = Saturday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ClassSlot {
  id: string;
  day: Weekday;
  start: HHMM;
  end: HHMM;
  subjectId: string | null;
  /** free-text label used when no subject is linked */
  title: string;
  teacher: string;
  room: string;
  type: 'lecture' | 'lab' | 'tutorial' | 'other';
  color?: string;
}

export interface Semester {
  id: string;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  slots: ClassSlot[];
}

export interface ScheduleState {
  activeSemesterId: string;
  semesters: Semester[];
  /** dates (YYYY-MM-DD) with no classes — holidays, leaves */
  holidays: ISODate[];
}

/* ------------------------------------------------------------------ */
/* Subjects                                                            */
/* ------------------------------------------------------------------ */

export interface Topic {
  id: string;
  title: string;
  module?: string;
  done: boolean;
  completedAt?: ISOInstant;
}

export interface Assignment {
  id: string;
  title: string;
  dueDate: ISODate | null;
  done: boolean;
  completedAt?: ISOInstant;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  teacher: string;
  credits: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** target study minutes for the whole semester */
  targetMinutes: number;
  color: string;
  topics: Topic[];
  assignments: Assignment[];
  examDate: ISODate | null;
  notes: string;
  archived: boolean;
}

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'skipped' | 'postponed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskCategory =
  | 'study'
  | 'college'
  | 'coding'
  | 'project'
  | 'assignment'
  | 'exercise'
  | 'personal'
  | 'relationship'
  | 'other';

export type RecurrenceKind = 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface Recurrence {
  kind: RecurrenceKind;
  /** every N days/weeks/months */
  interval: number;
  /** for weekly: which weekdays it repeats on */
  daysOfWeek?: Weekday[];
  until?: ISODate | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  date: ISODate;
  start: HHMM | null;
  end: HHMM | null;
  category: TaskCategory;
  subjectId: string | null;
  priority: TaskPriority;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  status: TaskStatus;
  /** set on the template task only */
  recurrence: Recurrence | null;
  /** set on generated instances, pointing at the template */
  recurrenceParentId: string | null;
  notes: string;
  createdAt: ISOInstant;
  updatedAt: ISOInstant;
  completedAt: ISOInstant | null;
  /** XP actually granted for completing this task; 0 until first completion */
  xpAwarded: number;
  order: number;
}

/* ------------------------------------------------------------------ */
/* Study sessions                                                      */
/* ------------------------------------------------------------------ */

export type StudyMethod =
  | 'reading'
  | 'practice'
  | 'revision'
  | 'problem_solving'
  | 'lecture'
  | 'coding'
  | 'mock_test'
  | 'flashcards';

export interface StudySession {
  id: string;
  date: ISODate;
  subjectId: string | null;
  /** links the session to a specific topic inside the subject */
  topicId: string | null;
  topic: string;
  start: HHMM | null;
  end: HHMM | null;
  minutes: number;
  method: StudyMethod;
  /** 1-5 self-rated focus */
  concentration: 1 | 2 | 3 | 4 | 5;
  difficulty: 1 | 2 | 3 | 4 | 5;
  notes: string;
  /** set when the session was logged against a task */
  taskId: string | null;
  /** true for sessions generated by a completed Pomodoro focus round */
  fromPomodoro: boolean;
  createdAt: ISOInstant;
}

/* ------------------------------------------------------------------ */
/* Habits                                                              */
/* ------------------------------------------------------------------ */

export type HabitFreq = 'daily' | 'weekly' | 'custom';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  freq: HabitFreq;
  /** for weekly: how many times per week; for custom: specific weekdays */
  timesPerWeek?: number;
  daysOfWeek?: Weekday[];
  /** habits where NOT doing it is the win (e.g. "no excessive social media") */
  inverse: boolean;
  xp: number;
  archived: boolean;
  createdAt: ISOInstant;
  order: number;
}

/** habitId -> ISODate[] completions is stored per-day in DailyLog to keep one source of truth */

/* ------------------------------------------------------------------ */
/* Daily log                                                           */
/* ------------------------------------------------------------------ */

export interface TimeAllocation {
  study: number;
  coding: number;
  college: number;
  travel: number;
  relationship: number;
  exercise: number;
  entertainment: number;
  socialMedia: number;
  other: number;
}

export interface DailyLog {
  date: ISODate;
  wokeAt: HHMM | null;
  sleptAt: HHMM | null;
  /** minutes actually slept, entered or derived */
  sleepMinutes: number | null;
  /** manually tracked minutes; study/coding are derived from sessions + these */
  minutes: TimeAllocation;
  relationshipDayMinutes: number;
  relationshipNightMinutes: number;
  habitsDone: string[];
  habitsSkipped: string[];
  mood: 1 | 2 | 3 | 4 | 5 | null;
  energy: 1 | 2 | 3 | 4 | 5 | null;
  note: string;
  reviewWentWell: string;
  reviewImprove: string;
  reviewedAt: ISOInstant | null;
  /** cached productivity score for the day, recomputed on change */
  score: number | null;
  xpEarned: number;
}

/* ------------------------------------------------------------------ */
/* Gamification                                                        */
/* ------------------------------------------------------------------ */

export type XPSource =
  | 'task'
  | 'study_session'
  | 'pomodoro'
  | 'habit'
  | 'daily_study_goal'
  | 'daily_coding_goal'
  | 'all_tasks_done'
  | 'exercise'
  | 'weekly_goal'
  | 'goal_completed'
  | 'achievement'
  | 'daily_review'
  | 'penalty';

export interface XPEntry {
  id: string;
  date: ISODate;
  at: ISOInstant;
  source: XPSource;
  /** stable key used to guarantee an award happens at most once */
  refKey: string;
  amount: number;
  label: string;
}

export interface XPState {
  total: number;
  entries: XPEntry[];
  /** refKeys already awarded — the anti-farm ledger */
  awarded: Record<string, number>;
}

export type StreakKey = 'study' | 'coding' | 'exercise' | 'earlyWake' | 'tasks' | 'habits';

export interface Streak {
  key: StreakKey;
  current: number;
  best: number;
  totalDays: number;
  lastQualifiedDate: ISODate | null;
  freezesUsed: { date: ISODate }[];
}

export interface StreakState {
  streaks: Record<StreakKey, Streak>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlockedAt: ISOInstant | null;
  /** cached progress 0..1 for locked achievements */
  progress: number;
}

/* ------------------------------------------------------------------ */
/* Goals                                                               */
/* ------------------------------------------------------------------ */

export type GoalUnit = 'hours' | 'minutes' | 'tasks' | 'sessions' | 'days' | 'topics' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'archived' | 'failed';

export interface Goal {
  id: string;
  title: string;
  description: string;
  target: number;
  /** manual goals track current directly; auto goals derive it */
  current: number;
  unit: GoalUnit;
  /** when set, current is computed from data instead of entered by hand */
  auto: null | {
    metric: 'study_minutes' | 'coding_minutes' | 'tasks_completed' | 'sessions' | 'streak_days' | 'topics_done';
    subjectId?: string | null;
    from: ISODate;
    to: ISODate;
  };
  deadline: ISODate | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: GoalStatus;
  createdAt: ISOInstant;
  completedAt: ISOInstant | null;
  xpAwarded: boolean;
}

/* ------------------------------------------------------------------ */
/* Notes & events                                                      */
/* ------------------------------------------------------------------ */

export interface Note {
  id: string;
  title: string;
  body: string;
  date: ISODate;
  subjectId: string | null;
  pinned: boolean;
  createdAt: ISOInstant;
  updatedAt: ISOInstant;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: ISODate;
  start: HHMM | null;
  end: HHMM | null;
  kind: 'exam' | 'deadline' | 'event' | 'holiday';
  subjectId: string | null;
  notes: string;
  color?: string;
}

export interface ExamSyllabusItem {
  id: string;
  text: string;
  topicId?: string;
}

export interface Exam {
  id: string;
  subjectId: string | null;
  title: string;
  date: ISODate;
  time: HHMM | null;
  durationMinutes: number;
  venue: string;
  syllabus: ExamSyllabusItem[];
  syllabusChecked: string[];
  notes: string;
  createdAt: ISOInstant;
}

/* ------------------------------------------------------------------ */
/* Study Materials                                                     */
/* ------------------------------------------------------------------ */

export type MaterialType = 'pdf' | 'video' | 'audio' | 'image' | 'link' | 'folder' | 'other';

export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  type: MaterialType;
  subjectId: string | null;
  topicId: string | null;
  tags: string[];
  url?: string;
  filePath?: string;
  fileHandleKey?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: ISOInstant;
  lastOpenedAt: ISOInstant | null;
}

/* ------------------------------------------------------------------ */
/* Root document                                                       */
/* ------------------------------------------------------------------ */

export interface AppData {
  version: number;
  profile: Profile;
  settings: Settings;
  schedule: ScheduleState;
  subjects: Subject[];
  tasks: Task[];
  habits: Habit[];
  dailyLogs: DailyLog[];
  studySessions: StudySession[];
  xp: XPState;
  streaks: StreakState;
  achievements: Achievement[];
  goals: Goal[];
  notes: Note[];
  events: CalendarEvent[];
  exams: Exam[];
  studyMaterials: StudyMaterial[];
  pomodoroLog: PomodoroRound[];
  /** Bookshelf reader preferences and categories */
  bookshelfSettings?: import('./bookshelf').BookshelfSettings;
  lastUpdated: ISOInstant;
}

export interface PomodoroRound {
  id: string;
  date: ISODate;
  startedAt: ISOInstant;
  endedAt: ISOInstant;
  minutes: number;
  subjectId: string | null;
  /** what the round was spent on; becomes the study session's topic */
  label: string;
  method: StudyMethod | null;
  taskId: string | null;
  kind: 'focus' | 'break';
}
