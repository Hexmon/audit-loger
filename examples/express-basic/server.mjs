import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import { createAuditLogger, onPremSelfHosted } from '@hexmon_tech/audit-core';
import { createAuditMiddleware } from '@hexmon_tech/audit-express';
import { createFileJsonlSink } from '@hexmon_tech/audit-sink-file-jsonl';
import { createHttpAuditSink } from '@hexmon_tech/audit-sink-http';

const outputDir = join(process.cwd(), 'tmp');
mkdirSync(outputDir, { recursive: true });
const sinks = [
  createFileJsonlSink({ filePath: join(outputDir, 'audit.jsonl') }),
];

const httpEndpoint = process.env.AUDIT_HTTP_ENDPOINT;
if (httpEndpoint) {
  sinks.push(createHttpAuditSink({ endpoint: httpEndpoint }));
}

const audit = createAuditLogger({
  ...onPremSelfHosted(),
  service: 'express-basic',
  environment: 'local',
  retentionTag: 'standard-90d',
  sinks,
});

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  req.user = { id: 'user-123', roles: ['admin'] };
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = randomUUID();
  }
  next();
});

app.use(
  createAuditMiddleware(audit, {
    getTenantId: (req) => req.header('x-tenant-id') ?? undefined,
    getOrgId: (req) => req.header('x-org-id') ?? undefined,
    getSessionId: (req) => req.header('x-session-id') ?? undefined,
    getActor: (req) =>
      req.user ? { type: 'user', id: req.user.id, roles: req.user.roles } : undefined,
  }),
);

app.post('/login', async (req, res) => {
  await req.audit.log({
    action: 'user.login',
    outcome: 'SUCCESS',
    actor: { type: 'user', id: req.user.id, roles: req.user.roles },
    target: { type: 'session', id: req.header('x-session-id') ?? undefined },
    metadata: { authMethod: 'password', mfa: 'totp' },
  });

  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log('listening on http://localhost:3000');
});
