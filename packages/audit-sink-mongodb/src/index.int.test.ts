import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoClient } from 'mongodb';
import type { AuditEvent } from '@stackio/audit-core';
import { createMongoAuditSink } from './index';

const MONGO_URL = process.env.TEST_MONGO_URL;

const run = MONGO_URL ? describe : describe.skip;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForMongo = async (uri: string, timeoutMs = 20_000) => {
  const started = Date.now();
  let lastError: unknown;
  while (Date.now() - started < timeoutMs) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
    try {
      await client.connect();
      await client.db('admin').command({ ping: 1 });
      await client.close();
      return;
    } catch (error) {
      lastError = error;
      await client.close().catch(() => undefined);
      await sleep(500);
    }
  }
  throw new Error(
    `MongoDB did not become ready: ${
      lastError instanceof Error ? lastError.message : 'unknown error'
    }`,
  );
};

run('mongodb sink integration', () => {
  let client: MongoClient;
  let collectionName: string;
  const dbName = 'audit_logs_test';

  beforeAll(async () => {
    await waitForMongo(MONGO_URL!);
    client = new MongoClient(MONGO_URL!);
    await client.connect();
    collectionName = `audit_events_test_${Date.now()}`;
  }, 30_000);

  afterAll(async () => {
    if (client) {
      await client.db(dbName).collection(collectionName).drop().catch(() => undefined);
      await client.close();
    }
  });

  it(
    'inserts unordered batches and ignores duplicates',
    async () => {
      const sink = createMongoAuditSink({
        client,
        dbName,
        collectionName,
        ensureIndexes: true,
        name: 'mongo-test',
      });

      const baseEvent: AuditEvent = {
        schemaVersion: 1,
        eventId: 'evt-1',
        action: 'user.login',
        outcome: 'SUCCESS',
        actor: { type: 'user', id: 'user-1' },
        context: { occurredAt: new Date().toISOString() },
      };

      const duplicateEvent: AuditEvent = {
        ...baseEvent,
        outcome: 'FAILURE',
      };

      const result = await sink.writeBatch([baseEvent, duplicateEvent]);
      expect(result.ok).toBe(true);
      expect(result.failures).toHaveLength(0);

      const collection = client.db(dbName).collection(collectionName);
      const count = await collection.countDocuments({ eventId: 'evt-1' });
      expect(count).toBe(1);

      const indexes = await collection.indexes();
      const hasUnique = indexes.some(
        (index) => index.key?.eventId === 1 && index.unique === true,
      );
      expect(hasUnique).toBe(true);
    },
    30_000,
  );
});
