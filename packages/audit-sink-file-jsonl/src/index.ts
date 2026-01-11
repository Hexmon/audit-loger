import { appendFile } from 'node:fs/promises';
import type {
  AuditEvent,
  AuditErrorType,
  AuditSink,
  WriteFailure,
  WriteResult,
} from '@yourorg/audit-core';

export type FileJsonlSinkConfig = {
  filePath: string;
  dedupeCacheSize?: number;
  name?: string;
};

const DEFAULT_DEDUPE_CACHE_SIZE = 10_000;

const classifyFileError = (error: unknown): AuditErrorType => {
  const code = (error as { code?: string }).code;
  if (code && ['EACCES', 'EPERM', 'ENOENT'].includes(code)) {
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

export const createFileJsonlSink = (config: FileJsonlSinkConfig): AuditSink => {
  if (!config.filePath) {
    throw new Error('filePath is required for file JSONL sink');
  }

  const cacheSize = config.dedupeCacheSize ?? DEFAULT_DEDUPE_CACHE_SIZE;
  const dedupeCache = new Map<string, true>();

  const remember = (eventId: string) => {
    if (cacheSize <= 0) {
      return;
    }
    if (dedupeCache.has(eventId)) {
      dedupeCache.delete(eventId);
    }
    dedupeCache.set(eventId, true);
    if (dedupeCache.size > cacheSize) {
      const oldest = dedupeCache.keys().next().value as string | undefined;
      if (oldest) {
        dedupeCache.delete(oldest);
      }
    }
  };

  const serializeEvent = (() => {
    const cache = new WeakMap<AuditEvent, string>();
    return (event: AuditEvent): string => {
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
    };
  })();

  return {
    name: config.name ?? 'file-jsonl',
    writeBatch: async (events: AuditEvent[], signal?: AbortSignal): Promise<WriteResult> => {
      void signal;
      if (events.length === 0) {
        return { ok: true, written: 0, failed: 0, failures: [] };
      }

      const seenBatch = new Set<string>();
      const toWrite: AuditEvent[] = [];

      for (const event of events) {
        if (seenBatch.has(event.eventId)) {
          continue;
        }
        seenBatch.add(event.eventId);
        if (dedupeCache.has(event.eventId)) {
          continue;
        }
        toWrite.push(event);
      }

      try {
        if (toWrite.length > 0) {
          const payload = `${toWrite.map((event) => serializeEvent(event)).join('\n')}\n`;
          await appendFile(config.filePath, payload, { encoding: 'utf8' });
        }

        for (const event of events) {
          remember(event.eventId);
        }

        return { ok: true, written: events.length, failed: 0, failures: [] };
      } catch (error) {
        const errorType = classifyFileError(error);
        const message = error instanceof Error ? error.message : 'File write failed';
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
    shutdown: async () => {},
  };
};
