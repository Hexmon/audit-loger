# Publish Readiness Report

## Summary
All `@hexmon_tech/audit-*` packages now ship with 0.1.0 versions, dual ESM/CJS exports, README/install guidance, and validated packaging scripts. CI runs lint/typecheck/build/test/smoke-tests/exports-check/pack-check in a single job so that every push exercises the same gates we follow locally.

## Per-package checklist
| Package | Status | Notes |
| --- | --- | --- |
| `@hexmon_tech/audit-core` | Pass | README now documents install + compatibility; `pack-check`, `smoke-tests`, and manual `pnpm pack` verified `dist/`, `README.md`, and `LICENSE`. |
| `@hexmon_tech/audit-node` | Pass | Node context helpers now documented with install instructions; build + exports verified via smoke-tests and exports-check. |
| `@hexmon_tech/audit-express` | Pass | Express middleware README now covers install/compat, peer dependency note, and pack artifacts include only `dist/`, README, and LICENSE. |
| `@hexmon_tech/audit-next` | Pass | Next.js App Router README includes install instructions and compatibility guidance; smoke-tests ensure `withAudit` exports exist for ESM/CJS. |
| `@hexmon_tech/audit-cli` | Pass | CLI README now covers install/compat and binary usage; pack output contains CLI entrypoints and docs, and exports-check confirms the binary exports such as `verifyFile`. |
| `@hexmon_tech/audit-export-postgres` | Pass | README now reminds adopters of shipped migrations; pack-check plus manual pack show README, dist, LICENSE, and Postgres assets are included. |
| `@hexmon_tech/audit-sink-http` | Pass | HTTP sink README documents install/use; smoke-tests/exports-check ensure helper exports exist. |
| `@hexmon_tech/audit-sink-postgres` | Pass | Sink README clarifies migrations, compatibility, and asset packaging; manual pack confirms `migrations/` are inside the tarball. |
| `@hexmon_tech/audit-sink-mongodb` | Pass | README describes install requirements; verification scripts ensure outputs stay clean. |
| `@hexmon_tech/audit-sink-file-jsonl` | Pass | README now lists install steps and compatibility notes; exports-check/smoke-tests pass. |
| `@hexmon_tech/audit-buffer-disk` | Pass | README updated, tsconfig fixes allow typecheck, and pack artifacts include README, LICENSE, and `dist/`. |

## Issues found + fixes
- **Blocker – registry target mismatch**: `.npmrc` previously pointed to `npm.pkg.github.com`, preventing public npm installs/publishes. Fixed by pointing the repo at `https://registry.npmjs.org/` for the `@hexmon_tech` scope ([`.npmrc`](../.npmrc)).
- **Warn – missing install guidance**: Package READMEs and the root README lacked install snippets and guidance on selecting packages. Added install/compatibility sections per package plus a package matrix and consumption guidance in the root README ([`packages/*/README.md`, `README.md`]).
- **Warn – workflow gaps**: CI/publish workflows only ran lint/test/build previously. Added `typecheck`, `smoke-tests`, `exports:check`, and `pack:check` steps to both workflows and introduced a `pnpm smoke-tests` script that imports each dist entry ([`.github/workflows/ci.yml`, `.github/workflows/publish.yml`, `package.json`, `smoke-tests/import-check.mjs`]).
- **Warn – missing shared expectations**: The exports-check script duplicated expected exports across modules, so adding a shared map improves maintainability ([`scripts/expected-exports.mjs`, `scripts/exports-check.mjs`, `smoke-tests/import-check.mjs`]).
- **Warn – placeholder package versions & tsconfig issue**: All packages were stuck at `0.0.0` and `audit-buffer-disk` used an unsupported `ignoreDeprecations` value. Bumped every package to `0.1.0` and removed the invalid compiler option so pnpm typecheck passes ([`packages/*/package.json`, `packages/audit-buffer-disk/tsconfig.json`]).
- **Nice-to-have – publish & verification docs**: Added `docs/PUBLISH_READINESS_REPORT.md` and `docs/NPM_PUBLISH_GUIDE.md` plus root README pointers so maintainers know the workflow and required secrets.

## Validation
- `pnpm -v` -> `9.0.6`
- `node -v` -> `v24.12.0`
- `pnpm install` -> up to date (lockfile unchanged)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test` (2 tests skipped)
- `pnpm smoke-tests` (`smoke-tests/import-check.mjs`)
- `node scripts/exports-check.mjs`
- `node scripts/pack-check.mjs`
- `pnpm -C packages/<pkg> pack --pack-destination /tmp/audit-packs` for each package; inspected tarballs to confirm `dist/`, `README.md`, `LICENSE`, and `migrations/` for the Postgres sink.

## Final publish steps
1. Create a Changeset (`pnpm changeset`) describing the affected packages and desired semver bump.
2. Run `pnpm changeset version` and confirm the generated release PR (the Changesets workflow handles this).
3. Once merged, trigger `Publish` (`.github/workflows/publish.yml`) via `workflow_dispatch`, ensuring `NPM_TOKEN`/`NODE_AUTH_TOKEN` are set in GitHub secrets.
4. The workflow runs typecheck/build/smoke-tests/exports-check/pack-check before `pnpm release:publish`, which pushes each scoped package to `https://registry.npmjs.org/`.
5. Optionally rerun `node scripts/exports-check.mjs` and `node scripts/pack-check.mjs` locally against the published tarballs to double-check the published contents.
