import type { AuditActor, AuditContext, AuditLogger } from '@yourorg/audit-core';
import type { NextRequest } from 'next/server';

export const PACKAGE_NAME = '@yourorg/audit-next';

export type NextAuditRuntime = 'nodejs' | 'edge';

export type NextAuditOptions = {
  getActor?: (req: NextRequest) => AuditActor | undefined;
  getTenantId?: (req: NextRequest) => string | undefined;
  getOrgId?: (req: NextRequest) => string | undefined;
  getSessionId?: (req: NextRequest) => string | undefined;
  getRequestId?: (req: NextRequest) => string | undefined;
  getTraceId?: (req: NextRequest) => string | undefined;
  runtime?: NextAuditRuntime;
};

export type AuditNextRequest = NextRequest & { audit: AuditLogger };

type AuditContextStore = {
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

const AUDIT_CONTEXT_KEYS: Array<keyof AuditContext> = [
  'requestId',
  'traceId',
  'sessionId',
  'tenantId',
  'orgId',
];

const getHeaderValue = (req: NextRequest, name: string): string | undefined => {
  const value = req.headers.get(name);
  return value || undefined;
};

export const getRequestId = (req: NextRequest): string | undefined =>
  getHeaderValue(req, 'x-request-id') ?? undefined;

export const getClientIp = (req: NextRequest): string | undefined => {
  const ip = (req as { ip?: string }).ip;
  if (ip) {
    return ip;
  }
  const forwarded = getHeaderValue(req, 'x-forwarded-for');
  if (!forwarded) {
    return undefined;
  }
  return forwarded.split(',')[0]?.trim();
};

export const getUserAgent = (req: NextRequest): string | undefined =>
  getHeaderValue(req, 'user-agent') ?? undefined;

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
  req: NextRequest,
  options: NextAuditOptions,
): AuditContextStore => ({
  requestId: options.getRequestId?.(req) ?? getRequestId(req),
  traceId: options.getTraceId?.(req),
  sessionId: options.getSessionId?.(req),
  tenantId: options.getTenantId?.(req),
  orgId: options.getOrgId?.(req),
  ip: getClientIp(req),
  userAgent: getUserAgent(req),
  route: req.nextUrl?.pathname ?? undefined,
  method: req.method,
});

export const withAudit =
  <TContext>(
    audit: AuditLogger,
    handler: (req: AuditNextRequest, context: TContext) => Response | Promise<Response>,
    options: NextAuditOptions = {},
  ) =>
  async (req: NextRequest, context: TContext): Promise<Response> => {
    const requestContext = buildRequestContext(req, options);
    const actor = options.getActor?.(req);
    const runtime = options.runtime ?? 'nodejs';

    const handle = (getStore: () => AuditContextStore) => {
      const defaultContext = buildContextFromStore(getStore());
      const child = audit.child({ defaultContext });
      const contextual = createContextualLogger(child, getStore, actor);
      const reqWithAudit = req as AuditNextRequest;
      reqWithAudit.audit = contextual;
      return handler(reqWithAudit, context);
    };

    if (runtime === 'edge') {
      return handle(() => requestContext);
    }

    try {
      const { runWithAuditContext, getAuditContext } = await import('@yourorg/audit-node');
      return runWithAuditContext(requestContext, () => handle(getAuditContext));
    } catch {
      return handle(() => requestContext);
    }
  };
