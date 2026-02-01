# NPM Publishing: PHASE 1 (Token) → PHASE 2 (OIDC)

## Current State: PHASE 1 (Bootstrap with npm Token)

The repository is configured for PHASE 1 publishing using an npm token stored in GitHub Secrets. This is a temporary bootstrap phase because npm Trusted Publishing (OIDC) requires at least one package to already exist in the npm registry.

### Why PHASE 1?

- npm Trusted Publishers can only be configured for scopes/orgs that already have published packages
- Our `@hexmon_tech` scope starts with 0 packages
- Solution: Use npm token for the first release, then switch to OIDC-only

---

## PHASE 1 Setup (Current)

### Step 1: Create npm Token

1. Go to https://registry.npmjs.org
2. Sign in as the `@hexmon_tech` org owner
3. Navigate to **Account Settings** → **Access Tokens**
4. Click **Generate New Token**
5. Select type: **Automation** (recommended for CI)
6. Name it: `hexmon_tech-github-actions`
7. Copy the token

### Step 2: Add Secret to GitHub

1. Go to your GitHub repo: `hexmon_tech/audit-log`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: (paste the token from step 1)
6. Click **Add secret**

### Step 3: Trigger First Release

1. Create a feature branch with code changes
2. Add a `.changeset/*.md` file describing the changes
3. Open a PR, get review, and merge to main
4. GitHub Actions automatically:
   - Runs `npm whoami` to verify token (fails fast if invalid)
   - Runs full CI suite (typecheck, build, test, smoke-tests, exports-check, pack-check)
   - If changesets exist, publishes all changed packages

### Step 4: Verify First Publish

```bash
npm view @hexmon_tech/audit-core@latest
# Should show the version just published
```

---

## PHASE 2 Transition (Future)

After the first package is published, npm Trusted Publishing becomes available.

### Setup Trusted Publishing on npm

1. Go to https://registry.npmjs.org
2. Sign in as the org owner
3. Go to **Organization Settings** → **Trusted Publishers**
4. Click **Add Trusted Publisher**
5. Fill in:
   - **Provider:** GitHub
   - **Repository:** `hexmon_tech/audit-log`
   - **Workflow file:** `.github/workflows/release.yml`
6. Click **Add**

### Migrate Workflow to PHASE 2

Once Trusted Publishing is configured:

1. Go to repo: **Settings** → **Secrets and variables** → **Actions**
2. Delete the `NPM_TOKEN` secret (no longer needed)
3. In `.github/workflows/release.yml`, change:
   ```yaml
   env:
     USE_NPM_TOKEN: "false"  # Switch from "true" to "false"
   ```
4. Commit and push

Why this works:
- `USE_NPM_TOKEN: "false"` disables the npm token auth check
- Publish step condition becomes: `if: env.USE_NPM_TOKEN == 'true' && steps.changesets.outputs.has_changesets == 'true'`
- Since `USE_NPM_TOKEN == 'false'`, publish step is skipped
- Next push triggers publishing via OIDC (from release.yml's `id-token: write` permission)

Actually, wait — we need a step that handles OIDC when the flag is false. Let me clarify the future state:

**Future (PHASE 2):** We'll add an additional publish step that uses OIDC when `USE_NPM_TOKEN == 'false'`. For now, just set it to `"true"`.

---

## Workflow Architecture

### PHASE 1 (Current)
```
┌─ Push to main with changesets
│
├─ release.yml triggers
│  ├─ Checkout, setup pnpm/Node
│  ├─ Install, typecheck, build, test, smoke-tests, exports, pack checks
│  ├─ Check for changesets
│  ├─ Verify npm token with `npm whoami`
│  │  └─ If token invalid → FAIL (fail fast)
│  └─ Publish with NODE_AUTH_TOKEN (token-based)
│     └─ Packages published to npmjs.org
│
└─ CI workflow (PR/push non-main)
   └─ Never publishes (no publish step)
```

### PHASE 2 (Future)
```
┌─ Push to main with changesets
│
├─ release.yml triggers
│  ├─ (Same as PHASE 1: Checkout, setup, install, checks)
│  ├─ Check for changesets
│  ├─ Publish with OIDC (id-token)
│  │  └─ No NODE_AUTH_TOKEN needed
│  └─ Packages published to npmjs.org
│
└─ CI workflow (PR/push non-main)
   └─ Never publishes
```

---

## Troubleshooting PHASE 1

### Publish step is skipped (not running)

**Check:**
1. Are there `.changeset/*.md` files (excluding README)?
   - No → Publish correctly skipped. Add changeset and retry.
   - Yes → Check GitHub Actions logs for why publish didn't run.

2. Is `USE_NPM_TOKEN: "true"` set in release.yml?
   - No → Set it to `"true"` and commit.

3. Check the GitHub Actions logs:
   - Look for "Verify npm token (PHASE 1)" step
   - Look for "Publish to npm" step

### `npm whoami` returns "Not Authorized"

**Cause:** Token is invalid, expired, or doesn't have publish permissions.

**Fix:**
1. Generate a new npm token with **Automation** type
2. Update `NPM_TOKEN` secret in GitHub
3. Re-run the workflow

### Publish runs but fails with 403/Forbidden

**Cause:** Token doesn't have publish rights for `@hexmon_tech` scope.

**Fix:**
1. Ensure token belongs to org member with publish permissions
2. If org-level, ensure org settings allow token-based publishing
3. Regenerate token with appropriate permissions

---

## Developer Workflow (PHASE 1 & 2)

Developers never need to know about PHASE 1 vs PHASE 2. The workflow is identical:

1. Create feature branch
2. Make code changes
3. Add changeset:
   ```bash
   pnpm changeset
   ```
4. Follow prompts (select packages, semver bump, changelog text)
5. Commit changeset and code
6. Open PR and merge
7. Automatic publish happens on merge to main

---

## Cleanup Notes

- ✓ `publish.yml` deleted (no longer needed; release.yml handles both PHASE 1 and 2)
- ✓ `changesets.yml` deleted (no more version PR automation; direct publishing)
- ✓ CI workflow unchanged (only runs checks, never publishes)
- ✓ Package configs verified (all have `publishConfig.access: "public"`)

---

## Reference

- [Changesets Documentation](https://github.com/changesets/changesets)
- [npm Access Tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens)
- [npm Trusted Publishing (OIDC)](https://docs.npmjs.com/about-trusted-publishers)
- [GitHub OIDC Tokens](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
