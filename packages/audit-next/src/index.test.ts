import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import type { AuditEvent, AuditSink } from '@hexmon_tech/audit-core';
import { createAuditLogger } from '@hexmon_tech/audit-core';
import { getAuditContext } from '@hexmon_tech/audit-node';
import { getClientIp, getRequestId, getUserAgent, withAudit } from './index';

describe('next audit helpers', () => {
  it('extracts requestId, ip, and userAgent', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: {
        'x-request-id': 'req-1',
        'x-forwarded-for': '203.0.113.10',
        'user-agent': 'agent-test',
      },
    });

    expect(getRequestId(req)).toBe('req-1');
    expect(getClientIp(req)).toBe('203.0.113.10');
    expect(getUserAgent(req)).toBe('agent-test');
  });

  it('wraps a handler and attaches req.audit', async () => {
    const events: AuditEvent[] = [];
    const sink: AuditSink = {
      writeBatch: async (batch) => {
        events.push(...batch);
        return { ok: true, written: batch.length, failed: 0, failures: [] };
      },
    };

    const audit = createAuditLogger({
      mode: 'BLOCK',
      sinks: [sink],
      batchSize: 1,
    });

    const handler = withAudit(
      audit,
      async (req) => {
        expect(getAuditContext().requestId).toBe('req-2');
        await req.audit.log({
          action: 'user.login',
          outcome: 'SUCCESS',
          actor: { type: 'user', id: 'user-1' },
        });
        return new Response('ok');
      },
      { runtime: 'nodejs' },
    );

    const req = new NextRequest('http://localhost/api/test', {
      headers: {
        'x-request-id': 'req-2',
        'user-agent': 'agent-test',
      },
    });

    const response = await handler(req, {} as never);
    expect(response.status).toBe(200);
    expect(events).toHaveLength(1);
    expect(events[0].context.requestId).toBe('req-2');
    expect(events[0].actor.userAgent).toBe('agent-test');
  });
});
