import { create } from 'zustand';
import type { AppData, ISODate } from '@/types';
import { createDefaultData } from '@/data/defaults';
import { runRollup, type RollupResult } from '@/services/rollup';
import { todayISO } from '@/utils/date';
import * as fs from '@/services/fileStorage';
import { useFeedbackStore } from './useFeedbackStore';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'disconnected' | 'error';

export type BootPhase = 'booting' | 'welcome' | 'ready';

interface DataState {
  data: AppData | null;
  bootPhase: BootPhase;
  storageMode: fs.StorageMode | null;
  fileName: string | null;
  saveState: SaveState;
  lastSavedAt: string | null;
  saveError: string | null;
  corruptedMessage: string | null;
  /** the date the UI is centred on; changes at midnight or via the date picker */
  activeDate: ISODate;

  boot: () => Promise<void>;
  setActiveDate: (date: ISODate) => void;

  /**
   * The single write path. `fn` mutates a draft; the rollup then recomputes
   * XP, streaks, achievements and the day's score, and an autosave is queued.
   */
  mutate: (fn: (draft: AppData) => void, opts?: MutateOpts) => void;

  saveNow: () => Promise<void>;
  connectNewFile: () => Promise<void>;
  openExistingFile: () => Promise<void>;
  saveAs: () => Promise<void>;
  reconnectFile: () => Promise<void>;
  importData: () => Promise<void>;
  exportBackup: () => void;
  resetAllData: () => Promise<void>;
  useLocalOnly: () => Promise<void>;
}

