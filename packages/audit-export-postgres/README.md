# @hexmon_tech/audit-export-postgres

Helpers to export audit logs from Postgres with safe, paginated queries.

## Install

```bash
pnpm add @hexmon_tech/audit-export-postgres
npm install @hexmon_tech/audit-export-postgres
```

## Compatibility

- Node.js >= 18
- Postgres 15+ (includes `migrations/*.sql` for the canonical audit table)

## Usage
```ts
import { exportAuditLogs } from '@hexmon_tech/audit-export-postgres';

const result = await exportAuditLogs({
  connectionString: process.env.DATABASE_URL,
  from: '2024-01-01',
  to: '2024-01-31',
  tenantId: 'tenant-123',
  format: 'json',
  pageSize: 1000,
});

if (result.ok) {
  console.log(result.data);
  console.log('next cursor', result.nextCursor);
}
```

## Options
- `from` / `to`: required time range (ISO or Postgres-compatible timestamps)
- `tenantId`: optional filter; required when `multiTenantStrict` is enabled
- `actorId`, `action`, `outcome`: optional filters
- `format`: `json` or `csv`
- `pageSize`: default 1000 (max 10,000)
- `cursor`: continue after a previous export page

## Notes
- Queries are keyset-paginated by `(occurred_at, event_id)`.
- `multiTenantStrict` helps prevent accidental cross-tenant export.
