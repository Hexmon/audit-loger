# Audit Log Monorepo

Enterprise-grade audit logging for JS/TS with a modular sink ecosystem. Includes a runtime-agnostic core, Node/Express/Next adapters, storage sinks, and verification tooling.

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
- `@hexmon_tech/audit-core`
- `@hexmon_tech/audit-node`
- `@hexmon_tech/audit-express`
- `@hexmon_tech/audit-next`
- `@hexmon_tech/audit-cli`
- `@hexmon_tech/audit-export-postgres`
- `@hexmon_tech/audit-sink-http`
- `@hexmon_tech/audit-sink-postgres`
- `@hexmon_tech/audit-sink-mongodb`
- `@hexmon_tech/audit-sink-file-jsonl`
- `@hexmon_tech/audit-buffer-disk`

## Examples
- Express integration: `examples/express-basic` and `examples/express`
- Next.js App Router handlers: `examples/nextjs-app-router` and `examples/next-app-router`

## Roadmap
- Add hosted control-plane integrations (SIEM/webhook targets).
- Expand retention automation helpers for Postgres.
- Add disk buffer compaction and rotation policies.
- Extend benchmarks across more deployment profiles.

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
