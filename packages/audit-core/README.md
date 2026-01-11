# @yourorg/audit-core

Runtime-agnostic audit event schema, validation helpers, and policy knobs. This package defines the canonical event shape and developer-facing logger API.

## Usage

```ts
import { createAuditLogger } from '@yourorg/audit-core';

const audit = createAuditLogger({
  service: 'billing-api',
  environment: 'production',
  strictValidation: false,
  sinks: [
    /* sink instances */
  ],
});

const result = await audit.log({
  action: 'billing.invoice.create',
  outcome: 'SUCCESS',
  actor: { type: 'user', id: 'user-123' },
  target: { type: 'invoice', id: 'inv-456' },
  context: { requestId: 'req-789' },
});

if (!result.ok) {
  console.error(result.error);
}

const child = audit.child({ defaultContext: { tenantId: 'tenant-1' } });
await child.log({
  action: 'user.login',
  outcome: 'SUCCESS',
  actor: { type: 'user', id: 'user-456' },
});

const stats = audit.getStats();
console.log(stats.counters.audit_events_total);

await audit.flush();
await audit.shutdown();
```

### Result Shape
`audit.log` returns a structured result:
- `{ ok: true, event, warnings }`
- `{ ok: false, error, warnings }`

### Metrics
Use the in-memory metrics registry for counters/gauges and Prometheus output:

```ts
const metrics = audit.getMetrics();
const promText = audit.getMetricsPrometheus();
```

See `docs/METRICS.md` for metric names and labels.

## Schema

### AuditEvent (normalized)
Required fields are fully populated in the normalized event used by sinks and storage.

- `schemaVersion` (number): version of the event schema.
- `eventId` (string): stable identifier for dedupe across sinks (default ULID).
- `action` (string): low-cardinality action name (e.g., `user.login`, `billing.invoice.create`).
- `outcome` (`SUCCESS` | `FAILURE` | `DENIED` | `ERROR`)
- `actor` (AuditActor): who performed the action.
- `target` (AuditTarget, optional): entity acted upon.
- `context` (AuditContext): request/session/tenant/source metadata.
- `metadata` (object, optional): extra structured fields.
- `diff` (object, optional): structured before/after data for updates.
- `metadataTruncated` / `diffTruncated` (boolean, optional): size limit flags.
- `integrity` (AuditIntegrity, optional): hash chain/signature metadata.
- `retentionTag` (string, optional): storage retention hint.

### AuditEventInput (developer input)
Input allows partial fields so the core can apply defaults later (e.g., `eventId`, `context.occurredAt`).

## Policy Knobs
- `Mode`: `QUEUE` | `BLOCK` | `DROP`
- `FanoutMode`: `BEST_EFFORT` | `ALL_OR_NOTHING`
- `StrictValidation`: boolean
- `retentionTag`: optional string
- `strictActionNaming`: when true, UUID-like action names are rejected
- `integrityMode`: `none` | `hash-chain` | `signed`
- `integrity`: integrity hashing configuration (hash algorithm, signer hook)
- `sinks`: array of `AuditSink` implementations
- `sinkConcurrency`: max concurrent sink writes (default 4)
- `batchSize`: batch size for writes (default 100)
- `maxBatchBytes`: max bytes per batch (default 1MB)
- `queue`: queue sizing and flush interval settings
- `retry`: transient retry policy
- `circuitBreaker`: per-sink circuit breaker thresholds
- `shutdownTimeoutMs`: drain timeout for shutdown
- `metrics`: custom metrics registry (defaults to in-memory)

## Presets
Use presets as a baseline and override per deployment:

```ts
import { createAuditLogger, saasMultiTenantStrict } from '@yourorg/audit-core';

const audit = createAuditLogger({
  ...saasMultiTenantStrict(),
  sinks: [/* sinks */],
});
```

Available presets:
- `saasMultiTenantStrict()`: strict validation, all-or-nothing fanout, hash-chain integrity.
- `onPremSelfHosted()`: queue mode with conservative backpressure defaults.
- `highThroughput()`: larger batches, higher concurrency, aggressive queueing.

## Privacy by Default
Redaction is enabled by default and runs before any write. Sensitive keys are masked (`***`) and can be configured with paths or regex patterns.

Default redaction keys:
`password`, `otp`, `token`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `set-cookie`, `secret`, `apiKey`, `privateKey`

```ts
const audit = createAuditLogger({
  redaction: {
    enabled: true,
    mask: '***',
    paths: ['metadata.headers.authorization'],
    keyPatterns: ['^secret_', 'token$'],
  },
  payloadLimits: {
    maxEventBytes: 64 * 1024,
    maxMetadataBytes: 32 * 1024,
    maxDiffBytes: 32 * 1024,
    oversizeEventBehavior: 'REJECT',
  },
});
```

Oversize `metadata` and `diff` payloads are replaced with a truncation marker and flagged on the event.

See `docs/PRIVACY.md` and `docs/STORAGE_SECURITY.md` for broader guidance.

## Integrity (Hash Chain)
Enable tamper-evident hash chaining:

```ts
const audit = createAuditLogger({
  integrityMode: 'hash-chain',
  integrity: {
    hashAlgorithm: 'SHA-256',
  },
});
```

Hash chains are scoped per tenant when `context.tenantId` is present; otherwise they are scoped per
service. For distributed systems, see `docs/INTEGRITY.md` for coordination limits.

Signed mode requires a signer hook (`integrity.signer`).

## Reliability
Queueing, retries, and circuit breakers are enabled by default:

```ts
const audit = createAuditLogger({
  queue: {
    maxQueueSize: 5000,
    maxQueueBytes: 2 * 1024 * 1024,
    flushIntervalMs: 250,
    overflowPolicy: 'DROP',
  },
  maxBatchBytes: 1024 * 1024,
  retry: {
    maxAttempts: 8,
    baseBackoffMs: 250,
    maxBackoffMs: 30_000,
  },
  circuitBreaker: {
    failureThreshold: 5,
    cooldownMs: 10_000,
    halfOpenMaxInFlight: 1,
  },
  shutdownTimeoutMs: 5000,
});
```

See `docs/RELIABILITY.md` for mode behavior, retry semantics, and circuit breaker guidance.
See `docs/PERFORMANCE.md` for batching and throughput tuning.

## Multi-Sink Usage
```ts
import { createAuditLogger } from '@yourorg/audit-core';
import { createHttpAuditSink } from '@yourorg/audit-sink-http';
import { createPostgresAuditSink } from '@yourorg/audit-sink-postgres';

const httpSink = createHttpAuditSink({ endpoint: 'https://audit.example.com/batch' });
const pgSink = createPostgresAuditSink({ connectionString: process.env.DATABASE_URL });

const audit = createAuditLogger({
  fanout: 'BEST_EFFORT',
  sinks: [httpSink, pgSink],
});
```

## Sink Contract
Sinks implement a batch writer with explicit error classification:
```ts
type AuditSink = {
  writeBatch(events: AuditEvent[], signal?: AbortSignal): Promise<WriteResult>;
  flush?(): Promise<void>;
  shutdown?(): Promise<void>;
};
```

## Validation
`validateRequiredFields` and `validateEventInput` provide lightweight runtime checks. Action names are expected to be low-cardinality; `validateEventInput` warns by default if an action includes a UUID-like identifier, and can reject when `strictActionNaming` is enabled.

## What to Audit
See `docs/WHAT_TO_AUDIT.md` for guidance on what to log.
