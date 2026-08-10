import { describe, it, expect } from 'vitest';
import type { AppData, Task } from '@/types';
import { createDefaultData } from '@/data/defaults';
import { computeDueReminders } from '@/services/reminders';

const NOW = '2026-01-05T00:00:00.000Z'; // a Monday

function enableNotifs(data: AppData): void {
  data.settings.notifications.enabled = true;
  data.settings.notifications.leadMinutes = 10;
}

/** Build a Date at a given HH:MM on 2026-01-05 (local time, as the app reads it). */
function at(hour: number, min: number): Date {
  return new Date(2026, 0, 5, hour, min, 0, 0);
}

describe('reminder scheduling (§28)', () => {
  it('is silent when notifications are disabled', () => {
    const data = createDefaultData(NOW);
    data.tasks.push(taskAt(data, '10:00'));
    expect(computeDueReminders(data, at(9, 55))).toEqual([]);
  });

  it('fires an upcoming-task reminder inside the lead window', () => {
    const data = createDefaultData(NOW);
    enableNotifs(data);
    data.tasks.push(taskAt(data, '10:00'));
    const due = computeDueReminders(data, at(9, 55)); // 5 min before, lead is 10
    expect(due.some((r) => r.key.startsWith('task:'))).toBe(true);
  });

  it('does not fire before the lead window or after the start', () => {
    const data = createDefaultData(NOW);
    enableNotifs(data);
    data.tasks.push(taskAt(data, '10:00'));
    expect(computeDueReminders(data, at(9, 30))).toEqual([]); // 30 min out
    expect(computeDueReminders(data, at(10, 1))).toEqual([]); // already started
  });

  it('does not remind about a completed task', () => {
    const data = createDefaultData(NOW);
    enableNotifs(data);
    const t = taskAt(data, '10:00');
    t.status = 'completed';
    data.tasks.push(t);
    expect(computeDueReminders(data, at(9, 55))).toEqual([]);
  });

  it('nudges an at-risk streak in the evening', () => {
    const data = createDefaultData(NOW);
    enableNotifs(data);
    data.streaks.streaks.study.current = 4;
    data.streaks.streaks.study.lastQualifiedDate = '2026-01-04'; // yesterday, not today
    const due = computeDueReminders(data, at(21, 0));
    expect(due.some((r) => r.key.startsWith('streak:'))).toBe(true);
    // ...but not in the morning.
    expect(computeDueReminders(data, at(9, 0)).some((r) => r.key.startsWith('streak:'))).toBe(false);
  });
});

function taskAt(data: AppData, start: string): Task {
  return {
    id: `t-${start}`,
    title: `Task ${start}`,
    description: '',
    date: '2026-01-05',
    start,
    end: null,
    category: 'study' as const,
    subjectId: null,
    priority: 'medium' as const,
    difficulty: 3 as const,
    estimatedMinutes: null,
    actualMinutes: null,
    status: 'todo' as const,
    recurrence: null,
    recurrenceParentId: null,
    notes: '',
    createdAt: data.profile.createdAt,
    updatedAt: data.profile.createdAt,
    completedAt: null,
    xpAwarded: 0,
    order: 0,
  };
}
