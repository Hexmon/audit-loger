# Security

## Reporting
If you discover a security issue, please email security@yourorg.example. Do not open a public issue.

## Data Handling
- Redaction is enabled by default.
- Raw request bodies are never logged by default.
- Consumers should avoid logging secrets or full tokens in custom fields.

## Dependency Security
- Run `pnpm audit` regularly and before releases; investigate all high/critical findings.
- Keep `pnpm-lock.yaml` committed to preserve verified dependency graphs.
- Prefer minimal dependencies in `@yourorg/audit-core` and review transitive updates.
- Enable automated dependency alerts (Dependabot/Renovate) for timely patches.

## Release & Supply Chain
- Publish from CI with `NPM_TOKEN` and least-privilege permissions.
- Use the Changesets release workflow to track versioned changes.
- Consider enabling npm provenance for public releases if available.

## Storage Guidance
- DB sinks should enforce UNIQUE(event_id) to prevent duplicate writes.
- File and HTTP sinks should use TLS and restricted access controls.
- Rotate credentials regularly and use least-privilege access.

## Threat Model (High Level)
- Unauthorized access to audit data
- Accidental PII leakage
- Duplicate or missing events under high load

See `docs/ARCHITECTURE.md` for system-level design context.
