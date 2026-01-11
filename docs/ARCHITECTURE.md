# Architecture

## Overview
This monorepo is designed as a layered audit logging system for JS/TS. The core package is runtime-agnostic and defines the event model, delivery semantics, redaction, and sink contracts. Runtime-specific integrations live in separate packages.

## Layers
- audit-core: event model, redaction rules, queueing modes, and sink interfaces.
- audit-node: Node-specific utilities (timers, process info, env helpers).
- audit-express / audit-next: framework adapters and request context mapping.
- sink packages: transport and storage backends with dedupe and backpressure behavior.

## Data Flow
1. Application creates an `AuditEventInput`.
2. Core normalizes fields (eventId, timestamps, defaults).
3. Redaction and payload limits are applied.
4. Optional integrity hashing is computed.
5. Events enter the queue writer and are flushed in batches.
6. Multi-sink fanout writes batches to sinks, with retries and circuit breakers.

## Delivery Semantics
- Default: at-least-once delivery.
- Dedupe: stable eventId; DB sinks enforce UNIQUE(event_id) and ignore duplicates.
- Modes: QUEUE (default), BLOCK, DROP.
- Fanout: BEST_EFFORT (default), ALL_OR_NOTHING.

## Security and Privacy
- Redaction is enabled by default.
- Raw request bodies are never logged by default.
- PII handling is explicit and sink-specific.
- Integrity hash chains are optional and scoped by tenant or service.

## Runtime Targets
- Node.js first-class support.
- Edge runtime support is limited to HTTP sink with manual context propagation.

## Observability
- In-memory metrics registry with optional Prometheus text output.
- Per-sink counters for write batches, failures, and circuit breaker state.
- `getStats()` provides a lightweight snapshot for debugging.

## Threat Model
See `docs/THREAT_MODEL.md` for a focused threat analysis and mitigations.

## Non-Goals (for now)
- Browser-only runtime adapters.
- Automatic tracing correlation across runtimes.
- Custom storage engines beyond listed sinks.
