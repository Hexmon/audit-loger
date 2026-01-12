import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createAuditLogger } from '@yourorg/audit-core';
import { verifyFile } from './verify';

const buildFilePath = (name: string) =>
  join(tmpdir(), `audit-cli-${name}-${Date.now()}-${Math.random()}.jsonl`);

const baseInput = {
  action: 'user.login',
  outcome: 'SUCCESS' as const,
  actor: { type: 'user', id: 'user-1' },
  context: {
    occurredAt: '2024-01-01T00:00:00.000Z',
    tenantId: 'tenant-a',
  },
};

describe('verifyFile', () => {
  it('verifies a valid hash chain', async () => {
    const audit = createAuditLogger({ integrityMode: 'hash-chain', service: 'api' });
    const first = await audit.log({ ...baseInput, eventId: 'evt-1' });
    const second = await audit.log({
      ...baseInput,
      eventId: 'evt-2',
      context: { ...baseInput.context, occurredAt: '2024-01-01T00:00:01.000Z' },
    });

    if (!first.ok || !second.ok) {
      throw new Error('Expected audit.log to succeed');
    }

    const path = buildFilePath('valid');
    await writeFile(
      path,
      `${JSON.stringify(first.event)}\n${JSON.stringify(second.event)}\n`,
      'utf8',
    );

    const result = await verifyFile({ path });
    expect(result.ok).toBe(true);
    expect(result.total).toBe(2);

    await audit.shutdown();
  });

  it('detects tampered entries', async () => {
    const audit = createAuditLogger({ integrityMode: 'hash-chain', service: 'api' });
    const first = await audit.log({ ...baseInput, eventId: 'evt-1' });
    const second = await audit.log({
      ...baseInput,
      eventId: 'evt-2',
      context: { ...baseInput.context, occurredAt: '2024-01-01T00:00:01.000Z' },
    });

    if (!first.ok || !second.ok) {
      throw new Error('Expected audit.log to succeed');
    }

    const tampered = { ...second.event, action: 'user.login.tampered' };
    const path = buildFilePath('tampered');
    await writeFile(
      path,
      `${JSON.stringify(first.event)}\n${JSON.stringify(tampered)}\n`,
      'utf8',
    );

    const result = await verifyFile({ path });
    expect(result.ok).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);

    await audit.shutdown();
  });
});
