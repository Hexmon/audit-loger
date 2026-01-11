import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuditEventInput, AuditSink } from './index';
import { createAuditLogger } from './index';

const baseInput: AuditEventInput = {
  action: 'user.login',
  outcome: 'SUCCESS',
  actor: { type: 'user', id: 'user-123' },
};

const createTransientFailureSink = (failures: number): AuditSink => {
  let attempts = 0;
  return {
    writeBatch: async (events) => {
      attempts += 1;
      if (attempts <= failures) {
        return {
          ok: false,
          written: 0,
          failed: events.length,
          failures: events.map((event) => ({
            eventId: event.eventId,
            errorType: 'TRANSIENT',
            message: 'temporary failure',
          })),
        };
      }
      return {
        ok: true,
        written: events.length,
        failed: 0,
        failures: [],
      };
    },
  };
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('reliability', () => {
  it('retries transient failures and eventually succeeds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const sink = createTransientFailureSink(2);
    const logger = createAuditLogger({
      mode: 'BLOCK',
      sinks: [sink],
      batchSize: 1,
      queue: { flushIntervalMs: 1, maxQueueSize: 10 },
      retry: { maxAttempts: 3, baseBackoffMs: 5, maxBackoffMs: 20 },
    });

    const logPromise = logger.log(baseInput);
    await vi.advanceTimersByTimeAsync(100);
    const result = await logPromise;

    expect(result.ok).toBe(true);
    const stats = logger.getStats();
    expect(stats.counters.audit_retries_total).toBe(2);
    expect(stats.counters.audit_events_written_total).toBe(1);
    expect(stats.counters.audit_write_failures_total).toBe(0);
  });

  it('opens the circuit and recovers after cooldown', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    let shouldFail = true;
    const sink: AuditSink = {
      writeBatch: async (events) => {
        if (shouldFail) {
          return {
            ok: false,
            written: 0,
            failed: events.length,
            failures: events.map((event) => ({
              eventId: event.eventId,
              errorType: 'TRANSIENT',
              message: 'upstream unavailable',
            })),
          };
        }
        return {
          ok: true,
          written: events.length,
          failed: 0,
          failures: [],
        };
      },
    };

    const logger = createAuditLogger({
      mode: 'BLOCK',
      sinks: [sink],
      batchSize: 1,
      queue: { flushIntervalMs: 1, maxQueueSize: 10 },
      retry: { maxAttempts: 1, baseBackoffMs: 1, maxBackoffMs: 1 },
      circuitBreaker: { failureThreshold: 2, cooldownMs: 50 },
    });

    const first = logger.log(baseInput);
    await vi.advanceTimersByTimeAsync(5);
    const firstResult = await first;
    expect(firstResult.ok).toBe(false);

    const second = logger.log({ ...baseInput, action: 'user.logout' });
    await vi.advanceTimersByTimeAsync(5);
    const secondResult = await second;
    expect(secondResult.ok).toBe(false);

    expect(logger.getStats().gauges.audit_circuit_open).toBe(1);

    shouldFail = false;
    await vi.advanceTimersByTimeAsync(60);

    const third = logger.log({ ...baseInput, action: 'user.reset' });
    await vi.advanceTimersByTimeAsync(5);
    const thirdResult = await third;
    expect(thirdResult.ok).toBe(true);
    expect(logger.getStats().gauges.audit_circuit_open).toBe(0);
  });

  it('drops when the queue is full in QUEUE mode', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const logger = createAuditLogger({
      mode: 'QUEUE',
      batchSize: 10,
      queue: { maxQueueSize: 1, flushIntervalMs: 10_000 },
      shutdownTimeoutMs: 1,
    });

    const first = await logger.log(baseInput);
    expect(first.ok).toBe(true);

    const second = await logger.log({ ...baseInput, action: 'user.logout' });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe('DROPPED');
    }

    const stats = logger.getStats();
    expect(stats.counters.audit_events_dropped_total).toBe(1);
  });

  it('rejects when the queue is full in BLOCK mode', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const logger = createAuditLogger({
      mode: 'BLOCK',
      batchSize: 10,
      queue: { maxQueueSize: 1, flushIntervalMs: 10_000 },
      shutdownTimeoutMs: 1,
    });

    const firstPromise = logger.log(baseInput);

    const second = await logger.log({ ...baseInput, action: 'user.logout' });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe('QUEUE_FULL');
    }

    await vi.advanceTimersByTimeAsync(10_000);
    await firstPromise;
  });

  it('splits batches by maxBatchBytes', async () => {
    const batches: number[] = [];
    const sink: AuditSink = {
      writeBatch: async (events) => {
        batches.push(events.length);
        return { ok: true, written: events.length, failed: 0, failures: [] };
      },
    };

    const logger = createAuditLogger({
      mode: 'QUEUE',
      sinks: [sink],
      batchSize: 10,
      maxBatchBytes: 1,
      queue: { maxQueueSize: 10, flushIntervalMs: 10_000 },
    });

    await logger.log(baseInput);
    await logger.log({ ...baseInput, action: 'user.logout' });

    await logger.flush();

    expect(batches).toEqual([1, 1]);
  });
});
