# What to Audit

Audit logs should record security-relevant and business-critical actions with low-cardinality action names and clear outcomes.

## Recommended Events
- Authentication: login, logout, MFA changes, password resets.
- Authorization: access grants/revokes, role changes, permission changes.
- Data changes: create/update/delete of sensitive records.
- Configuration: feature flag changes, billing plan changes, API key rotations.
- Administrative actions: user invites, org creation, SSO configuration.
- Security actions: failed logins, denied access, policy violations.

## Action Naming
Use low-cardinality action names that describe the action, not the specific resource.

Good:
- `user.login`
- `org.member.invite`
- `billing.invoice.create`

Avoid (high-cardinality):
- `user.login.550e8400-e29b-41d4-a716-446655440000`
- `invoice.create.8b2f6f5f-9e11-4e3f-9c1c-1a9a8f0c1c2d`

## Minimal Example
```
{
  "action": "user.login",
  "outcome": "SUCCESS",
  "actor": { "type": "user", "id": "user-123" },
  "context": { "occurredAt": "2024-06-01T12:34:56.000Z" }
}
```

## Privacy and Safety
- Do not log raw request bodies by default.
- Use redaction for secrets, tokens, and PII.
- Prefer stable identifiers over raw values where possible.
