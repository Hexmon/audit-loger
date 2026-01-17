import { createAuditLogger } from '@hexmon_tech/audit-core';
import { withAudit } from '@hexmon_tech/audit-next';

const audit = createAuditLogger({
  service: 'next-app',
  environment: 'local',
});

export const runtime = 'nodejs';

export const POST = withAudit(audit, async (req) => {
  await req.audit.log({
    action: 'admin.audit.ping',
    outcome: 'SUCCESS',
    actor: { type: 'service', id: 'system' },
    metadata: { source: 'next-app-router' },
  });

  return new Response('ok');
});
