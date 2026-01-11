import { createAuditLogger, saasMultiTenantStrict } from '@yourorg/audit-core';
import { withAudit } from '@yourorg/audit-next';

const audit = createAuditLogger({
  ...saasMultiTenantStrict(),
  service: 'next-app',
  environment: 'local',
});

export const runtime = 'nodejs';

export const POST = withAudit(
  audit,
  async (req) => {
    await req.audit.log({
      action: 'user.login',
      outcome: 'SUCCESS',
      metadata: { authMethod: 'password', mfa: 'webauthn' },
    });

    return Response.json({ ok: true });
  },
  {
    getTenantId: (req) => req.headers.get('x-tenant-id') ?? undefined,
    getActor: (req) => {
      const userId = req.headers.get('x-user-id');
      return userId ? { type: 'user', id: userId } : undefined;
    },
  },
);
