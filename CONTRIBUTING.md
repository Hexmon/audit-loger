# Contributing

Thanks for contributing! This repo is an early-stage scaffold for an audit logging ecosystem.

## Development
- Install: `pnpm install`
- Lint: `pnpm lint`
- Test: `pnpm test`
- Build: `pnpm build`

## Integration tests
- Start services: `docker compose -f test-infra/docker-compose.yml up -d`
- Run: `AUDIT_INTEGRATION=1 TEST_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/postgres TEST_MONGO_URL=mongodb://localhost:27017/audit_logs_test pnpm test`
- Stop services: `docker compose -f test-infra/docker-compose.yml down`

## Changesets
Use `pnpm changeset` to add a changeset for any change that should be released.

## Code Style
- TypeScript strict mode everywhere.
- Keep core dependencies minimal.
- Prefer small, focused modules with clear interfaces.

## Dependency Overrides
We use `pnpm.overrides` to pin known sensitive packages to safe versions when they
appear in the graph (e.g., `eslint-config-prettier`). This prevents accidental
pull-in of compromised or EOL releases while keeping the dependency surface minimal.
