# @hexmon_tech/audit-sink-file-jsonl

Append-only JSONL file sink for Node.js environments.

## Usage
```ts
import { createFileJsonlSink } from '@hexmon_tech/audit-sink-file-jsonl';

const sink = createFileJsonlSink({
  filePath: '/var/log/audit.jsonl',
  dedupeCacheSize: 10_000,
});
```

## Notes
- Best-effort in-memory dedupe avoids duplicate `eventId` entries during a process lifetime.
- Serverless filesystems are often ephemeral; prefer remote sinks in serverless environments.
