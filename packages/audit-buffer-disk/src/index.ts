import { createReadStream } from 'node:fs';
import { appendFile, mkdir, rename, stat, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';
import type {
  AuditEvent,
  AuditErrorType,
  AuditSink,
  WriteFailure,
  WriteResult,
} from '@hexmon_tech/audit-core';

export const PACKAGE_NAME = '@hexmon_tech/audit-buffer-disk';

export type DiskBufferConfig = {
  filePath: string;
  maxBufferBytes?: number;
  name?: string;
};

export type DiskBufferDrainOptions = {
  batchSize?: number;
  signal?: AbortSignal;
};

export type DiskBufferDrainResult = {
  ok: boolean;
  written: number;
  failed: number;
  errors: string[];
};

export type DiskBufferSink = AuditSink & {
  drain: (
    target: AuditSink,
    options?: DiskBufferDrainOptions,
  ) => Promise<DiskBufferDrainResult>;
  getBufferedBytes: () => Promise<number>;
};

const DEFAULT_BATCH_SIZE = 200;

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

const safeStat = async (filePath: string) => {
  try {
    return await stat(filePath);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const getFileSize = async (filePath: string): Promise<number> => {
  const stats = await safeStat(filePath);
  return stats ? stats.size : 0;
};

const ensureDir = async (filePath: string): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });
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

const buildPayload = (events: AuditEvent[]): string =>
  `${events.map((event) => serializeEvent(event)).join('\n')}\n`;

const appendEvents = async (
  filePath: string,
  events: AuditEvent[],
  maxBufferBytes?: number,
): Promise<
  | { ok: true }
  | { ok: false; error: string; errorType: AuditErrorType }
> => {
  if (events.length === 0) {
    return { ok: true };
  }

  const payload = buildPayload(events);
  const payloadBytes = Buffer.byteLength(payload, 'utf8');

  try {
    const currentSize = await getFileSize(filePath);
    if (maxBufferBytes && maxBufferBytes > 0 && currentSize + payloadBytes > maxBufferBytes) {
      return {
        ok: false,
        error: 'disk buffer size limit exceeded',
        errorType: 'PERMANENT',
      };
    }

    await ensureDir(filePath);
    await appendFile(filePath, payload, { encoding: 'utf8' });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'disk buffer write failed',
      errorType: classifyFileError(error),
    };
  }
};

export const createDiskBuffer = (config: DiskBufferConfig): DiskBufferSink => {
  if (!config.filePath) {
    throw new Error('filePath is required for disk buffer');
  }

  const filePath = config.filePath;
  const maxBufferBytes = config.maxBufferBytes;

  const writeBatch = async (
    events: AuditEvent[],
    signal?: AbortSignal,
  ): Promise<WriteResult> => {
    void signal;
    if (events.length === 0) {
      return { ok: true, written: 0, failed: 0, failures: [] };
    }

    const result = await appendEvents(filePath, events, maxBufferBytes);
    if (result.ok) {
      return { ok: true, written: events.length, failed: 0, failures: [] };
    }

    const errorType = result.errorType;
    const failures = buildFailures(events, errorType, result.error);
    return {
      ok: false,
      written: 0,
      failed: events.length,
      failures,
    };
  };

  const drain = async (
    target: AuditSink,
    options: DiskBufferDrainOptions = {},
  ): Promise<DiskBufferDrainResult> => {
    const batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE);
    const stats = await safeStat(filePath);
    if (!stats || stats.size === 0) {
      return { ok: true, written: 0, failed: 0, errors: [] };
    }

    const tempPath = `${filePath}.drain.${Date.now()}`;
    try {
      await rename(filePath, tempPath);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ENOENT') {
        return { ok: true, written: 0, failed: 0, errors: [] };
      }
      return {
        ok: false,
        written: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'drain rename failed'],
      };
    }

    const errors: string[] = [];
    const rebuffer: AuditEvent[] = [];
    let written = 0;
    let failed = 0;
    let allowWrite = true;
    let ok = true;

    let batch: AuditEvent[] = [];
    const flushBatch = async () => {
      if (batch.length === 0) {
        return;
      }
      if (!allowWrite) {
        rebuffer.push(...batch);
        batch = [];
        return;
      }

      try {
        const result = await target.writeBatch(batch, options.signal);
        if (!result.ok) {
          ok = false;
          failed += batch.length;
          rebuffer.push(...batch);
          const failureMessages = result.failures
            .map((failure: WriteFailure) => failure.message)
            .filter(Boolean);
          if (failureMessages.length > 0) {
            errors.push(...failureMessages);
          } else {
            errors.push('drain target returned failure');
          }
          allowWrite = false;
        } else {
          written += batch.length;
        }
      } catch (error) {
        ok = false;
        failed += batch.length;
        rebuffer.push(...batch);
        errors.push(error instanceof Error ? error.message : 'drain target failed');
        allowWrite = false;
      } finally {
        batch = [];
      }
    };

    const reader = createInterface({
      input: createReadStream(tempPath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    for await (const line of reader) {
      if (options.signal?.aborted) {
        ok = false;
        allowWrite = false;
        errors.push('drain aborted');
      }

      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      let event: AuditEvent;
      try {
        event = JSON.parse(trimmed) as AuditEvent;
      } catch (error) {
        ok = false;
        failed += 1;
        errors.push(error instanceof Error ? error.message : 'invalid JSON');
        continue;
      }

      if (!allowWrite) {
        rebuffer.push(event);
        continue;
      }

      batch.push(event);
      if (batch.length >= batchSize) {
        await flushBatch();
      }
    }

    await flushBatch();

    let rebufferOk = true;
    if (rebuffer.length > 0) {
      const result = await appendEvents(filePath, rebuffer, maxBufferBytes);
      if (!result.ok) {
        ok = false;
        rebufferOk = false;
        errors.push(result.error);
      }
    }

    if (rebufferOk) {
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors to avoid masking drain results.
      }
    }

    return { ok: ok && errors.length === 0, written, failed, errors };
  };

  return {
    name: config.name ?? 'disk-buffer',
    writeBatch,
    flush: async () => {},
    shutdown: async () => {},
    drain,
    getBufferedBytes: () => getFileSize(filePath),
  };
};
