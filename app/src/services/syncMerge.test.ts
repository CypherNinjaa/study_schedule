import { describe, expect, it } from 'vitest';
import { createDefaultData } from '@/data/defaults';
import { mergeAppData } from './syncMerge';
import type { Task } from '@/types';

function makeTask(id: string, title: string, updatedAt: string): Task {
  return {
    id,
    title,
    description: '',
    date: '2026-11-18',
    start: null,
    end: null,
    category: 'study',
    subjectId: null,
    priority: 'medium',
    difficulty: 3,
    estimatedMinutes: 30,
    actualMinutes: null,
    status: 'todo',
    recurrence: null,
    recurrenceParentId: null,
    notes: '',
    createdAt: updatedAt,
    updatedAt,
    completedAt: null,
    xpAwarded: 0,
    order: 0,
  };
}

describe('mergeAppData', () => {
  it('keeps tasks and habits created on both offline local and online remote', () => {
    const local = createDefaultData('2026-11-18T10:00:00.000Z');
    local.lastUpdated = '2026-11-18T12:00:00.000Z';
    local.profile.onboarded = true;
    local.tasks = [makeTask('t_local', 'Offline laptop task', '2026-11-18T12:00:00.000Z')];
    local.dailyLogs = [
      {
        date: '2026-11-18',
        wokeAt: '05:30',
        sleptAt: null,
        sleepMinutes: null,
        minutes: { study: 60, coding: 0, college: 0, travel: 0, relationship: 0, exercise: 0, entertainment: 0, socialMedia: 0, other: 0 },
        relationshipDayMinutes: 0,
        relationshipNightMinutes: 0,
        habitsDone: ['h1'],
        habitsSkipped: [],
        mood: null,
        energy: null,
        note: '',
        reviewWentWell: '',
        reviewImprove: '',
        reviewedAt: null,
        score: null,
        xpEarned: 0,
      },
    ];

    const remote = createDefaultData('2026-11-18T10:00:00.000Z');
    remote.lastUpdated = '2026-11-18T12:05:00.000Z';
    remote.profile.onboarded = true;
    remote.tasks = [makeTask('t_remote', 'Phone task', '2026-11-18T12:05:00.000Z')];
    remote.dailyLogs = [
      {
        date: '2026-11-18',
        wokeAt: null,
        sleptAt: null,
        sleepMinutes: null,
        minutes: { study: 30, coding: 45, college: 0, travel: 0, relationship: 0, exercise: 0, entertainment: 0, socialMedia: 0, other: 0 },
        relationshipDayMinutes: 0,
        relationshipNightMinutes: 0,
        habitsDone: ['h2'],
        habitsSkipped: [],
        mood: 4,
        energy: null,
        note: '',
        reviewWentWell: 'Focused well',
        reviewImprove: '',
        reviewedAt: '2026-11-18T12:05:00.000Z',
        score: null,
        xpEarned: 0,
      },
    ];

    const merged = mergeAppData(local, remote, '2026-11-18');
    expect(merged.tasks.map((t) => t.id).sort()).toEqual(['t_local', 't_remote']);

    const log = merged.dailyLogs.find((l) => l.date === '2026-11-18')!;
    expect(log.habitsDone.sort()).toEqual(['h1', 'h2']);
    expect(log.wokeAt).toBe('05:30');
    expect(log.mood).toBe(4);
    expect(log.minutes.study).toBe(60);
    expect(log.minutes.coding).toBe(45);
  });
});
