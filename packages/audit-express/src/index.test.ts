import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { AuditEvent, AuditSink } from '@hexmon/audit-core';
import { createAuditLogger } from '@hexmon/audit-core';
import { createAuditMiddleware } from './index';

describe('createAuditMiddleware', () => {
  it('attaches req.audit with request context', async () => {
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

    const app = express();
    app.use(
      createAuditMiddleware(audit, {
        getTenantId: (req) => req.header('x-tenant-id') ?? undefined,
      }),
    );

    app.get('/test', async (req, res) => {
      await req.audit.log({
        action: 'user.login',
        outcome: 'SUCCESS',
        actor: { type: 'user', id: 'user-1' },
      });
      res.status(200).json({ ok: true });
    });

    await request(app)
      .get('/test')
      .set('x-request-id', 'req-1')
      .set('x-tenant-id', 'tenant-1')
      .set('user-agent', 'agent-test')
      .expect(200);

    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event.context.requestId).toBe('req-1');
    expect(event.context.tenantId).toBe('tenant-1');
    expect(event.actor.userAgent).toBe('agent-test');

    const metadata = event.metadata as Record<string, unknown>;
    const http = metadata.http as Record<string, unknown>;
    expect(http.method).toBe('GET');
    expect(http.route).toBe('/test');
  });
});
