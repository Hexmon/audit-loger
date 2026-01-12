import { createAuditLogger, saasMultiTenantStrict } from '@stackio/audit-core';
import { withAudit } from '@stackio/audit-next';

const audit = createAuditLogger({
  ...saasMultiTenantStrict(),
  service: 'nextjs-app-router',
  environment: 'local',
});

const getHeader = (req: Request, name: string): string | undefined =>
  req.headers.get(name) ?? undefined;

export const runtime = 'nodejs';

export const POST = withAudit(
  audit,
  async (req) => {
    await req.audit.log({
      action: 'user.login',
      outcome: 'SUCCESS',
      target: { type: 'session', id: getHeader(req, 'x-session-id') },
      metadata: { source: 'nextjs-app-router' },
    });

    return new Response('ok');
  },
  {
    getTenantId: (req) => getHeader(req, 'x-tenant-id'),
    getActor: (req) => {
      const userId = getHeader(req, 'x-user-id');
      return userId ? { type: 'user', id: userId } : { type: 'service', id: 'system' };
    },
  },
);
