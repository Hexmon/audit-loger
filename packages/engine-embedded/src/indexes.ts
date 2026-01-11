import { collectContextPaths } from './conditions';
import { WILDCARD, makeIndexKey } from './index-keys';
import { buildRoleRuleIndex } from './roles';
import { FieldSpec, PolicyIR, Rule } from './types';

export interface IndexedRule extends Rule {
  tenantScope: string;
  resourceType: string;
  action: string;
  priority: number;
  order: number;
  source: 'policy' | 'role';
  roleName?: string;
}

export interface PolicyIndexes {
  allowRulesByKey: Map<string, IndexedRule[]>;
  denyRulesByKey: Map<string, IndexedRule[]>;
  roleRulesByRole: Map<string, Map<string, IndexedRule[]>>;
  contextPaths: Set<string>;
  policyVersion?: string;
}

export function buildIndexes(ir: PolicyIR): PolicyIndexes {
  const allowRulesByKey = new Map<string, IndexedRule[]>();
  const denyRulesByKey = new Map<string, IndexedRule[]>();
  const contextPaths = new Set<string>();
  let order = 0;

  for (const rule of ir.rules) {
    const normalized = normalizeRule(rule, order++);
    if (normalized.conditions) {
      for (const condition of normalized.conditions) {
        collectContextPaths(condition, contextPaths);
      }
    }

    const key = makeIndexKey(normalized.tenantScope, normalized.resourceType, normalized.action);
    const target = normalized.effect === 'deny' ? denyRulesByKey : allowRulesByKey;
    pushRule(target, key, normalized);
  }

  const roleResult = buildRoleRuleIndex(ir.roles, order);
  for (const path of roleResult.contextPaths) {
    contextPaths.add(path);
  }

  for (const rules of allowRulesByKey.values()) {
    rules.sort(compareRules);
  }
  for (const rules of denyRulesByKey.values()) {
    rules.sort(compareRules);
  }
  for (const roleMap of roleResult.roleRulesByRole.values()) {
    for (const rules of roleMap.values()) {
      rules.sort(compareRules);
    }
  }

  return {
    allowRulesByKey,
    denyRulesByKey,
    roleRulesByRole: roleResult.roleRulesByRole,
    contextPaths,
    policyVersion: ir.version
  };
}

function normalizeRule(rule: Rule, order: number): IndexedRule {
  return {
    ...rule,
    tenantScope: rule.tenantScope ?? WILDCARD,
    resourceType: rule.resourceType ?? WILDCARD,
    action: rule.action ?? WILDCARD,
    priority: rule.priority ?? 0,
    fields: normalizeFieldSpec(rule.fields),
    order,
    source: 'policy'
  };
}

function normalizeFieldSpec(fields?: FieldSpec): FieldSpec | undefined {
  if (!fields) {
    return undefined;
  }
  const normalized: FieldSpec = {};

  if (fields.allow) {
    normalized.allow = normalizeFieldList(fields.allow);
  }
  if (fields.deny) {
    normalized.deny = normalizeFieldList(fields.deny);
  }
  if (fields.mask) {
    normalized.mask = normalizeFieldList(fields.mask);
  }
  if (fields.omit) {
    normalized.omit = normalizeFieldList(fields.omit);
  }

  return normalized;
}

function normalizeFieldList(values: string[]): string[] {
  const set = new Set(values.map((value) => value.trim()).filter(Boolean));
  return Array.from(set).sort();
}

function pushRule(
  map: Map<string, IndexedRule[]>,
  key: string,
  rule: IndexedRule
): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(rule);
  } else {
    map.set(key, [rule]);
  }
}

function compareRules(a: IndexedRule, b: IndexedRule): number {
  if (a.priority !== b.priority) {
    return b.priority - a.priority;
  }
  return a.order - b.order;
}
