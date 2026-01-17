import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { Client } from 'pg';
import { computeIntegrityHash, getIntegrityScopeKey } from '@hexmon_tech/audit-core';
import type {
  AuditActor,
  AuditContext,
  AuditEvent,
  AuditTarget,
} from '@hexmon_tech/audit-core';

export type VerifyFailure = {
  index: number;
  eventId?: string;
  scope: string;
  reason: string;
};

export type VerifySummary = {
  ok: boolean;
  total: number;
  failures: VerifyFailure[];
};

export type VerifyFileOptions = {
  path: string;
};

export type VerifyPostgresOptions = {
  connectionString: string;
  from?: string;
  to?: string;
  tenantId?: string;
  table?: string;
};

type VerifyState = {
  total: number;
  failures: VerifyFailure[];
  lastHashByScope: Map<string, string>;
};

const DEFAULT_TABLE = 'audit_events';

const assertSafeIdentifier = (value: string) => {
  if (!/^[a-zA-Z0-9_.]+$/.test(value)) {
    throw new Error('Invalid table name');
  }
};

const coerceString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const coerceStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  if (value.every((item) => typeof item === 'string')) {
    return value as string[];
  }
  return value.filter((item) => typeof item === 'string') as string[];
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return value as Record<string, unknown>;
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

const getHashValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const verifyEvent = async (
  state: VerifyState,
  event: AuditEvent,
  index: number,
): Promise<void> => {
  state.total += 1;
  const scope = getIntegrityScopeKey(event);
  const integrity = event.integrity ?? {};
  const hash = getHashValue(integrity.hash);
  const prevHash = getHashValue(integrity.prevHash);

  if (!hash) {
    state.failures.push({
      index,
      eventId: event.eventId,
      scope,
      reason: 'Missing integrity.hash',
    });
  }

  const expectedPrev = state.lastHashByScope.get(scope);
  if (prevHash !== expectedPrev) {
    state.failures.push({
      index,
      eventId: event.eventId,
      scope,
      reason: `prevHash mismatch (expected ${expectedPrev ?? 'none'})`,
    });
  }

  if (hash) {
    const result = await computeIntegrityHash({
      event,
      prevHash,
      algorithm: integrity.alg,
    });
    if (!result.ok) {
      state.failures.push({
        index,
        eventId: event.eventId,
        scope,
        reason: `hash compute failed: ${result.error}`,
      });
    } else if (result.hash !== hash) {
      state.failures.push({
        index,
        eventId: event.eventId,
        scope,
        reason: 'hash mismatch',
      });
    }
  }

  if (hash) {
    state.lastHashByScope.set(scope, hash);
  }
};

const initState = (): VerifyState => ({
  total: 0,
  failures: [],
  lastHashByScope: new Map<string, string>(),
});

const buildEventFromRow = (row: Record<string, unknown>): AuditEvent => {
  const eventId = coerceString(row.event_id);
  const action = coerceString(row.action);
  const outcome = coerceString(row.outcome);
  const schemaVersion = row.schema_version;
  const occurredAt = toIsoString(row.occurred_at);
  const actorId = coerceString(row.actor_id);
  const actorType = coerceString(row.actor_type);

  if (
    !eventId ||
    !action ||
    !outcome ||
    !occurredAt ||
    !actorId ||
    !actorType ||
    typeof schemaVersion !== 'number'
  ) {
    throw new Error('Missing required audit columns for integrity verification');
  }

  const contextRecord = toRecord(row.context);
  const context: AuditContext = {
    ...contextRecord,
    occurredAt:
      typeof contextRecord.occurredAt === 'string'
        ? contextRecord.occurredAt
        : occurredAt,
    tenantId: (contextRecord.tenantId as string | undefined) ?? coerceString(row.tenant_id),
    orgId: (contextRecord.orgId as string | undefined) ?? coerceString(row.org_id),
  };

  const actor: AuditActor = {
    id: actorId,
    type: actorType,
    displayName: coerceString(row.actor_display_name),
    roles: coerceStringArray(row.actor_roles),
    ip: coerceString(row.actor_ip),
    userAgent: coerceString(row.actor_user_agent),
  };

  let target: AuditTarget | undefined;
  const targetRecord = toOptionalRecord(row.target);
  if (targetRecord) {
    target = targetRecord as AuditTarget;
  } else if (row.target_type || row.target_id) {
    target = {
      type: coerceString(row.target_type) ?? 'unknown',
      id: coerceString(row.target_id),
      displayName: coerceString(row.target_display_name),
    };
  }

  return {
    eventId,
    schemaVersion,
    action,
    outcome: outcome as AuditEvent['outcome'],
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

export const verifyFile = async (options: VerifyFileOptions): Promise<VerifySummary> => {
  const state = initState();
  const stream = createReadStream(options.path, { encoding: 'utf8' });
  const reader = createInterface({ input: stream, crlfDelay: Infinity });

  let index = 0;

  for await (const line of reader) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    index += 1;
    let event: AuditEvent;
    try {
      event = JSON.parse(trimmed) as AuditEvent;
    } catch (error) {
      state.total += 1;
      state.failures.push({
        index,
        scope: 'unknown',
        reason: error instanceof Error ? error.message : 'invalid JSON',
      });
      continue;
    }

    try {
      await verifyEvent(state, event, index);
    } catch (error) {
      state.failures.push({
        index,
        eventId: event.eventId,
        scope: 'unknown',
        reason: error instanceof Error ? error.message : 'verification failed',
      });
    }
  }

  return {
    ok: state.failures.length === 0,
    total: state.total,
    failures: state.failures,
  };
};

export const verifyPostgres = async (
  options: VerifyPostgresOptions,
): Promise<VerifySummary> => {
  const state = initState();
  const table = options.table ?? DEFAULT_TABLE;
  assertSafeIdentifier(table);

  const client = new Client({ connectionString: options.connectionString });
  await client.connect();

  try {
    const clauses: string[] = [];
    const values: Array<string> = [];

    if (options.from) {
      values.push(options.from);
      clauses.push(`occurred_at >= $${values.length}`);
    }
    if (options.to) {
      values.push(options.to);
      clauses.push(`occurred_at <= $${values.length}`);
    }
    if (options.tenantId) {
      values.push(options.tenantId);
      clauses.push(`tenant_id = $${values.length}`);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const query = `SELECT event_id, schema_version, occurred_at, action, outcome, actor_id, actor_type,
      actor_display_name, actor_roles, actor_ip, actor_user_agent, target_id, target_type,
      target_display_name, tenant_id, org_id, target, context, metadata, diff, integrity,
      retention_tag, metadata_truncated, diff_truncated
      FROM ${table} ${where} ORDER BY occurred_at ASC, event_id ASC`;

    const result = await client.query(query, values);
    let index = 0;

    for (const row of result.rows as Record<string, unknown>[]) {
      index += 1;
      try {
        const event = buildEventFromRow(row);
        await verifyEvent(state, event, index);
      } catch (error) {
        state.total += 1;
        state.failures.push({
          index,
          scope: 'unknown',
          reason: error instanceof Error ? error.message : 'row verification failed',
        });
      }
    }
  } finally {
    await client.end();
  }

  return {
    ok: state.failures.length === 0,
    total: state.total,
    failures: state.failures,
  };
};
