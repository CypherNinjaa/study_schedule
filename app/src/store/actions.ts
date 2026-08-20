import type {
  AppData,
  Assignment,
  CalendarEvent,
  ClassSlot,
  Exam,
  Goal,
  Habit,
  HHMM,
  ISODate,
  Note,
  PomodoroRound,
  Profile,
  Semester,
  Settings,
  StreakKey,
  StudyMaterial,
  StudySession,
  Subject,
  Task,
  TaskStatus,
  Topic,
  Weekday,
} from '@/types';
import { uid } from '@/utils/misc';
import { diffDaysISO, minutesToHHMM, startOfWeekISO, todayISO, toISODate } from '@/utils/date';
import { awardXP, studySessionXP, taskXP, XP_RULES } from '@/services/xp';
import { ensureLog } from '@/services/rollup';
import { applyStreakFreeze, removeStreakFreeze, type FreezeResult } from '@/services/streaks';
import { useDataStore, type MutateOpts } from './useDataStore';
import { useFeedbackStore } from './useFeedbackStore';

const mutate = (fn: (d: AppData) => void, opts?: MutateOpts) =>
  useDataStore.getState().mutate(fn, opts);

const toast = (t: Parameters<ReturnType<typeof useFeedbackStore.getState>['toast']>[0]) =>
  useFeedbackStore.getState().toast(t);

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

export type NewTask = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> & { title: string };

export function createTask(input: NewTask): string {
  const id = uid('task');
  const now = new Date().toISOString();
  const date = input.date ?? todayISO();
  mutate(
    (d) => {
      const task: Task = {
        id,
        title: input.title.trim(),
        description: input.description ?? '',
        date,
        start: input.start ?? null,
        end: input.end ?? null,
        category: input.category ?? 'study',
        subjectId: input.subjectId ?? null,
        priority: input.priority ?? 'medium',
        difficulty: input.difficulty ?? 2,
        estimatedMinutes: input.estimatedMinutes ?? null,
        actualMinutes: input.actualMinutes ?? null,
        status: input.status ?? 'todo',
        recurrence: input.recurrence ?? null,
        recurrenceParentId: input.recurrenceParentId ?? null,
        xpAwarded: 0,
        notes: input.notes ?? '',
        completedAt: null,
        createdAt: now,
        updatedAt: now,
        order: d.tasks.filter((t) => t.date === date).length,
      };
      d.tasks.push(task);
    },
    { date },
  );
  return id;
}

export function updateTask(id: string, patch: Partial<Task>): void {
  const existing = useDataStore.getState().data?.tasks.find((t) => t.id === id);
  const date = patch.date ?? existing?.date;
  mutate(
    (d) => {
      const task = d.tasks.find((t) => t.id === id);
      if (!task) return;
      Object.assign(task, patch, { updatedAt: new Date().toISOString() });
    },
    { date },
  );
}

/**
 * Status transitions are the only place task XP is granted, and the XP ledger
 * key is the task id — so completing, un-completing and re-completing the same
 * task can never award twice.
 */
export function setTaskStatus(id: string, status: TaskStatus): void {
  const snapshot = useDataStore.getState().data?.tasks.find((t) => t.id === id);
  if (!snapshot) return;
  mutate(
    (d) => {
      const task = d.tasks.find((t) => t.id === id);
      if (!task) return;
      const wasCompleted = task.status === 'completed';
      task.status = status;
      task.updatedAt = new Date().toISOString();

      if (status === 'completed' && !wasCompleted) {
        task.completedAt = new Date().toISOString();
        const amount = taskXP(task.difficulty, task.priority);
        const granted = awardXP(d, {
          source: 'task',
          refKey: `task:${task.id}`,
          amount,
          label: task.title,
          date: task.date,
        });
        if (granted > 0) task.xpAwarded = granted;
      } else if (status !== 'completed' && wasCompleted) {
        task.completedAt = null;
      }
    },
    { date: snapshot.date },
  );
}

export function deleteTask(id: string): void {
  const snapshot = useDataStore.getState().data?.tasks.find((t) => t.id === id);
  mutate(
    (d) => {
      d.tasks = d.tasks.filter((t) => t.id !== id);
    },
    { date: snapshot?.date },
  );
}

export function duplicateTask(id: string): void {
  const source = useDataStore.getState().data?.tasks.find((t) => t.id === id);
  if (!source) return;
  createTask({ ...source, title: `${source.title} (copy)`, status: 'todo' });
}

