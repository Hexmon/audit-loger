import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import type { AuditEvent } from '@hexmon/audit-core';
import { createPostgresAuditSink } from './index';

const POSTGRES_URL = process.env.TEST_POSTGRES_URL;

const run = POSTGRES_URL ? describe : describe.skip;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForPostgres = async (connectionString: string, timeoutMs = 20_000) => {
  const started = Date.now();
  let lastError: unknown;
  while (Date.now() - started < timeoutMs) {
    const client = new Client({ connectionString });
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      await sleep(500);
    }
  }
  throw new Error(
    `Postgres did not become ready: ${
      lastError instanceof Error ? lastError.message : 'unknown error'
    }`,
  );
};

const createTestTable = async (client: Client, tableName: string) => {
  const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (
    event_id TEXT PRIMARY KEY,
    schema_version INTEGER NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    action TEXT NOT NULL,
    outcome TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_display_name TEXT,
    actor_roles TEXT[],
    actor_ip TEXT,
    actor_user_agent TEXT,
    target_id TEXT,
    target_type TEXT,
    target_display_name TEXT,
    tenant_id TEXT,
    org_id TEXT,
    target JSONB,
    context JSONB,
    metadata JSONB,
    diff JSONB,
    integrity JSONB,
    retention_tag TEXT,
    metadata_truncated BOOLEAN DEFAULT FALSE,
    diff_truncated BOOLEAN DEFAULT FALSE
  );`;
  await client.query(sql);
};

run('postgres sink integration', () => {
  let client: Client;
  let tableName: string;

  beforeAll(async () => {
    await waitForPostgres(POSTGRES_URL!);
    client = new Client({ connectionString: POSTGRES_URL! });
    await client.connect();
    tableName = `audit_events_test_${Date.now()}`;
    await createTestTable(client, tableName);
  }, 30_000);

  afterAll(async () => {
    if (client) {
      await client.query(`DROP TABLE IF EXISTS ${tableName}`);
      await client.end();
    }
  });

  it(
    'writes batches and dedupes by event_id',
    async () => {
      const sink = createPostgresAuditSink({
        connectionString: POSTGRES_URL!,
        tableName,
        name: 'postgres-test',
      });

      const baseEvent: AuditEvent = {
        schemaVersion: 1,
        eventId: 'evt-1',
        action: 'user.login',
        outcome: 'SUCCESS',
        actor: { type: 'user', id: 'user-1' },
        context: { occurredAt: new Date().toISOString() },
      };

      const duplicateEvent: AuditEvent = {
        ...baseEvent,
        outcome: 'FAILURE',
      };

      const result = await sink.writeBatch([baseEvent, duplicateEvent]);
      expect(result.ok).toBe(true);

      const countResult = await client.query(
        `SELECT COUNT(*)::int AS count FROM ${tableName}`,
      );
      expect(countResult.rows[0].count).toBe(1);

      await sink.shutdown?.();
    },
    30_000,
  );
});
