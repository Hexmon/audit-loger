# Express Basic Example

Minimal Express integration using `@yourorg/audit-express`.

## Run
1) Install dependencies at the repo root.
2) Build the packages: `pnpm -r build`
3) Run the example:

```bash
node examples/express-basic/server.mjs
```

The example writes JSONL logs to `./tmp/audit.jsonl`. Optionally set
`AUDIT_HTTP_ENDPOINT` to mirror batches to an HTTP sink.

This example assumes you have an auth layer that sets `req.user`.
