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

## Package matrix
| Package | Purpose | Install |
| --- | --- | --- |
| `@hexmon_tech/audit-core` | Runtime-agnostic schema, validation, and sink fan-out | `pnpm add @hexmon_tech/audit-core`<br>`npm install @hexmon_tech/audit-core` |
| `@hexmon_tech/audit-node` | AsyncLocalStorage-driven context helpers for Node | `pnpm add @hexmon_tech/audit-node`<br>`npm install @hexmon_tech/audit-node` |
| `@hexmon_tech/audit-express` | Express middleware that wires `req.audit` and request metadata | `pnpm add @hexmon_tech/audit-express`<br>`npm install @hexmon_tech/audit-express` |
| `@hexmon_tech/audit-next` | Next.js App Router helpers (Server/Edge) | `pnpm add @hexmon_tech/audit-next`<br>`npm install @hexmon_tech/audit-next` |
| `@hexmon_tech/audit-cli` | CLI tooling for verification, exports, and migrations | `pnpm add @hexmon_tech/audit-cli`<br>`npm install @hexmon_tech/audit-cli` |
| `@hexmon_tech/audit-export-postgres` | Postgres export helpers with cursor support | `pnpm add @hexmon_tech/audit-export-postgres`<br>`npm install @hexmon_tech/audit-export-postgres` |
| `@hexmon_tech/audit-sink-http` | Remote HTTP sink for batching audit events | `pnpm add @hexmon_tech/audit-sink-http`<br>`npm install @hexmon_tech/audit-sink-http` |
| `@hexmon_tech/audit-sink-postgres` | Idempotent Postgres sink with bundled migrations | `pnpm add @hexmon_tech/audit-sink-postgres`<br>`npm install @hexmon_tech/audit-sink-postgres` |
| `@hexmon_tech/audit-sink-mongodb` | MongoDB sink with resilient writes | `pnpm add @hexmon_tech/audit-sink-mongodb`<br>`npm install @hexmon_tech/audit-sink-mongodb` |
| `@hexmon_tech/audit-sink-file-jsonl` | JSONL file sink for durable local buffering | `pnpm add @hexmon_tech/audit-sink-file-jsonl`<br>`npm install @hexmon_tech/audit-sink-file-jsonl` |
| `@hexmon_tech/audit-buffer-disk` | Disk-backed buffer with replay support | `pnpm add @hexmon_tech/audit-buffer-disk`<br>`npm install @hexmon_tech/audit-buffer-disk` |

## Choosing packages
- **Core-only**: install `@hexmon_tech/audit-core` and pair it with whichever sinks (`audit-sink-*`, disk buffer, HTTP) suit your deployment.
- **Node runtime**: add `@hexmon_tech/audit-node` so request metadata flows through async work via `AsyncLocalStorage`.
- **Framework adapters**: use `@hexmon_tech/audit-express` for Express apps and `@hexmon_tech/audit-next` for Next.js App Router routes (Next 16+, React 18+). They rely on `audit-core` + `audit-node` but keep framework runtimes as peer dependencies.
- **Storage sinks**: pick only the sinks you need—HTTP batching, Postgres (migrations in `migrations/*.sql`), MongoDB, JSONL file output, or disk buffer—all ship just the core + sink logic.
- **Tooling**: `@hexmon_tech/audit-cli` offers CLI commands for file verification, Postgres migrations, and export helpers so you can run compliance checks in CI.

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
- `docs/PUBLISH_READINESS_REPORT.md`
- `docs/NPM_PUBLISH_GUIDE.md`
- `SECURITY.md`

## Development
- Install: `pnpm install`
- Lint: `pnpm lint`
- Test: `pnpm test`
- Build: `pnpm build`
- Smoke tests: `pnpm smoke-tests`
- Exports validation: `pnpm exports:check`
- Pack validation: `pnpm pack:check`

See `docs/ARCHITECTURE.md` for the high-level design.
