# Threat Model

This document outlines the high-level threats and mitigations for the audit logging system.
It is not a formal security assessment.

## Scope
- Audit event creation, normalization, redaction, and delivery.
- Storage in sinks (file, HTTP, Postgres, MongoDB).
- Integrity hash chaining and verification.

## Assets
- Audit events (including actor/target metadata).
- Integrity chain state and hash material.
- Retention policies and export outputs.

## Trust Boundaries
- Application runtime (producer) to sink transport.
- Sink transport to storage backend.
- Operator access to stored audit data.

## Threats and Mitigations
- Unauthorized access to audit data
  - Mitigation: least-privilege DB roles, TLS for HTTP/file endpoints, network isolation.
- PII or secret leakage
  - Mitigation: redaction enabled by default, explicit payload limits, no raw request bodies.
- Tampering or deletion of audit events
  - Mitigation: hash chaining (optional), append-only storage, insert-only permissions.
- Event loss under load
  - Mitigation: bounded queue, retry with backoff, circuit breakers, and explicit modes.
- Replay or duplicate events
  - Mitigation: stable `eventId`, UNIQUE constraints in DB sinks.
- Cross-tenant data exposure
  - Mitigation: tenant scoping in context, strict export requirements, separate chains by tenant.

## Assumptions
- The application generates accurate actor/target context.
- Storage credentials are rotated and protected.
- Multi-instance deployments coordinate ordering if strict chain ordering is required.

## Out of Scope
- End-user identity proofing.
- End-to-end encryption or key management.
- Runtime compromise of application hosts.
