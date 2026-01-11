import { collectContextPaths } from './conditions';
import { WILDCARD, makeIndexKey } from './index-keys';
import type { IndexedRule } from './indexes';
import { FieldSpec, RoleDefinition } from './types';

export function resolveRoles(
  roleDefinitions: Record<string, RoleDefinition> | undefined,
  assignedRoles: string[] | undefined
): Set<string> {
  const resolved = new Set<string>();
  if (!assignedRoles || assignedRoles.length === 0) {
    return resolved;
  }

  const stack = [...assignedRoles];
  while (stack.length > 0) {
    const roleName = stack.pop();
    if (!roleName || resolved.has(roleName)) {
      continue;
    }
    resolved.add(roleName);

    const definition = roleDefinitions?.[roleName];
    if (definition?.inherits) {
      for (const inherited of definition.inherits) {
        if (!resolved.has(inherited)) {
          stack.push(inherited);
        }
      }
    }
  }

  return resolved;
}

export function buildRoleRuleIndex(
  roles: Record<string, RoleDefinition> | undefined,
  startingOrder: number
): {
  roleRulesByRole: Map<string, Map<string, IndexedRule[]>>;
  contextPaths: Set<string>;
  nextOrder: number;
} {
  const roleRulesByRole = new Map<string, Map<string, IndexedRule[]>>();
  const contextPaths = new Set<string>();
  let order = startingOrder;

  if (!roles) {
    return { roleRulesByRole, contextPaths, nextOrder: order };
  }

  for (const [roleName, roleDefinition] of Object.entries(roles)) {
    const roleMap = new Map<string, IndexedRule[]>();
    roleRulesByRole.set(roleName, roleMap);

    roleDefinition.permissions.forEach((permission, index) => {
      const rule: IndexedRule = {
        id: permission.id ?? `role:${roleName}:${index}`,
        effect: 'allow',
        tenantScope: permission.tenantScope ?? WILDCARD,
        resourceType: permission.resourceType ?? WILDCARD,
        resourceId: permission.resourceId,
        action: permission.action ?? WILDCARD,
        priority: permission.priority ?? 0,
        principals: undefined,
        roles: undefined,
        conditions: permission.conditions,
        fields: normalizeFieldSpec(permission.fields),
        obligations: permission.obligations,
        description: permission.description,
        order: order++,
        source: 'role',
        roleName
      };

      if (rule.conditions) {
        for (const condition of rule.conditions) {
          collectContextPaths(condition, contextPaths);
        }
      }

      const key = makeIndexKey(rule.tenantScope, rule.resourceType, rule.action);
      const existing = roleMap.get(key);
      if (existing) {
        existing.push(rule);
      } else {
        roleMap.set(key, [rule]);
      }
    });
  }

  return { roleRulesByRole, contextPaths, nextOrder: order };
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
