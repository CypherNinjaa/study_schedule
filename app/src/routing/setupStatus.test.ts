import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSetupFlag,
  hasEnteredStudyOSInSession,
  hasFastSetupFlag,
  markEnteredStudyOS,
  markSetupCompleted,
} from './setupStatus';

describe('setupStatus routing flags', () => {
  const localMap = new Map<string, string>();
  const sessionMap = new Map<string, string>();

  beforeEach(() => {
    localMap.clear();
    sessionMap.clear();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => localMap.get(k) ?? null,
        setItem: (k: string, v: string) => localMap.set(k, v),
        removeItem: (k: string) => localMap.delete(k),
      },
      sessionStorage: {
        getItem: (k: string) => sessionMap.get(k) ?? null,
        setItem: (k: string, v: string) => sessionMap.set(k, v),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to not onboarded for brand-new visitors', () => {
    expect(hasFastSetupFlag()).toBe(false);
    expect(hasEnteredStudyOSInSession()).toBe(false);
  });

  it('marks setup completed and clears it cleanly on reset', () => {
    markSetupCompleted();
    expect(hasFastSetupFlag()).toBe(true);

    clearSetupFlag();
    expect(hasFastSetupFlag()).toBe(false);
  });

  it('tracks explicit landing-to-studyos entry in sessionStorage', () => {
    markEnteredStudyOS();
    expect(hasEnteredStudyOSInSession()).toBe(true);
  });
});
