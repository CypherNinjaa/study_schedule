import { create } from 'zustand';
import type { AppData } from '@/types';
import { createDefaultData } from '@/data/defaults';
import { parseJSON, validateAndMigrate } from '@/services/schema';
import { mergeAppData } from '@/services/syncMerge';
import * as gist from '@/services/gistSync';
import { useFeedbackStore } from './useFeedbackStore';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

interface DataBridge {
  getData: () => AppData | null;
  applyRemoteData: (data: AppData) => Promise<void>;
}

let bridge: DataBridge | null = null;
let autoPushTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;
let lastAutoCheckAt = 0;

const AUTO_PUSH_DELAY_MS = 4000;
const REALTIME_POLL_MS = 20000;
const FOCUS_THROTTLE_MS = 3000;

export function registerSyncDataBridge(b: DataBridge): void {
  bridge = b;
}

interface SyncState {
  config: gist.GistSyncConfig | null;
  status: SyncStatus;
  error: string | null;
  hasPendingPush: boolean;

  connect: (token: string, gistId?: string) => Promise<{ ok: boolean; error?: string }>;
  disconnect: () => void;
  setAutoSync: (enabled: boolean) => void;
  syncNow: (mode?: 'auto' | 'push' | 'pull', silent?: boolean) => Promise<void>;
  uploadJsonFileToGist: (file: File) => Promise<{ ok: boolean; error?: string }>;
  scheduleAutoPush: () => void;
  flushPendingPush: () => void;
}

function parseTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function isNavigatorOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

