import { createAuditLogger } from '@stackio/audit-core';
import { withAudit } from '@stackio/audit-next';

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
