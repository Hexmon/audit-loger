# Publish Readiness Report

| Package | Build | Tests | Exports | Pack Contents | Publish Config | Assets Included |
|---|---|---|---|---|---|---|
| @hexmon_tech/audit-buffer-disk | ✅ | ✅ | ✅ | ✅ | ✅ | dist/, README.md, LICENSE |
| @hexmon_tech/audit-cli | ✅ | ✅ | ✅ | ✅ | ✅ | dist/, README.md, LICENSE |
| @hexmon_tech/audit-core | ✅ | ✅ | ✅ | ✅ | ✅ | dist/, README.md, LICENSE |
| @hexmon_tech/audit-export-postgres | ✅ | ✅ | ✅ | ✅ | ✅ | dist/, README.md, LICENSE |
| @hexmon_tech/audit-express | ✅ | ✅ | ✅ | ✅ | ✅ | dist/, README.md, LICENSE |
| @hexmon_tech/audit-next | ✅ | ✅ | ✅ | ✅ | ✅ | dist/, README.md, LICENSE |
| @hexmon_tech/audit-node | ✅ | ✅ | ✅ | ✅ | ✅ | dist/, README.md, LICENSE |
| @hexmon_tech/audit-sink-file-jsonl | ✅ | ✅ | ✅ | ✅ | ✅ | dist/, README.md, LICENSE |
| @hexmon_tech/audit-sink-http | ✅ | ✅ | ✅ | ✅ | ✅ | dist/, README.md, LICENSE |
| @hexmon_tech/audit-sink-mongodb | ✅ | ✅ | ✅ | ✅ | ✅ | dist/, README.md, LICENSE |
| @hexmon_tech/audit-sink-postgres | ✅ | ✅ | ✅ | ✅ | ✅ | dist/, README.md, LICENSE, migrations/ |

## Blockers & Fixes

- **Token expiry / authentication**: previous publish job failed because the stored npm token (`NPM_TOKEN`) had expired; the token is now managed exclusively via the GitHub secret that drives `pnpm release:publish`, and the publish workflow runs `npm whoami` as a preflight to fail fast if the secret is stale.
- **Node engine alignment**: the repo and every package now insist on `node >=20.0.0`, matching the Node version that CI/publish workflows already target and preventing downstream surprises.
- **Peer dependency cleanup**: Postgres and MongoDB sinks/export packages now declare `pg`/`mongodb` as peer dependencies while keeping them as dev dependencies for local development, ensuring downstream apps supply the driver versions they actually use.
- **Docs**: added a publish readiness report summarizing validations and a first-publish checklist that explains the manual publish path when PRs are blocked plus the required npm token setup.
