# npm First Publish Checklist

## Required secrets & permissions
- Add a GitHub repository secret named `NPM_TOKEN`. The publish workflow copies this secret into `NODE_AUTH_TOKEN` before running `npm whoami` and `pnpm release:publish`, so it must hold a **valid granular npm token** with publish rights for the `@hexmon_tech` scope.
- There is no "token type" toggle on the granular access page; you must explicitly grant **Read & Write** permissions, select the `@hexmon_tech` scope, set an expiry that meets your org policy, then copy the generated token straight into the `NPM_TOKEN` secret.
- Keep the token current: the workflow now fails early via `npm whoami` if the secret is stale.

## Token creation walkthrough
1. On npmjs.com, open your profile ▶︎ Access Tokens ▶︎ **Create New Token** (granular access only).
2. Give it a descriptive name, set the **Permissions** dropdown to **Read & Write**, and include the `@hexmon_tech` scope so the token can access the scoped packages.
3. Choose an expiry window that matches your security policy (30/90 days, etc.), then copy the token immediately: it is shown only once.
4. Paste the token value into the GitHub secret `NPM_TOKEN` for this repository.

## Publish path when PR creation is blocked by policy
1. Create the release metadata locally:
   - Run `pnpm changeset` to describe the packages that need to ship.
   - Run `pnpm release:version` to bump package versions and inject changelog entries.
2. Commit and push the generated changes (changeset files, bumped package versions, updated lockfile) directly to `main` because PRs are blocked.
3. In the GitHub Actions UI, open the **Publish** workflow and click **Run workflow** (`workflow_dispatch`) to execute the pipeline that ultimately runs `pnpm release:publish`. Monitor the job logs; the added `npm whoami` step will fail fast if the npm token is invalid.
4. Once the workflow succeeds, the scoped packages are published to `https://registry.npmjs.org/` with the public access configured in each package.

## Publish path when PR creation is allowed
1. Create your changeset and version bump as described above (`pnpm changeset` ➜ `pnpm release:version`).
2. Push the feature/release branch, open a PR against `main`, and wait for CI to pass (lint, tests, build, smoke-tests, exports/pack checks).
3. Merge the PR; the release commits land on `main`.
4. Manually trigger the **Publish** workflow from the GitHub Actions tab (because the workflow only runs on `workflow_dispatch`). It will re-run lint/typecheck/build/pack checks before calling `pnpm release:publish` with the `NPM_TOKEN` secret.

## Post-publish
- Tagging and changelog updates are handled by Changesets when you run `pnpm release:version`; confirm the generated files are committed before running the Publish workflow.
- Keep the `NPM_TOKEN` secret in sync with an active granular token to avoid the `npm whoami` gate from failing.
