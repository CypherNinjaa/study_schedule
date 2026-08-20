import { describe, expect, it } from 'vitest';
import { createDefaultData } from '@/data/defaults';
import { createTask, materialiseRecurring } from '@/store/actions';
import { useDataStore } from '@/store/useDataStore';

describe('Recurring tasks materialisation', () => {
  it('generates correct instances for daily recurrence', () => {
    const data = createDefaultData('2026-08-01T00:00:00.000Z');
    useDataStore.setState({ data, bootPhase: 'ready' });

    createTask({
      title: 'Daily Review',
      date: '2026-08-01',
      category: 'study',
      priority: 'medium',
      difficulty: 2,
      recurrence: { kind: 'daily', interval: 1 },
    });

    const count = materialiseRecurring('2026-08-01', '2026-08-05');
    expect(count).toBe(4); // 2026-08-02, 2026-08-03, 2026-08-04, 2026-08-05

    const tasks = useDataStore.getState().data?.tasks || [];
    const dates = tasks.map((t) => t.date).sort();
    expect(dates).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
    ]);
  });

  it('generates correct instances for weekly recurrence with specific weekdays', () => {
    const data = createDefaultData('2026-08-03T00:00:00.000Z'); // 2026-08-03 is Monday
    useDataStore.setState({ data, bootPhase: 'ready' });

    createTask({
      title: 'Lab Class',
      date: '2026-08-03', // Mon
      category: 'college',
      priority: 'high',
      difficulty: 3,
      recurrence: { kind: 'weekly', interval: 1, daysOfWeek: [1, 3] }, // Mon, Wed
    });

    materialiseRecurring('2026-08-03', '2026-08-10');

    const tasks = useDataStore.getState().data?.tasks || [];
    const dates = tasks.map((t) => t.date).sort();
    // Expected: 2026-08-03 (anchor Mon), 2026-08-05 (Wed), 2026-08-10 (Mon)
    expect(dates).toContain('2026-08-05');
    expect(dates).toContain('2026-08-10');
  });
});
