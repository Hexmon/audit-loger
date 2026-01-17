# Integrity Mode

Integrity mode provides tamper-evident hashing by chaining each event to the previous hash.
This makes modifications or missing entries detectable during verification.

## How It Works
- When enabled, audit-core computes `integrity.hash` using the event payload and the previous
  hash (`integrity.prevHash`).
- The payload is the normalized + redacted event (after size limits) plus `prevHash`.
- Hashes are computed after redaction/truncation so verification matches stored payloads.
- Hashes are scoped per tenant when `context.tenantId` is present. If no tenant is present,
  the chain is scoped per service.

## Configuration

```ts
const audit = createAuditLogger({
  integrityMode: 'hash-chain',
  integrity: {
    hashAlgorithm: 'SHA-256',
    // signer: async ({ payload, hash }) => ({ sig, keyId })
  },
});
```

`hashAlgorithm` defaults to `SHA-256`.

`integrityMode` can be:
- `none` (default)
- `hash-chain`
- `signed` (hash chain + optional signature hook)

`signed` requires a signer hook; if none is configured the logger rejects events.

## Verification
Use `@hexmon/audit-cli` to verify stored events:

```bash
pnpm --filter @hexmon/audit-cli exec audit-cli verify-file --path ./audit.jsonl
pnpm --filter @hexmon/audit-cli exec audit-cli verify-postgres --connection "..."
```

## Guarantees and Limits
- Detects tampering and missing entries within a chain scope.
- Does not prevent deletion or reordering by an attacker with full write access; it only
  makes those changes detectable.
- In-memory chaining is per process. Multi-instance deployments need external coordination
  if strict global ordering is required.
- If events are dropped due to queue overflow or shutdown, verification will show gaps.
