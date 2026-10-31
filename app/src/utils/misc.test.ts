import { describe, expect, it } from 'vitest';
import { clamp, mean, pct, roundNumber, sum, trendPct } from './misc';

describe('misc utils', () => {
  describe('roundNumber', () => {
    it('rounds to 2 decimal places by default', () => {
      expect(roundNumber(33.33333333333333)).toBe(33.33);
      expect(roundNumber(36.666666666666664)).toBe(36.67);
      expect(roundNumber(26.666666666666668)).toBe(26.67);
      expect(roundNumber(23.333333333333332)).toBe(23.33);
      expect(roundNumber(10)).toBe(10);
    });

    it('supports custom decimal places', () => {
      expect(roundNumber(3.14159, 1)).toBe(3.1);
      expect(roundNumber(3.14159, 3)).toBe(3.142);
      expect(roundNumber(3.14159, 0)).toBe(3);
    });
  });

  describe('pct', () => {
    it('returns at most 2 decimal places and handles floating precision', () => {
      expect(pct(10, 30)).toBe(33.33);
      expect(pct(11, 30)).toBe(36.67);
      expect(pct(8, 30)).toBe(26.67);
      expect(pct(7, 30)).toBe(23.33);
      expect(pct(3, 30)).toBe(10);
      expect(pct(1, 3)).toBe(33.33);
      expect(pct(2, 3)).toBe(66.67);
    });

    it('clamps between 0 and 100', () => {
      expect(pct(-5, 100)).toBe(0);
      expect(pct(150, 100)).toBe(100);
      expect(pct(10, 0)).toBe(0);
      expect(pct(0, 100)).toBe(0);
    });
  });

  describe('trendPct', () => {
    it('returns null when previous value is zero unless next is also zero', () => {
      expect(trendPct(0, 50)).toBeNull();
      expect(trendPct(0, 0)).toBe(0);
    });

    it('computes trend with at most 2 decimal places', () => {
      expect(trendPct(30, 40)).toBe(33.33);
      expect(trendPct(30, 20)).toBe(-33.33);
      expect(trendPct(100, 150)).toBe(50);
    });
  });

  describe('sum and mean', () => {
    it('computes sum and mean correctly', () => {
      expect(sum([1, 2, 3, 4])).toBe(10);
      expect(mean([])).toBe(0);
      expect(mean([10, 20, 30])).toBe(20);
    });
  });

  describe('clamp', () => {
    it('clamps numbers within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });
});
