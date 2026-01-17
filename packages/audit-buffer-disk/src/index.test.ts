import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { AuditEvent, AuditSink } from '@hexmon_tech/audit-core';
import { PACKAGE_NAME, createDiskBuffer } from './index';

const baseEvent: AuditEvent = {
  schemaVersion: 1,
  eventId: '01HZX0W3D4C9B3Z5C3G0Y1N9QX',
  action: 'user.login',
  outcome: 'SUCCESS',
  actor: { type: 'user', id: 'user-1' },
  context: { occurredAt: new Date().toISOString() },
};

type TempFixture = { dir: string; filePath: string };

const createTempFixture = async (): Promise<TempFixture> => {
  const dir = await mkdtemp(join(tmpdir(), 'audit-buffer-'));
  return { dir, filePath: join(dir, 'buffer.jsonl') };
};

const fixtures: TempFixture[] = [];

afterEach(async () => {
  while (fixtures.length > 0) {
    const fixture = fixtures.pop();
    if (!fixture) {
      continue;
    }
    await rm(fixture.dir, { recursive: true, force: true });
  }
});

describe('audit-buffer-disk', () => {
  it('exports the package name', () => {
    expect(PACKAGE_NAME).toBe('@hexmon_tech/audit-buffer-disk');
  });

  it('buffers events and drains to a target sink', async () => {
    const fixture = await createTempFixture();
    fixtures.push(fixture);

    const buffer = createDiskBuffer({ filePath: fixture.filePath });
    const writeResult = await buffer.writeBatch([baseEvent]);
    expect(writeResult.ok).toBe(true);

    const received: AuditEvent[] = [];
    const target: AuditSink = {
      writeBatch: async (events) => {
        received.push(...events);
        return { ok: true, written: events.length, failed: 0, failures: [] };
      },
    };

    const drainResult = await buffer.drain(target, { batchSize: 1 });
    expect(drainResult.ok).toBe(true);
    expect(received).toHaveLength(1);

    let contents = '';
    try {
      contents = await readFile(fixture.filePath, 'utf8');
    } catch {
      contents = '';
    }
    expect(contents.trim()).toBe('');
  });

  it('re-buffers events when the target sink fails', async () => {
    const fixture = await createTempFixture();
    fixtures.push(fixture);

    const buffer = createDiskBuffer({ filePath: fixture.filePath });
    await buffer.writeBatch([baseEvent]);

    const target: AuditSink = {
      writeBatch: async (events) => ({
        ok: false,
        written: 0,
        failed: events.length,
        failures: events.map((event) => ({
          eventId: event.eventId,
          errorType: 'TRANSIENT',
          message: 'downstream unavailable',
        })),
      }),
    };

    const drainResult = await buffer.drain(target);
    expect(drainResult.ok).toBe(false);

    const contents = await readFile(fixture.filePath, 'utf8');
    expect(contents).toContain(baseEvent.eventId);
  });
});
