import type { AppData } from '@/types';
import { parseJSON, serialize, validateAndMigrate } from './schema';

const CONFIG_KEY = 'pos:gist-sync';
export const GIST_FILENAME = 'productivity-data.json';
export const GIST_DESCRIPTION = 'Study Schedule Sync (productivity-data.json)';

export interface GistSyncConfig {
  token: string;
  gistId: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
  /** AppData.lastUpdated value at the last successful sync (for 3-way conflict detection) */
  lastRemoteUpdatedAt?: string | null;
  /** True when local edits happened while offline or before a push succeeded */
  pendingPush?: boolean;
  etag?: string | null;
  htmlUrl?: string;
}

interface GitHubGistFile {
  filename?: string;
  content?: string;
  truncated?: boolean;
  raw_url?: string;
}

interface GitHubGistResponse {
  id: string;
  html_url: string;
  description: string | null;
  updated_at: string;
  files: Record<string, GitHubGistFile>;
}

export function getGistConfig(): GistSyncConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GistSyncConfig>;
    if (typeof parsed.token === 'string' && parsed.token && typeof parsed.gistId === 'string' && parsed.gistId) {
      return {
        token: parsed.token,
        gistId: parsed.gistId,
        autoSync: parsed.autoSync ?? true,
        lastSyncedAt: parsed.lastSyncedAt ?? null,
        lastRemoteUpdatedAt: parsed.lastRemoteUpdatedAt ?? null,
        pendingPush: parsed.pendingPush ?? false,
        etag: parsed.etag ?? null,
        htmlUrl: parsed.htmlUrl,
      };
    }
  } catch {
    /* ignore malformed config */
  }
  return null;
}

export function saveGistConfig(config: GistSyncConfig | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!config) {
      window.localStorage.removeItem(CONFIG_KEY);
    } else {
      window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }
  } catch {
    /* ignore storage quota errors */
  }
}

function githubHeaders(token: string, withJson = false): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (withJson) headers['Content-Type'] = 'application/json';
  return headers;
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    if (body?.message) return `${res.status}: ${body.message}`;
  } catch {
    /* ignore */
  }
  return `GitHub API error (${res.status})`;
}

export async function findExistingSyncGist(
  token: string,
): Promise<{ ok: true; gist: GitHubGistResponse | null } | { ok: false; error: string }> {
  try {
    const res = await fetch('https://api.github.com/gists?per_page=50', {
      headers: githubHeaders(token),
    });
    if (!res.ok) return { ok: false, error: await parseError(res) };
    const list = (await res.json()) as GitHubGistResponse[];
    const match =
      list.find((g) => g.files && GIST_FILENAME in g.files && g.description === GIST_DESCRIPTION) ??
      list.find((g) => g.files && GIST_FILENAME in g.files) ??
      null;
    return { ok: true, gist: match };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error contacting GitHub.' };
  }
}

export async function createSyncGist(
  token: string,
  data: AppData,
): Promise<{ ok: true; gistId: string; htmlUrl: string; updatedAt: string } | { ok: false; error: string }> {
  try {
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: githubHeaders(token, true),
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: {
          [GIST_FILENAME]: { content: serialize(data) },
        },
      }),
    });
    if (!res.ok) return { ok: false, error: await parseError(res) };
    const created = (await res.json()) as GitHubGistResponse;
    return { ok: true, gistId: created.id, htmlUrl: created.html_url, updatedAt: created.updated_at };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error creating Gist.' };
  }
}

export async function pullFromGist(
  config: Pick<GistSyncConfig, 'token' | 'gistId'>,
  ifNoneMatch?: string | null,
): Promise<
  | { ok: true; notModified: true }
  | { ok: true; notModified: false; data: AppData; htmlUrl: string; updatedAt: string; etag: string | null }
  | { ok: false; error: string }
> {
  try {
    const headers = githubHeaders(config.token);
    if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch;

    const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(config.gistId.trim())}`, {
      headers,
      cache: 'no-store',
    });
    if (res.status === 304) {
      return { ok: true, notModified: true };
    }
    if (!res.ok) return { ok: false, error: await parseError(res) };
    const etag = res.headers.get('etag');
    const gist = (await res.json()) as GitHubGistResponse;
    const file = gist.files?.[GIST_FILENAME] ?? Object.values(gist.files ?? {})[0];
    if (!file) return { ok: false, error: `Gist does not contain ${GIST_FILENAME}.` };

    let content = file.content ?? '';
    if (file.truncated && file.raw_url) {
      const rawRes = await fetch(file.raw_url, { cache: 'no-store' });
      if (!rawRes.ok) return { ok: false, error: `Failed to download large Gist file (${rawRes.status}).` };
      content = await rawRes.text();
    }

    const parsed = parseJSON(content);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const validated = validateAndMigrate(parsed.value);
    if (!validated.ok || !validated.data) {
      return { ok: false, error: validated.errors.join(' ') || 'Remote Gist data is invalid.' };
    }
    return {
      ok: true,
      notModified: false,
      data: validated.data,
      htmlUrl: gist.html_url,
      updatedAt: gist.updated_at,
      etag,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error pulling from GitHub.' };
  }
}

export async function pushToGist(
  config: Pick<GistSyncConfig, 'token' | 'gistId'>,
  data: AppData,
): Promise<{ ok: true; htmlUrl: string; updatedAt: string; etag: string | null } | { ok: false; error: string }> {
  try {
    const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(config.gistId.trim())}`, {
      method: 'PATCH',
      headers: githubHeaders(config.token, true),
      body: JSON.stringify({
        files: {
          [GIST_FILENAME]: { content: serialize(data) },
        },
      }),
    });
    if (!res.ok) return { ok: false, error: await parseError(res) };
    const etag = res.headers.get('etag');
    const updated = (await res.json()) as GitHubGistResponse;
    return { ok: true, htmlUrl: updated.html_url, updatedAt: updated.updated_at, etag };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error pushing to GitHub.' };
  }
}
