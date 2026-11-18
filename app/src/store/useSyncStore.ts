import { create } from 'zustand';
import type { AppData } from '@/types';
import { createDefaultData } from '@/data/defaults';
import * as gist from '@/services/gistSync';
import { useFeedbackStore } from './useFeedbackStore';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface DataBridge {
  getData: () => AppData | null;
  applyRemoteData: (data: AppData) => Promise<void>;
}

let bridge: DataBridge | null = null;
let autoPushTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;

const AUTO_PUSH_DELAY_MS = 4000;

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
  scheduleAutoPush: () => void;
  flushPendingPush: () => void;
}

function parseTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export const useSyncStore = create<SyncState>((set, get) => {
  const persistConfig = (next: gist.GistSyncConfig | null) => {
    gist.saveGistConfig(next);
    set({ config: next });
  };

  return {
    config: gist.getGistConfig(),
    status: gist.getGistConfig() ? 'idle' : 'idle',
    error: null,
    hasPendingPush: false,

    connect: async (rawToken, rawGistId) => {
      const token = rawToken.trim();
      const explicitId = rawGistId?.trim() ?? '';
      if (!token) return { ok: false, error: 'Please paste a GitHub Personal Access Token.' };

      set({ status: 'syncing', error: null });
      const localData = bridge?.getData() ?? createDefaultData();

      // 1. If user gave a specific Gist ID, pull & verify it.
      if (explicitId) {
        const pulled = await gist.pullFromGist({ token, gistId: explicitId });
        if (!pulled.ok) {
          set({ status: 'error', error: pulled.error });
          return { ok: false, error: pulled.error };
        }
        const cfg: gist.GistSyncConfig = {
          token,
          gistId: explicitId,
          autoSync: true,
          lastSyncedAt: new Date().toISOString(),
          htmlUrl: pulled.htmlUrl,
        };
        persistConfig(cfg);

        const localMs = parseTime(localData.lastUpdated);
        const remoteMs = parseTime(pulled.data.lastUpdated);
        if (remoteMs > localMs || !localData.profile.onboarded) {
          await bridge?.applyRemoteData(pulled.data);
          set({ status: 'synced', error: null });
          useFeedbackStore.getState().toast({
            kind: 'success',
            title: 'Connected & restored from Gist',
            message: 'Loaded your cloud data into this browser.',
          });
        } else {
          await gist.pushToGist(cfg, localData);
          set({ status: 'synced', error: null });
          useFeedbackStore.getState().toast({
            kind: 'success',
            title: 'Connected to GitHub Gist',
            message: 'Your data will now auto-sync automatically.',
          });
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
        const cfg: gist.GistSyncConfig = {
          token,
          gistId: found.gist.id,
          autoSync: true,
          lastSyncedAt: new Date().toISOString(),
          htmlUrl: pulled.htmlUrl,
        };
        persistConfig(cfg);

        const localMs = parseTime(localData.lastUpdated);
        const remoteMs = parseTime(pulled.data.lastUpdated);
        if ((remoteMs > localMs && pulled.data.profile.onboarded) || !localData.profile.onboarded) {
          await bridge?.applyRemoteData(pulled.data);
          set({ status: 'synced', error: null });
          useFeedbackStore.getState().toast({
            kind: 'success',
            title: 'Found existing cloud backup',
            message: 'Restored your data from your secret GitHub Gist.',
          });
        } else {
          await gist.pushToGist(cfg, localData);
          set({ status: 'synced', error: null });
          useFeedbackStore.getState().toast({
            kind: 'success',
            title: 'Connected to existing Gist',
            message: 'Updated cloud backup with your newer local changes.',
          });
        }
        return { ok: true };
      }

      // 3. First time: create a brand-new secret Gist with local data.
      const created = await gist.createSyncGist(token, localData);
      if (!created.ok) {
        set({ status: 'error', error: created.error });
        return { ok: false, error: created.error };
      }
      const cfg: gist.GistSyncConfig = {
        token,
        gistId: created.gistId,
        autoSync: true,
        lastSyncedAt: new Date().toISOString(),
        htmlUrl: created.htmlUrl,
      };
      persistConfig(cfg);
      set({ status: 'synced', error: null });
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
      if (inFlight) return inFlight;

      const run = async () => {
        if (autoPushTimer) {
          clearTimeout(autoPushTimer);
          autoPushTimer = null;
        }
        set({ status: 'syncing', error: null, hasPendingPush: false });
        const localData = bridge?.getData();
        if (!localData) {
          set({ status: 'idle' });
          return;
        }

        if (mode === 'push') {
          const pushed = await gist.pushToGist(cfg, localData);
          if (!pushed.ok) {
            set({ status: 'error', error: pushed.error });
            if (!silent) {
              useFeedbackStore.getState().toast({ kind: 'error', title: 'Cloud sync failed', message: pushed.error });
            }
            return;
          }
          persistConfig({ ...cfg, lastSyncedAt: new Date().toISOString(), htmlUrl: pushed.htmlUrl });
          set({ status: 'synced', error: null });
          if (!silent) {
            useFeedbackStore.getState().toast({ kind: 'success', title: 'Synced to GitHub Gist' });
          }
          return;
        }

        const pulled = await gist.pullFromGist(cfg);
        if (!pulled.ok) {
          set({ status: 'error', error: pulled.error });
          if (!silent) {
            useFeedbackStore.getState().toast({ kind: 'error', title: 'Cloud sync failed', message: pulled.error });
          }
          return;
        }

        const localMs = parseTime(localData.lastUpdated);
        const remoteMs = parseTime(pulled.data.lastUpdated);

        if (mode === 'pull' || (remoteMs > localMs + 1000 && pulled.data.profile.onboarded) || (!localData.profile.onboarded && pulled.data.profile.onboarded)) {
          await bridge?.applyRemoteData(pulled.data);
          persistConfig({ ...cfg, lastSyncedAt: new Date().toISOString(), htmlUrl: pulled.htmlUrl });
          set({ status: 'synced', error: null });
          useFeedbackStore.getState().toast({
            kind: 'info',
            title: 'Synced from cloud',
            message: 'Loaded newer study data from your GitHub Gist.',
          });
        } else if (localMs > remoteMs + 1000 && localData.profile.onboarded) {
          const pushed = await gist.pushToGist(cfg, localData);
          if (!pushed.ok) {
            set({ status: 'error', error: pushed.error });
            return;
          }
          persistConfig({ ...cfg, lastSyncedAt: new Date().toISOString(), htmlUrl: pushed.htmlUrl });
          set({ status: 'synced', error: null });
          if (!silent) {
            useFeedbackStore.getState().toast({ kind: 'success', title: 'Pushed local changes to Gist' });
          }
        } else {
          persistConfig({ ...cfg, lastSyncedAt: new Date().toISOString(), htmlUrl: pulled.htmlUrl });
          set({ status: 'synced', error: null });
          if (!silent) {
            useFeedbackStore.getState().toast({ kind: 'success', title: 'Already up to date' });
          }
        }
      };

      inFlight = run().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },

    scheduleAutoPush: () => {
      const cfg = get().config;
      if (!cfg || !cfg.autoSync) return;
      if (autoPushTimer) clearTimeout(autoPushTimer);
      set({ hasPendingPush: true });
      autoPushTimer = setTimeout(() => {
        autoPushTimer = null;
        void get().syncNow('push', true);
      }, AUTO_PUSH_DELAY_MS);
    },

    flushPendingPush: () => {
      const { config, hasPendingPush } = get();
      if (!config || !config.autoSync || !hasPendingPush) return;
      void get().syncNow('push', true);
    },
  };
});

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      useSyncStore.getState().flushPendingPush();
    }
  });
}
