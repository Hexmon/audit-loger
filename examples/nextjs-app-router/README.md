# Next.js App Router Example

Minimal App Router handler using `@stackio/audit-next`.

## Setup
Create a Next.js app and copy the `app/api/login/route.ts` file into your project.
Ensure the monorepo packages are installed or published.

## Notes
- The example reads `x-tenant-id` and `x-user-id` headers to populate audit context.
- The preset `saasMultiTenantStrict()` enables strict validation and hash chaining.

## Edge Note
If you run on the Edge runtime, set `runtime: 'edge'` in `withAudit` and use the
HTTP sink. AsyncLocalStorage is not available in Edge runtimes.
