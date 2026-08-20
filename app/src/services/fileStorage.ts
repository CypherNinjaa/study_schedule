/**
 * File System Access API wrapper with an IndexedDB fallback.
 *
 * Primary path: a real JSON file on disk (Documents/Study Productivity/…),
 * with the FileSystemFileHandle persisted in IndexedDB so the same file
 * reconnects on the next visit with a single permission click.
 *
 * Fallback path: the whole document is mirrored into IndexedDB, so data is
 * never lost even in browsers without the File System Access API.
 */

import { get, set, del } from 'idb-keyval';
import type { AppData } from '@/types';
import { parseJSON, serialize, validateAndMigrate, type ValidationResult } from './schema';

const HANDLE_KEY = 'pos:file-handle';
const MIRROR_KEY = 'pos:data-mirror';
const CORRUPT_BACKUP_KEY = 'pos:corrupt-backup';

export const DEFAULT_FILENAME = 'productivity-data.json';

export type StorageMode = 'file' | 'local';

export type PermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

/* ---------------------------------------------------------------- */
/* Minimal structural types (TS DOM lib coverage varies by version)  */
/* ---------------------------------------------------------------- */

interface FSWritable {
  write: (data: string | BufferSource | Blob) => Promise<void>;
  close: () => Promise<void>;
}
interface FSFileHandle {
  name: string;
  kind: 'file';
  getFile: () => Promise<File>;
  createWritable: (opts?: { keepExistingData?: boolean }) => Promise<FSWritable>;
  queryPermission?: (d: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (d: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
}
interface PickerOpts {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  id?: string;
  startIn?: string;
}
type WindowWithFS = Window & {
  showSaveFilePicker?: (o?: PickerOpts) => Promise<FSFileHandle>;
  showOpenFilePicker?: (o?: PickerOpts) => Promise<FSFileHandle[]>;
};

const JSON_TYPES = [
  { description: 'Productivity data (JSON)', accept: { 'application/json': ['.json'] as string[] } },
];

/* ---------------------------------------------------------------- */
/* Handle management                                                 */
/* ---------------------------------------------------------------- */

let handle: FSFileHandle | null = null;

export function getHandle(): FSFileHandle | null {
  return handle;
}

export function getFileName(): string | null {
  return handle?.name ?? null;
}

export async function loadStoredHandle(): Promise<FSFileHandle | null> {
  try {
    const stored = await get<FSFileHandle>(HANDLE_KEY);
    if (stored && typeof stored.getFile === 'function') {
      handle = stored;
      return stored;
    }
  } catch {
    /* IndexedDB unavailable (private mode) — fall through to local mode */
  }
  return null;
}

async function rememberHandle(h: FSFileHandle): Promise<void> {
  handle = h;
  try {
    await set(HANDLE_KEY, h);
  } catch {
    /* not fatal: the file still works for this session */
  }
}

export async function forgetHandle(): Promise<void> {
  handle = null;
  try {
    await del(HANDLE_KEY);
  } catch {
    /* ignore */
  }
}

/** Checks permission without prompting. Returns 'prompt' when a click is needed. */
export async function checkPermission(mode: 'read' | 'readwrite' = 'readwrite'): Promise<PermissionState> {
  if (!handle) return 'unsupported';
  if (!handle.queryPermission) return 'granted';
  try {
    return await handle.queryPermission({ mode });
  } catch {
    return 'denied';
  }
}

/** Must be called from a user gesture. */
export async function requestPermission(mode: 'read' | 'readwrite' = 'readwrite'): Promise<PermissionState> {
  if (!handle) return 'unsupported';
  if (!handle.requestPermission) return 'granted';
  try {
    return await handle.requestPermission({ mode });
  } catch {
    return 'denied';
  }
}

/* ---------------------------------------------------------------- */
/* Create / open / save                                              */
/* ---------------------------------------------------------------- */

export interface OpenResult {
  status: 'ok' | 'cancelled' | 'corrupted' | 'error' | 'unsupported';
  data?: AppData;
  fileName?: string;
  message?: string;
  warnings?: string[];
  /** raw text preserved when the file could not be parsed */
  rawBackup?: string;
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && (e.name === 'AbortError' || e.name === 'NotAllowedError');
}

export async function createFile(initial: AppData, suggestedName = DEFAULT_FILENAME): Promise<OpenResult> {
  const w = window as WindowWithFS;
  if (!w.showSaveFilePicker) return { status: 'unsupported' };
  try {
    const h = await w.showSaveFilePicker({
      suggestedName,
      types: JSON_TYPES,
      id: 'productivity-os',
      startIn: 'documents',
    });
    await rememberHandle(h);
    await writeHandle(h, serialize(initial));
    return { status: 'ok', data: initial, fileName: h.name };
  } catch (e) {
    if (isAbort(e)) return { status: 'cancelled' };
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

export async function openFile(): Promise<OpenResult> {
  const w = window as WindowWithFS;
  if (!w.showOpenFilePicker) return { status: 'unsupported' };
  try {
    const [h] = await w.showOpenFilePicker({
      types: JSON_TYPES,
      multiple: false,
      id: 'productivity-os',
      startIn: 'documents',
    });
    if (!h) return { status: 'cancelled' };
    const file = await h.getFile();
    const text = await file.text();
    const result = readText(text);
    if (result.status === 'ok') {
      await rememberHandle(h);
      return { ...result, fileName: h.name };
    }
    // Never adopt a corrupted file as the active handle — that would risk
    // overwriting it on the next autosave.
    return result;
  } catch (e) {
    if (isAbort(e)) return { status: 'cancelled' };
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

/** Reads the currently connected file (used on reconnect / startup). */
export async function loadFromHandle(): Promise<OpenResult> {
  if (!handle) return { status: 'error', message: 'No file connected.' };
  try {
    const file = await handle.getFile();
    const text = await file.text();
    // A brand-new empty file is not corruption.
    if (text.trim() === '') return { status: 'error', message: 'File is empty.' };
    const result = readText(text);
    return { ...result, fileName: handle.name };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

export function readText(text: string): OpenResult {
  const parsed = parseJSON(text);
  if (!parsed.ok) {
    void stashCorruptBackup(text);
    return {
      status: 'corrupted',
      message: `Your data file appears to be corrupted (${parsed.error}). A backup of the original text has been kept.`,
      rawBackup: text,
    };
  }
  const validation: ValidationResult = validateAndMigrate(parsed.value);
  if (!validation.ok || !validation.data) {
    void stashCorruptBackup(text);
    return {
      status: 'corrupted',
      message: validation.errors[0] ?? 'File could not be read.',
      rawBackup: text,
    };
  }
  return { status: 'ok', data: validation.data, warnings: validation.warnings };
}

async function stashCorruptBackup(text: string): Promise<void> {
  try {
    await set(CORRUPT_BACKUP_KEY, { at: new Date().toISOString(), text });
  } catch {
    /* ignore */
  }
}

export async function getCorruptBackup(): Promise<{ at: string; text: string } | null> {
  try {
    return (await get(CORRUPT_BACKUP_KEY)) ?? null;
  } catch {
    return null;
  }
}

async function writeHandle(h: FSFileHandle, text: string): Promise<void> {
  const writable = await h.createWritable();
  try {
    await writable.write(text);
  } finally {
    await writable.close();
  }
}

export type SaveStatus = 'saved' | 'no-file' | 'denied' | 'error';

export interface SaveResult {
  status: SaveStatus;
  message?: string;
}

/** Writes to the connected file. Falls back to the IndexedDB mirror only. */
export async function saveFile(data: AppData): Promise<SaveResult> {
  if (!handle) {
    await saveLocalMirror(data);
    return { status: 'no-file' };
  }
  const perm = await checkPermission('readwrite');
  if (perm !== 'granted') {
    await saveLocalMirror(data);
    return { status: 'denied', message: 'Permission to write the data file was not granted.' };
  }
  try {
    await writeHandle(handle, serialize(data));
    await saveLocalMirror(data); // mirror doubles as a crash-safety net
    return { status: 'saved' };
  } catch (e) {
    await saveLocalMirror(data);
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

export async function saveAs(data: AppData, suggestedName = DEFAULT_FILENAME): Promise<OpenResult> {
  return createFile(data, suggestedName);
}

/* ---------------------------------------------------------------- */
/* IndexedDB mirror (fallback + safety net)                          */
/* ---------------------------------------------------------------- */

export async function saveLocalMirror(data: AppData): Promise<void> {
  try {
    await set(MIRROR_KEY, serialize(data));
  } catch {
    try {
      localStorage.setItem(MIRROR_KEY, serialize(data));
    } catch {
      /* out of quota — the user still has export */
    }
  }
}

export async function loadLocalMirror(): Promise<OpenResult | null> {
  let text: string | null = null;
  try {
    text = (await get<string>(MIRROR_KEY)) ?? null;
  } catch {
    /* ignore */
  }
  if (!text) {
    try {
      text = localStorage.getItem(MIRROR_KEY);
    } catch {
      /* ignore */
    }
  }
  if (!text) return null;
  return readText(text);
}

export async function clearLocalMirror(): Promise<void> {
  try {
    await del(MIRROR_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(MIRROR_KEY);
  } catch {
    /* ignore */
  }
}

/* ---------------------------------------------------------------- */
/* Import / export                                                   */
/* ---------------------------------------------------------------- */

export function downloadBackup(data: AppData, filename?: string): void {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const name = filename ?? `productivity-backup-${stamp}.json`;
  const blob = new Blob([serialize(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Import via <input type=file>, works in every browser. */
export function importFromDisk(): Promise<OpenResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    let settled = false;
    const finish = (r: OpenResult) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return finish({ status: 'cancelled' });
      try {
        finish({ ...readText(await file.text()), fileName: file.name });
      } catch (e) {
        finish({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    };
    // `cancel` is not universally supported; window focus is the fallback.
    input.oncancel = () => finish({ status: 'cancelled' });
    window.addEventListener(
      'focus',
      () => setTimeout(() => finish({ status: 'cancelled' }), 500),
      { once: true },
    );
    input.click();
  });
}

/* ---------------------------------------------------------------- */
/* Study Materials File Handles                                     */
/* ---------------------------------------------------------------- */

const MATERIAL_HANDLE_PREFIX = 'pos:material-handle:';

export async function saveMaterialHandle(id: string, h: FSFileHandle): Promise<void> {
  try {
    await set(`${MATERIAL_HANDLE_PREFIX}${id}`, h);
  } catch {
    /* ignore */
  }
}

export async function getMaterialHandle(id: string): Promise<FSFileHandle | null> {
  try {
    const h = await get<FSFileHandle>(`${MATERIAL_HANDLE_PREFIX}${id}`);
    if (h && typeof h.getFile === 'function') return h;
  } catch {
    /* ignore */
  }
  return null;
}

export async function deleteMaterialHandle(id: string): Promise<void> {
  try {
    await del(`${MATERIAL_HANDLE_PREFIX}${id}`);
  } catch {
    /* ignore */
  }
}

export async function pickMaterialFile(): Promise<{ handle: FSFileHandle; file: File } | null> {
  const win = window as unknown as WindowWithFS;
  if (!win.showOpenFilePicker) return null;
  try {
    const [h] = await win.showOpenFilePicker({
      multiple: false,
    });
    if (!h) return null;
    const file = await h.getFile();
    return { handle: h, file };
  } catch {
    return null;
  }
}

export async function openMaterialFileHandle(h: FSFileHandle): Promise<boolean> {
  try {
    if (h.queryPermission && h.requestPermission) {
      let state = await h.queryPermission({ mode: 'read' });
      if (state !== 'granted') {
        state = await h.requestPermission({ mode: 'read' });
      }
      if (state !== 'granted') return false;
    }
    const file = await h.getFile();
    const url = URL.createObjectURL(file);
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  } catch {
    return false;
  }
}
