import { Client, Pool } from 'pg';
import type { AuditEvent, AuditOutcome } from '@hexmon_tech/audit-core';

export type ExportFormat = 'json' | 'csv';

export type ExportAuditLogsOptions = {
  connectionString?: string;
  client?: Client | Pool;
  table?: string;
  from: string;
  to: string;
  tenantId?: string;
  actorId?: string;
  action?: string;
  outcome?: AuditOutcome;
  format: ExportFormat;
  pageSize?: number;
  cursor?: string;
  multiTenantStrict?: boolean;
};

export type ExportAuditLogsError = {
  code: 'INVALID_OPTIONS' | 'QUERY_FAILED';
  message: string;
  details?: string[];
};

export type ExportAuditLogsResult =
  | {
      ok: true;
      format: ExportFormat;
      data: AuditEvent[] | string;
      rowCount: number;
      nextCursor?: string;
    }
  | {
      ok: false;
      error: ExportAuditLogsError;
    };

export type ExportCursor = {
  occurredAt: string;
  eventId: string;
};

export type ExportQuery = {
  text: string;
  values: unknown[];
};

export type ExportQueryResult =
  | { ok: true; query: ExportQuery; limit: number }
  | { ok: false; error: ExportAuditLogsError };

const DEFAULT_TABLE = 'audit_events';
const DEFAULT_PAGE_SIZE = 1000;
const MAX_PAGE_SIZE = 10_000;

const assertSafeIdentifier = (value: string) => {
  if (!/^[a-zA-Z0-9_.]+$/.test(value)) {
    throw new Error('Invalid table name');
  }
};

const normalizePageSize = (value?: number): number => {
  const size = value ?? DEFAULT_PAGE_SIZE;
  return Math.max(1, Math.min(size, MAX_PAGE_SIZE));
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isAuditOutcome = (value: unknown): value is AuditOutcome =>
  value === 'SUCCESS' || value === 'FAILURE' || value === 'DENIED' || value === 'ERROR';

export const encodeCursor = (cursor: ExportCursor): string =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64');

export const decodeCursor = (cursor: string): ExportCursor | null => {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as ExportCursor;
    if (!isNonEmptyString(parsed?.occurredAt) || !isNonEmptyString(parsed?.eventId)) {
      return null;
    }
    return { occurredAt: parsed.occurredAt, eventId: parsed.eventId };
  } catch {
    return null;
  }
};

const buildInvalidOptions = (errors: string[]): ExportQueryResult => ({
  ok: false,
  error: {
    code: 'INVALID_OPTIONS',
    message: 'Invalid export options',
    details: errors,
  },
});

export const buildExportQuery = (options: ExportAuditLogsOptions): ExportQueryResult => {
  const errors: string[] = [];

  if (!isNonEmptyString(options.from)) {
    errors.push('from is required');
  }
  if (!isNonEmptyString(options.to)) {
    errors.push('to is required');
  }
  if (options.multiTenantStrict && !isNonEmptyString(options.tenantId)) {
    errors.push('tenantId is required when multiTenantStrict is enabled');
  }

  if (errors.length > 0) {
    return buildInvalidOptions(errors);
  }

  const table = options.table ?? DEFAULT_TABLE;
  try {
    assertSafeIdentifier(table);
  } catch (error) {
    return buildInvalidOptions([
      error instanceof Error ? error.message : 'Invalid table name',
    ]);
  }

  const values: unknown[] = [];
  const clauses: string[] = [];

  values.push(options.from);
  clauses.push(`occurred_at >= $${values.length}`);
  values.push(options.to);
  clauses.push(`occurred_at <= $${values.length}`);

  if (isNonEmptyString(options.tenantId)) {
    values.push(options.tenantId);
    clauses.push(`tenant_id = $${values.length}`);
  }

  if (isNonEmptyString(options.actorId)) {
    values.push(options.actorId);
    clauses.push(`actor_id = $${values.length}`);
  }

  if (isNonEmptyString(options.action)) {
    values.push(options.action);
    clauses.push(`action = $${values.length}`);
  }

  if (isNonEmptyString(options.outcome)) {
    values.push(options.outcome);
    clauses.push(`outcome = $${values.length}`);
  }

  if (isNonEmptyString(options.cursor)) {
    const decoded = decodeCursor(options.cursor);
    if (!decoded) {
      return buildInvalidOptions(['cursor is invalid']);
    }
    values.push(decoded.occurredAt);
    values.push(decoded.eventId);
    clauses.push(`(occurred_at, event_id) > ($${values.length - 1}, $${values.length})`);
  }

  const limit = normalizePageSize(options.pageSize);
  values.push(limit);
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const text = `SELECT event_id, schema_version, occurred_at, action, outcome, actor_id, actor_type,
    actor_display_name, actor_roles, actor_ip, actor_user_agent, target_id, target_type,
    target_display_name, tenant_id, org_id, target, context, metadata, diff, integrity,
    retention_tag, metadata_truncated, diff_truncated
    FROM ${table} ${where} ORDER BY occurred_at ASC, event_id ASC LIMIT $${values.length}`;

  return { ok: true, query: { text, values }, limit };
};

type QueryClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

type ClientHandle = {
  client: QueryClient;
  release: () => Promise<void>;
};

const resolveClient = async (options: ExportAuditLogsOptions): Promise<ClientHandle> => {
  if (options.client) {
    return { client: options.client, release: async () => {} };
  }
  if (!options.connectionString) {
    throw new Error('connectionString is required when no client is provided');
  }

  const client = new Client({ connectionString: options.connectionString });
  await client.connect();
  return {
    client,
    release: async () => {
      await client.end();
    },
  };
};

const toOptionalRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  return value as Record<string, unknown>;
};

const toIsoString = (value: unknown): string | undefined => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return undefined;
};

const coerceString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const toStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((item) => typeof item === 'string') as string[];
};

const rowToEvent = (row: Record<string, unknown>): AuditEvent => {
  const occurredAt = toIsoString(row.occurred_at);
  if (!occurredAt) {
    throw new Error('occurred_at is missing');
  }
  const eventId = typeof row.event_id === 'string' ? row.event_id : undefined;
  const schemaVersion = typeof row.schema_version === 'number' ? row.schema_version : undefined;
  const action = typeof row.action === 'string' ? row.action : undefined;
  const outcome = typeof row.outcome === 'string' ? row.outcome : undefined;
  const actorId = typeof row.actor_id === 'string' ? row.actor_id : undefined;
  const actorType = typeof row.actor_type === 'string' ? row.actor_type : undefined;

  if (
    !eventId ||
    schemaVersion === undefined ||
    !action ||
    !isAuditOutcome(outcome) ||
    !actorId ||
    !actorType
  ) {
    throw new Error('row is missing required audit columns');
  }

  const contextRecord = toOptionalRecord(row.context) ?? {};
  const context = {
    ...contextRecord,
    occurredAt:
      typeof contextRecord.occurredAt === 'string'
        ? contextRecord.occurredAt
        : occurredAt,
    tenantId: (contextRecord.tenantId as string | undefined) ?? coerceString(row.tenant_id),
    orgId: (contextRecord.orgId as string | undefined) ?? coerceString(row.org_id),
  };

  const actor = {
    id: actorId,
    type: actorType,
    displayName: coerceString(row.actor_display_name),
    roles: toStringArray(row.actor_roles),
    ip: coerceString(row.actor_ip),
    userAgent: coerceString(row.actor_user_agent),
  };

  const targetRecord = toOptionalRecord(row.target);
  const target = targetRecord
    ? (targetRecord as AuditEvent['target'])
    : row.target_type || row.target_id
      ? {
          type: coerceString(row.target_type) ?? 'unknown',
          id: coerceString(row.target_id),
          displayName: coerceString(row.target_display_name),
        }
      : undefined;

  return {
    eventId,
    schemaVersion,
    action,
    outcome,
    actor,
    target,
    context,
    metadata: toOptionalRecord(row.metadata),
    diff: toOptionalRecord(row.diff),
    integrity: toOptionalRecord(row.integrity) as AuditEvent['integrity'],
    retentionTag: coerceString(row.retention_tag),
    metadataTruncated: Boolean(row.metadata_truncated),
    diffTruncated: Boolean(row.diff_truncated),
  };
};

const CSV_COLUMNS = [
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
] as const;

const escapeCsv = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (/["]/.test(text)) {
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  if (/[\n,]/.test(text)) {
    return `"${text}"`;
  }
  return text;
};

const eventsToCsv = (events: AuditEvent[]): string => {
  const rows = [CSV_COLUMNS.join(',')];
  for (const event of events) {
    const record: Record<string, unknown> = {
      event_id: event.eventId,
      schema_version: event.schemaVersion,
      occurred_at: event.context.occurredAt,
      action: event.action,
      outcome: event.outcome,
      actor_id: event.actor.id,
      actor_type: event.actor.type,
      actor_display_name: event.actor.displayName,
      actor_roles: event.actor.roles,
      actor_ip: event.actor.ip,
      actor_user_agent: event.actor.userAgent,
      target_id: event.target?.id,
      target_type: event.target?.type,
      target_display_name: event.target?.displayName,
      tenant_id: event.context.tenantId,
      org_id: event.context.orgId,
      target: event.target,
      context: event.context,
      metadata: event.metadata,
      diff: event.diff,
      integrity: event.integrity,
      retention_tag: event.retentionTag,
      metadata_truncated: event.metadataTruncated ?? false,
      diff_truncated: event.diffTruncated ?? false,
    };

    const row = CSV_COLUMNS.map((key) => escapeCsv(record[key])).join(',');
    rows.push(row);
  }
  return rows.join('\n');
};

export const exportAuditLogs = async (
  options: ExportAuditLogsOptions,
): Promise<ExportAuditLogsResult> => {
  const queryResult = buildExportQuery(options);
  if (!queryResult.ok) {
    return { ok: false, error: queryResult.error };
  }

  let clientHandle: ClientHandle;
  try {
    clientHandle = await resolveClient(options);
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'INVALID_OPTIONS',
        message: error instanceof Error ? error.message : 'Invalid connection options',
      },
    };
  }

  try {
    const result = await clientHandle.client.query(
      queryResult.query.text,
      queryResult.query.values,
    );
    const events = result.rows.map((row) => rowToEvent(row));
    const nextCursor =
      events.length === queryResult.limit
        ? encodeCursor({
            occurredAt: events[events.length - 1].context.occurredAt,
            eventId: events[events.length - 1].eventId,
          })
        : undefined;

    if (options.format === 'csv') {
      return {
        ok: true,
        format: 'csv',
        data: eventsToCsv(events),
        rowCount: events.length,
        nextCursor,
      };
    }

    return {
      ok: true,
      format: 'json',
      data: events,
      rowCount: events.length,
      nextCursor,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'QUERY_FAILED',
        message: error instanceof Error ? error.message : 'Query failed',
      },
    };
  } finally {
    await clientHandle.release();
  }
};
