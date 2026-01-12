import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuditEventInput, AuditSink } from './index';
import { createAuditLogger } from './index';

const baseInput: AuditEventInput = {
  action: 'user.login',
  outcome: 'SUCCESS',
  actor: { type: 'user', id: 'user-123' },
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe('chaos', () => {
  it('recovers from transient failures with queue retries and circuit breaker', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    let shouldFail = true;
    const sink: AuditSink = {
      name: 'flaky',
      writeBatch: async (events) => {
        if (shouldFail) {
          return {
            ok: false,
            written: 0,
            failed: events.length,
            failures: events.map((event) => ({
              eventId: event.eventId,
              errorType: 'TRANSIENT',
              message: 'flaky sink',
            })),
          };
        }
        return { ok: true, written: events.length, failed: 0, failures: [] };
      },
    };

    const logger = createAuditLogger({
      mode: 'QUEUE',
      sinks: [sink],
      batchSize: 1,
      queue: { flushIntervalMs: 1, maxQueueSize: 10 },
      retry: { maxAttempts: 6, baseBackoffMs: 10, maxBackoffMs: 50 },
      circuitBreaker: { failureThreshold: 2, cooldownMs: 50 },
    });

    const first = await logger.log(baseInput);
    expect(first.ok).toBe(true);

    await logger.flush();
    await sleep(15);
    await logger.flush();

    expect(logger.getStats().gauges.audit_circuit_open).toBe(1);

    shouldFail = false;

    await sleep(120);
    await logger.flush();

    const flush = await logger.flush();
    expect(flush.ok).toBe(true);

    const stats = logger.getStats();
    expect(stats.counters.audit_retries_total).toBeGreaterThan(0);
    expect(stats.counters.audit_events_written_total).toBe(1);
    expect(stats.gauges.audit_circuit_open).toBe(0);
  });
});
