import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultData } from '@/data/defaults';
import { computeDayMetrics } from '@/services/metrics';
import { useDataStore } from '@/store/useDataStore';
import { usePomodoroStore } from '@/store/usePomodoroStore';

vi.mock('@/utils/confetti', () => ({
  sideCannons: vi.fn(),
  burstConfetti: vi.fn(),
}));

describe('usePomodoroStore duration tracking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-21T09:00:00.000Z'));

    const stubWin = {
      setInterval: globalThis.setInterval.bind(globalThis),
      clearInterval: globalThis.clearInterval.bind(globalThis),
      setTimeout: globalThis.setTimeout.bind(globalThis),
      addEventListener: vi.fn(),
    };
    vi.stubGlobal('window', stubWin);
    vi.stubGlobal('document', { title: 'Study Schedule' });

    const data = createDefaultData('2026-11-21T09:00:00.000Z');
    useDataStore.setState({
      data,
      activeDate: '2026-11-21',
      bootPhase: 'ready',
      saveState: 'saved',
    });

    usePomodoroStore.getState().skip('focus', 25 * 60);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('logs 5 min when default 25m focus timer is decreased to 5m before starting', () => {
    const store = usePomodoroStore.getState();

    // Decrease 25m -> 5m in four -5m steps while idle
    for (let i = 0; i < 4; i++) {
      store.adjustMinutes(-5);
    }

    const afterAdjust = usePomodoroStore.getState();
    expect(afterAdjust.remaining).toBe(5 * 60);
    expect(afterAdjust.scheduledTotal).toBe(5 * 60);
    expect(afterAdjust.displayTotal).toBe(5 * 60);

    // Start countdown and advance 5 minutes to completion
    afterAdjust.toggle();
    vi.advanceTimersByTime(5 * 60 * 1000);
    usePomodoroStore.getState().tick();

    const data = useDataStore.getState().data!;
    expect(data.pomodoroLog).toHaveLength(1);
    expect(data.pomodoroLog[0].minutes).toBe(5);
    expect(data.studySessions).toHaveLength(1);
    expect(data.studySessions[0].minutes).toBe(5);
    expect(computeDayMetrics(data, '2026-11-21').studyMinutes).toBe(5);
  });

  it('logs 20 min when 25m session runs for 3 min and is decreased by 5m mid-session', () => {
    const store = usePomodoroStore.getState();
    store.toggle();

    // Study 3 minutes, then adjust -5m -> 17m left
    vi.advanceTimersByTime(3 * 60 * 1000);
    usePomodoroStore.getState().tick();
    usePomodoroStore.getState().adjustMinutes(-5);

    const mid = usePomodoroStore.getState();
    expect(mid.remaining).toBe(17 * 60);
    expect(mid.scheduledTotal).toBe(20 * 60);

    // Finish remaining 17 minutes
    vi.advanceTimersByTime(17 * 60 * 1000);
    usePomodoroStore.getState().tick();

    const data = useDataStore.getState().data!;
    expect(data.pomodoroLog).toHaveLength(1);
    expect(data.pomodoroLog[0].minutes).toBe(20);
    expect(data.studySessions[0].minutes).toBe(20);
  });

  it('logs 30 min when +5m is added to default 25m session', () => {
    const store = usePomodoroStore.getState();
    store.adjustMinutes(5);
    expect(usePomodoroStore.getState().remaining).toBe(30 * 60);
    expect(usePomodoroStore.getState().scheduledTotal).toBe(30 * 60);

    usePomodoroStore.getState().toggle();
    vi.advanceTimersByTime(30 * 60 * 1000);
    usePomodoroStore.getState().tick();

    const data = useDataStore.getState().data!;
    expect(data.pomodoroLog[0].minutes).toBe(30);
    expect(data.studySessions[0].minutes).toBe(30);
  });

  it('clamps deadline safely when -5m drops below 5 minutes mid-run', () => {
    usePomodoroStore.getState().skip('focus', 2 * 60);
    usePomodoroStore.getState().toggle();

    // Immediately cut -5m -> clamps to 10s rather than pushing deadline into the past
    usePomodoroStore.getState().adjustMinutes(-5);
    const mid = usePomodoroStore.getState();
    expect(mid.remaining).toBe(10);
    expect(mid.scheduledTotal).toBe(10);

    vi.advanceTimersByTime(5 * 1000);
    usePomodoroStore.getState().tick();
    expect(usePomodoroStore.getState().running).toBe(true);
    expect(usePomodoroStore.getState().remaining).toBe(5);

    vi.advanceTimersByTime(5 * 1000);
    usePomodoroStore.getState().tick();
    expect(useDataStore.getState().data!.pomodoroLog[0].minutes).toBe(1);
  });

  it('does not count subtracted -5m time as elapsed on immediate submitEarly', () => {
    const store = usePomodoroStore.getState();
    store.toggle();
    store.adjustMinutes(-5);
    vi.advanceTimersByTime(30 * 1000);
    usePomodoroStore.getState().submitEarly();

    const data = useDataStore.getState().data!;
    expect(data.pomodoroLog[0].minutes).toBe(1);
    expect(data.studySessions[0].minutes).toBe(1);
  });
});