export function postponeTask(id: string, toDate: ISODate): void {
  mutate((d) => {
    const task = d.tasks.find((t) => t.id === id);
    if (!task) return;
    task.date = toDate;
    task.status = 'todo';
    task.completedAt = null;
    task.updatedAt = new Date().toISOString();
  });
}

export function reorderTasks(date: ISODate, orderedIds: string[]): void {
  mutate(
    (d) => {
      orderedIds.forEach((id, i) => {
        const task = d.tasks.find((t) => t.id === id);
        if (task) task.order = i;
      });
    },
    { date, skipRollup: true },
  );
}

/** Expands a recurring template into concrete task instances. */
export function materialiseRecurring(from: ISODate, to: ISODate): number {
  let created = 0;
  mutate(
    (d) => {
      const templates = d.tasks.filter((t) => t.recurrence !== null && t.recurrenceParentId === null);
      for (const tpl of templates) {
        const rule = tpl.recurrence;
        if (!rule) continue;
        for (const date of datesForRule(rule, tpl.date, from, to)) {
          if (date <= tpl.date) continue;
          if (rule.until && date > rule.until) continue;
          const exists = d.tasks.some((t) => t.recurrenceParentId === tpl.id && t.date === date);
          if (exists) continue;
          const now = new Date().toISOString();
          d.tasks.push({
            ...tpl,
            id: uid('task'),
            date,
            status: 'todo',
            completedAt: null,
            xpAwarded: 0,
            actualMinutes: null,
            recurrence: null,
            recurrenceParentId: tpl.id,
            createdAt: now,
            updatedAt: now,
          });
          created += 1;
        }
      }
    },
    { skipRollup: true },
  );
  return created;
}

/* ------------------------------------------------------------------ */
/* Study sessions                                                      */
/* ------------------------------------------------------------------ */

export type NewSession = Partial<Omit<StudySession, 'id' | 'createdAt'>> & { minutes: number };

export function logStudySession(input: NewSession): string {
  const id = uid('sess');
  const date = input.date ?? todayISO();
  mutate(
    (d) => {
      const session: StudySession = {
        id,
        date,
        subjectId: input.subjectId ?? null,
        topicId: input.topicId ?? null,
        topic: input.topic ?? '',
        start: input.start ?? null,
        end: input.end ?? null,
        minutes: Math.max(0, Math.round(input.minutes)),
        method: input.method ?? 'reading',
        concentration: input.concentration ?? 3,
        difficulty: input.difficulty ?? 3,
        notes: input.notes ?? '',
        taskId: input.taskId ?? null,
        fromPomodoro: input.fromPomodoro ?? false,
        createdAt: new Date().toISOString(),
      };
      d.studySessions.push(session);
      awardXP(d, {
        source: 'study_session',
        refKey: `session:${id}`,
        amount: studySessionXP(session.minutes),
        label: session.topic || 'Study session',
        date,
      });
    },
    { date },
  );
  return id;
}

export function updateStudySession(id: string, patch: Partial<StudySession>): void {
  const existing = useDataStore.getState().data?.studySessions.find((s) => s.id === id);
  mutate(
    (d) => {
      const session = d.studySessions.find((s) => s.id === id);
      if (!session) return;
      Object.assign(session, patch);
    },
    { date: patch.date ?? existing?.date },
  );
}

export function deleteStudySession(id: string): void {
  const existing = useDataStore.getState().data?.studySessions.find((s) => s.id === id);
  mutate(
    (d) => {
      d.studySessions = d.studySessions.filter((s) => s.id !== id);
    },
    { date: existing?.date },
  );
}

/* ------------------------------------------------------------------ */
/* Pomodoro                                                            */
/* ------------------------------------------------------------------ */

