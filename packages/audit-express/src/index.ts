import type { NextFunction, Request, Response } from 'express';
import type { AuditActor, AuditContext, AuditLogger } from '@stackio/audit-core';
import type { AuditContextStore } from '@stackio/audit-node';
import { getAuditContext, runWithAuditContext } from '@stackio/audit-node';

export const PACKAGE_NAME = '@stackio/audit-express';

export type ExpressAuditMiddlewareOptions = {
  getActor?: (req: Request) => AuditActor | undefined;
  getTenantId?: (req: Request) => string | undefined;
  getOrgId?: (req: Request) => string | undefined;
  getSessionId?: (req: Request) => string | undefined;
  getRequestId?: (req: Request) => string | undefined;
  getTraceId?: (req: Request) => string | undefined;
};

type ContextKey = keyof AuditContextStore & keyof AuditContext;

const AUDIT_CONTEXT_KEYS: Array<ContextKey> = [
  'requestId',
  'traceId',
  'sessionId',
  'tenantId',
  'orgId',
];

const getHeaderValue = (req: Request, name: string): string | undefined => {
  const value = req.get?.(name);
  if (value) {
    return value;
  }
  const header = req.headers[name.toLowerCase()];
  if (Array.isArray(header)) {
    return header[0];
  }
  if (typeof header === 'string') {
    return header;
  }
  return undefined;
};

const extractIp = (req: Request): string | undefined => {
  if (req.ip) {
    return req.ip;
  }
  const forwarded = getHeaderValue(req, 'x-forwarded-for');
  if (!forwarded) {
    return undefined;
  }
  return forwarded.split(',')[0]?.trim();
};

const extractRoute = (req: Request): string | undefined => {
  if (req.route?.path) {
    return typeof req.route.path === 'string' ? req.route.path : undefined;
  }
  return req.originalUrl ?? req.path ?? undefined;
};

const buildContextFromStore = (store: AuditContextStore): Partial<AuditContext> => {
  const context: Partial<AuditContext> = {};
  for (const key of AUDIT_CONTEXT_KEYS) {
    const value = store[key];
    if (typeof value === 'string' && value.length > 0) {
      context[key] = value;
    }
  }
  return context;
};

const mergeHttpMetadata = (
  metadata: Record<string, unknown> | undefined,
  store: AuditContextStore,
): Record<string, unknown> | undefined => {
  const method = store.method;
  const route = store.route;
  if (!method && !route) {
    return metadata;
  }

  const merged: Record<string, unknown> = metadata ? { ...metadata } : {};
  const existingHttp =
    typeof merged.http === 'object' && merged.http !== null
      ? { ...(merged.http as Record<string, unknown>) }
      : {};

  if (method && existingHttp.method === undefined) {
    existingHttp.method = method;
  }
  if (route && existingHttp.route === undefined) {
    existingHttp.route = route;
  }

  merged.http = existingHttp;
  return merged;
};

const createContextualLogger = (
  base: AuditLogger,
  getStore: () => AuditContextStore,
  actorDefaults?: AuditActor,
): AuditLogger => ({
  log: (input) => {
    const store = getStore();
    const contextDefaults = buildContextFromStore(store);
    const mergedContext = input.context
      ? { ...contextDefaults, ...input.context }
      : Object.keys(contextDefaults).length > 0
        ? contextDefaults
        : undefined;

    const actorOverlay: Partial<AuditActor> = {};
    if (store.ip) {
      actorOverlay.ip = store.ip;
    }
    if (store.userAgent) {
      actorOverlay.userAgent = store.userAgent;
    }

    const actor =
      input.actor || actorDefaults
        ? ({
            ...actorOverlay,
            ...(actorDefaults ?? {}),
            ...input.actor,
          } as AuditActor)
        : input.actor;

    const metadata = mergeHttpMetadata(input.metadata, store);

    return base.log({
      ...input,
      ...(mergedContext ? { context: mergedContext } : {}),
      ...(metadata ? { metadata } : {}),
      ...(actor ? { actor } : {}),
    });
  },
  flush: () => base.flush(),
  shutdown: () => base.shutdown(),
  child: (options) => createContextualLogger(base.child(options), getStore, actorDefaults),
  getStats: () => base.getStats(),
  getMetrics: () => base.getMetrics(),
  getMetricsPrometheus: () => base.getMetricsPrometheus(),
});

const buildRequestContext = (
  req: Request,
  options: ExpressAuditMiddlewareOptions,
): AuditContextStore => ({
  requestId:
    options.getRequestId?.(req) ?? getHeaderValue(req, 'x-request-id') ?? undefined,
  traceId: options.getTraceId?.(req),
  sessionId: options.getSessionId?.(req),
  tenantId: options.getTenantId?.(req),
  orgId: options.getOrgId?.(req),
  ip: extractIp(req),
  userAgent: getHeaderValue(req, 'user-agent'),
  route: extractRoute(req),
  method: req.method,
});

export const createAuditMiddleware = (
  audit: AuditLogger,
  options: ExpressAuditMiddlewareOptions = {},
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const initialContext = buildRequestContext(req, options);
    const actor = options.getActor?.(req);

    runWithAuditContext(initialContext, () => {
      const defaultContext = buildContextFromStore(initialContext);
      const childLogger = audit.child({ defaultContext });
      req.audit = createContextualLogger(childLogger, getAuditContext, actor);
      next();
    });
  };
};

declare global {
  namespace Express {
    interface Request {
      audit: AuditLogger;
    }
  }
}
