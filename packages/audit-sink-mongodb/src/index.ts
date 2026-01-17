import { MongoClient } from 'mongodb';
import type {
  AuditEvent,
  AuditErrorType,
  AuditSink,
  WriteFailure,
  WriteResult,
} from '@hexmon_tech/audit-core';

export type MongoAuditSinkConfig = {
  uri?: string;
  client?: MongoClient;
  dbName?: string;
  collectionName?: string;
  ensureIndexes?: boolean;
  name?: string;
};

const DEFAULT_DB = 'audit_logs';
const DEFAULT_COLLECTION = 'audit_events';

const isBulkWriteError = (error: unknown): error is { writeErrors: { index: number; code: number }[] } => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as { writeErrors?: unknown };
  return Array.isArray(candidate.writeErrors);
};

const classifyMongoError = (error: unknown): AuditErrorType => {
  const name = (error as { name?: string }).name;
  if (name && (name.includes('Network') || name.includes('ServerSelection'))) {
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

export const createMongoAuditSink = (config: MongoAuditSinkConfig): AuditSink => {
  if (!config.client && !config.uri) {
    throw new Error('MongoDB uri is required when no client is provided');
  }

  const client = config.client ?? new MongoClient(config.uri ?? '');
  const ownsClient = !config.client;
  const dbName = config.dbName ?? DEFAULT_DB;
  const collectionName = config.collectionName ?? DEFAULT_COLLECTION;
  const ensureIndexes = config.ensureIndexes ?? true;

  let connected = false;
  let indexReady: Promise<void> | null = null;

  const getCollection = async () => {
    if (!connected) {
      await client.connect();
      connected = true;
    }
    const collection = client.db(dbName).collection<AuditEvent>(collectionName);

    if (ensureIndexes && !indexReady) {
      indexReady = collection.createIndex({ eventId: 1 }, { unique: true }).then(() => undefined);
    }

    if (indexReady) {
      await indexReady;
    }

    return collection;
  };

  return {
    name: config.name ?? 'mongodb',
    writeBatch: async (events: AuditEvent[], signal?: AbortSignal): Promise<WriteResult> => {
      void signal;
      if (events.length === 0) {
        return { ok: true, written: 0, failed: 0, failures: [] };
      }

      const collection = await getCollection();

      try {
        await collection.insertMany(events, { ordered: false });
        return { ok: true, written: events.length, failed: 0, failures: [] };
      } catch (error) {
        if (isBulkWriteError(error)) {
          const failures: WriteFailure[] = [];

          for (const writeError of error.writeErrors) {
            if (writeError.code === 11000) {
              continue;
            }
            const event = events[writeError.index];
            if (event) {
              failures.push({
                eventId: event.eventId,
                errorType: 'PERMANENT',
                message: 'MongoDB write failed',
              });
            }
          }

          const failed = failures.length;
          const written = Math.max(0, events.length - failed);
          return {
            ok: failed === 0,
            written,
            failed,
            failures,
          };
        }

        const errorType = classifyMongoError(error);
        const message = error instanceof Error ? error.message : 'MongoDB write failed';
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
    shutdown: async () => {
      if (ownsClient) {
        await client.close();
      }
    },
  };
};
