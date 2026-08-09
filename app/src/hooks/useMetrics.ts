import { useMemo } from 'react';
import type { AppData, ISODate } from '@/types';
import { useDataStore } from '@/store/useDataStore';
import {
  buildIndex,
  computeDayMetrics,
  computeRangeMetrics,
  productivityScore,
  type DayMetrics,
  type MetricsIndex,
  type RangeMetrics,
  type ScoreBreakdown,
} from '@/services/metrics';

/**
 * Metrics are pure functions of the document, so every hook here keys its
 * memo on `data.lastUpdated` — one string compare instead of a deep scan.
 */

export function useData(): AppData {
  const data = useDataStore((s) => s.data);
  // Pages only render once boot has produced a document.
  return data as AppData;
}

export function useIndex(): MetricsIndex {
  const data = useData();
  return useMemo(() => buildIndex(data), [data.lastUpdated]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useDayMetrics(date: ISODate): DayMetrics {
  const data = useData();
  const index = useIndex();
  return useMemo(() => computeDayMetrics(data, date, index), [index, date]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useScore(date: ISODate): ScoreBreakdown {
  const data = useData();
  const index = useIndex();
  const metrics = useDayMetrics(date);
  return useMemo(() => productivityScore(data, metrics, index), [metrics, index]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useRangeMetrics(from: ISODate, to: ISODate): RangeMetrics {
  const data = useData();
  const index = useIndex();
  return useMemo(() => computeRangeMetrics(data, from, to, index), [index, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
}
