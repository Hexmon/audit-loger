import { describe, expect, it } from 'vitest';
import {
  getAuditContext,
  runWithAuditContext,
  setAuditContextPartial,
} from './index';

describe('audit context store', () => {
  it('propagates context through async boundaries', async () => {
    const result = await runWithAuditContext({ requestId: 'req-1' }, async () => {
      expect(getAuditContext().requestId).toBe('req-1');
      await new Promise((resolve) => setTimeout(resolve, 0));
      return getAuditContext().requestId;
    });

    expect(result).toBe('req-1');
  });

  it('updates context with setAuditContextPartial', () => {
    runWithAuditContext({ tenantId: 'tenant-1' }, () => {
      setAuditContextPartial({ tenantId: 'tenant-2', orgId: 'org-1' });
      const ctx = getAuditContext();
      expect(ctx.tenantId).toBe('tenant-2');
      expect(ctx.orgId).toBe('org-1');
    });
  });

  it('creates a store when setAuditContextPartial is called outside a run', () => {
    setAuditContextPartial({ requestId: 'req-2' });
    expect(getAuditContext().requestId).toBe('req-2');
  });
});
