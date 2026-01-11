export const WILDCARD = '*';

export function makeIndexKey(tenantScope: string, resourceType: string, action: string): string {
  return `${tenantScope}::${resourceType}::${action}`;
}

export function collectCandidateKeys(
  tenantKey: string,
  resourceType: string,
  action: string
): string[] {
  const tenantKeys = tenantKey === WILDCARD ? [WILDCARD] : [tenantKey, WILDCARD];
  const resourceKeys = resourceType === WILDCARD ? [WILDCARD] : [resourceType, WILDCARD];
  const actionKeys = action === WILDCARD ? [WILDCARD] : [action, WILDCARD];
  const keys: string[] = [];

  for (const t of tenantKeys) {
    for (const r of resourceKeys) {
      for (const a of actionKeys) {
        keys.push(makeIndexKey(t, r, a));
      }
    }
  }

  return keys;
}
