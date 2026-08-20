/**
 * Semantic date helpers built on top of diffDaysISO.
 *
 * Problem: diffDaysISO(a, b) = a - b (positive when a is later).
 * Every call-site that passed (today, target) instead of (target, today)
 * produced inverted results.  These wrappers give names that are impossible
 * to misread.
 *
 * All functions accept an optional `from` date defaulting to today so that
 * tests can inject a reference date without monkey-patching Date.now.
 */

import { diffDaysISO, todayISO } from './date';
import type { ISODate } from '@/types';

/**
 * How many calendar days until `target`.
 *   > 0  — target is in the future
 *   = 0  — target is today
 *   < 0  — target is in the past (overdue)
 */
export function daysUntil(target: ISODate, from: ISODate = todayISO()): number {
  return diffDaysISO(target, from);
}

/**
 * How many calendar days since `past`.
 *   > 0  — past is indeed in the past
 *   = 0  — past is today
 *   < 0  — past is in the future (unusual, but defensive)
 */
export function daysAgo(past: ISODate, from: ISODate = todayISO()): number {
  return diffDaysISO(from, past);
}

/** True when `date` is strictly before `from` (defaults to today). */
export function isPast(date: ISODate, from: ISODate = todayISO()): boolean {
  return date < from;
}

/** True when `date` is strictly after `from` (defaults to today). */
export function isFuture(date: ISODate, from: ISODate = todayISO()): boolean {
  return date > from;
}

/** True when `date` equals today's ISO date. */
export function isToday(date: ISODate): boolean {
  return date === todayISO();
}
