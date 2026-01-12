import { describe, expect, it } from 'vitest';
import type { AuditEvent, AuditSink, MultiSink } from './index';
import { multiSink } from './index';

const baseEvent: AuditEvent = {
  schemaVersion: 1,
  eventId: '01HZX0W3D4C9B3Z5C3G0Y1N9QX',
  action: 'user.login',
  outcome: 'SUCCESS',
  actor: { type: 'user', id: 'user-1' },
  context: { occurredAt: new Date().toISOString() },
};

const createSuccessSink = (): AuditSink => ({
  writeBatch: async (events) => ({
    ok: true,
    written: events.length,
    failed: 0,
    failures: [],
  }),
});

const createFailureSink = (): AuditSink => ({
  writeBatch: async (events) => ({
    ok: false,
    written: 0,
    failed: events.length,
    failures: events.map((event) => ({
      eventId: event.eventId,
      errorType: 'TRANSIENT',
      message: 'failed',
    })),
  }),
});

describe('multiSink', () => {
  it('aggregates BEST_EFFORT as success when at least one sink writes', async () => {
    const sink: MultiSink = multiSink([createSuccessSink(), createFailureSink()], {
      fanoutMode: 'BEST_EFFORT',
    });

    const result = await sink.writeBatch([baseEvent]);
    expect(result.ok).toBe(true);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(2);
    expect(result.failures.length).toBe(0);
  });

  it('aggregates ALL_OR_NOTHING as failure when any sink fails', async () => {
    const sink: MultiSink = multiSink([createSuccessSink(), createFailureSink()], {
      fanoutMode: 'ALL_OR_NOTHING',
    });

    const result = await sink.writeBatch([baseEvent]);
    expect(result.ok).toBe(false);
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.results).toHaveLength(2);
  });
});
