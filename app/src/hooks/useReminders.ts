import { useEffect } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { computeDueReminders } from '@/services/reminders';

/**
 * Fires local browser notifications for classes, tasks, streaks and goals as
 * their moment arrives. Everything is computed on-device from the user's own
 * document — no network, no tracking (§38). Each reminder fires once per day;
 * a session-level set guards against re-firing on every tick.
 */
export function useReminders(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (typeof Notification === 'undefined') return;

    const fired = new Set<string>();

    const check = () => {
      if (Notification.permission !== 'granted') return;
      const data = useDataStore.getState().data;
      if (!data || !data.settings.notifications.enabled) return;

      for (const r of computeDueReminders(data, new Date())) {
        if (fired.has(r.key)) continue;
        fired.add(r.key);
        try {
          new Notification(r.title, { body: r.body, tag: r.key });
        } catch {
          // Some browsers throw if the tab isn't allowed to notify; ignore.
        }
      }

      // Keep the guard from growing without bound over a long-open tab.
      if (fired.size > 500) fired.clear();
    };

    check();
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, [active]);
}
