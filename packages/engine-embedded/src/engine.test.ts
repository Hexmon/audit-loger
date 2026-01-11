import { describe, expect, it } from 'vitest';
import { EmbeddedEngine } from './engine';
import type { Condition, PolicyIR } from './types';

const path = (value: string) => ({ kind: 'path' as const, path: value });
const value = (val: unknown) => ({ kind: 'value' as const, value: val });
const eqPath = (left: string, right: string): Condition => ({
  op: 'eq',
  left: path(left),
  right: path(right)
});
const eqValue = (left: string, rightValue: unknown): Condition => ({
  op: 'eq',
  left: path(left),
  right: value(rightValue)
});
const and = (...conditions: Condition[]): Condition => ({ op: 'and', conditions });

const baseInput = {
  principal: { id: 'user-1' },
  action: { name: 'read' },
  resource: { type: 'doc', id: 'doc-1' }
};

describe('EmbeddedEngine', () => {
  it('denies override allows', () => {
    const policy: PolicyIR = {
      rules: [
        {
          id: 'allow-read',
          effect: 'allow',
          resourceType: 'doc',
          action: 'read',
          principals: ['user-1'],
          priority: 100
        },
        {
          id: 'deny-read',
          effect: 'deny',
          resourceType: 'doc',
          action: 'read',
          principals: ['user-1'],
          priority: 1
        }
      ]
    };

    const engine = new EmbeddedEngine();
    engine.setPolicy(policy);

    const decision = engine.evaluate(baseInput);
    expect(decision.allow).toBe(false);
    expect(decision.reasons.some((reason) => reason.ruleId === 'deny-read')).toBe(true);
  });

  it('resolves role inheritance', () => {
    const policy: PolicyIR = {
      rules: [],
      roles: {
        editor: {
          name: 'editor',
          permissions: [
            {
              resourceType: 'doc',
              action: 'read'
            }
          ]
        },
        admin: {
          name: 'admin',
          inherits: ['editor'],
          permissions: []
        }
      }
    };

    const engine = new EmbeddedEngine();
    engine.setPolicy(policy);

    const decision = engine.evaluate({
      ...baseInput,
      principal: { id: 'user-1', roles: ['admin'] }
    });

    expect(decision.allow).toBe(true);
  });

  it('evaluates ABAC owner conditions', () => {
    const policy: PolicyIR = {
      rules: [
        {
          id: 'owner-read',
          effect: 'allow',
          resourceType: 'doc',
          action: 'read',
          conditions: [eqPath('principal.id', 'resource.ownerId')]
        }
      ]
    };

    const engine = new EmbeddedEngine();
    engine.setPolicy(policy);

    const allowed = engine.evaluate({
      ...baseInput,
      resource: { type: 'doc', id: 'doc-1', ownerId: 'user-1' }
    });
    const denied = engine.evaluate({
      ...baseInput,
      resource: { type: 'doc', id: 'doc-1', ownerId: 'other-user' }
    });

    expect(allowed.allow).toBe(true);
    expect(denied.allow).toBe(false);
  });

  it('evaluates context ip/device conditions', () => {
    const policy: PolicyIR = {
      rules: [
        {
          id: 'trusted-context',
          effect: 'allow',
          resourceType: 'doc',
          action: 'read',
          conditions: [
            and(eqValue('context.ip', '10.0.0.1'), eqValue('context.device', 'trusted'))
          ]
        }
      ]
    };

    const engine = new EmbeddedEngine();
    engine.setPolicy(policy);

    const decision = engine.evaluate({
      ...baseInput,
      context: { ip: '10.0.0.1', device: 'trusted' }
    });

    expect(decision.allow).toBe(true);
  });

  it('checks workflow tasks via context.workflow', () => {
    const policy: PolicyIR = {
      rules: [
        {
          id: 'workflow-approve',
          effect: 'allow',
          resourceType: 'doc',
          action: 'approve',
          conditions: [eqValue('context.workflow.task', 'approve')]
        }
      ]
    };

    const engine = new EmbeddedEngine();
    engine.setPolicy(policy);

    const decision = engine.evaluate({
      principal: { id: 'user-1' },
      action: { name: 'approve' },
      resource: { type: 'doc', id: 'doc-1' },
      context: { workflow: { task: 'approve' } }
    });

    expect(decision.allow).toBe(true);
  });

  it('adds field obligations and enforces fieldViolation behavior', () => {
    const policy: PolicyIR = {
      rules: [
        {
          id: 'allow-read',
          effect: 'allow',
          resourceType: 'doc',
          action: 'read'
        },
        {
          id: 'deny-secret',
          effect: 'deny',
          resourceType: 'doc',
          action: 'read',
          fields: { deny: ['secret'] }
        },
        {
          id: 'mask-ssn',
          effect: 'deny',
          resourceType: 'doc',
          action: 'read',
          fields: { mask: ['ssn'] }
        }
      ]
    };

    const engine = new EmbeddedEngine();
    engine.setPolicy(policy);

    const decision = engine.evaluate({
      ...baseInput,
      fields: ['title', 'secret', 'ssn']
    });

    expect(decision.allow).toBe(true);
    expect(decision.obligations.omitFields).toContain('secret');
    expect(decision.obligations.maskFields).toContain('ssn');

    const denyEngine = new EmbeddedEngine({ fieldViolation: 'deny' });
    denyEngine.setPolicy(policy);

    const denied = denyEngine.evaluate({
      ...baseInput,
      fields: ['title', 'secret']
    });

    expect(denied.allow).toBe(false);
  });

  it('uses cache to avoid repeated evaluations', () => {
    const policy: PolicyIR = {
      rules: [
        {
          id: 'allow-read',
          effect: 'allow',
          resourceType: 'doc',
          action: 'read'
        }
      ]
    };

    const engine = new EmbeddedEngine();
    engine.setPolicy(policy);

    const input = {
      principal: { id: 'user-1' },
      action: { name: 'read' },
      resource: { type: 'doc', id: 'doc-1' }
    };

    engine.evaluate(input);
    const afterFirst = engine.getStats();
    engine.evaluate(input);
    const afterSecond = engine.getStats();

    expect(afterFirst.evaluations).toBe(1);
    expect(afterSecond.evaluations).toBe(1);
    expect(afterSecond.cacheHits).toBe(1);
  });
});
