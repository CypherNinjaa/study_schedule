import * as fs from '@/services/fileStorage';

const ONBOARDED_KEY = 'studyos_onboarded';
const ENTER_SESSION_KEY = 'studyos_enter';

/** Synchronously mark that this browser has completed StudyOS onboarding. */
export function markSetupCompleted(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ONBOARDED_KEY, '1');
    }
  } catch {
    // Ignore storage quota or restricted-context errors
  }
}

/** Clear the fast setup flag when the user resets all data. */
export function clearSetupFlag(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(ONBOARDED_KEY);
    }
  } catch {
    // Ignore
  }
}

/** Fast synchronous check used before async IndexedDB inspection. */
export function hasFastSetupFlag(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem(ONBOARDED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Remember that a new visitor explicitly clicked into /studyos from the landing page. */
export function markEnteredStudyOS(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(ENTER_SESSION_KEY, '1');
    }
  } catch {
    // Ignore
  }
}

export function hasEnteredStudyOSInSession(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      window.sessionStorage?.getItem(ENTER_SESSION_KEY) === '1'
    );
  } catch {
    return false;
  }
}

/**
 * Check whether this browser already has a completed StudyOS workspace
 * (either via fast localStorage flag, persisted File System handle, or IndexedDB mirror).
 */
export async function detectCompletedSetup(): Promise<boolean> {
  if (hasFastSetupFlag()) return true;

  try {
    const mirror = await fs.loadLocalMirror();
    if (mirror?.status === 'ok' && mirror.data?.profile?.onboarded) {
      markSetupCompleted();
      return true;
    }

    const handle = await fs.loadStoredHandle();
    if (handle) {
      const perm = await fs.checkPermission('readwrite');
      if (perm === 'granted') {
        const res = await fs.loadFromHandle();
        if (res.status === 'ok' && res.data?.profile?.onboarded) {
          markSetupCompleted();
          return true;
        }
      }
    }
  } catch {
    // IndexedDB unavailable or fresh browser
  }

  return false;
}
