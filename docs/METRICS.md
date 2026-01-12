# Metrics

Audit metrics are stable and versioned by name. Counters monotonically increase; gauges represent
current state.

## Global Counters
- `audit_events_total`: total audit log attempts.
- `audit_events_written_total`: events successfully written (after fanout rules).
- `audit_events_dropped_total`: events dropped before writing.
- `audit_invalid_total`: invalid events rejected by validation/payload limits.
- `audit_write_failures_total`: events that failed permanently after retries.
- `audit_retries_total`: retry attempts for transient failures.

## Global Gauges
- `audit_queue_size`: current queued events.
- `audit_queue_bytes`: current queued bytes.
- `audit_circuit_open`: number of open circuit breakers.

## Per-Sink Metrics
All per-sink metrics include the `sinkName` label.
If a sink does not specify `name`, it is assigned `sink-<index>` by position.

- `audit_sink_batches_total{sinkName}`: batches routed to a sink (includes circuit-open short-circuits).
- `audit_sink_events_written_total{sinkName}`: events written by a sink.
- `audit_sink_events_failed_total{sinkName}`: events failed by a sink.
- `audit_sink_event_failures_total{sinkName,errorType}`: failures by error type (`TRANSIENT` or `PERMANENT`).
- `audit_sink_circuit_open{sinkName}`: sink circuit open state (0/1).

Global counters are per event after fanout rules. Per-sink counters are per sink attempt.

## Prometheus Output
Use `audit.getMetricsPrometheus()` for a text exposition format that can be scraped by Prometheus.

```ts
const audit = createAuditLogger();
const metricsText = audit.getMetricsPrometheus();
```

For programmatic access, use `audit.getMetrics()` and read the snapshot in your own exporter.

To plug in a custom exporter, pass a `metrics` registry to `createAuditLogger`.

```ts
import { createAuditLogger, createMetricsRegistry } from '@stackio/audit-core';

const registry = createMetricsRegistry();
const audit = createAuditLogger({ metrics: registry });
```
