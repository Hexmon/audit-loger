import { describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import type { AuditEvent } from '@stackio/audit-core';
import { createPostgresAuditSink } from './index';

const connectionString = process.env.PG_TEST_URL ?? process.env.TEST_POSTGRES_URL;
const describeMaybe = connectionString ? describe : describe.skip;

const baseEvent: AuditEvent = {
  schemaVersion: 1,
  eventId: '01HZX0W3D4C9B3Z5C3G0Y1N9QX',
  action: 'user.login',
  outcome: 'SUCCESS',
  actor: { type: 'user', id: 'user-1' },
  context: { occurredAt: new Date().toISOString() },
};

describeMaybe('createPostgresAuditSink', () => {
  it('writes a batch when a test database is configured', async () => {
    if (!connectionString) {
      return;
    }

    const pool = new Pool({ connectionString });
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_events (
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
        );
      `);

      const sink = createPostgresAuditSink({ pool, tableName: 'audit_events' });
      const result = await sink.writeBatch([baseEvent]);
      expect(result.ok).toBe(true);
    } finally {
      await pool.end();
    }
  });
});
