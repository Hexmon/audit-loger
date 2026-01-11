import { AsyncLocalStorage } from 'node:async_hooks';

export const PACKAGE_NAME = '@yourorg/audit-node';

export type AuditContextStore = {
  requestId?: string;
  traceId?: string;
  sessionId?: string;
  tenantId?: string;
  orgId?: string;
  ip?: string;
  userAgent?: string;
  route?: string;
  method?: string;
};

const storage = new AsyncLocalStorage<AuditContextStore>();

export const runWithAuditContext = <T>(
  ctx: AuditContextStore,
  fn: () => T,
): T => storage.run({ ...ctx }, fn);

export const getAuditContext = (): AuditContextStore => {
  const store = storage.getStore();
  return store ? { ...store } : {};
};

export const setAuditContextPartial = (partial: Partial<AuditContextStore>): void => {
  const store = storage.getStore();
  if (store) {
    Object.assign(store, partial);
    return;
  }
  storage.enterWith({ ...partial });
};
