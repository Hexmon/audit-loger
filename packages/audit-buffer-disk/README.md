# @stackio/audit-buffer-disk

Disk-backed buffer for audit events in Node.js. Use this sink to persist events
locally and replay them to another sink when it becomes available.

## Usage
```ts
import { createAuditLogger } from '@stackio/audit-core';
import { createDiskBuffer } from '@stackio/audit-buffer-disk';
import { createHttpAuditSink } from '@stackio/audit-sink-http';

const buffer = createDiskBuffer({
  filePath: './tmp/audit-buffer.jsonl',
  maxBufferBytes: 50 * 1024 * 1024,
});

const audit = createAuditLogger({
  sinks: [buffer],
});

// Later (cron/background job) flush to a primary sink
const httpSink = createHttpAuditSink({ endpoint: 'https://audit.example.com/batch' });
await buffer.drain(httpSink, { batchSize: 200 });
```

## Notes
- `createDiskBuffer` returns an `AuditSink` plus a `drain` method for replay.
- Draining is at-least-once; downstream sinks should de-duplicate by `eventId`.
- `maxBufferBytes` protects disk usage and rejects writes when exceeded.