export interface MutateOpts {
  /** date the rollup should recompute; defaults to the active date */
  date?: ISODate;
  /** skip the rollup for pure UI/settings edits that can't change metrics */
  skipRollup?: boolean;
  /** suppress XP/level/achievement toasts (e.g. bulk imports) */
  silent?: boolean;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
/** Serialises writes so a slow save can't be overtaken by a newer one. */
let savingChain: Promise<void> = Promise.resolve();
let pendingSave = false;

export const useDataStore = create<DataState>((set, get) => {
  const scheduleSave = () => {
    const { data } = get();
    if (!data) return;
    if (saveTimer) clearTimeout(saveTimer);
    const delay = data.settings.autosaveDebounceMs;
    saveTimer = setTimeout(() => void get().saveNow(), delay);
  };

  const announce = (result: RollupResult, silent: boolean) => {
    if (silent) return;
    const fb = useFeedbackStore.getState();
    if (result.xpGained > 0) fb.floatXP(result.xpGained, 'XP');
    if (result.unlocked.length > 0) fb.queueAchievements(result.unlocked);
    if (result.leveledUpTo !== null) fb.showLevelUp(result.leveledUpTo);
  };

  return {
    data: null,
    bootPhase: 'booting',
    storageMode: null,
    fileName: null,
    saveState: 'idle',
    lastSavedAt: null,
    saveError: null,
    corruptedMessage: null,
    activeDate: todayISO(),

    boot: async () => {
      // 1. Try the remembered file handle (silent if permission still granted).
      const handle = await fs.loadStoredHandle();
      if (handle) {
        const perm = await fs.checkPermission('readwrite');
        if (perm === 'granted') {
          const result = await fs.loadFromHandle();
          if (result.status === 'ok' && result.data) {
            set({
              data: result.data,
              storageMode: 'file',
              fileName: result.fileName ?? null,
              bootPhase: result.data.profile.onboarded ? 'ready' : 'welcome',
              saveState: 'saved',
              lastSavedAt: result.data.lastUpdated,
            });
            if (result.warnings?.length) {
              useFeedbackStore.getState().toast({
                kind: 'warning',
                title: 'Data file repaired',
                message: result.warnings.join(' '),
                duration: 7000,
              });
            }
            return;
          }
          if (result.status === 'corrupted') {
            set({ corruptedMessage: result.message ?? 'Data file is corrupted.' });
          }
        } else {
          // Handle exists but needs a click to regain access.
          const mirror = await fs.loadLocalMirror();
          set({
            data: mirror?.status === 'ok' ? (mirror.data ?? null) : null,
            storageMode: 'file',
            fileName: handle.name,
            saveState: 'disconnected',
            bootPhase: mirror?.data?.profile.onboarded ? 'ready' : 'welcome',
          });
          return;
        }
      }

      // 2. Fall back to the IndexedDB mirror.
      const mirror = await fs.loadLocalMirror();
      if (mirror?.status === 'ok' && mirror.data) {
        set({
          data: mirror.data,
          storageMode: 'local',
          fileName: null,
          bootPhase: mirror.data.profile.onboarded ? 'ready' : 'welcome',
          saveState: 'saved',
          lastSavedAt: mirror.data.lastUpdated,
        });
        return;
      }

      // 3. Genuine first run.
      set({ data: createDefaultData(), storageMode: null, bootPhase: 'welcome', saveState: 'idle' });
    },

    setActiveDate: (date) => set({ activeDate: date }),

    mutate: (fn, opts = {}) => {
      const current = get().data;
      if (!current) return;
      const draft = structuredClone(current);
      fn(draft);

      let result: RollupResult | null = null;
      if (!opts.skipRollup) {
        result = runRollup(draft, opts.date ?? todayISO());
      } else {
        draft.lastUpdated = new Date().toISOString();
      }

      set({ data: draft, saveState: 'dirty' });
      if (result) announce(result, opts.silent ?? false);
      scheduleSave();
    },

    saveNow: async () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      if (pendingSave) return savingChain;
      pendingSave = true;

      savingChain = savingChain.then(async () => {
        pendingSave = false;
        const { data, storageMode } = get();
        if (!data) return;
        set({ saveState: 'saving' });

        if (storageMode === 'file' && fs.getHandle()) {
          const res = await fs.saveFile(data);
          if (res.status === 'saved') {
            set({ saveState: 'saved', lastSavedAt: new Date().toISOString(), saveError: null });
          } else if (res.status === 'denied' || res.status === 'no-file') {
            set({ saveState: 'disconnected', saveError: res.message ?? null });
          } else {
            set({ saveState: 'error', saveError: res.message ?? 'Could not write the data file.' });
            useFeedbackStore.getState().toast({
              kind: 'error',
              title: 'Save failed',
              message: `${res.message ?? 'Unknown error'} — your data is still safe in this browser.`,
              duration: 8000,
            });
          }
          return;
        }

        await fs.saveLocalMirror(data);
        set({ saveState: 'saved', lastSavedAt: new Date().toISOString(), saveError: null });
      });

      return savingChain;
    },

    connectNewFile: async () => {
      const data = get().data ?? createDefaultData();
      const res = await fs.createFile(data);
      if (res.status === 'ok') {
        set({
          data,
          storageMode: 'file',
          fileName: res.fileName ?? fs.DEFAULT_FILENAME,
          saveState: 'saved',
          lastSavedAt: new Date().toISOString(),
          saveError: null,
        });
        await fs.saveLocalMirror(data);
        useFeedbackStore.getState().toast({
          kind: 'success',
          title: 'Data file created',
          message: `Everything now autosaves to ${res.fileName ?? fs.DEFAULT_FILENAME}.`,
        });
      } else if (res.status === 'unsupported') {
        useFeedbackStore.getState().toast({
          kind: 'warning',
          title: 'Not supported in this browser',
          message: 'Use Chrome or Edge for direct file saving. Your data stays in this browser meanwhile.',
          duration: 7000,
        });
      } else if (res.status === 'error') {
        useFeedbackStore.getState().toast({ kind: 'error', title: 'Could not create file', message: res.message });
      }
    },

    openExistingFile: async () => {
      const res = await fs.openFile();
      if (res.status === 'ok' && res.data) {
        set({
          data: res.data,
          storageMode: 'file',
          fileName: res.fileName ?? null,
          saveState: 'saved',
          lastSavedAt: res.data.lastUpdated,
          corruptedMessage: null,
          bootPhase: res.data.profile.onboarded ? 'ready' : 'welcome',
        });
        await fs.saveLocalMirror(res.data);
        useFeedbackStore.getState().toast({
          kind: 'success',
          title: 'Data loaded',
          message: res.warnings?.length ? res.warnings.join(' ') : `Opened ${res.fileName ?? 'your file'}.`,
        });
      } else if (res.status === 'corrupted') {
        set({ corruptedMessage: res.message ?? 'That file could not be read.' });
      } else if (res.status === 'error') {
        useFeedbackStore.getState().toast({ kind: 'error', title: 'Could not open file', message: res.message });
      }
    },

    saveAs: async () => {
      const { data } = get();
      if (!data) return;
      const res = await fs.saveAs(data);
      if (res.status === 'ok') {
        set({
          storageMode: 'file',
          fileName: res.fileName ?? null,
          saveState: 'saved',
          lastSavedAt: new Date().toISOString(),
        });
        useFeedbackStore.getState().toast({ kind: 'success', title: 'Saved', message: `Now saving to ${res.fileName}.` });
      }
    },

    reconnectFile: async () => {
      const perm = await fs.requestPermission('readwrite');
      if (perm !== 'granted') {
        useFeedbackStore.getState().toast({
          kind: 'warning',
          title: 'Still disconnected',
          message: 'Permission was not granted. Data is being kept in this browser.',
        });
        return;
      }
      // The file on disk may be newer than the mirror (edited elsewhere), so
      // prefer whichever has the later lastUpdated stamp.
      const onDisk = await fs.loadFromHandle();
      const current = get().data;
      if (onDisk.status === 'ok' && onDisk.data) {
        const diskNewer = !current || onDisk.data.lastUpdated > current.lastUpdated;
        if (diskNewer) {
          set({ data: onDisk.data, bootPhase: onDisk.data.profile.onboarded ? 'ready' : 'welcome' });
        }
      }
      set({ saveState: 'dirty', saveError: null });
      await get().saveNow();
      useFeedbackStore.getState().toast({ kind: 'success', title: 'File reconnected' });
    },

    importData: async () => {
      const res = await fs.importFromDisk();
      if (res.status === 'ok' && res.data) {
        set({
          data: res.data,
          saveState: 'dirty',
          corruptedMessage: null,
          bootPhase: res.data.profile.onboarded ? 'ready' : 'welcome',
        });
        await get().saveNow();
        useFeedbackStore.getState().toast({ kind: 'success', title: 'Data imported' });
      } else if (res.status === 'corrupted') {
        set({ corruptedMessage: res.message ?? 'That file could not be read.' });
      }
    },

    exportBackup: () => {
      const { data } = get();
      if (!data) return;
      fs.downloadBackup(data);
      useFeedbackStore.getState().toast({ kind: 'success', title: 'Backup downloaded' });
    },

    resetAllData: async () => {
      const fresh = createDefaultData();
      set({ data: fresh, saveState: 'dirty', bootPhase: 'welcome' });
      await get().saveNow();
    },

    useLocalOnly: async () => {
      const data = get().data ?? createDefaultData();
      await fs.forgetHandle();
      set({ data, storageMode: 'local', fileName: null, saveState: 'dirty' });
      await get().saveNow();
    },
  };
});

/** Flush pending writes when the tab goes away. */
if (typeof window !== 'undefined') {
  const flush = () => {
    const { saveState, saveNow } = useDataStore.getState();
    if (saveState === 'dirty' || saveState === 'saving') void saveNow();
  };
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', (e) => {
    const { saveState } = useDataStore.getState();
    if (saveState === 'dirty' || saveState === 'saving') {
      flush();
      e.preventDefault();
    }
  });
}
