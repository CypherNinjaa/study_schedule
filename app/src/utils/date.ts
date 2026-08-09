import type { HHMM, ISODate, Weekday } from '@/types';

export const MINUTES_PER_DAY = 1440;

export function todayISO(d: Date = new Date()): ISODate {
  return toISODate(d);
}

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDaysISO(s: ISODate, n: number): ISODate {
  const d = fromISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function diffDaysISO(a: ISODate, b: ISODate): number {
  const ms = fromISODate(a).getTime() - fromISODate(b).getTime();
  return Math.round(ms / 86_400_000);
}

export function weekdayOf(s: ISODate): Weekday {
  return fromISODate(s).getDay() as Weekday;
}

export function isSameISOWeek(a: ISODate, b: ISODate, weekStartsOn: 0 | 1 = 1): boolean {
  return startOfWeekISO(a, weekStartsOn) === startOfWeekISO(b, weekStartsOn);
}

export function startOfWeekISO(s: ISODate, weekStartsOn: 0 | 1 = 1): ISODate {
  const d = fromISODate(s);
  const day = d.getDay();
  const delta = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - delta);
  return toISODate(d);
}

export function endOfWeekISO(s: ISODate, weekStartsOn: 0 | 1 = 1): ISODate {
  return addDaysISO(startOfWeekISO(s, weekStartsOn), 6);
}

export function startOfMonthISO(s: ISODate): ISODate {
  const d = fromISODate(s);
  d.setDate(1);
  return toISODate(d);
}

export function endOfMonthISO(s: ISODate): ISODate {
  const d = fromISODate(s);
  d.setMonth(d.getMonth() + 1, 0);
  return toISODate(d);
}

/** Inclusive list of dates from `from` to `to`. */
export function rangeISO(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard++ < 4000) {
    out.push(cur);
    cur = addDaysISO(cur, 1);
  }
  return out;
}

export function lastNDays(n: number, end: ISODate = todayISO()): ISODate[] {
  return rangeISO(addDaysISO(end, -(n - 1)), end);
}

/* ---------------------------- time of day ---------------------------- */

export function hhmmToMinutes(t: HHMM): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToHHMM(min: number): HHMM {
  const wrapped = ((min % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Duration between two clock times, wrapping past midnight (e.g. 23:00 -> 05:00 = 360). */
export function durationBetween(start: HHMM, end: HHMM): number {
  const s = hhmmToMinutes(start);
  const e = hhmmToMinutes(end);
  return e >= s ? e - s : MINUTES_PER_DAY - s + e;
}

export function nowHHMM(d: Date = new Date()): HHMM {
  return minutesToHHMM(d.getHours() * 60 + d.getMinutes());
}

/* ---------------------------- formatting ---------------------------- */

export function formatMinutes(min: number, opts: { short?: boolean } = {}): string {
  const total = Math.max(0, Math.round(min));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (opts.short) {
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatHours(min: number, digits = 1): string {
  return `${(min / 60).toFixed(digits)}h`;
}

export function formatHHMM12(t: HHMM): string {
  const mins = hhmmToMinutes(t);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function weekdayName(day: number, short = false): string {
  return (short ? WEEKDAY_SHORT : WEEKDAY_LONG)[((day % 7) + 7) % 7] ?? '';
}

export function monthName(month: number, short = false): string {
  return (short ? MONTH_SHORT : MONTH_LONG)[((month % 12) + 12) % 12] ?? '';
}

/** "Sat, 9 Aug" */
export function formatDateShort(s: ISODate): string {
  const d = fromISODate(s);
  return `${weekdayName(d.getDay(), true)}, ${d.getDate()} ${monthName(d.getMonth(), true)}`;
}

/** "Saturday, 9 August 2026" */
export function formatDateLong(s: ISODate): string {
  const d = fromISODate(s);
  return `${weekdayName(d.getDay())}, ${d.getDate()} ${monthName(d.getMonth())} ${d.getFullYear()}`;
}

export function relativeDayLabel(s: ISODate, today: ISODate = todayISO()): string {
  const delta = diffDaysISO(s, today);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  if (delta === -1) return 'Yesterday';
  if (delta > 1 && delta < 7) return weekdayName(weekdayOf(s));
  return formatDateShort(s);
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}
