# Performance

This document covers the tuning knobs that control audit logging throughput and memory usage.

## Batching
The queue writer batches by count and size:
- `batchSize`: max number of events per batch (default 100).
- `maxBatchBytes`: max JSON bytes per batch (default 1MB).

If either limit is reached, the batch is flushed. Large individual events are still sent as single-item batches.

## Queue Sizing
Use queue limits to cap memory usage during outages:
- `queue.maxQueueSize`: max events held in memory (default 5000).
- `queue.maxQueueBytes`: optional byte cap for the queue.
- `queue.flushIntervalMs`: max delay before flushing a partial batch.

## Payload Limits
The core enforces size caps to prevent oversized events:
- `payloadLimits.maxEventBytes`: max size for a normalized event.
- `payloadLimits.maxMetadataBytes` and `payloadLimits.maxDiffBytes`: caps for large payloads.

## Suggested Starting Points
For HTTP sinks:
- `batchSize`: 100
- `maxBatchBytes`: 1–4MB
- `queue.flushIntervalMs`: 250–500ms

For DB sinks (Postgres/Mongo):
- `batchSize`: 50–200
- `maxBatchBytes`: 1MB
- `queue.flushIntervalMs`: 250ms

## Monitoring
Track these metrics from `audit.getStats()`:
- `audit_queue_size` and `audit_queue_bytes` to detect backpressure
- `audit_retries_total` and `audit_write_failures_total` for sink health
- `audit_circuit_open` to identify degraded sinks

## Benchmarking
Run the local throughput script after building:

```bash
pnpm -r build
node benchmarks/throughput.mjs --events 100000 --batchSize 100 --maxBatchBytes 1048576
```

Or via the root script:

```bash
pnpm bench -- --events 100000
```
