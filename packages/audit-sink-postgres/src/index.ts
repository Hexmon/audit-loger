import { Pool } from 'pg';
import type {
  AuditEvent,
  AuditErrorType,
  AuditSink,
  WriteFailure,
  WriteResult,
} from '@yourorg/audit-core';

export type PostgresAuditSinkConfig = {
  connectionString?: string;
  pool?: Pool;
  tableName?: string;
  name?: string;
};

const DEFAULT_TABLE = 'audit_events';

const toNullableJson = (value: unknown) => (value === undefined ? null : value);

const assertSafeIdentifier = (value: string) => {
  if (!/^[a-zA-Z0-9_.]+$/.test(value)) {
    throw new Error('Invalid table name');
  }
};

const classifyPostgresError = (error: unknown): AuditErrorType => {
  const code = (error as { code?: string }).code;
  if (!code) {
    return 'TRANSIENT';
  }
  if (code.startsWith('22') || code.startsWith('42')) {
    return 'PERMANENT';
  }
  return 'TRANSIENT';
};

const buildFailures = (
  events: AuditEvent[],
  errorType: AuditErrorType,
  message: string,
): WriteFailure[] =>
  events.map((event) => ({
    eventId: event.eventId,
    errorType,
    message,
  }));

export const createPostgresAuditSink = (config: PostgresAuditSinkConfig): AuditSink => {
  const tableName = config.tableName ?? DEFAULT_TABLE;
  assertSafeIdentifier(tableName);

  const pool = config.pool ?? new Pool({ connectionString: config.connectionString });
  const ownsPool = !config.pool;

  return {
    name: config.name ?? 'postgres',
    writeBatch: async (events: AuditEvent[], signal?: AbortSignal): Promise<WriteResult> => {
      void signal;
      if (events.length === 0) {
        return { ok: true, written: 0, failed: 0, failures: [] };
      }

      const columns = [
        'event_id',
        'schema_version',
        'occurred_at',
        'action',
        'outcome',
        'actor_id',
        'actor_type',
        'actor_display_name',
        'actor_roles',
        'actor_ip',
        'actor_user_agent',
        'target_id',
        'target_type',
        'target_display_name',
        'tenant_id',
        'org_id',
        'target',
        'context',
        'metadata',
        'diff',
        'integrity',
        'retention_tag',
        'metadata_truncated',
        'diff_truncated',
      ];

      const values: unknown[] = [];
      const placeholders = events
        .map((event, index) => {
          const base = index * columns.length;
          values.push(
            event.eventId,
            event.schemaVersion,
            event.context.occurredAt,
            event.action,
            event.outcome,
            event.actor.id,
            event.actor.type,
            event.actor.displayName ?? null,
            event.actor.roles ?? null,
            event.actor.ip ?? null,
            event.actor.userAgent ?? null,
            event.target?.id ?? null,
            event.target?.type ?? null,
            event.target?.displayName ?? null,
            event.context.tenantId ?? null,
            event.context.orgId ?? null,
            toNullableJson(event.target),
            toNullableJson(event.context),
            toNullableJson(event.metadata),
            toNullableJson(event.diff),
            toNullableJson(event.integrity),
            event.retentionTag ?? null,
            event.metadataTruncated ?? false,
            event.diffTruncated ?? false,
          );

          const rowPlaceholders = columns.map((_, colIndex) => `$${base + colIndex + 1}`);
          return `(${rowPlaceholders.join(', ')})`;
        })
        .join(', ');

      const text = `INSERT INTO ${tableName} (${columns.join(
        ', ',
      )}) VALUES ${placeholders} ON CONFLICT (event_id) DO NOTHING`;

      try {
        await pool.query(text, values);
        return { ok: true, written: events.length, failed: 0, failures: [] };
      } catch (error) {
        const errorType = classifyPostgresError(error);
        const message = error instanceof Error ? error.message : 'Postgres write failed';
        const failures = buildFailures(events, errorType, message);
        return {
          ok: false,
          written: 0,
          failed: events.length,
          failures,
        };
      }
    },
    flush: async () => {},
    shutdown: async () => {
      if (ownsPool) {
        await pool.end();
      }
    },
  };
};