export function logPomodoroRound(round: Omit<PomodoroRound, 'id'>): void {
  mutate(
    (d) => {
      const id = uid('pomo');
      d.pomodoroLog.push({ ...round, id });
      if (round.kind === 'focus') {
        awardXP(d, {
          source: 'pomodoro',
          refKey: `pomodoro:${id}`,
          amount: XP_RULES.pomodoro,
          label: 'Pomodoro completed',
          date: round.date,
        });

        const dStart = new Date(round.startedAt);
        const dEnd = new Date(round.endedAt);
        const startMinutes = isNaN(dStart.getTime()) ? null : dStart.getHours() * 60 + dStart.getMinutes();
        const endMinutes = isNaN(dEnd.getTime()) ? null : dEnd.getHours() * 60 + dEnd.getMinutes();

        // A focus round is study time, so it is also recorded as a session.
        d.studySessions.push({
          id: uid('sess'),
          date: round.date,
          subjectId: round.subjectId,
          topicId: null,
          topic: round.label,
          start: startMinutes !== null ? minutesToHHMM(startMinutes) : null,
          end: endMinutes !== null ? minutesToHHMM(endMinutes) : null,
          minutes: round.minutes,
          method: round.method ?? 'reading',
          concentration: 4,
          difficulty: 3,
          notes: '',
          taskId: round.taskId,
          fromPomodoro: true,
          createdAt: new Date().toISOString(),
        });
      }
    },
    { date: round.date },
  );
}

/* ------------------------------------------------------------------ */
/* Habits                                                              */
/* ------------------------------------------------------------------ */

export function toggleHabit(habitId: string, date: ISODate): void {
  mutate(
    (d) => {
      const log = ensureLog(d, date);
      const habit = d.habits.find((h) => h.id === habitId);
      if (!habit) return;
      const doneIdx = log.habitsDone.indexOf(habitId);
      if (doneIdx >= 0) {
        log.habitsDone.splice(doneIdx, 1);
      } else {
        log.habitsDone.push(habitId);
        log.habitsSkipped = log.habitsSkipped.filter((h) => h !== habitId);
        awardXP(d, {
          source: 'habit',
          refKey: `habit:${habitId}:${date}`,
          amount: habit.xp,
          label: habit.name,
          date,
        });
      }
    },
    { date },
  );
}

export function skipHabit(habitId: string, date: ISODate): void {
  mutate(
    (d) => {
      const log = ensureLog(d, date);
      log.habitsDone = log.habitsDone.filter((h) => h !== habitId);
      if (!log.habitsSkipped.includes(habitId)) log.habitsSkipped.push(habitId);
    },
    { date },
  );
}

export function createHabit(input: Partial<Habit> & { name: string }): void {
  mutate((d) => {
    d.habits.push({
      id: uid('habit'),
      name: input.name.trim(),
      icon: input.icon ?? 'Circle',
      color: input.color ?? '#6366f1',
      freq: input.freq ?? 'daily',
      daysOfWeek: input.daysOfWeek,
      timesPerWeek: input.timesPerWeek,
      inverse: input.inverse ?? false,
      xp: input.xp ?? XP_RULES.habit,
      archived: false,
      order: d.habits.length,
      createdAt: new Date().toISOString(),
    });
  });
}

export function updateHabit(id: string, patch: Partial<Habit>): void {
  mutate((d) => {
    const habit = d.habits.find((h) => h.id === id);
    if (habit) Object.assign(habit, patch);
  });
}

