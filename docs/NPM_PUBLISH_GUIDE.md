# NPM Publish Guide

This repo produces scoped packages under `@hexmon_tech/audit-*` and publishes them to `https://registry.npmjs.org/` via Changesets + pnpm.

## One-time organization setup
1. Register `@hexmon_tech` on npmjs.com and invite maintainers with publish rights.
2. Enable public package visibility for the org.
3. Add the generated `NPM_TOKEN` to the repo's **GitHub secrets** so Actions can authenticate. The token must be scoped to publish packages and read packages on behalf of the org.

## Required tokens/secrets
- `NPM_TOKEN`: publish token stored in GitHub secrets.
- `NODE_AUTH_TOKEN`: set to the same token so pnpm can authenticate when writing to the npm registry.

The publish workflow (`.github/workflows/publish.yml`) already reads both secrets and sets `registry-url: https://registry.npmjs.org` for `setup-node`.

## Local validation before publishing
1. `pnpm install`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`
5. `pnpm build`
6. `pnpm smoke-tests`
7. `pnpm exports:check`
8. `pnpm pack:check`

These scripts run the shared `tsup` pipelines, linting, type checking, `vitest`, smoke tests that import each package's dist output, and npm pack validation for packaging hygiene.

## Creating a changeset
1. `pnpm changeset` (or `changeset`) prompts for affected packages and bump type.
2. Review the generated file under `.changeset`.
3. `pnpm changeset version` to apply the version bump across packages.
4. `pnpm changeset publish` / `pnpm release:publish` (CI-run) to publish the versions.

The repo enforces **independent versioning** because `.changeset/config.json` leaves `fixed` empty and `access` is `public`.

## GitHub Actions publish flow
1. The `publish` workflow (`.github/workflows/publish.yml`) is `workflow_dispatch` only.
2. It runs `pnpm install`, `pnpm typecheck`, `pnpm -r build`, `pnpm smoke-tests`, `pnpm exports:check`, `pnpm pack:check`, and finally `pnpm release:publish`.
3. The job uses `NPM_TOKEN` / `NODE_AUTH_TOKEN` from secrets and publishes to `https://registry.npmjs.org`.

## Testing packages locally with npm pack
Run one of the following to inspect the tarball contents:

```bash
pnpm -C packages/<package-name> pack
```

Confirm the output includes `dist/`, `README.md`, `LICENSE`, and any runtime assets such as `migrations/*.sql`.

For targeted verification you can also run:

```bash
node scripts/exports-check.mjs --package @hexmon_tech/audit-core
node scripts/pack-check.mjs --package @hexmon_tech/audit-sink-postgres
```
