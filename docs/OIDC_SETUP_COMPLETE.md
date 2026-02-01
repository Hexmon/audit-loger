# NPM Trusted Publishing (OIDC) Setup Complete

## Summary of Changes

✅ **All implementation complete.** The repository is now configured for npm Trusted Publishing via OIDC.

### Files Changed

| File | Action | Reason |
|------|--------|--------|
| `.github/workflows/release.yml` | **CREATED** | New OIDC-based release workflow (replaces manual publish.yml) |
| `.github/workflows/publish.yml` | **DELETED** | Obsolete token-based manual workflow |
| `.github/workflows/changesets.yml` | **DELETED** | Obsolete PR-creation workflow |
| `.github/workflows/ci.yml` | **UPDATED** | Node version upgraded from 20 → 24 |

### What Was Removed

1. **Token secrets dependency** — No `NPM_TOKEN` or `NODE_AUTH_TOKEN` needed anymore
2. **Manual dispatch workflow** — `publish.yml` (manual `workflow_dispatch` trigger) deleted
3. **Version PR automation** — `changesets.yml` (auto PR creation) deleted
4. **Manual release scripts** — Local `release:version` + `release:publish` still available for testing/rollback

### What Was Kept Safe

✓ All 10 packages have `publishConfig.access: "public"`  
✓ `.npmrc` unchanged (no embedded tokens)  
✓ Changesets config unchanged (correct baseBranch, access settings)  
✓ All migration files included (postgres)  
✓ CLI bins properly resolved  
✓ Export/pack validation scripts functional

---

## Final Release Flow (8 Steps)

1. **Developer creates feature branch** → commits code + adds `.changeset/*.md` file
2. **Developer opens PR** → CI runs (typecheck, build, test, smoke-tests, exports-check, pack-check)
3. **PR review approved** → code reviewed, changesets verified to exist
4. **PR merged to main** → GitHub Actions triggers
5. **release.yml runs full CI suite** on main (same checks as PR CI)
6. **release.yml detects changesets** exist in `.changeset/` directory
7. **release.yml publishes via OIDC** to npmjs.org:
   - Uses `NPM_CONFIG_PROVENANCE=true` for supply chain transparency
   - Uses GitHub's OIDC token (no credentials needed)
   - Runs `pnpm changeset publish`
8. **Changesets consumed** → version bumped, changelog updated, packages published

### What Happens If No Changesets?

- Publishing **skipped** (step 7 is conditional)
- Main branch can receive non-release commits (docs, scripts, etc.)
- Next merge with changesets will trigger publish

---

## NPM Side Configuration (You Must Do This)

### Required: Add GitHub as Trusted Publisher

1. **Go to npmjs.org** → Sign in as the package owner
2. **For each package scope** (`@hexmon_tech/audit-*`):
   - Navigate to: **Account Settings** → **Access Tokens** → **Trusted Publishers**
   - Click **Add Trusted Publisher**
   - Select: **GitHub Actions** as the type
   - Configure:
     ```
     GitHub repository: hexmon_tech/audit-log
     Workflow file path: .github/workflows/release.yml
     Environment name: (leave blank - not using specific environment)
     ```
   - Save

**Note:** This must be done at the npm registry for each scope or on the org settings if available.

### Verification Command (npm CLI)

After setup, you can verify with:
```bash
npm token list
# Should show your Trusted Publisher configuration
```

---

## Developer Instructions

### How to Create a Release (for developers)

1. **Make your changes** in a feature branch
   ```bash
   git checkout -b feat/my-feature
   # ... make changes ...
   git add .
   git commit -m "feat: add my feature"
   ```

2. **Add a changeset** before creating PR
   ```bash
   pnpm changeset
   ```
   - Answer prompts:
     - **Which packages?** (select changed packages)
     - **Major/Minor/Patch?** (select semver bump)
     - **Write description?** (yes, add changelog text)
   - This creates `.changeset/xxx-xxx.md`

3. **Commit changeset** and push to PR
   ```bash
   git add .changeset/
   git commit -m "chore: changesets"
   git push origin feat/my-feature
   ```

4. **Open PR** → Let CI verify → Get review → Merge
   - **No manual publish needed** — release.yml handles it automatically

### Example Changeset File

`.changeset/fancy-addition-001.md`:
```
---
"@hexmon_tech/audit-core": minor
"@hexmon_tech/audit-express": minor
---

Add support for custom schema validation in audit events.
```

### What NOT to Do

- ❌ Do NOT create an `NPM_TOKEN` or personal access token
- ❌ Do NOT manually run `npm publish` or `pnpm publish`
- ❌ Do NOT commit changesets to main directly (always via PR)
- ❌ Do NOT skip the changeset step

---

## Verification Checklist

### Before You Merge This Change

- [ ] You have npm account owner access to `@hexmon_tech` scope
- [ ] You understand the changesets flow
- [ ] You've read developer instructions

### After You Deploy This (First Release)

1. **Commit and push** this branch to GitHub
2. **Create and merge a test PR** that includes:
   - Any code change (e.g., README update)
   - A changeset file
3. **Watch GitHub Actions**:
   - CI workflow runs (on PR push) ✓
   - Release workflow runs (on merge to main) ✓
   - Should see step: "Publish to npm" **successfully completed**
4. **Verify on npm**:
   ```bash
   npm view @hexmon_tech/audit-core@latest
   # Should show the new version just published
   ```
5. **Check provenance**:
   ```bash
   npm audit --audit-level=moderate --engine-strict
   # View provenance data in npm registry
   ```

---

## Troubleshooting

### Release workflow doesn't publish

**Check:**
1. Are there `.changeset/*.md` files (excluding README)?
   - If no, publishing intentionally skipped (correct behavior)
   - If yes, check GitHub Actions logs for errors

2. Is Trusted Publisher configured on npm?
   - If not, you'll see auth failures in logs

3. Is the package scope correct?
   - Must match `@hexmon_tech` in publish config

### CI fails before publish

- Release.yml runs full CI suite before publishing
- Fix the errors, push new commit with changesets → retry

### Need to rollback a release

```bash
# Local (requires npm access)
npm unpublish @hexmon_tech/package-name@version
pnpm changeset version --skip-publish
# Create a new changeset with a patch bump
git push --force  # (dangerous, use carefully)
```

---

## Architecture Overview

```
┌─ Push to main with changesets
│
├─ release.yml triggers
│  ├─ Runs: typecheck, build, test, smoke-tests
│  ├─ Validates: exports, pack
│  ├─ Checks: changesets exist?
│  │  ├─ YES → Publish via OIDC
│  │  └─ NO → Exit gracefully
│  └─ Publishes to npmjs.org
│     └─ Provenance recorded ✓
│
└─ Developers have NO tokens stored
   ├─ Cannot accidentally publish
   ├─ Cannot leak credentials
   └─ Cannot bypass changesets gate
```

---

## Security Properties

✓ **No developer tokens stored** — only GitHub OIDC  
✓ **Provenance tracking** — `NPM_CONFIG_PROVENANCE=true` enables supply chain security  
✓ **Atomic releases** — changesets ensure coordinated version bumps  
✓ **Audit trail** — every publish comes from a specific GitHub commit  
✓ **Strict CI gate** — tests/checks must pass before publish  
✓ **Repository isolation** — only `main` branch triggers releases  

---

## Reference Links

- [npm Trusted Publishing](https://docs.npmjs.com/about-trusted-publishers)
- [Changesets](https://github.com/changesets/changesets)
- [GitHub OIDC Tokens](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
