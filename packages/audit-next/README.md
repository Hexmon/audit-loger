# @yourorg/audit-next

Next.js App Router helpers for audit logging. Provides a `withAudit` wrapper that
attaches `req.audit` and captures request context.

## Usage

```ts
import { createAuditLogger } from '@yourorg/audit-core';
import { withAudit } from '@yourorg/audit-next';

const audit = createAuditLogger({ service: 'api', environment: 'dev' });

export const POST = withAudit(audit, async (req) => {
  await req.audit.log({
    action: 'user.login',
    outcome: 'SUCCESS',
    actor: { type: 'user', id: 'user-123' },
  });

  return new Response('ok');
});
```

## Context Auto-Capture
The wrapper captures:
- `requestId` from `x-request-id` (or a custom extractor)
- `ip` from `req.ip` or `x-forwarded-for`
- `userAgent` from `user-agent`
- `route` and `method` (added to event metadata under `metadata.http`)

## Node vs Edge
`withAudit` uses `@yourorg/audit-node` (AsyncLocalStorage) when running in
Node.js. Edge runtimes do not support `AsyncLocalStorage`.
Install `@yourorg/audit-node` in Node.js deployments to enable context propagation.

If you use the Edge runtime:
- Set `runtime: 'edge'` in the options.
- Provide manual context and send events via the HTTP sink.

```ts
export const runtime = 'edge';

export const POST = withAudit(audit, handler, { runtime: 'edge' });
```

## Peer Dependencies
`next`, `react`, and `react-dom` are peer dependencies to avoid bundling framework
runtime code into the library. Install compatible versions in your Next.js app.
