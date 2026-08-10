import { describe, it, expect } from 'vitest';
import { SCHEMA_VERSION } from '@/types';
import { createDefaultData } from '@/data/defaults';
import { parseJSON, serialize, validateAndMigrate } from '@/services/schema';

const NOW = '2026-01-01T00:00:00.000Z';

describe('data integrity (§35)', () => {
  it('round-trips a full document unchanged', () => {
    const data = createDefaultData(NOW);
    const text = serialize(data);
    const parsed = parseJSON(text);
    expect(parsed.ok).toBe(true);
    const result = validateAndMigrate((parsed as { value: unknown }).value);
    expect(result.ok).toBe(true);
    expect(result.data?.version).toBe(SCHEMA_VERSION);
    expect(result.data?.profile.name).toBe(data.profile.name);
  });

  it('rejects a non-object as corrupted rather than overwriting', () => {
    const result = validateAndMigrate(42);
    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects valid JSON that is not one of our files', () => {
    const result = validateAndMigrate({ hello: 'world', count: 3 });
    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
  });

  it('refuses a file from a newer schema version', () => {
    const result = validateAndMigrate({ version: SCHEMA_VERSION + 5, tasks: [] });
    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
  });

  it('repairs a partial document from defaults instead of failing', () => {
    // Only a couple of recognisable keys present; everything else missing.
    const result = validateAndMigrate({ version: 1, tasks: [{ id: 't1', title: 'x' }] });
    expect(result.ok).toBe(true);
    expect(result.data).not.toBeNull();
    // Missing sections are filled, not dropped.
    expect(Array.isArray(result.data?.dailyLogs)).toBe(true);
    expect(result.data?.settings).toBeDefined();
    expect(result.data?.streaks.streaks.study).toBeDefined();
  });

  it('surfaces a broken JSON string through parseJSON', () => {
    const parsed = parseJSON('{ not: valid json');
    expect(parsed.ok).toBe(false);
  });
});
