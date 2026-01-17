# @hexmon/audit-cli

Command-line verification tools for audit log integrity chains.

## Commands

### verify-file

Verify a JSONL file produced by the file sink.

```bash
pnpm --filter @hexmon/audit-cli exec audit-cli verify-file --path ./audit.jsonl
```

### verify-postgres

Verify audit records stored in Postgres.

```bash
pnpm --filter @hexmon/audit-cli exec audit-cli verify-postgres \
  --connection "postgres://user:pass@localhost:5432/audit" \
  --from "2024-01-01" \
  --to "2024-01-31" \
  --tenantId "tenant-123"
```

Optional flags: `--table` (defaults to `audit_events`).

### export-postgres

Export audit records from Postgres (JSON or CSV).

```bash
pnpm --filter @hexmon/audit-cli exec audit-cli export-postgres \
  --connection "postgres://user:pass@localhost:5432/audit" \
  --from "2024-01-01" \
  --to "2024-01-31" \
  --tenantId "tenant-123" \
  --format json
```

Optional flags: `--actorId`, `--action`, `--outcome`, `--pageSize`, `--cursor`,
`--table`, `--multiTenantStrict`.

### retention-postgres

Run a retention delete for records older than a timestamp.

```bash
pnpm --filter @hexmon/audit-cli exec audit-cli retention-postgres \
  --connection "postgres://user:pass@localhost:5432/audit" \
  --before "2024-01-01" \
  --dry-run
```

Optional flags: `--table` (defaults to `audit_events`).

## Notes
- Verification uses the same hash chain algorithm as `@hexmon/audit-core`.
- Hash chains are scoped per tenant when `tenantId` is present, otherwise per service.
- For distributed systems, see `docs/INTEGRITY.md` for ordering and coordination limits.
