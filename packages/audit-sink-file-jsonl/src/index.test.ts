import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AuditEvent } from '@yourorg/audit-core';
import { createFileJsonlSink } from './index';

const baseEvent: AuditEvent = {
  schemaVersion: 1,
  eventId: '01HZX0W3D4C9B3Z5C3G0Y1N9QX',
  action: 'user.login',
  outcome: 'SUCCESS',
  actor: { type: 'user', id: 'user-1' },
  context: { occurredAt: new Date().toISOString() },
};

describe('createFileJsonlSink', () => {
  it('appends JSONL entries', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'audit-'));
    const filePath = join(dir, 'audit.jsonl');

    try {
      const sink = createFileJsonlSink({ filePath });
      const result = await sink.writeBatch([baseEvent]);
      expect(result.ok).toBe(true);

      const contents = await readFile(filePath, 'utf8');
      expect(contents).toContain(baseEvent.eventId);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
