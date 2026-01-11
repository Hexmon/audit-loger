import { createAuditLogger, computeIntegrityHash } from './index';
import type { AuditEventInput } from './index';

type LoggedEvent = Awaited<ReturnType<ReturnType<typeof createAuditLogger>['log']>>;

const expectOk = (result: LoggedEvent) => {
  if (!result.ok) {
    throw new Error(`Expected ok result: ${result.error.message}`);
  }
  return result.event;
};

describe('integrity hash chain', () => {
  it('computes a deterministic per-tenant hash chain', async () => {
    const audit = createAuditLogger({
      integrityMode: 'hash-chain',
      service: 'api',
    });

    const base: AuditEventInput = {
      action: 'user.login',
      outcome: 'SUCCESS',
      actor: { type: 'user', id: 'user-1' },
      context: {
        occurredAt: '2024-01-01T00:00:00.000Z',
        tenantId: 'tenant-a',
      },
      eventId: 'evt-1',
    };

    const first = expectOk(await audit.log(base));
    const second = expectOk(
      await audit.log({
        ...base,
        eventId: 'evt-2',
        context: {
          ...base.context,
          occurredAt: '2024-01-01T00:00:01.000Z',
        },
      }),
    );

    const third = expectOk(
      await audit.log({
        ...base,
        eventId: 'evt-3',
        context: {
          ...base.context,
          tenantId: 'tenant-b',
          occurredAt: '2024-01-01T00:00:02.000Z',
        },
      }),
    );

    expect(first.integrity?.hash).toBeTruthy();
    expect(first.integrity?.prevHash).toBeUndefined();
    expect(second.integrity?.prevHash).toBe(first.integrity?.hash);
    expect(third.integrity?.prevHash).toBeUndefined();

    const recomputed = await computeIntegrityHash({
      event: first,
      prevHash: first.integrity?.prevHash,
      algorithm: first.integrity?.alg,
    });

    expect(recomputed.ok).toBe(true);
    if (recomputed.ok) {
      expect(recomputed.hash).toBe(first.integrity?.hash);
    }

    await audit.shutdown();
  });

  it('chains by service when tenantId is absent', async () => {
    const audit = createAuditLogger({
      integrityMode: 'hash-chain',
      service: 'worker',
    });

    const base: AuditEventInput = {
      action: 'job.run',
      outcome: 'SUCCESS',
      actor: { type: 'service', id: 'worker-1' },
      context: {
        occurredAt: '2024-01-01T00:00:10.000Z',
      },
      eventId: 'job-1',
    };

    const first = expectOk(await audit.log(base));
    const second = expectOk(
      await audit.log({
        ...base,
        eventId: 'job-2',
        context: { ...base.context, occurredAt: '2024-01-01T00:00:11.000Z' },
      }),
    );

    expect(second.integrity?.prevHash).toBe(first.integrity?.hash);

    await audit.shutdown();
  });
});
