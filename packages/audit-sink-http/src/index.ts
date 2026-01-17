import type { AuditEvent, AuditErrorType, AuditSink, WriteFailure, WriteResult } from '@hexmon_tech/audit-core';

export type HttpAuditSinkConfig = {
  endpoint: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  fetch?: typeof fetch;
  name?: string;
};

const classifyStatus = (status: number): AuditErrorType => {
  if (status >= 500 || status === 408 || status === 429) {
    return 'TRANSIENT';
  }
  return 'PERMANENT';
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

const createAbortController = (signal?: AbortSignal, timeoutMs?: number) => {
  const controller = new AbortController();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs && timeoutMs > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  return { controller, timeoutId };
};

const serializeEvents = (() => {
  const cache = new WeakMap<AuditEvent, string>();
  return (events: AuditEvent[]): string => {
    const parts = events.map((event) => {
      const cached = cache.get(event);
      if (cached) {
        return cached;
      }
      const serialized = JSON.stringify(event);
      if (serialized === undefined) {
        throw new Error('Audit event is not JSON-serializable');
      }
      cache.set(event, serialized);
      return serialized;
    });
    return `{"events":[${parts.join(',')}]}`;
  };
})();

export const createHttpAuditSink = (config: HttpAuditSinkConfig): AuditSink => {
  const fetchImpl = config.fetch ?? fetch;

  if (!fetchImpl) {
    throw new Error('fetch is not available in this runtime');
  }

  return {
    name: config.name ?? 'http',
    writeBatch: async (events: AuditEvent[], signal?: AbortSignal): Promise<WriteResult> => {
      if (events.length === 0) {
        return { ok: true, written: 0, failed: 0, failures: [] };
      }

      const { controller, timeoutId } = createAbortController(signal, config.timeoutMs);

      try {
        const body = serializeEvents(events);
        const response = await fetchImpl(config.endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(config.headers ?? {}),
          },
          body,
          signal: controller.signal,
        });

        if (response.ok) {
          return { ok: true, written: events.length, failed: 0, failures: [] };
        }

        const errorType = classifyStatus(response.status);
        const message = `HTTP ${response.status}`;
        const failures = buildFailures(events, errorType, message);
        return {
          ok: false,
          written: 0,
          failed: events.length,
          failures,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'HTTP sink request failed';
        const failures = buildFailures(events, 'TRANSIENT', message);
        return {
          ok: false,
          written: 0,
          failed: events.length,
          failures,
        };
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    },
    flush: async () => {},
    shutdown: async () => {},
  };
};
