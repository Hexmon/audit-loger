# Retention Guidance

Audit logs grow quickly. Use partitioning and automated cleanup to keep storage predictable.

## Recommended Postgres Partitioning (Monthly)
For large deployments, partition `audit_events` by `occurred_at` month. This enables fast retention
operations and keeps index sizes manageable.

Template SQL is provided in:
- `packages/audit-sink-postgres/migrations/002_partition_by_month.sql`

Note: partitioning by `occurred_at` requires a composite primary key
(`event_id`, `occurred_at`). If you need global `event_id` uniqueness across
partitions, use a dedicated dedupe table or tooling like `pg_partman`.

### Retention Workflow
- Create monthly partitions ahead of time (or via a scheduler).
- Drop old partitions once they exceed retention policy.

Example:
```sql
DROP TABLE IF EXISTS audit_events_2023_12;
```

### CLI Helper
The CLI includes a basic retention command for non-partitioned tables:
```bash
audit-cli retention-postgres --connection "<conn>" --before "2024-01-01"
```
Use partition drops for large tables where possible.

## Viewer Filtering Examples
Common filters for audit viewers:
- Per-actor activity
  ```sql
  SELECT * FROM audit_events
  WHERE actor_id = 'user-123'
    AND occurred_at >= '2024-01-01'
    AND occurred_at <= '2024-01-31'
  ORDER BY occurred_at DESC;
  ```

- Security-relevant actions
  ```sql
  SELECT * FROM audit_events
  WHERE action IN ('user.login', 'user.password.reset')
    AND outcome IN ('FAILURE', 'DENIED')
    AND occurred_at >= NOW() - INTERVAL '7 days'
  ORDER BY occurred_at DESC;
  ```

- Tenant-scoped exports
  ```sql
  SELECT * FROM audit_events
  WHERE tenant_id = 'tenant-1'
    AND occurred_at BETWEEN '2024-01-01' AND '2024-01-31'
  ORDER BY occurred_at ASC;
  ```

For application usage, see `@stackio/audit-export-postgres` for a typed export helper.
