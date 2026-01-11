# Storage Security

Audit logs should be stored with strict access controls to preserve integrity and confidentiality.

## Recommended DB Permissions
- Prefer insert-only roles for audit writers.
- Disallow update and delete permissions for audit tables.
- Keep read access limited to trusted services and administrators.

## Append-Only Guidance
- Use append-only storage semantics wherever possible.
- For relational databases, enforce `UNIQUE(event_id)` and avoid mutable rows.
- Consider immutable storage tiers for long-term retention.

## Operational Controls
- Use TLS for all connections.
- Rotate credentials regularly.
- Apply least-privilege access for sink credentials.

See `SECURITY.md` for the broader security posture.
