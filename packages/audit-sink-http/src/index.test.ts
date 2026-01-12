import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import type { AuditEvent } from '@stackio/audit-core';
import { createHttpAuditSink } from './index';

const baseEvent: AuditEvent = {
  schemaVersion: 1,
  eventId: '01HZX0W3D4C9B3Z5C3G0Y1N9QX',
  action: 'user.login',
  outcome: 'SUCCESS',
  actor: { type: 'user', id: 'user-1' },
  context: { occurredAt: new Date().toISOString() },
};

const startServer = (handler: (req: IncomingMessage, res: ServerResponse) => void) =>
  new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const server = createServer(handler);
    server.listen(0, () => {
      const address = server.address() as AddressInfo;
      const url = `http://127.0.0.1:${address.port}`;
      resolve({
        url,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });

describe('createHttpAuditSink', () => {
  it('posts a batch payload and returns success', async () => {
    const server = await startServer((req, res) => {
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString('utf8');
      });
      req.on('end', () => {
        const parsed = JSON.parse(body);
        expect(parsed.events).toHaveLength(1);
        res.statusCode = 200;
        res.end('ok');
      });
    });

    try {
      const sink = createHttpAuditSink({ endpoint: server.url });
      const result = await sink.writeBatch([baseEvent]);
      expect(result.ok).toBe(true);
      expect(result.written).toBe(1);
    } finally {
      await server.close();
    }
  });

  it('classifies 500s as transient failures', async () => {
    const server = await startServer((_req, res) => {
      res.statusCode = 500;
      res.end('fail');
    });

    try {
      const sink = createHttpAuditSink({ endpoint: server.url });
      const result = await sink.writeBatch([baseEvent]);
      expect(result.ok).toBe(false);
      expect(result.failures[0].errorType).toBe('TRANSIENT');
    } finally {
      await server.close();
    }
  });
});
