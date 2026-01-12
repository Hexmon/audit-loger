import { describe, expect, it } from 'vitest';
import { MongoClient } from 'mongodb';
import type { AuditEvent } from '@stackio/audit-core';
import { createMongoAuditSink } from './index';

const connectionString = process.env.MONGO_TEST_URL ?? process.env.TEST_MONGO_URL;
const describeMaybe = connectionString ? describe : describe.skip;

const baseEvent: AuditEvent = {
  schemaVersion: 1,
  eventId: '01HZX0W3D4C9B3Z5C3G0Y1N9QX',
  action: 'user.login',
  outcome: 'SUCCESS',
  actor: { type: 'user', id: 'user-1' },
  context: { occurredAt: new Date().toISOString() },
};

describeMaybe('createMongoAuditSink', () => {
  it('writes a batch when a test database is configured', async () => {
    if (!connectionString) {
      return;
    }

    const client = new MongoClient(connectionString);
    try {
      await client.connect();

      const dbName = 'audit_logs_test';
      const collectionName = 'audit_events';
      await client.db(dbName).collection(collectionName).deleteMany({});

      const sink = createMongoAuditSink({
        client,
        dbName,
        collectionName,
      });

      const result = await sink.writeBatch([baseEvent]);
      expect(result.ok).toBe(true);
    } finally {
      await client.close();
    }
  });
});
