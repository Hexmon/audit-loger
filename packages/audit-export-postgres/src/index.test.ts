import { describe, expect, it } from 'vitest';
import { buildExportQuery, decodeCursor, encodeCursor } from './index';

const baseOptions = {
  from: '2024-01-01',
  to: '2024-01-31',
  format: 'json' as const,
};

describe('buildExportQuery', () => {
  it('builds a minimal query with required time range', () => {
    const result = buildExportQuery(baseOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.query.text).toContain('WHERE occurred_at >= $1 AND occurred_at <= $2');
    expect(result.query.text).toContain('ORDER BY occurred_at ASC, event_id ASC');
    expect(result.query.text).toContain('LIMIT $3');
    expect(result.query.values[0]).toBe('2024-01-01');
    expect(result.query.values[1]).toBe('2024-01-31');
  });

  it('adds filters and cursor with stable parameter ordering', () => {
    const cursor = encodeCursor({ occurredAt: '2024-01-10T00:00:00.000Z', eventId: 'evt-2' });
    const result = buildExportQuery({
      ...baseOptions,
      tenantId: 'tenant-1',
      actorId: 'user-9',
      action: 'user.login',
      outcome: 'SUCCESS',
      cursor,
      pageSize: 500,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const { text, values } = result.query;
    expect(text).toContain('tenant_id = $3');
    expect(text).toContain('actor_id = $4');
    expect(text).toContain('action = $5');
    expect(text).toContain('outcome = $6');
    expect(text).toContain('(occurred_at, event_id) > ($7, $8)');
    expect(text).toContain('LIMIT $9');

    expect(values.slice(0, 6)).toEqual([
      '2024-01-01',
      '2024-01-31',
      'tenant-1',
      'user-9',
      'user.login',
      'SUCCESS',
    ]);
    expect(values[6]).toBe('2024-01-10T00:00:00.000Z');
    expect(values[7]).toBe('evt-2');
    expect(values[8]).toBe(500);
  });

  it('rejects missing from/to', () => {
    const result = buildExportQuery({
      to: '2024-01-31',
      format: 'json',
    } as typeof baseOptions);
    expect(result.ok).toBe(false);
  });

  it('rejects cursor that cannot be decoded', () => {
    const result = buildExportQuery({
      ...baseOptions,
      cursor: 'not-base64',
    });
    expect(result.ok).toBe(false);
  });

  it('enforces tenantId when multiTenantStrict is enabled', () => {
    const result = buildExportQuery({
      ...baseOptions,
      multiTenantStrict: true,
    });
    expect(result.ok).toBe(false);
  });
});

describe('cursor encoding', () => {
  it('roundtrips cursor values', () => {
    const original = { occurredAt: '2024-01-01T00:00:00.000Z', eventId: 'evt-1' };
    const encoded = encodeCursor(original);
    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual(original);
  });
});
