# @hexmon_tech/audit-sink-mongodb

MongoDB sink using the official driver with a unique index on `eventId`.

## Usage
```ts
import { createMongoAuditSink } from '@hexmon_tech/audit-sink-mongodb';

const sink = createMongoAuditSink({
  uri: process.env.MONGO_URL,
  dbName: 'audit_logs',
  collectionName: 'audit_events',
});
```

## Behavior
- Ensures a unique index on `eventId` by default.
- Duplicate key errors are treated as successful writes (idempotent).
