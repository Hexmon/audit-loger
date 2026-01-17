# @hexmon_tech/audit-express

Express middleware for audit logging. Attaches `req.audit` with request-scoped
context populated from headers and extractor functions.

## Install

```bash
pnpm add @hexmon_tech/audit-express
npm install @hexmon_tech/audit-express
```

## Compatibility

- Node.js >= 18
- Express 4.18+ required as a peer dependency
- Automatically extends `@hexmon_tech/audit-core` and `@hexmon_tech/audit-node`

## Usage

```ts
import express from 'express';
import { createAuditLogger } from '@hexmon_tech/audit-core';
import { createAuditMiddleware } from '@hexmon_tech/audit-express';

const app = express();
const audit = createAuditLogger({ service: 'api', environment: 'dev' });

app.use(
  createAuditMiddleware(audit, {
    getActor: (req) => req.user,
    getTenantId: (req) => req.headers['x-tenant-id'] as string | undefined,
    getOrgId: (req) => req.headers['x-org-id'] as string | undefined,
    getSessionId: (req) => req.session?.id,
  }),
);

app.post('/login', async (req, res) => {
  await req.audit.log({
    action: 'user.login',
    outcome: 'SUCCESS',
    actor: { type: 'user', id: req.user.id },
    metadata: { authMethod: 'password' },
  });
  res.json({ ok: true });
});
```

## Context Auto-Capture
The middleware captures:
- `requestId` from `x-request-id` (or a custom extractor)
- `ip` from `req.ip` or `x-forwarded-for`
- `userAgent` from `user-agent`
- `route` and `method` (added to event metadata under `metadata.http`)

## Type Augmentation
`req.audit` is typed via module augmentation so handlers can access the audit logger directly.

## Peer Dependencies
`express` is a peer dependency so the middleware does not bundle framework runtime code.
Install Express in your application or workspace root.
