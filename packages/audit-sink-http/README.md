# @hexmon_tech/audit-sink-http

Edge-friendly HTTP sink that POSTs audit event batches to a remote endpoint.

## Install

```bash
pnpm add @hexmon_tech/audit-sink-http
npm install @hexmon_tech/audit-sink-http
```

## Compatibility

- Node.js >= 18 or any runtime that provides `fetch`
- Works well in Edge, Deno, or Cloudflare Workers when paired with the core

## Usage
```ts
import { createHttpAuditSink } from '@hexmon_tech/audit-sink-http';

const sink = createHttpAuditSink({
  endpoint: 'https://audit.example.com/batch',
  headers: { Authorization: 'Bearer token' },
  timeoutMs: 5000,
});
```

## Behavior
- Uses `fetch` to POST `{ events: AuditEvent[] }` to the endpoint.
- 5xx, 408, 429, and timeouts are classified as `TRANSIENT` failures.
- 4xx (except 429) are classified as `PERMANENT` failures.
- Idempotency is expected to be enforced by the server using `eventId`.
