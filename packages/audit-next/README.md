# @hexmon_tech/audit-next

Next.js App Router helpers for audit logging. Provides a `withAudit` wrapper that
attaches `req.audit` and captures request context.

## Install

```bash
pnpm add @hexmon_tech/audit-next
npm install @hexmon_tech/audit-next
```

## Compatibility

- Node.js >= 18
- Next.js >= 16, React 18+, and `@hexmon_tech/audit-node` (optional peer) for Node contexts
- Edge runtimes supported through manual context plus HTTP sink writes

## Usage

```ts
import { createAuditLogger } from '@hexmon_tech/audit-core';
import { withAudit } from '@hexmon_tech/audit-next';

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
`withAudit` uses `@hexmon_tech/audit-node` (AsyncLocalStorage) when running in
Node.js. Edge runtimes do not support `AsyncLocalStorage`.
Install `@hexmon_tech/audit-node` in Node.js deployments to enable context propagation.

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
