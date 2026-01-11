import { describe, expect, it } from 'vitest';
import {
  AuditEventInput,
  AuditValidationError,
  createAuditLogger,
  validateActionName,
  validateEventInput,
  validateRequiredFields,
} from './index';

const baseInput: AuditEventInput = {
  action: 'user.login',
  outcome: 'SUCCESS',
  actor: {
    type: 'user',
    id: 'user-123',
  },
};

describe('validateRequiredFields', () => {
  it('accepts a minimal valid input', () => {
    const result = validateRequiredFields(baseInput);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports missing actor fields', () => {
    const result = validateRequiredFields({
      ...baseInput,
      actor: { type: '', id: '' },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('actor.type');
    expect(result.errors.join(' ')).toContain('actor.id');
  });
});

describe('validateActionName', () => {
  it('flags UUIDs inside action names', () => {
    const result = validateActionName('user.login.550e8400-e29b-41d4-a716-446655440000');
    expect(result.ok).toBe(false);
  });
});

describe('validateEventInput', () => {
  it('warns by default when action naming looks high-cardinality', () => {
    const result = validateEventInput({
      ...baseInput,
      action: 'user.login.550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.ok).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('errors when strictActionNaming is enabled', () => {
    const result = validateEventInput(
      {
        ...baseInput,
        action: 'user.login.550e8400-e29b-41d4-a716-446655440000',
      },
      { strictActionNaming: true },
    );
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('createAuditLogger', () => {
  it('enqueues in QUEUE mode and updates stats', async () => {
    const logger = createAuditLogger({
      defaultContext: { sourceService: 'api', environment: 'test' },
    });

    const result = await logger.log(baseInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.context.sourceService).toBe('api');
      expect(result.event.context.environment).toBe('test');
      expect(result.event.context.occurredAt).toBeTruthy();
    }

    const stats = logger.getStats();
    expect(stats.counters.audit_events_total).toBe(1);

    await logger.flush();
    const afterFlush = logger.getStats();
    expect(afterFlush.counters.audit_events_written_total).toBe(1);
    expect(afterFlush.gauges.audit_queue_size).toBe(0);
  });

  it('redacts sensitive metadata by default', async () => {
    const logger = createAuditLogger();
    const result = await logger.log({
      ...baseInput,
      metadata: {
        headers: { authorization: 'Bearer secret' },
        nested: { token: 'abc', profile: { password: 'pass' } },
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const metadata = result.event.metadata as Record<string, unknown>;
      const headers = metadata.headers as Record<string, unknown>;
      const nested = metadata.nested as Record<string, unknown>;
      const profile = (nested.profile as Record<string, unknown>) ?? {};
      expect(headers.authorization).toBe('***');
      expect(nested.token).toBe('***');
      expect(profile.password).toBe('***');
    }
  });

  it('truncates metadata when it exceeds the configured limit', async () => {
    const logger = createAuditLogger({
      payloadLimits: { maxMetadataBytes: 10, maxEventBytes: 10_000 },
    });

    const result = await logger.log({
      ...baseInput,
      metadata: { payload: 'x'.repeat(200) },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.metadataTruncated).toBe(true);
      const metadata = result.event.metadata as Record<string, unknown>;
      expect(metadata._marker).toBe('[TRUNCATED]');
    }
  });

  it('increments dropped metric in DROP mode', async () => {
    const logger = createAuditLogger({ mode: 'DROP' });
    const result = await logger.log(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('DROPPED');
    }
    const stats = logger.getStats();
    expect(stats.counters.audit_events_dropped_total).toBe(1);
  });

  it('rejects events that exceed maxEventBytes', async () => {
    const logger = createAuditLogger({ payloadLimits: { maxEventBytes: 120 } });
    const result = await logger.log({
      ...baseInput,
      metadata: { payload: 'x'.repeat(1000) },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('EVENT_TOO_LARGE');
    }
    const stats = logger.getStats();
    expect(stats.counters.audit_invalid_total).toBe(1);
  });

  it('increments invalid metric for invalid events', async () => {
    const logger = createAuditLogger();
    const result = await logger.log({ ...baseInput, action: '' });
    expect(result.ok).toBe(false);
    const stats = logger.getStats();
    expect(stats.counters.audit_invalid_total).toBe(1);
  });

  it('throws when strictValidation is enabled', async () => {
    const logger = createAuditLogger({ strictValidation: true });
    await expect(logger.log({ ...baseInput, action: '' })).rejects.toBeInstanceOf(
      AuditValidationError,
    );
  });
});
