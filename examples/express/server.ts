import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import express, { type Request } from 'express';
import { createAuditLogger, highThroughput } from '@stackio/audit-core';
import { createAuditMiddleware } from '@stackio/audit-express';
import { createFileJsonlSink } from '@stackio/audit-sink-file-jsonl';

type AuthedRequest = Request & { user?: { id: string; roles?: string[] } };

const outputDir = join(process.cwd(), 'tmp');
mkdirSync(outputDir, { recursive: true });

const audit = createAuditLogger({
  ...highThroughput(),
  service: 'express-ts',
  environment: 'local',
  sinks: [createFileJsonlSink({ filePath: join(outputDir, 'audit.jsonl') })],
});

const app = express();
app.use(express.json());

app.use((req: AuthedRequest, _res, next) => {
  req.user = { id: 'user-123', roles: ['admin'] };
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = randomUUID();
  }
  next();
});

app.use(
  createAuditMiddleware(audit, {
    getTenantId: (req) => req.header('x-tenant-id') ?? undefined,
    getActor: (req) =>
      (req as AuthedRequest).user
        ? {
            type: 'user',
            id: (req as AuthedRequest).user!.id,
            roles: (req as AuthedRequest).user!.roles,
          }
        : undefined,
  }),
);

app.post('/admin/reset-user', async (req: AuthedRequest, res) => {
  await req.audit.log({
    action: 'admin.user.reset',
    outcome: 'SUCCESS',
    target: { type: 'user', id: req.body?.userId ?? 'unknown' },
    metadata: { reason: req.body?.reason ?? 'manual' },
  });

  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log('listening on http://localhost:3000');
});