export const useSyncStore = create<SyncState>((set, get) => {
  const persistConfig = (next: gist.GistSyncConfig | null) => {
    gist.saveGistConfig(next);
    set({ config: next, hasPendingPush: Boolean(next?.pendingPush) });
  };

  const initialCfg = gist.getGistConfig();

  return {
    config: initialCfg,
    status: !initialCfg ? 'idle' : !isNavigatorOnline() ? 'offline' : 'idle',
    error: null,
    hasPendingPush: Boolean(initialCfg?.pendingPush),

    connect: async (rawToken, rawGistId) => {
      const token = rawToken.trim();
      const explicitId = rawGistId?.trim() ?? '';
      if (!token) return { ok: false, error: 'Please paste a GitHub Personal Access Token.' };
      if (!isNavigatorOnline()) {
        return { ok: false, error: 'You are offline. Reconnect to the internet to link GitHub Gist.' };
      }

      set({ status: 'syncing', error: null });
      const localData = bridge?.getData() ?? createDefaultData();

      const finishConnectWithRemote = async (
        gistId: string,
        pulled: { data: AppData; htmlUrl: string; etag: string | null },
        foundLabel: string,
      ) => {
        const localMs = parseTime(localData.lastUpdated);
        const remoteMs = parseTime(pulled.data.lastUpdated);
        let finalData = pulled.data;
        let finalEtag = pulled.etag;

        if (!localData.profile.onboarded && pulled.data.profile.onboarded) {
          await bridge?.applyRemoteData(pulled.data);
          useFeedbackStore.getState().toast({
            kind: 'success',
            title: foundLabel,
            message: 'Loaded your cloud data into this browser.',
          });
        } else if (localData.profile.onboarded && pulled.data.profile.onboarded && Math.abs(localMs - remoteMs) > 1000) {
          // Merge both onboarded workspaces so neither device loses items.
          finalData = mergeAppData(localData, pulled.data);
          await bridge?.applyRemoteData(finalData);
          const pushed = await gist.pushToGist({ token, gistId }, finalData);
          if (pushed.ok) finalEtag = pushed.etag;
          useFeedbackStore.getState().toast({
            kind: 'success',
            title: 'Merged local & cloud data',
            message: 'Combined items from both devices safely.',
          });
        } else if (remoteMs > localMs) {
          await bridge?.applyRemoteData(pulled.data);
          useFeedbackStore.getState().toast({
            kind: 'success',
            title: foundLabel,
            message: 'Loaded your cloud data into this browser.',
          });
        } else {
          finalData = localData;
          const pushed = await gist.pushToGist({ token, gistId }, localData);
          if (pushed.ok) finalEtag = pushed.etag;
          useFeedbackStore.getState().toast({
            kind: 'success',
            title: 'Connected to GitHub Gist',
            message: 'Your data will now auto-sync automatically.',
          });
        }

        persistConfig({
          token,
          gistId,
          autoSync: true,
          lastSyncedAt: new Date().toISOString(),
          lastRemoteUpdatedAt: finalData.lastUpdated,
          pendingPush: false,
          etag: finalEtag,
          htmlUrl: pulled.htmlUrl,
        });
        set({ status: 'synced', error: null, hasPendingPush: false });
      };

      // 1. If user gave a specific Gist ID, pull & verify it.
      if (explicitId) {
        const pulled = await gist.pullFromGist({ token, gistId: explicitId });
        if (!pulled.ok) {
          set({ status: 'error', error: pulled.error });
          return { ok: false, error: pulled.error };
        }
        if (!pulled.notModified) {
          await finishConnectWithRemote(explicitId, pulled, 'Connected & restored from Gist');
        }
        return { ok: true };
      }

      // 2. Otherwise look for an existing Study Schedule Sync Gist on this account.
      const found = await gist.findExistingSyncGist(token);
      if (!found.ok) {
        set({ status: 'error', error: found.error });
        return { ok: false, error: found.error };
      }

      if (found.gist) {
        const pulled = await gist.pullFromGist({ token, gistId: found.gist.id });
        if (!pulled.ok) {
          set({ status: 'error', error: pulled.error });
          return { ok: false, error: pulled.error };
        }
        if (!pulled.notModified) {
          await finishConnectWithRemote(found.gist.id, pulled, 'Found existing cloud backup');
        }
        return { ok: true };
      }

      // 3. First time: create a brand-new secret Gist with local data.
      const created = await gist.createSyncGist(token, localData);
      if (!created.ok) {
        set({ status: 'error', error: created.error });
        return { ok: false, error: created.error };
      }
      persistConfig({
        token,
        gistId: created.gistId,
        autoSync: true,
        lastSyncedAt: new Date().toISOString(),
        lastRemoteUpdatedAt: localData.lastUpdated,
        pendingPush: false,
        etag: null,
        htmlUrl: created.htmlUrl,
      });
      set({ status: 'synced', error: null, hasPendingPush: false });
      useFeedbackStore.getState().toast({
        kind: 'success',
        title: 'Secret GitHub Gist created',
        message: 'Automatic cloud sync is now active.',
      });
      return { ok: true };
    },

    disconnect: () => {
      if (autoPushTimer) {
        clearTimeout(autoPushTimer);
        autoPushTimer = null;
      }
      persistConfig(null);
      set({ status: 'idle', error: null, hasPendingPush: false });
      useFeedbackStore.getState().toast({
        kind: 'info',
        title: 'Cloud sync disconnected',
        message: 'Your local data and GitHub Gist remain untouched.',
      });
    },

    setAutoSync: (enabled) => {
      const cfg = get().config;
      if (!cfg) return;
      persistConfig({ ...cfg, autoSync: enabled });
    },

    syncNow: async (mode = 'auto', silent = false) => {
      const cfg = get().config;
      if (!cfg) return;

      if (!isNavigatorOnline()) {
        set({ status: 'offline', error: null });
        if (!silent) {
          useFeedbackStore.getState().toast({
            kind: 'info',
            title: 'You are offline',
            message: 'Changes are saved locally and will sync automatically when you reconnect.',
          });
        }
        return;
      }

      if (inFlight) return inFlight;

      const run = async () => {
        if (autoPushTimer) {
          clearTimeout(autoPushTimer);
          autoPushTimer = null;
        }
        lastAutoCheckAt = Date.now();
        set({ status: 'syncing', error: null });

        const localData = bridge?.getData();
        if (!localData) {
          set({ status: 'idle' });
          return;
        }

        const pushLocal = async (dataToPush: AppData, toastTitle?: string) => {
          const pushed = await gist.pushToGist(cfg, dataToPush);
          if (!pushed.ok) {
            if (!isNavigatorOnline()) {
              persistConfig({ ...cfg, pendingPush: true });
              set({ status: 'offline', error: null });
              return false;
            }
            persistConfig({ ...cfg, pendingPush: true });
            set({ status: 'error', error: pushed.error });
            if (!silent) {
              useFeedbackStore.getState().toast({ kind: 'error', title: 'Cloud sync failed', message: pushed.error });
            }
            return false;
          }
          persistConfig({
            ...cfg,
            lastSyncedAt: new Date().toISOString(),
            lastRemoteUpdatedAt: dataToPush.lastUpdated,
            pendingPush: false,
            etag: pushed.etag ?? cfg.etag,
            htmlUrl: pushed.htmlUrl,
          });
          set({ status: 'synced', error: null, hasPendingPush: false });
          if (!silent && toastTitle) {
            useFeedbackStore.getState().toast({ kind: 'success', title: toastTitle });
          }
          return true;
        };

        if (mode === 'push') {
          await pushLocal(localData, 'Synced to GitHub Gist');
          return;
        }

        // Use ETag for lightweight background auto-checks; bypass ETag on manual pull.
        const pulled = await gist.pullFromGist(cfg, mode === 'auto' ? cfg.etag : null);
        if (!pulled.ok) {
          if (!isNavigatorOnline()) {
            set({ status: 'offline', error: null });
            return;
          }
          set({ status: 'error', error: pulled.error });
          if (!silent) {
            useFeedbackStore.getState().toast({ kind: 'error', title: 'Cloud sync failed', message: pulled.error });
          }
          return;
        }

        if (pulled.notModified) {
          const baseMs = parseTime(cfg.lastRemoteUpdatedAt);
          const localMs = parseTime(localData.lastUpdated);
          if (cfg.pendingPush || (baseMs > 0 && localMs > baseMs + 1000)) {
            await pushLocal(localData, 'Pushed offline changes to Gist');
          } else {
            set({ status: 'synced', error: null });
            if (!silent) {
              useFeedbackStore.getState().toast({ kind: 'success', title: 'Already up to date' });
            }
          }
          return;
        }

        const localMs = parseTime(localData.lastUpdated);
        const remoteMs = parseTime(pulled.data.lastUpdated);
        const baseMs = parseTime(cfg.lastRemoteUpdatedAt);

        const remoteChanged = baseMs === 0 ? remoteMs > localMs + 1000 : remoteMs > baseMs + 1000;
        const localChanged =
          Boolean(cfg.pendingPush) || (baseMs === 0 ? localMs > remoteMs + 1000 : localMs > baseMs + 1000);

        if (mode === 'pull') {
          await bridge?.applyRemoteData(pulled.data);
          persistConfig({
            ...cfg,
            lastSyncedAt: new Date().toISOString(),
            lastRemoteUpdatedAt: pulled.data.lastUpdated,
            pendingPush: false,
            etag: pulled.etag,
            htmlUrl: pulled.htmlUrl,
          });
          set({ status: 'synced', error: null, hasPendingPush: false });
          useFeedbackStore.getState().toast({
            kind: 'info',
            title: 'Pulled from cloud',
            message: 'Loaded data from your GitHub Gist.',
          });
          return;
        }

        // Case 1: Both local and remote changed since last sync -> smart 3-way merge!
        if (remoteChanged && localChanged && localData.profile.onboarded && pulled.data.profile.onboarded) {
          const merged = mergeAppData(localData, pulled.data);
          await bridge?.applyRemoteData(merged);
          const ok = await pushLocal(merged);
          if (ok) {
            useFeedbackStore.getState().toast({
              kind: 'info',
              title: 'Merged offline & cloud edits',
              message: 'Combined changes from both devices without data loss.',
            });
          }
          return;
        }

        // Case 2: Only remote changed (or this browser hasn't onboarded yet).
        if (
          (remoteChanged && pulled.data.profile.onboarded) ||
          (!localData.profile.onboarded && pulled.data.profile.onboarded)
        ) {
          await bridge?.applyRemoteData(pulled.data);
          persistConfig({
            ...cfg,
            lastSyncedAt: new Date().toISOString(),
            lastRemoteUpdatedAt: pulled.data.lastUpdated,
            pendingPush: false,
            etag: pulled.etag,
            htmlUrl: pulled.htmlUrl,
          });
          set({ status: 'synced', error: null, hasPendingPush: false });
          useFeedbackStore.getState().toast({
            kind: 'info',
            title: 'Synced from cloud',
            message: 'Loaded newer study data from your GitHub Gist.',
          });
          return;
        }

        // Case 3: Only local changed.
        if (localChanged && localData.profile.onboarded) {
          await pushLocal(localData, 'Pushed local changes to Gist');
          return;
        }

        // Case 4: In sync.
        persistConfig({
          ...cfg,
          lastSyncedAt: new Date().toISOString(),
          lastRemoteUpdatedAt: pulled.data.lastUpdated,
          pendingPush: false,
          etag: pulled.etag,
          htmlUrl: pulled.htmlUrl,
        });
        set({ status: 'synced', error: null, hasPendingPush: false });
        if (!silent) {
          useFeedbackStore.getState().toast({ kind: 'success', title: 'Already up to date' });
        }
      };

      inFlight = run().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },

    uploadJsonFileToGist: async (file) => {
      const cfg = get().config;
      if (!cfg) return { ok: false, error: 'Connect GitHub Gist first.' };

      set({ status: 'syncing', error: null });
      try {
        const text = await file.text();
        const parsed = parseJSON(text);
        if (!parsed.ok) {
          set({ status: 'error', error: parsed.error });
          useFeedbackStore.getState().toast({ kind: 'error', title: 'Invalid JSON file', message: parsed.error });
          return { ok: false, error: parsed.error };
        }
        const validated = validateAndMigrate(parsed.value);
        if (!validated.ok || !validated.data) {
          const msg = validated.errors.join(' ') || 'File is not valid Productivity OS data.';
          set({ status: 'error', error: msg });
          useFeedbackStore.getState().toast({ kind: 'error', title: 'Invalid data file', message: msg });
          return { ok: false, error: msg };
        }

        const nextData: AppData = { ...validated.data, lastUpdated: new Date().toISOString() };
        await bridge?.applyRemoteData(nextData);

        if (!isNavigatorOnline()) {
          persistConfig({ ...cfg, pendingPush: true });
          set({ status: 'offline', error: null, hasPendingPush: true });
          useFeedbackStore.getState().toast({
            kind: 'info',
            title: 'Imported locally (offline)',
            message: 'Will upload to your GitHub Gist automatically once online.',
          });
          return { ok: true };
        }

        const pushed = await gist.pushToGist(cfg, nextData);
        if (!pushed.ok) {
          persistConfig({ ...cfg, pendingPush: true });
          set({ status: 'error', error: pushed.error });
          useFeedbackStore.getState().toast({ kind: 'error', title: 'Upload to Gist failed', message: pushed.error });
          return { ok: false, error: pushed.error };
        }

        persistConfig({
          ...cfg,
          lastSyncedAt: new Date().toISOString(),
          lastRemoteUpdatedAt: nextData.lastUpdated,
          pendingPush: false,
          etag: pushed.etag ?? cfg.etag,
          htmlUrl: pushed.htmlUrl,
        });
        set({ status: 'synced', error: null, hasPendingPush: false });
        useFeedbackStore.getState().toast({
          kind: 'success',
          title: 'JSON uploaded to GitHub Gist',
          message: `Imported ${file.name} and synced to your secret Gist.`,
        });
        return { ok: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not read JSON file.';
        set({ status: 'error', error: msg });
        useFeedbackStore.getState().toast({ kind: 'error', title: 'Upload failed', message: msg });
        return { ok: false, error: msg };
      }
    },

    scheduleAutoPush: () => {
      const cfg = get().config;
      if (!cfg || !cfg.autoSync) return;

      // Always mark pendingPush in localStorage so offline/closed-tab edits survive reloads.
      if (!cfg.pendingPush) {
        persistConfig({ ...cfg, pendingPush: true });
      } else {
        set({ hasPendingPush: true });
      }

      if (!isNavigatorOnline()) {
        set({ status: 'offline' });
        return;
      }

      if (autoPushTimer) clearTimeout(autoPushTimer);
      autoPushTimer = setTimeout(() => {
        autoPushTimer = null;
        void get().syncNow('auto', true);
      }, AUTO_PUSH_DELAY_MS);
    },

    flushPendingPush: () => {
      const { config, hasPendingPush } = get();
      if (!config || !config.autoSync || !hasPendingPush || !isNavigatorOnline()) return;
      void get().syncNow('push', true);
    },
  };
});

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const throttledAutoSync = () => {
    const { config } = useSyncStore.getState();
    if (!config || !config.autoSync || !isNavigatorOnline()) return;
    if (Date.now() - lastAutoCheckAt < FOCUS_THROTTLE_MS) return;
    void useSyncStore.getState().syncNow('auto', true);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      useSyncStore.getState().flushPendingPush();
    } else if (document.visibilityState === 'visible') {
      throttledAutoSync();
    }
  });

  window.addEventListener('focus', throttledAutoSync);

  window.addEventListener('online', () => {
    const { config } = useSyncStore.getState();
    if (config) {
      useSyncStore.setState({ status: 'idle', error: null });
      if (config.autoSync || config.pendingPush) {
        void useSyncStore.getState().syncNow('auto', true);
      }
    }
  });

  window.addEventListener('offline', () => {
    const { config } = useSyncStore.getState();
    if (config) {
      useSyncStore.setState({ status: 'offline', error: null });
    }
  });

  // Lightweight ETag-based background poll while tab is active & online.
  window.setInterval(() => {
    if (document.visibilityState !== 'visible' || !isNavigatorOnline()) return;
    const { config, status } = useSyncStore.getState();
    if (!config || !config.autoSync || status === 'syncing') return;
    void useSyncStore.getState().syncNow('auto', true);
  }, REALTIME_POLL_MS);
}
