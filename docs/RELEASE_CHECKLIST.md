# Release Checklist

## Before release
- Ensure every user-facing change has a changeset (`pnpm changeset`).
- Run `pnpm lint`, `pnpm test`, `pnpm -r build`, and `pnpm -r typecheck`.
- Run `pnpm -r exports:check` and `pnpm -r pack:check` to validate published artifacts.
- Verify integration tests if applicable (see `CONTRIBUTING.md`).
- Review `SECURITY.md` and ensure any security notes are up to date.
- Confirm `publishConfig.access` is correct for your npm scope (public vs restricted).

## Versioning
- Use the Changesets workflow to open a release PR, or run:
  - `pnpm release:version`
- Review the generated version bumps and changelogs in the release PR.

## Publish (manual)
- Ensure `NPM_TOKEN` is set with publish permissions.
- Run `pnpm release:publish` (or trigger the manual Publish workflow).
- Verify packages on npm and validate install for at least one sink and the core package.

## After release
- Tag and archive release notes if needed.
- Monitor error rates and support channels for regressions.
