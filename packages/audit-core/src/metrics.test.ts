import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuditEventInput, AuditSink, MetricsSnapshot } from './index';
import { createAuditLogger } from './index';

const baseInput: AuditEventInput = {
  action: 'user.login',
  outcome: 'SUCCESS',
  actor: { type: 'user', id: 'user-123' },
};

const matchLabels = (labels: Record<string, string>, expected: Record<string, string>) => {
  const keys = Object.keys(expected);
  if (Object.keys(labels).length !== keys.length) {
    return false;
  }
  return keys.every((key) => labels[key] === expected[key]);
};

const getMetricValue = (
  snapshot: MetricsSnapshot,
  name: string,
  labels: Record<string, string> = {},
): number => {
  const metric = snapshot.metrics.find((item) => item.name === name);
  if (!metric) {
    return 0;
  }
  const sample = metric.values.find((value) => matchLabels(value.labels, labels));
  return sample ? sample.value : 0;
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('metrics', () => {
  it('records retries and per-sink failures', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    vi.spyOn(Math, 'random').mockReturnValue(0);

    let attempts = 0;
    const sink: AuditSink = {
      name: 'primary',
      writeBatch: async (events) => {
        attempts += 1;
        if (attempts === 1) {
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
        return { ok: true, written: events.length, failed: 0, failures: [] };
      },
    };

    const logger = createAuditLogger({
      mode: 'BLOCK',
      sinks: [sink],
      batchSize: 1,
      queue: { flushIntervalMs: 1, maxQueueSize: 10 },
      retry: { maxAttempts: 2, baseBackoffMs: 5, maxBackoffMs: 5 },
    });

    const logPromise = logger.log(baseInput);
    await vi.advanceTimersByTimeAsync(50);
    const result = await logPromise;
    expect(result.ok).toBe(true);

    const metrics = logger.getMetrics();
    expect(getMetricValue(metrics, 'audit_retries_total')).toBe(1);
    expect(getMetricValue(metrics, 'audit_events_written_total')).toBe(1);
    expect(getMetricValue(metrics, 'audit_sink_batches_total', { sinkName: 'primary' })).toBe(2);
    expect(
      getMetricValue(metrics, 'audit_sink_event_failures_total', {
        sinkName: 'primary',
        errorType: 'TRANSIENT',
      }),
    ).toBe(1);
    expect(
      getMetricValue(metrics, 'audit_sink_events_written_total', { sinkName: 'primary' }),
    ).toBe(1);
  });

  it('records permanent failures without retries', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const sink: AuditSink = {
      name: 'primary',
      writeBatch: async (events) => ({
        ok: false,
        written: 0,
        failed: events.length,
        failures: events.map((event) => ({
          eventId: event.eventId,
          errorType: 'PERMANENT',
          message: 'permanent failure',
        })),
      }),
    };

    const logger = createAuditLogger({
      mode: 'BLOCK',
      sinks: [sink],
      batchSize: 1,
      queue: { flushIntervalMs: 1, maxQueueSize: 10 },
      retry: { maxAttempts: 1, baseBackoffMs: 1, maxBackoffMs: 1 },
    });

    const logPromise = logger.log(baseInput);
    await vi.advanceTimersByTimeAsync(20);
    const result = await logPromise;
    expect(result.ok).toBe(false);

    const metrics = logger.getMetrics();
    expect(getMetricValue(metrics, 'audit_write_failures_total')).toBe(1);
    expect(
      getMetricValue(metrics, 'audit_sink_event_failures_total', {
        sinkName: 'primary',
        errorType: 'PERMANENT',
      }),
    ).toBe(1);
    expect(
      getMetricValue(metrics, 'audit_sink_events_failed_total', { sinkName: 'primary' }),
    ).toBe(1);
  });
});
