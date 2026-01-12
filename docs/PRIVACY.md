# Privacy

Audit logs often include sensitive data. This project defaults to redaction and size limits to reduce accidental exposure.

## What Never to Log
- Raw request bodies (especially authentication or payment payloads)
- Passwords, OTPs, API keys, private keys, session cookies
- Full tokens or authorization headers
- Unredacted PII (unless strictly required and approved)

## Redaction Defaults
Redaction is enabled by default in `@stackio/audit-core`.

Default redaction keys:
- password
- otp
- token
- accessToken
- refreshToken
- authorization
- cookie
- set-cookie
- secret
- apiKey
- privateKey

Redaction supports:
- Path-based rules, e.g. `metadata.headers.authorization`
- Regex key patterns (case-insensitive)

## Configuration
```ts
createAuditLogger({
  redaction: {
    enabled: true,
    mask: '***',
    paths: ['metadata.headers.authorization'],
    keyPatterns: ['^secret_', 'token$'],
  },
  payloadLimits: {
    maxEventBytes: 64 * 1024,
    maxMetadataBytes: 32 * 1024,
    maxDiffBytes: 32 * 1024,
    oversizeEventBehavior: 'REJECT',
  },
});
```

## Payload Limits
- Oversize metadata/diff is replaced with a truncation marker.
- Events over `maxEventBytes` are rejected by default or truncated if configured.

See `docs/WHAT_TO_AUDIT.md` for event selection guidance.