export function deleteHabit(id: string): void {
  mutate((d) => {
    d.habits = d.habits.filter((h) => h.id !== id);
    for (const log of d.dailyLogs) {
      log.habitsDone = log.habitsDone.filter((h) => h !== id);
      log.habitsSkipped = log.habitsSkipped.filter((h) => h !== id);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Daily log                                                           */
/* ------------------------------------------------------------------ */

export function updateDailyLog(date: ISODate, patch: Partial<AppData['dailyLogs'][number]>): void {
  mutate(
    (d) => {
      const log = ensureLog(d, date);
      Object.assign(log, patch);
      if (patch.minutes) log.minutes = { ...log.minutes, ...patch.minutes };
    },
    { date },
  );
}

export function setDayMinutes(
  date: ISODate,
  key: keyof AppData['dailyLogs'][number]['minutes'],
  minutes: number,
): void {
  mutate(
    (d) => {
      const log = ensureLog(d, date);
      log.minutes[key] = Math.max(0, Math.round(minutes));
    },
    { date },
  );
}

export function saveDailyReview(
  date: ISODate,
  review: { wentWell: string; improve: string; mood?: number | null; energy?: number | null },
): void {
  mutate(
    (d) => {
      const log = ensureLog(d, date);
      log.reviewWentWell = review.wentWell;
      log.reviewImprove = review.improve;
      if (review.mood !== undefined) log.mood = review.mood as 1 | 2 | 3 | 4 | 5 | null;
      if (review.energy !== undefined) log.energy = review.energy as 1 | 2 | 3 | 4 | 5 | null;
      log.reviewedAt = new Date().toISOString();
    },
    { date },
  );
}

/* ------------------------------------------------------------------ */
/* Goals                                                               */
/* ------------------------------------------------------------------ */

export function createGoal(input: Partial<Goal> & { title: string; target: number }): string {
  const id = uid('goal');
  mutate((d) => {
    d.goals.push({
      id,
      title: input.title.trim(),
      description: input.description ?? '',
      target: input.target,
      current: input.current ?? 0,
      unit: input.unit ?? 'hours',
      auto: input.auto ?? null,
      deadline: input.deadline ?? null,
      category: input.category ?? 'study',
      priority: input.priority ?? 'medium',
      status: 'active',
      createdAt: new Date().toISOString(),
      completedAt: null,
      xpAwarded: false,
    });
  });
  return id;
}

export function updateGoal(id: string, patch: Partial<Goal>): void {
  mutate((d) => {
    const goal = d.goals.find((g) => g.id === id);
    if (goal) Object.assign(goal, patch);
  });
}

/** Manual goals only — auto goals recompute themselves on every rollup. */
export function setGoalProgress(id: string, current: number): void {
  mutate((d) => {
    const goal = d.goals.find((g) => g.id === id);
    if (goal && !goal.auto) goal.current = Math.max(0, current);
  });
}

export function deleteGoal(id: string): void {
  mutate((d) => {
    d.goals = d.goals.filter((g) => g.id !== id);
  });
}

/* ------------------------------------------------------------------ */
/* Subjects, topics & assignments                                      */
/* ------------------------------------------------------------------ */

export function createSubject(input: Partial<Subject> & { name: string; code: string }): string {
  const id = uid('subj');
  mutate(
    (d) => {
      d.subjects.push({
        id,
        code: input.code.trim(),
        name: input.name.trim(),
        teacher: input.teacher ?? '',
        credits: input.credits ?? 3,
        difficulty: input.difficulty ?? 3,
        targetMinutes: input.targetMinutes ?? 30 * 60,
        color: input.color ?? '#6366f1',
        topics: input.topics ?? [],
        assignments: input.assignments ?? [],
        examDate: input.examDate ?? null,
        notes: input.notes ?? '',
        archived: false,
      });
    },
    { skipRollup: true },
  );
  return id;
}

export function updateSubject(id: string, patch: Partial<Subject>): void {
  mutate((d) => {
    const subject = d.subjects.find((s) => s.id === id);
    if (subject) Object.assign(subject, patch);
  });
}

export function deleteSubject(id: string): void {
  mutate((d) => {
    d.subjects = d.subjects.filter((s) => s.id !== id);
    // Unlink rather than delete: the study time and tasks themselves stay.
    for (const t of d.tasks) if (t.subjectId === id) t.subjectId = null;
    for (const s of d.studySessions) if (s.subjectId === id) s.subjectId = null;
    for (const sem of d.schedule.semesters) {
      for (const slot of sem.slots) if (slot.subjectId === id) slot.subjectId = null;
    }
    // Clear subjectId on any auto-tracking goal that pointed at this subject
    // so the goal does not silently continue tracking against a ghost subject.
    for (const g of d.goals) {
      if (g.auto?.subjectId === id) g.auto = { ...g.auto, subjectId: null };
    }
  });
}

export function addTopic(subjectId: string, title: string, module?: string): void {
  mutate(
    (d) => {
      const subject = d.subjects.find((s) => s.id === subjectId);
      if (!subject) return;
      subject.topics.push({ id: uid('topic'), title: title.trim(), module, done: false });
    },
    { skipRollup: true },
  );
}

export function toggleTopic(subjectId: string, topicId: string): void {
  mutate((d) => {
    const topic = d.subjects.find((s) => s.id === subjectId)?.topics.find((t) => t.id === topicId);
    if (!topic) return;
    topic.done = !topic.done;
    topic.completedAt = topic.done ? new Date().toISOString() : undefined;
  });
}

export function updateTopic(subjectId: string, topicId: string, patch: Partial<Topic>): void {
  mutate((d) => {
    const topic = d.subjects.find((s) => s.id === subjectId)?.topics.find((t) => t.id === topicId);
    if (topic) Object.assign(topic, patch);
  });
}

export function deleteTopic(subjectId: string, topicId: string): void {
  mutate((d) => {
    const subject = d.subjects.find((s) => s.id === subjectId);
    if (subject) subject.topics = subject.topics.filter((t) => t.id !== topicId);
  });
}

export function addAssignment(subjectId: string, input: Partial<Assignment> & { title: string }): void {
  mutate(
    (d) => {
      const subject = d.subjects.find((s) => s.id === subjectId);
      if (!subject) return;
      subject.assignments.push({
        id: uid('asgn'),
        title: input.title.trim(),
        dueDate: input.dueDate ?? null,
        done: false,
      });
    },
    { skipRollup: true },
  );
}

export function toggleAssignment(subjectId: string, assignmentId: string): void {
  mutate((d) => {
    const asgn = d.subjects
      .find((s) => s.id === subjectId)
      ?.assignments.find((a) => a.id === assignmentId);
    if (!asgn) return;
    asgn.done = !asgn.done;
    asgn.completedAt = asgn.done ? new Date().toISOString() : undefined;
  });
}

export function deleteAssignment(subjectId: string, assignmentId: string): void {
  mutate((d) => {
    const subject = d.subjects.find((s) => s.id === subjectId);
    if (subject) subject.assignments = subject.assignments.filter((a) => a.id !== assignmentId);
  });
}

/* ------------------------------------------------------------------ */
/* Timetable                                                           */
/* ------------------------------------------------------------------ */

function activeSemester(d: AppData) {
  return d.schedule.semesters.find((s) => s.id === d.schedule.activeSemesterId);
}

export function addClassSlot(input: Partial<ClassSlot> & { day: Weekday; start: HHMM; end: HHMM }): void {
  mutate((d) => {
    const sem = activeSemester(d);
    if (!sem) return;
    sem.slots.push({
      id: uid('slot'),
      day: input.day,
      start: input.start,
      end: input.end,
      subjectId: input.subjectId ?? null,
      title: input.title ?? '',
      teacher: input.teacher ?? '',
      room: input.room ?? '',
      type: input.type ?? 'lecture',
      color: input.color,
    });
    sem.slots.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  });
}

export function updateClassSlot(id: string, patch: Partial<ClassSlot>): void {
  mutate((d) => {
    const sem = activeSemester(d);
    const slot = sem?.slots.find((s) => s.id === id);
    if (!slot || !sem) return;
    Object.assign(slot, patch);
    sem.slots.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  });
}

export function deleteClassSlot(id: string): void {
  mutate((d) => {
    const sem = activeSemester(d);
    if (sem) sem.slots = sem.slots.filter((s) => s.id !== id);
  });
}

export function toggleHoliday(date: ISODate): void {
  mutate(
    (d) => {
      const i = d.schedule.holidays.indexOf(date);
      if (i >= 0) d.schedule.holidays.splice(i, 1);
      else d.schedule.holidays.push(date);
    },
    { date },
  );
}

export function createSemester(name: string, startDate: ISODate, endDate: ISODate): string {
  const id = uid('sem');
  mutate(
    (d) => {
      d.schedule.semesters.push({ id, name: name.trim(), startDate, endDate, slots: [] });
      d.schedule.activeSemesterId = id;
    },
    { skipRollup: true },
  );
  return id;
}

export function setActiveSemester(id: string): void {
  mutate(
    (d) => {
      if (d.schedule.semesters.some((s) => s.id === id)) d.schedule.activeSemesterId = id;
    },
    { skipRollup: true },
  );
}

export function updateSemester(id: string, patch: Partial<Omit<Semester, 'slots'>>): void {
  mutate((d) => {
    const sem = d.schedule.semesters.find((s) => s.id === id);
    if (sem) Object.assign(sem, patch);
  });
}

export function deleteSemester(id: string): void {
  mutate((d) => {
    if (d.schedule.semesters.length <= 1) return;
    d.schedule.semesters = d.schedule.semesters.filter((s) => s.id !== id);
    if (d.schedule.activeSemesterId === id) {
      d.schedule.activeSemesterId = d.schedule.semesters[0].id;
    }
  });
}

/* ------------------------------------------------------------------ */
/* Streak freezes                                                      */
/* ------------------------------------------------------------------ */

export function spendStreakFreeze(key: StreakKey, date: ISODate): void {
  // mutate() runs `fn` synchronously against a draft, so the outcome is
  // readable straight after — and a rejected freeze never touches live state.
  let outcome: FreezeResult = { ok: false, reason: 'No data loaded yet.' };
  mutate(
    (d) => {
      outcome = applyStreakFreeze(d, key, date);
    },
    { date },
  );
  if (outcome.ok) {
    toast({
      kind: 'success',
      title: 'Streak freeze used',
      message: `Your ${key} streak is protected for ${date}.`,
    });
  } else {
    toast({ kind: 'warning', title: 'Freeze not applied', message: outcome.reason });
  }
}

export function undoStreakFreeze(key: StreakKey, date: ISODate): void {
  mutate(
    (d) => {
      removeStreakFreeze(d, key, date);
    },
    { date },
  );
}

/* ------------------------------------------------------------------ */
/* Settings & profile                                                  */
/* ------------------------------------------------------------------ */

export function updateSettings(patch: Partial<Settings>): void {
  mutate(
    (d) => {
      Object.assign(d.settings, patch);
      if (patch.targets) d.settings.targets = { ...d.settings.targets, ...patch.targets };
      if (patch.pomodoro) d.settings.pomodoro = { ...d.settings.pomodoro, ...patch.pomodoro };
      if (patch.notifications) {
        d.settings.notifications = { ...d.settings.notifications, ...patch.notifications };
      }
    },
    // Targets feed the score, so a rollup is needed unless it is pure chrome.
    { skipRollup: false },
  );
}

export function updateProfile(patch: Partial<Profile>): void {
  mutate(
    (d) => {
      Object.assign(d.profile, patch);
    },
    { skipRollup: true },
  );
}

export function completeOnboarding(): void {
  mutate((d) => {
    d.profile.onboarded = true;
  });
}

/* ------------------------------------------------------------------ */
/* Notes & calendar events                                             */
/* ------------------------------------------------------------------ */

export function createNote(input: Partial<Note> & { title: string }): string {
  const id = uid('note');
  const now = new Date().toISOString();
  mutate(
    (d) => {
      d.notes.push({
        id,
        title: input.title.trim(),
        body: input.body ?? '',
        date: input.date ?? todayISO(),
        subjectId: input.subjectId ?? null,
        pinned: input.pinned ?? false,
        createdAt: now,
        updatedAt: now,
      });
    },
    { skipRollup: true },
  );
  return id;
}

export function updateNote(id: string, patch: Partial<Note>): void {
  mutate(
    (d) => {
      const note = d.notes.find((n) => n.id === id);
      if (note) Object.assign(note, patch, { updatedAt: new Date().toISOString() });
    },
    { skipRollup: true },
  );
}

export function deleteNote(id: string): void {
  mutate(
    (d) => {
      d.notes = d.notes.filter((n) => n.id !== id);
    },
    { skipRollup: true },
  );
}

export function createEvent(input: Partial<CalendarEvent> & { title: string; date: ISODate }): string {
  const id = uid('evt');
  mutate(
    (d) => {
      d.events.push({
        id,
        title: input.title.trim(),
        date: input.date,
        start: input.start ?? null,
        end: input.end ?? null,
        kind: input.kind ?? 'event',
        subjectId: input.subjectId ?? null,
        notes: input.notes ?? '',
        color: input.color,
      });
    },
    { skipRollup: true },
  );
  return id;
}

export function updateEvent(id: string, patch: Partial<CalendarEvent>): void {
  mutate(
    (d) => {
      const evt = d.events.find((e) => e.id === id);
      if (evt) Object.assign(evt, patch);
    },
    { skipRollup: true },
  );
}

export function deleteEvent(id: string): void {
  mutate(
    (d) => {
      d.events = d.events.filter((e) => e.id !== id);
    },
    { skipRollup: true },
  );
}

/* ------------------------------------------------------------------ */
/* Exams                                                              */
/* ------------------------------------------------------------------ */

export function createExam(payload: Omit<Exam, 'id' | 'createdAt'>): string {
  const id = uid('exam');
  mutate((d) => {
    d.exams = d.exams || [];
    d.exams.push({
      ...payload,
      id,
      createdAt: new Date().toISOString(),
    });
  });
  return id;
}

export function updateExam(id: string, patch: Partial<Exam>): void {
  mutate((d) => {
    d.exams = d.exams || [];
    const exam = d.exams.find((e) => e.id === id);
    if (exam) Object.assign(exam, patch);
  });
}

export function deleteExam(id: string): void {
  mutate((d) => {
    d.exams = d.exams || [];
    d.exams = d.exams.filter((e) => e.id !== id);
  });
}

export function toggleExamSyllabusItem(examId: string, itemId: string): void {
  mutate((d) => {
    d.exams = d.exams || [];
    const exam = d.exams.find((e) => e.id === examId);
    if (!exam) return;
    const exists = exam.syllabusChecked.includes(itemId);
    if (exists) {
      exam.syllabusChecked = exam.syllabusChecked.filter((id) => id !== itemId);
    } else {
      exam.syllabusChecked.push(itemId);
    }
  });
}

export function addExamSyllabusItem(examId: string, text: string, topicId?: string): void {
  mutate((d) => {
    d.exams = d.exams || [];
    const exam = d.exams.find((e) => e.id === examId);
    if (!exam) return;
    exam.syllabus.push({
      id: uid('syl'),
      text: text.trim(),
      topicId,
    });
  });
}

export function removeExamSyllabusItem(examId: string, itemId: string): void {
  mutate((d) => {
    d.exams = d.exams || [];
    const exam = d.exams.find((e) => e.id === examId);
    if (!exam) return;
    exam.syllabus = exam.syllabus.filter((s) => s.id !== itemId);
    exam.syllabusChecked = exam.syllabusChecked.filter((id) => id !== itemId);
  });
}

/* ------------------------------------------------------------------ */
/* Study Materials                                                     */
/* ------------------------------------------------------------------ */

export function addMaterial(
  payload: Omit<StudyMaterial, 'id' | 'createdAt' | 'lastOpenedAt'>,
): string {
  const id = uid('mat');
  mutate((d) => {
    d.studyMaterials = d.studyMaterials || [];
    d.studyMaterials.push({
      ...payload,
      id,
      createdAt: new Date().toISOString(),
      lastOpenedAt: null,
    });
  });
  return id;
}

export function updateMaterial(id: string, patch: Partial<StudyMaterial>): void {
  mutate((d) => {
    d.studyMaterials = d.studyMaterials || [];
    const mat = d.studyMaterials.find((m) => m.id === id);
    if (mat) Object.assign(mat, patch);
  });
}

export function deleteMaterial(id: string): void {
  mutate((d) => {
    d.studyMaterials = d.studyMaterials || [];
    d.studyMaterials = d.studyMaterials.filter((m) => m.id !== id);
  });
}

export function recordMaterialOpened(id: string): void {
  mutate((d) => {
    d.studyMaterials = d.studyMaterials || [];
    const mat = d.studyMaterials.find((m) => m.id === id);
    if (mat) mat.lastOpenedAt = new Date().toISOString();
  });
}

function datesForRule(
  rule: NonNullable<Task['recurrence']>,
  anchor: ISODate,
  from: ISODate,
  to: ISODate,
): ISODate[] {
  const out: ISODate[] = [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const anchorDate = new Date(`${anchor}T00:00:00`);
  const every = Math.max(1, rule.interval);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = toISODate(d);
    const dayDiff = Math.round((d.getTime() - anchorDate.getTime()) / 86_400_000);
    if (dayDiff <= 0) continue;

    if (rule.kind === 'daily' && dayDiff % every === 0) {
      out.push(iso);
    } else if (rule.kind === 'weekly') {
      const days = rule.daysOfWeek ?? [anchorDate.getDay() as Weekday];
      if (days.includes(d.getDay() as Weekday)) {
        // Compare which ISO calendar week each date falls in (Mon-based).
        const weekDiff = Math.round(
          diffDaysISO(startOfWeekISO(iso, 1), startOfWeekISO(anchor, 1)) / 7,
        );
        if (weekDiff >= 0 && weekDiff % every === 0) out.push(iso);
      }
    } else if (rule.kind === 'monthly') {
      const monthDiff =
        (d.getFullYear() - anchorDate.getFullYear()) * 12 +
        (d.getMonth() - anchorDate.getMonth());
      if (monthDiff > 0 && monthDiff % every === 0) {
        // Clamp to last valid day of the target month (handles Jan 31 -> Feb 28, etc.)
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const targetDay = Math.min(anchorDate.getDate(), lastDay);
        if (d.getDate() === targetDay) out.push(iso);
      }
    } else if (rule.kind === 'weekdays' && d.getDay() >= 1 && d.getDay() <= 5) {
      out.push(iso);
    }
  }
  return out;
}
