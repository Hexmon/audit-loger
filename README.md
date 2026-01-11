# Audit Log Monorepo

Enterprise-grade audit logging for JS/TS with a modular sink ecosystem. This repo is the initial scaffold: structure, tooling, and docs are in place, while runtime logic will be implemented in subsequent steps.

## Goals
- Correctness, security, reliability, performance, and clear documentation.
- TS + JS consumers (types + dual ESM/CJS builds).
- Node.js runtime first; Edge supported only via HTTP sink and manual context.
- Minimal dependency footprint in core.

## Hard Decisions (Locked)
- Delivery guarantee: at-least-once by default.
- Dedupe via stable eventId; DB sinks enforce UNIQUE(event_id) and ignore duplicates.
- Modes: QUEUE (default), BLOCK, DROP.
- Multi-sink fanout: BEST_EFFORT (default), ALL_OR_NOTHING.
- Core is runtime-agnostic; Node-specific utilities live in audit-node.
- No raw request bodies logged by default.
- Redaction enabled by default.
- Batching + async non-blocking in QUEUE mode.

## Packages
- `@yourorg/audit-core`
- `@yourorg/audit-node`
- `@yourorg/audit-express`
- `@yourorg/audit-next`
- `@yourorg/audit-cli`
- `@yourorg/audit-export-postgres`
- `@yourorg/audit-sink-http`
- `@yourorg/audit-sink-postgres`
- `@yourorg/audit-sink-mongodb`
- `@yourorg/audit-sink-file-jsonl`
- `@yourorg/audit-buffer-disk` (scaffold only)

## Examples
- Express integration: `examples/express-basic`
- Next.js App Router route handler: `examples/nextjs-app-router`

## Roadmap
- Define core event model and redaction pipeline.
- Implement queueing, batching, and retry policy.
- Add sink implementations with dedupe and backpressure semantics.
- Add Node/Express/Next adapters and context propagation.
- Harden docs, observability, and benchmarks.

## Docs
- `docs/ARCHITECTURE.md`
- `docs/WHAT_TO_AUDIT.md`
- `docs/PRIVACY.md`
- `docs/RELIABILITY.md`
- `docs/INTEGRITY.md`
- `docs/RETENTION.md`
- `docs/METRICS.md`
- `docs/PERFORMANCE.md`
- `docs/STORAGE_SECURITY.md`
- `docs/THREAT_MODEL.md`
- `docs/COMPLIANCE_MAPPING.md`
- `docs/RELEASE_CHECKLIST.md`
- `SECURITY.md`

## Development
- Install: `pnpm install`
- Lint: `pnpm lint`
- Test: `pnpm test`
- Build: `pnpm build`

See `docs/ARCHITECTURE.md` for the high-level design.
