# Compliance Mapping (High-Level)

This document maps audit logging capabilities to common compliance themes. It is not legal advice.

## SOC 2 / ISO 27001
- Logging and monitoring: structured audit events with consistent schema.
- Integrity controls: optional hash chaining for tamper evidence.
- Access controls: guidance for least-privilege DB roles and insert-only policies.
- Change management: versioned schema and explicit retention tags.

## HIPAA
- Audit controls: capture access to PHI with actor/target metadata.
- Integrity: hash chains help detect unauthorized modifications.
- Transmission security: use TLS for HTTP sinks.

## PCI DSS
- Track and monitor access: record authentication, authorization, and admin actions.
- Secure transmission and storage: TLS + restricted DB permissions.

## GDPR / Privacy Regulations
- Data minimization: avoid raw bodies; configurable redaction.
- Retention management: partitioning and retention guidance for deletion schedules.
- Access visibility: export helpers for subject access or internal investigations.

## Operational Guidance
- Define a policy for what to log and who can access it.
- Implement tenant scoping for SaaS environments.
- Validate audit coverage for critical actions (auth, billing, admin).
