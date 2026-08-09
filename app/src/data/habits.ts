import type { Habit } from '@/types';

interface HabitSeed extends Omit<Habit, 'createdAt'> {}

export function buildSeedHabits(now: string): Habit[] {
  const seeds: Omit<HabitSeed, 'id'>[] = [
    { name: 'Deep study session', icon: 'BookOpen', color: '#6366f1', freq: 'daily', inverse: false, xp: 10, archived: false, order: 0 },
    { name: 'Wake up by 5:00 AM', icon: 'Sunrise', color: '#f59e0b', freq: 'daily', inverse: false, xp: 10, archived: false, order: 1 },
    { name: 'Sleep on time', icon: 'Moon', color: '#8b5cf6', freq: 'daily', inverse: false, xp: 10, archived: false, order: 2 },
    { name: 'Exercise', icon: 'Dumbbell', color: '#10b981', freq: 'daily', inverse: false, xp: 15, archived: false, order: 3 },
    { name: 'Code / build something', icon: 'Code2', color: '#0ea5e9', freq: 'daily', inverse: false, xp: 10, archived: false, order: 4 },
    { name: 'Revision', icon: 'RotateCcw', color: '#14b8a6', freq: 'daily', inverse: false, xp: 10, archived: false, order: 5 },
    { name: 'Read (non-syllabus)', icon: 'Library', color: '#f97316', freq: 'weekly', timesPerWeek: 4, inverse: false, xp: 10, archived: false, order: 6 },
    { name: 'No excessive social media', icon: 'ShieldOff', color: '#ef4444', freq: 'daily', inverse: true, xp: 10, archived: false, order: 7 },
    { name: 'Drink enough water', icon: 'Droplets', color: '#38bdf8', freq: 'daily', inverse: false, xp: 5, archived: false, order: 8 },
  ];

  return seeds.map((s, i) => ({
    ...s,
    id: `habit_${i + 1}`,
    createdAt: now,
  }));
}
