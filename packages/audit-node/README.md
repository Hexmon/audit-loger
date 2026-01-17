# @hexmon_tech/audit-node

Node-only helpers for audit logging integrations. Provides an AsyncLocalStorage-backed
context store so request metadata can flow through async calls without manual threading.

## Install

```bash
pnpm add @hexmon_tech/audit-node
npm install @hexmon_tech/audit-node
```

## Compatibility

- Node.js >= 18 (requires `AsyncLocalStorage`)
- Intended to pair with `@hexmon_tech/audit-core` for context propagation

## Usage

```ts
import { runWithAuditContext, getAuditContext, setAuditContextPartial } from '@hexmon_tech/audit-node';

runWithAuditContext({ requestId: 'req-123', tenantId: 'tenant-1' }, async () => {
  // Access anywhere in the async call tree
  console.log(getAuditContext().requestId);

  // Update once you know more (e.g. after auth)
  setAuditContextPartial({ tenantId: 'tenant-2', orgId: 'org-1' });
});
```

## API
- `runWithAuditContext(ctx, fn)`: run a function with the provided context bound.
- `getAuditContext()`: read the current context (returns an empty object if none).
- `setAuditContextPartial(partial)`: merge new fields into the current context.

This package is Node-only because it depends on `AsyncLocalStorage`.
