import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

let counter = 0;
export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 100_000;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function sum(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0);
}

export function mean(ns: number[]): number {
  return ns.length === 0 ? 0 : sum(ns) / ns.length;
}

export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return clamp((part / whole) * 100, 0, 100);
}

export function groupBy<T, K extends string>(items: T[], key: (t: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  const wrapped = (...a: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
  wrapped.cancel = () => {
    if (t) clearTimeout(t);
    t = undefined;
  };
  wrapped.flush = (...a: A) => {
    if (t) clearTimeout(t);
    t = undefined;
    fn(...a);
  };
  return wrapped;
}

/** Percentage change from a to b, guarding divide-by-zero. */
export function trendPct(prev: number, next: number): number | null {
  if (prev === 0) return next === 0 ? 0 : null;
  return ((next - prev) / prev) * 100;
}

export function titleCase(s: string): string {
  return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
