# @hexmon_tech/audit-sink-postgres

Postgres sink using the `pg` driver with idempotent inserts via `event_id`.

## Install

```bash
pnpm add @hexmon_tech/audit-sink-postgres
npm install @hexmon_tech/audit-sink-postgres
```

## Compatibility

- Node.js >= 18
- Postgres 15+ (migrations shipped under `migrations/*.sql`)

## Usage
```ts
import { createPostgresAuditSink } from '@hexmon_tech/audit-sink-postgres';

const sink = createPostgresAuditSink({
  connectionString: process.env.DATABASE_URL,
  tableName: 'audit_events',
});
```

## Migrations
Run the migration in `migrations/001_create_audit_logs.sql`:
```sql
-- From your migration tool
\i migrations/001_create_audit_logs.sql
```

The table enforces `event_id` uniqueness and indexes `occurred_at`.

### Optional partitioning
For large installs, see the monthly partition template in
`migrations/002_partition_by_month.sql` and `docs/RETENTION.md`.
