export const PACKAGE_NAME = '@hexmon_tech/audit-core';

export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED' | 'ERROR';

export type AuditActor = {
  type: string;
  id: string;
  displayName?: string;
  roles?: string[];
  ip?: string;
  userAgent?: string;
};

export type AuditTarget = {
  type: string;
  id?: string;
  displayName?: string;
};

export type AuditContext = {
  occurredAt: string;
  requestId?: string;
  traceId?: string;
  sessionId?: string;
  tenantId?: string;
  orgId?: string;
  environment?: string;
  sourceService?: string;
  sourceVersion?: string;
  sourceHost?: string;
  sourceRegion?: string;
  sourceInstance?: string;
};

export type AuditIntegrity = {
  prevHash?: string;
  hash?: string;
  sig?: string;
  alg?: string;
  keyId?: string;
};

export type IntegrityMode = 'none' | 'hash-chain' | 'signed';

export type RetentionTag = string;

export type AuditEvent = {
  schemaVersion: number;
  eventId: string;
  action: string;
  outcome: AuditOutcome;
  actor: AuditActor;
  target?: AuditTarget;
  context: AuditContext;
  metadata?: Record<string, unknown>;
  diff?: Record<string, unknown>;
  integrity?: AuditIntegrity;
  retentionTag?: RetentionTag;
  metadataTruncated?: boolean;
  diffTruncated?: boolean;
};

export type AuditEventInput = {
  action: string;
  outcome: AuditOutcome;
  actor: AuditActor;
  target?: AuditTarget;
  context?: Partial<AuditContext>;
  metadata?: Record<string, unknown>;
  diff?: Record<string, unknown>;
  integrity?: AuditIntegrity;
  retentionTag?: RetentionTag;
  eventId?: string;
  schemaVersion?: number;
};

export type IntegritySigningInput = {
  payload: string;
  hash: string;
  prevHash?: string;
  event: AuditEvent;
};

export type IntegritySigningResult = {
  sig: string;
  keyId?: string;
};

export type IntegrityConfig = {
  mode?: IntegrityMode;
  hashAlgorithm?: string;
  signer?: (
    input: IntegritySigningInput,
  ) => Promise<IntegritySigningResult> | IntegritySigningResult;
};

export type IntegrityHashInput = {
  event: AuditEvent;
  prevHash?: string;
  algorithm?: string;
};

export type IntegrityHashResult =
  | { ok: true; hash: string; payload: string; algorithm: string }
  | { ok: false; error: string };

export type Mode = 'QUEUE' | 'BLOCK' | 'DROP';
export type FanoutMode = 'BEST_EFFORT' | 'ALL_OR_NOTHING';
export type StrictValidation = boolean;

export type AuditPolicyConfig = {
  mode: Mode;
  fanout: FanoutMode;
  strictValidation: StrictValidation;
  integrityMode?: IntegrityMode;
  retentionTag?: RetentionTag;
};

export type RedactionConfig = {
  enabled?: boolean;
  mask?: string;
  paths?: string[];
  keyPatterns?: string[];
};

export type OversizeEventBehavior = 'REJECT' | 'TRUNCATE';

export type PayloadLimitsConfig = {
  maxEventBytes?: number;
  maxMetadataBytes?: number;
  maxDiffBytes?: number;
  oversizeEventBehavior?: OversizeEventBehavior;
};

export type QueueOverflowPolicy = 'DROP' | 'BLOCK';

export type QueueConfig = {
  maxQueueSize?: number;
  maxQueueBytes?: number;
  flushIntervalMs?: number;
  overflowPolicy?: QueueOverflowPolicy;
};

export type RetryConfig = {
  maxAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
};

export type CircuitBreakerConfig = {
  failureThreshold?: number;
  cooldownMs?: number;
  halfOpenMaxInFlight?: number;
};

export type ActionSchemaDefinition<TSchema = unknown> = {
  description?: string;
  schema?: TSchema;
};

export type ActionSchemaMap = Record<string, ActionSchemaDefinition>;

export type ActionName<T extends ActionSchemaMap> = keyof T & string;

export type AuditValidationOptions = {
  strictActionNaming?: boolean;
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type AuditLoggerConfig = {
  mode?: Mode;
  fanout?: FanoutMode;
  strictValidation?: StrictValidation;
  strictActionNaming?: boolean;
  integrityMode?: IntegrityMode;
  integrity?: IntegrityConfig;
  schemaVersion?: number;
  retentionTag?: RetentionTag;
  defaultContext?: Partial<AuditContext>;
  service?: string;
  environment?: string;
  redaction?: RedactionConfig;
  payloadLimits?: PayloadLimitsConfig;
  queue?: QueueConfig;
  retry?: RetryConfig;
  circuitBreaker?: CircuitBreakerConfig;
  shutdownTimeoutMs?: number;
  sinks?: AuditSink[];
  sinkConcurrency?: number;
  batchSize?: number;
  maxBatchBytes?: number;
  metrics?: MetricsRegistry;
};

export type AuditLoggerChildOptions = {
  defaultContext?: Partial<AuditContext>;
};

export type AuditLogErrorCode =
  | 'INVALID_EVENT'
  | 'EVENT_TOO_LARGE'
  | 'DROPPED'
  | 'QUEUE_FULL'
  | 'WRITE_FAILED'
  | 'SHUTDOWN';

export type AuditLogError = {
  code: AuditLogErrorCode;
  message: string;
  details?: string[];
};

export type AuditLogResult =
  | {
      ok: true;
      event: AuditEvent;
      warnings: string[];
    }
  | {
      ok: false;
      error: AuditLogError;
      warnings: string[];
    };

export type AuditFlushResult = {
  ok: boolean;
  written: number;
  errors: string[];
};

export type AuditCounters = {
  audit_events_total: number;
  audit_events_written_total: number;
  audit_events_dropped_total: number;
  audit_write_failures_total: number;
  audit_retries_total: number;
  audit_invalid_total: number;
};

export type AuditGauges = {
  audit_queue_size: number;
  audit_queue_bytes: number;
  audit_circuit_open: number;
};

export type AuditModeStats = {
  attempted: number;
  accepted: number;
  dropped: number;
  invalid: number;
  written: number;
};

export type AuditReason = 'invalid' | 'dropped' | 'shutdown' | 'write_failure';

export type AuditStatsSnapshot = {
  counters: AuditCounters;
  gauges: AuditGauges;
  byMode: Record<Mode, AuditModeStats>;
  byReason: Record<AuditReason, number>;
};

export type MetricLabels = Record<string, string>;

export type MetricSnapshot = {
  name: string;
  type: 'counter' | 'gauge';
  help?: string;
  labelNames: string[];
  values: Array<{ labels: MetricLabels; value: number }>;
};

export type MetricsSnapshot = {
  metrics: MetricSnapshot[];
};

export type CounterMetric = {
  inc: (labels?: MetricLabels, value?: number) => void;
  get: (labels?: MetricLabels) => number;
};

export type GaugeMetric = {
  set: (labels: MetricLabels | undefined, value: number) => void;
  inc: (labels?: MetricLabels, value?: number) => void;
  dec: (labels?: MetricLabels, value?: number) => void;
  get: (labels?: MetricLabels) => number;
};

export type MetricsRegistry = {
  counter: (name: string, help?: string, labelNames?: string[]) => CounterMetric;
  gauge: (name: string, help?: string, labelNames?: string[]) => GaugeMetric;
  snapshot: () => MetricsSnapshot;
  toPrometheus: () => string;
};

export type AuditErrorType = 'TRANSIENT' | 'PERMANENT';

export type WriteFailure = {
  eventId: string;
  errorType: AuditErrorType;
  message: string;
};

export type WriteResult = {
  ok: boolean;
  written: number;
  failed: number;
  failures: WriteFailure[];
};

export type MultiSinkWriteResult = WriteResult & {
  results: WriteResult[];
};

export type AuditSink = {
  name?: string;
  writeBatch: (events: AuditEvent[], signal?: AbortSignal) => Promise<WriteResult>;
  health?: () => Promise<{ ok: boolean; details?: string }>;
  flush?: () => Promise<void>;
  shutdown?: () => Promise<void>;
};

export type MultiSinkOptions = {
  fanoutMode?: FanoutMode;
  concurrency?: number;
  circuitBreaker?: CircuitBreakerConfig;
  onCircuitStateChange?: (openCount: number) => void;
  metrics?: MetricsRegistry;
  sinkNames?: string[];
};

export type MultiSink = Omit<AuditSink, 'writeBatch'> & {
  writeBatch: (events: AuditEvent[], signal?: AbortSignal) => Promise<MultiSinkWriteResult>;
};

export type AuditLogger = {
  log: (input: AuditEventInput) => Promise<AuditLogResult>;
  flush: () => Promise<AuditFlushResult>;
  shutdown: () => Promise<AuditFlushResult>;
  child: (options: AuditLoggerChildOptions) => AuditLogger;
  getStats: () => AuditStatsSnapshot;
  getMetrics: () => MetricsSnapshot;
  getMetricsPrometheus: () => string;
};

const AUDIT_OUTCOMES: AuditOutcome[] = ['SUCCESS', 'FAILURE', 'DENIED', 'ERROR'];
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isAuditOutcome = (value: unknown): value is AuditOutcome =>
  AUDIT_OUTCOMES.includes(value as AuditOutcome);

const isIsoDateString = (value: unknown): boolean =>
  isNonEmptyString(value) && !Number.isNaN(Date.parse(value));

export const validateRequiredFields = (
  input: AuditEventInput,
): { ok: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!isNonEmptyString(input?.action)) {
    errors.push('action is required');
  }

  if (!input?.actor || typeof input.actor !== 'object') {
    errors.push('actor is required');
  } else {
    if (!isNonEmptyString(input.actor.type)) {
      errors.push('actor.type is required');
    }
    if (!isNonEmptyString(input.actor.id)) {
      errors.push('actor.id is required');
    }
  }

  if (!isAuditOutcome(input?.outcome)) {
    errors.push(`outcome must be one of ${AUDIT_OUTCOMES.join(', ')}`);
  }

  if (input?.target && !isNonEmptyString(input.target.type)) {
    errors.push('target.type is required when target is provided');
  }

  if (input?.context?.occurredAt !== undefined && !isIsoDateString(input.context.occurredAt)) {
    errors.push('context.occurredAt must be an ISO date string');
  }

  if (input?.eventId !== undefined && !isNonEmptyString(input.eventId)) {
    errors.push('eventId must be a non-empty string when provided');
  }

  if (input?.schemaVersion !== undefined && typeof input.schemaVersion !== 'number') {
    errors.push('schemaVersion must be a number when provided');
  }

  return { ok: errors.length === 0, errors };
};

export const validateActionName = (action: string): { ok: boolean; reason?: string } => {
  if (!isNonEmptyString(action)) {
    return { ok: false, reason: 'action must be a non-empty string' };
  }

  if (UUID_PATTERN.test(action)) {
    return {
      ok: false,
      reason: 'action appears to contain a UUID; use a low-cardinality action name',
    };
  }

  return { ok: true };
};

export const validateEventInput = (
  input: AuditEventInput,
  options: AuditValidationOptions = {},
): ValidationResult => {
  const required = validateRequiredFields(input);
  const errors = [...required.errors];
  const warnings: string[] = [];

  if (isNonEmptyString(input?.action)) {
    const actionCheck = validateActionName(input.action);
    if (!actionCheck.ok && actionCheck.reason) {
      if (options.strictActionNaming) {
        errors.push(actionCheck.reason);
      } else {
        warnings.push(actionCheck.reason);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
};

export class AuditValidationError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super('Invalid audit event input');
    this.name = 'AuditValidationError';
    this.errors = errors;
  }
}

export const defineActions = <T extends ActionSchemaMap>(actions: T): T => actions;

export const registerActionSchema = <T extends ActionSchemaMap>(_actions: T): void => {
  void _actions;
};

type AuditLoggerResolvedConfig = {
  mode: Mode;
  fanout: FanoutMode;
  strictValidation: StrictValidation;
  strictActionNaming: boolean;
  integrity: ResolvedIntegrityConfig;
  schemaVersion: number;
  retentionTag?: RetentionTag;
  defaultContext: Partial<AuditContext>;
  redaction: ResolvedRedactionConfig;
  payloadLimits: ResolvedPayloadLimits;
  queue: ResolvedQueueConfig;
  retry: ResolvedRetryConfig;
  circuitBreaker: ResolvedCircuitBreakerConfig;
  shutdownTimeoutMs: number;
  sinks: AuditSink[];
  sinkConcurrency: number;
  batchSize: number;
  maxBatchBytes: number;
};

type AuditWriter = {
  writeBatch: (events: AuditEvent[], signal?: AbortSignal) => Promise<WriteResult>;
  flush: () => Promise<void>;
  shutdown: () => Promise<void>;
};

type ResolvedRedactionConfig = {
  enabled: boolean;
  mask: string;
  paths: string[];
  keyPatterns: RegExp[];
  keySet: Set<string>;
};

type ResolvedIntegrityConfig = {
  mode: IntegrityMode;
  hashAlgorithm: string;
  signer?: (
    input: IntegritySigningInput,
  ) => Promise<IntegritySigningResult> | IntegritySigningResult;
};

type ResolvedPayloadLimits = {
  maxEventBytes: number;
  maxMetadataBytes: number;
  maxDiffBytes: number;
  oversizeEventBehavior: OversizeEventBehavior;
};

type ResolvedQueueConfig = {
  maxQueueSize: number;
  maxQueueBytes?: number;
  flushIntervalMs: number;
  overflowPolicy: QueueOverflowPolicy;
};

type ResolvedRetryConfig = {
  maxAttempts: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
};

type ResolvedCircuitBreakerConfig = {
  failureThreshold: number;
  cooldownMs: number;
  halfOpenMaxInFlight: number;
};

type AuditLoggerState = {
  stats: AuditStatsSnapshot;
  writer: AuditWriter;
  queueWriter: QueueWriter;
  integrityState: IntegrityState;
  metrics: MetricsRegistry;
  metricHandles: AuditMetricHandles;
  isShutdown: boolean;
};

type IntegrityState = {
  lastHashByScope: Map<string, string>;
  pendingByScope: Map<string, Promise<void>>;
};

type AuditMetricHandles = {
  counters: {
    eventsTotal: CounterMetric;
    eventsWritten: CounterMetric;
    eventsDropped: CounterMetric;
    writeFailures: CounterMetric;
    retries: CounterMetric;
    invalid: CounterMetric;
    sinkBatches: CounterMetric;
    sinkEventsWritten: CounterMetric;
    sinkEventsFailed: CounterMetric;
    sinkEventFailures: CounterMetric;
  };
  gauges: {
    queueSize: GaugeMetric;
    queueBytes: GaugeMetric;
    circuitOpen: GaugeMetric;
    sinkCircuitOpen: GaugeMetric;
  };
};

type SinkMetricHandles = {
  batches: CounterMetric;
  eventsWritten: CounterMetric;
  eventsFailed: CounterMetric;
  eventFailures: CounterMetric;
  circuitOpen: GaugeMetric;
};

const DEFAULT_SCHEMA_VERSION = 1;
const DEFAULT_MODE: Mode = 'QUEUE';
const DEFAULT_FANOUT: FanoutMode = 'BEST_EFFORT';
const DEFAULT_INTEGRITY_MODE: IntegrityMode = 'none';
const DEFAULT_INTEGRITY_HASH_ALGORITHM = 'SHA-256';
const DEFAULT_REDACTION_MASK = '***';
const DEFAULT_MAX_EVENT_BYTES = 64 * 1024;
const DEFAULT_MAX_METADATA_BYTES = 32 * 1024;
const DEFAULT_MAX_DIFF_BYTES = 32 * 1024;
const DEFAULT_OVERSIZE_BEHAVIOR: OversizeEventBehavior = 'REJECT';
const TRUNCATION_MARKER = '[TRUNCATED]';
const DEFAULT_SINK_CONCURRENCY = 4;
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_BATCH_BYTES = 1024 * 1024;
const DEFAULT_QUEUE_MAX_SIZE = 5000;
const DEFAULT_QUEUE_FLUSH_INTERVAL_MS = 250;
const DEFAULT_QUEUE_OVERFLOW_POLICY: QueueOverflowPolicy = 'DROP';
const DEFAULT_RETRY_MAX_ATTEMPTS = 8;
const DEFAULT_RETRY_BASE_BACKOFF_MS = 250;
const DEFAULT_RETRY_MAX_BACKOFF_MS = 30_000;
const DEFAULT_CIRCUIT_FAILURE_THRESHOLD = 5;
const DEFAULT_CIRCUIT_COOLDOWN_MS = 10_000;
const DEFAULT_CIRCUIT_HALF_OPEN_MAX_INFLIGHT = 1;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5000;

const DEFAULT_REDACTION_KEYS = [
  'password',
  'otp',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'set-cookie',
  'secret',
  'apiKey',
  'privateKey',
];


const createInitialStats = (): AuditStatsSnapshot => ({
  counters: {
    audit_events_total: 0,
    audit_events_written_total: 0,
    audit_events_dropped_total: 0,
    audit_write_failures_total: 0,
    audit_retries_total: 0,
    audit_invalid_total: 0,
  },
  gauges: {
    audit_queue_size: 0,
    audit_queue_bytes: 0,
    audit_circuit_open: 0,
  },
  byMode: {
    QUEUE: { attempted: 0, accepted: 0, dropped: 0, invalid: 0, written: 0 },
    BLOCK: { attempted: 0, accepted: 0, dropped: 0, invalid: 0, written: 0 },
    DROP: { attempted: 0, accepted: 0, dropped: 0, invalid: 0, written: 0 },
  },
  byReason: {
    invalid: 0,
    dropped: 0,
    shutdown: 0,
    write_failure: 0,
  },
});

const createIntegrityState = (): IntegrityState => ({
  lastHashByScope: new Map<string, string>(),
  pendingByScope: new Map<string, Promise<void>>(),
});

const cloneStats = (stats: AuditStatsSnapshot): AuditStatsSnapshot => ({
  counters: { ...stats.counters },
  gauges: { ...stats.gauges },
  byMode: {
    QUEUE: { ...stats.byMode.QUEUE },
    BLOCK: { ...stats.byMode.BLOCK },
    DROP: { ...stats.byMode.DROP },
  },
  byReason: { ...stats.byReason },
});

const resolveDefaultContext = (
  config: AuditLoggerConfig,
  parentDefaultContext?: Partial<AuditContext>,
): Partial<AuditContext> => {
  const baseContext: Partial<AuditContext> = {
    ...(config.service ? { sourceService: config.service } : {}),
    ...(config.environment ? { environment: config.environment } : {}),
  };

  return {
    ...baseContext,
    ...parentDefaultContext,
    ...config.defaultContext,
  };
};

const resolveIntegrityConfig = (
  config?: IntegrityConfig,
  modeOverride?: IntegrityMode,
): ResolvedIntegrityConfig => ({
  mode: modeOverride ?? config?.mode ?? DEFAULT_INTEGRITY_MODE,
  hashAlgorithm: config?.hashAlgorithm ?? DEFAULT_INTEGRITY_HASH_ALGORITHM,
  signer: config?.signer,
});

function resolveConfig(
  config: AuditLoggerConfig,
  parentDefaultContext?: Partial<AuditContext>,
): AuditLoggerResolvedConfig {
  return {
    mode: config.mode ?? DEFAULT_MODE,
    fanout: config.fanout ?? DEFAULT_FANOUT,
    strictValidation: config.strictValidation ?? false,
    strictActionNaming: config.strictActionNaming ?? false,
    integrity: resolveIntegrityConfig(config.integrity, config.integrityMode),
    schemaVersion: config.schemaVersion ?? DEFAULT_SCHEMA_VERSION,
    retentionTag: config.retentionTag,
    defaultContext: resolveDefaultContext(config, parentDefaultContext),
    redaction: resolveRedactionConfig(config.redaction),
    payloadLimits: resolvePayloadLimits(config.payloadLimits),
    queue: resolveQueueConfig(config.queue),
    retry: resolveRetryConfig(config.retry),
    circuitBreaker: resolveCircuitBreakerConfig(config.circuitBreaker),
    shutdownTimeoutMs: config.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
    sinks: config.sinks ?? [],
    sinkConcurrency: Math.max(1, config.sinkConcurrency ?? DEFAULT_SINK_CONCURRENCY),
    batchSize: Math.max(1, config.batchSize ?? DEFAULT_BATCH_SIZE),
    maxBatchBytes: Math.max(1, config.maxBatchBytes ?? DEFAULT_MAX_BATCH_BYTES),
  };
}

export const saasMultiTenantStrict = (): AuditLoggerConfig => ({
  mode: 'BLOCK',
  fanout: 'ALL_OR_NOTHING',
  strictValidation: true,
  strictActionNaming: true,
  integrityMode: 'hash-chain',
  queue: {
    maxQueueSize: 10_000,
    flushIntervalMs: 100,
    overflowPolicy: 'BLOCK',
  },
});

export const onPremSelfHosted = (): AuditLoggerConfig => ({
  mode: 'QUEUE',
  fanout: 'BEST_EFFORT',
  queue: {
    maxQueueSize: 20_000,
    flushIntervalMs: 250,
    overflowPolicy: 'BLOCK',
  },
  retry: {
    maxAttempts: 10,
    baseBackoffMs: 500,
    maxBackoffMs: 60_000,
  },
});

export const highThroughput = (): AuditLoggerConfig => ({
  mode: 'QUEUE',
  fanout: 'BEST_EFFORT',
  batchSize: 500,
  maxBatchBytes: 2 * 1024 * 1024,
  sinkConcurrency: 8,
  queue: {
    maxQueueSize: 25_000,
    flushIntervalMs: 50,
    overflowPolicy: 'DROP',
  },
});

const ULID_ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const resolveRedactionConfig = (config?: RedactionConfig): ResolvedRedactionConfig => {
  const patterns: RegExp[] = [];
  if (config?.keyPatterns) {
    for (const pattern of config.keyPatterns) {
      try {
        patterns.push(new RegExp(pattern, 'i'));
      } catch {
        // Ignore invalid patterns to keep runtime resilient.
      }
    }
  }

  return {
    enabled: config?.enabled ?? true,
    mask: config?.mask ?? DEFAULT_REDACTION_MASK,
    paths: config?.paths ?? [],
    keyPatterns: patterns,
    keySet: new Set(DEFAULT_REDACTION_KEYS.map((key) => key.toLowerCase())),
  };
};

const resolvePayloadLimits = (config?: PayloadLimitsConfig): ResolvedPayloadLimits => ({
  maxEventBytes: config?.maxEventBytes ?? DEFAULT_MAX_EVENT_BYTES,
  maxMetadataBytes: config?.maxMetadataBytes ?? DEFAULT_MAX_METADATA_BYTES,
  maxDiffBytes: config?.maxDiffBytes ?? DEFAULT_MAX_DIFF_BYTES,
  oversizeEventBehavior: config?.oversizeEventBehavior ?? DEFAULT_OVERSIZE_BEHAVIOR,
});

const resolveQueueConfig = (config?: QueueConfig): ResolvedQueueConfig => ({
  maxQueueSize: Math.max(1, config?.maxQueueSize ?? DEFAULT_QUEUE_MAX_SIZE),
  maxQueueBytes:
    config?.maxQueueBytes && config.maxQueueBytes > 0 ? config.maxQueueBytes : undefined,
  flushIntervalMs: Math.max(1, config?.flushIntervalMs ?? DEFAULT_QUEUE_FLUSH_INTERVAL_MS),
  overflowPolicy: config?.overflowPolicy ?? DEFAULT_QUEUE_OVERFLOW_POLICY,
});

const resolveRetryConfig = (config?: RetryConfig): ResolvedRetryConfig => ({
  maxAttempts: Math.max(1, config?.maxAttempts ?? DEFAULT_RETRY_MAX_ATTEMPTS),
  baseBackoffMs: Math.max(1, config?.baseBackoffMs ?? DEFAULT_RETRY_BASE_BACKOFF_MS),
  maxBackoffMs: Math.max(1, config?.maxBackoffMs ?? DEFAULT_RETRY_MAX_BACKOFF_MS),
});

const resolveCircuitBreakerConfig = (
  config?: CircuitBreakerConfig,
): ResolvedCircuitBreakerConfig => ({
  failureThreshold: Math.max(
    1,
    config?.failureThreshold ?? DEFAULT_CIRCUIT_FAILURE_THRESHOLD,
  ),
  cooldownMs: Math.max(1, config?.cooldownMs ?? DEFAULT_CIRCUIT_COOLDOWN_MS),
  halfOpenMaxInFlight: Math.max(
    1,
    config?.halfOpenMaxInFlight ?? DEFAULT_CIRCUIT_HALF_OPEN_MAX_INFLIGHT,
  ),
});

type MetricType = 'counter' | 'gauge';

type MetricEntry = {
  name: string;
  type: MetricType;
  help?: string;
  labelNames: string[];
  values: Map<string, number>;
};

const normalizeLabelValues = (
  labelNames: string[],
  labels?: MetricLabels,
): { key: string; labels: MetricLabels } => {
  if (labelNames.length === 0) {
    return { key: '[]', labels: {} };
  }
  const labelValues = labelNames.map((name) =>
    labels && typeof labels[name] === 'string' ? labels[name] : '',
  );
  const normalized: MetricLabels = {};
  for (let i = 0; i < labelNames.length; i += 1) {
    normalized[labelNames[i]] = labelValues[i];
  }
  return { key: JSON.stringify(labelValues), labels: normalized };
};

const createMetricSnapshot = (entry: MetricEntry): MetricSnapshot => {
  const values: Array<{ labels: MetricLabels; value: number }> = [];
  for (const [key, value] of entry.values.entries()) {
    let labels: MetricLabels = {};
    if (entry.labelNames.length > 0) {
      try {
        const labelValues = JSON.parse(key) as string[];
        labels = {};
        for (let i = 0; i < entry.labelNames.length; i += 1) {
          labels[entry.labelNames[i]] = labelValues[i] ?? '';
        }
      } catch {
        labels = {};
      }
    }
    values.push({ labels, value });
  }
  return {
    name: entry.name,
    type: entry.type,
    help: entry.help,
    labelNames: entry.labelNames,
    values,
  };
};

const escapePrometheusLabelValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');

class InMemoryMetricsRegistry implements MetricsRegistry {
  private entries = new Map<string, MetricEntry>();

  counter(name: string, help?: string, labelNames: string[] = []): CounterMetric {
    return this.getOrCreate(name, 'counter', help, labelNames);
  }

  gauge(name: string, help?: string, labelNames: string[] = []): GaugeMetric {
    return this.getOrCreate(name, 'gauge', help, labelNames);
  }

  snapshot(): MetricsSnapshot {
    const metrics: MetricSnapshot[] = [];
    for (const entry of this.entries.values()) {
      metrics.push(createMetricSnapshot(entry));
    }
    return { metrics };
  }

  toPrometheus(): string {
    const lines: string[] = [];
    for (const entry of this.entries.values()) {
      if (entry.help) {
        lines.push(`# HELP ${entry.name} ${entry.help}`);
      }
      lines.push(`# TYPE ${entry.name} ${entry.type}`);
      if (entry.values.size === 0) {
        if (entry.labelNames.length === 0) {
          lines.push(`${entry.name} 0`);
        }
        continue;
      }
      for (const [key, value] of entry.values.entries()) {
        let labelSuffix = '';
        if (entry.labelNames.length > 0) {
          const labelValues = JSON.parse(key) as string[];
          const parts: string[] = [];
          for (let i = 0; i < entry.labelNames.length; i += 1) {
            const name = entry.labelNames[i];
            const labelValue = labelValues[i] ?? '';
            parts.push(`${name}="${escapePrometheusLabelValue(labelValue)}"`);
          }
          labelSuffix = `{${parts.join(',')}}`;
        }
        lines.push(`${entry.name}${labelSuffix} ${value}`);
      }
    }
    return lines.join('\n');
  }

  private getOrCreate(
    name: string,
    type: MetricType,
    help?: string,
    labelNames: string[] = [],
  ): CounterMetric & GaugeMetric {
    const existing = this.entries.get(name);
    if (existing) {
      if (existing.type !== type) {
        throw new Error(`Metric ${name} already registered with different type`);
      }
      if (
        existing.labelNames.length !== labelNames.length ||
        existing.labelNames.some((label, index) => label !== labelNames[index])
      ) {
        throw new Error(`Metric ${name} already registered with different labels`);
      }
      return this.createHandle(existing);
    }

    const entry: MetricEntry = {
      name,
      type,
      help,
      labelNames: [...labelNames],
      values: new Map<string, number>(),
    };

    if (labelNames.length === 0) {
      entry.values.set('[]', 0);
    }

    this.entries.set(name, entry);
    return this.createHandle(entry);
  }

  private createHandle(entry: MetricEntry): CounterMetric & GaugeMetric {
    const getValue = (labels?: MetricLabels) => {
      const { key } = normalizeLabelValues(entry.labelNames, labels);
      return entry.values.get(key) ?? 0;
    };

    const setValue = (labels: MetricLabels | undefined, value: number) => {
      const { key } = normalizeLabelValues(entry.labelNames, labels);
      entry.values.set(key, value);
    };

    const incValue = (labels?: MetricLabels, value = 1) => {
      const { key } = normalizeLabelValues(entry.labelNames, labels);
      const current = entry.values.get(key) ?? 0;
      entry.values.set(key, current + value);
    };

    const decValue = (labels?: MetricLabels, value = 1) => {
      const { key } = normalizeLabelValues(entry.labelNames, labels);
      const current = entry.values.get(key) ?? 0;
      entry.values.set(key, current - value);
    };

    return {
      inc: incValue,
      dec: decValue,
      set: setValue,
      get: getValue,
    };
  }
}

export const createMetricsRegistry = (): MetricsRegistry => new InMemoryMetricsRegistry();

const createSinkMetricHandles = (registry: MetricsRegistry): SinkMetricHandles => ({
  batches: registry.counter('audit_sink_batches_total', 'Sink batch write attempts', [
    'sinkName',
  ]),
  eventsWritten: registry.counter('audit_sink_events_written_total', 'Events written by sink', [
    'sinkName',
  ]),
  eventsFailed: registry.counter('audit_sink_events_failed_total', 'Events failed by sink', [
    'sinkName',
  ]),
  eventFailures: registry.counter('audit_sink_event_failures_total', 'Sink failures by error type', [
    'sinkName',
    'errorType',
  ]),
  circuitOpen: registry.gauge(
    'audit_sink_circuit_open',
    'Sink circuit breaker open state',
    ['sinkName'],
  ),
});

const createAuditMetricHandles = (registry: MetricsRegistry): AuditMetricHandles => {
  const sinkMetrics = createSinkMetricHandles(registry);
  return {
    counters: {
      eventsTotal: registry.counter('audit_events_total', 'Total audit log attempts'),
      eventsWritten: registry.counter(
        'audit_events_written_total',
        'Audit events successfully written',
      ),
      eventsDropped: registry.counter(
        'audit_events_dropped_total',
        'Audit events dropped before writing',
      ),
      writeFailures: registry.counter(
        'audit_write_failures_total',
        'Audit events that failed permanently',
      ),
      retries: registry.counter('audit_retries_total', 'Audit event retries'),
      invalid: registry.counter('audit_invalid_total', 'Invalid audit events'),
      sinkBatches: sinkMetrics.batches,
      sinkEventsWritten: sinkMetrics.eventsWritten,
      sinkEventsFailed: sinkMetrics.eventsFailed,
      sinkEventFailures: sinkMetrics.eventFailures,
    },
    gauges: {
      queueSize: registry.gauge('audit_queue_size', 'Queued audit events'),
      queueBytes: registry.gauge('audit_queue_bytes', 'Queued audit event bytes'),
      circuitOpen: registry.gauge(
        'audit_circuit_open',
        'Number of open circuit breakers',
      ),
      sinkCircuitOpen: sinkMetrics.circuitOpen,
    },
  };
};

const getUtf8ByteLength = (value: string): number => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  return encodeURIComponent(value).replace(/%[0-9A-F]{2}/g, 'U').length;
};

const safeJsonByteSize = (
  value: unknown,
): { ok: true; bytes: number } | { ok: false; error: string } => {
  try {
    const json = JSON.stringify(value);
    if (json === undefined) {
      return { ok: false, error: 'value is not JSON-serializable' };
    }
    return { ok: true, bytes: getUtf8ByteLength(json) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'value is not JSON-serializable',
    };
  }
};

const stableStringify = (
  value: unknown,
): { ok: true; value: string } | { ok: false; error: string } => {
  try {
    const json = JSON.stringify(value, (_key, val) => {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const record = val as Record<string, unknown>;
        const sorted: Record<string, unknown> = {};
        const keys = Object.keys(record).sort();
        for (const key of keys) {
          sorted[key] = record[key];
        }
        return sorted;
      }
      return val;
    });
    if (json === undefined) {
      return { ok: false, error: 'value is not JSON-serializable' };
    }
    return { ok: true, value: json };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'value is not JSON-serializable',
    };
  }
};

const createTruncationValue = (originalBytes: number): Record<string, unknown> => ({
  _truncated: true,
  _marker: TRUNCATION_MARKER,
  _originalBytes: originalBytes,
});

const truncatePayload = (
  value: unknown,
  maxBytes: number,
): { ok: true; value: unknown; truncated: boolean } | { ok: false; error: string } => {
  if (maxBytes <= 0) {
    return { ok: true, value: createTruncationValue(0), truncated: true };
  }

  const size = safeJsonByteSize(value);
  if (!size.ok) {
    return size;
  }
  if (size.bytes <= maxBytes) {
    return { ok: true, value, truncated: false };
  }

  return { ok: true, value: createTruncationValue(size.bytes), truncated: true };
};

const shouldRedactKey = (key: string, config: ResolvedRedactionConfig): boolean => {
  if (config.keySet.has(key.toLowerCase())) {
    return true;
  }
  return config.keyPatterns.some((pattern) => pattern.test(key));
};

const redactValue = (value: unknown, config: ResolvedRedactionConfig, seen: WeakSet<object>) => {
  if (typeof value !== 'object' || value === null) {
    return;
  }
  const obj = value as Record<string, unknown>;
  if (seen.has(obj)) {
    return;
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      redactValue(item, config, seen);
    }
    return;
  }

  for (const [key, child] of Object.entries(obj)) {
    if (shouldRedactKey(key, config)) {
      obj[key] = config.mask;
      continue;
    }
    redactValue(child, config, seen);
  }
};

const redactPath = (root: unknown, path: string, mask: string) => {
  if (!path) {
    return;
  }
  const segments = path.split('.').filter(Boolean);
  if (segments.length === 0) {
    return;
  }

  let current: unknown = root;
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;

    if (typeof current !== 'object' || current === null) {
      return;
    }

    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return;
      }
      if (isLast) {
        current[index] = mask;
      } else {
        current = current[index];
      }
      continue;
    }

    const record = current as Record<string, unknown>;
    if (!(segment in record)) {
      return;
    }
    if (isLast) {
      record[segment] = mask;
    } else {
      current = record[segment];
    }
  }
};

const applyRedaction = (event: AuditEvent, config: ResolvedRedactionConfig): AuditEvent => {
  if (!config.enabled) {
    return event;
  }

  redactValue(event, config, new WeakSet());

  if (config.paths.length > 0) {
    for (const path of config.paths) {
      redactPath(event, path, config.mask);
    }
  }

  return event;
};

type PayloadCheckResult =
  | { ok: true; event: AuditEvent; eventBytes: number }
  | { ok: false; code: AuditLogErrorCode; errors: string[] };

const applyPayloadLimits = (
  event: AuditEvent,
  limits: ResolvedPayloadLimits,
): PayloadCheckResult => {
  if (event.metadata !== undefined) {
    const result = truncatePayload(event.metadata, limits.maxMetadataBytes);
    if (!result.ok) {
      return {
        ok: false,
        code: 'INVALID_EVENT',
        errors: [`metadata is not JSON-serializable: ${result.error}`],
      };
    }
    if (result.truncated) {
      event.metadata = result.value as Record<string, unknown>;
      event.metadataTruncated = true;
    }
  }

  if (event.diff !== undefined) {
    const result = truncatePayload(event.diff, limits.maxDiffBytes);
    if (!result.ok) {
      return {
        ok: false,
        code: 'INVALID_EVENT',
        errors: [`diff is not JSON-serializable: ${result.error}`],
      };
    }
    if (result.truncated) {
      event.diff = result.value as Record<string, unknown>;
      event.diffTruncated = true;
    }
  }

  const eventSize = safeJsonByteSize(event);
  if (!eventSize.ok) {
    return {
      ok: false,
      code: 'INVALID_EVENT',
      errors: [`event is not JSON-serializable: ${eventSize.error}`],
    };
  }

  if (eventSize.bytes <= limits.maxEventBytes) {
    return { ok: true, event, eventBytes: eventSize.bytes };
  }

  if (limits.oversizeEventBehavior === 'TRUNCATE') {
    if (event.metadata !== undefined) {
      event.metadata = undefined;
      event.metadataTruncated = true;
    }
    if (event.diff !== undefined) {
      event.diff = undefined;
      event.diffTruncated = true;
    }

    const truncatedSize = safeJsonByteSize(event);
    if (truncatedSize.ok && truncatedSize.bytes <= limits.maxEventBytes) {
      return { ok: true, event, eventBytes: truncatedSize.bytes };
    }
  }

  return {
    ok: false,
    code: 'EVENT_TOO_LARGE',
    errors: [`event exceeds maxEventBytes (${limits.maxEventBytes})`],
  };
};

const stripIntegrity = (event: AuditEvent): AuditEvent => {
  const clone = { ...event };
  if ('integrity' in clone) {
    delete (clone as { integrity?: AuditIntegrity }).integrity;
  }
  return clone;
};

export const getIntegrityScopeKey = (event: AuditEvent): string => {
  if (event.context.tenantId) {
    return `tenant:${event.context.tenantId}`;
  }
  const service = event.context.sourceService ?? 'unknown';
  return `service:${service}`;
};

const getSubtleCrypto = (): SubtleCrypto | undefined => {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  return cryptoObj?.subtle;
};

const bufferToHex = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
};

const buildIntegrityPayload = (
  event: AuditEvent,
  prevHash?: string,
): { ok: true; payload: string } | { ok: false; error: string } => {
  const payloadValue: Record<string, unknown> = {
    event: stripIntegrity(event),
  };
  if (prevHash) {
    payloadValue.prevHash = prevHash;
  }
  const payload = stableStringify(payloadValue);
  if (!payload.ok) {
    return payload;
  }
  return { ok: true, payload: payload.value };
};

export const computeIntegrityHash = async (
  input: IntegrityHashInput,
): Promise<IntegrityHashResult> => {
  const subtle = getSubtleCrypto();
  if (!subtle) {
    return { ok: false, error: 'crypto.subtle is not available' };
  }
  if (typeof TextEncoder === 'undefined') {
    return { ok: false, error: 'TextEncoder is not available' };
  }

  const algorithm = input.algorithm ?? DEFAULT_INTEGRITY_HASH_ALGORITHM;
  const payloadResult = buildIntegrityPayload(input.event, input.prevHash);
  if (!payloadResult.ok) {
    return payloadResult;
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadResult.payload);
    const digest = await subtle.digest(algorithm, data);
    return {
      ok: true,
      hash: bufferToHex(digest),
      payload: payloadResult.payload,
      algorithm,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'hash computation failed',
    };
  }
};

const withIntegrityScopeLock = async <T>(
  state: IntegrityState,
  scopeKey: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const previous = state.pendingByScope.get(scopeKey) ?? Promise.resolve();
  let release: () => void = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(() => current);
  state.pendingByScope.set(scopeKey, chained);
  try {
    await previous;
    return await fn();
  } finally {
    release();
    chained.finally(() => {
      if (state.pendingByScope.get(scopeKey) === chained) {
        state.pendingByScope.delete(scopeKey);
      }
    });
  }
};

type IntegrityProcessResult =
  | { ok: true; event: AuditEvent; nextHash?: string }
  | { ok: false; errors: string[] };

const applyIntegrity = async (
  event: AuditEvent,
  config: ResolvedIntegrityConfig,
  prevHash: string | undefined,
): Promise<IntegrityProcessResult> => {
  if (config.mode === 'none') {
    return { ok: true, event };
  }

  const hashResult = await computeIntegrityHash({
    event,
    prevHash,
    algorithm: config.hashAlgorithm,
  });
  if (!hashResult.ok) {
    return { ok: false, errors: [hashResult.error] };
  }

  const integrity: AuditIntegrity = {
    prevHash,
    hash: hashResult.hash,
    alg: config.hashAlgorithm,
  };

  if (config.mode === 'signed') {
    if (!config.signer) {
      return { ok: false, errors: ['integrity signer is not configured'] };
    }
    let signature: IntegritySigningResult;
    try {
      signature = await config.signer({
        payload: hashResult.payload,
        hash: hashResult.hash,
        prevHash,
        event,
      });
    } catch (error) {
      return {
        ok: false,
        errors: [
          error instanceof Error ? error.message : 'integrity signer failed',
        ],
      };
    }
    if (!signature?.sig) {
      return { ok: false, errors: ['integrity signer returned empty signature'] };
    }
    integrity.sig = signature.sig;
    if (signature.keyId) {
      integrity.keyId = signature.keyId;
    }
  }

  return { ok: true, event: { ...event, integrity }, nextHash: hashResult.hash };
};

const createNullSink = (): AuditSink => ({
  name: 'null',
  writeBatch: async (events: AuditEvent[], signal?: AbortSignal) => {
    void signal;
    return {
      ok: true,
      written: events.length,
      failed: 0,
      failures: [],
    };
  },
});

const createAuditWriter = (sink: AuditSink): AuditWriter => ({
  writeBatch: sink.writeBatch,
  flush: sink.flush ?? (async () => {}),
  shutdown: sink.shutdown ?? (async () => {}),
});

const runWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  handler: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = new Array(Math.min(concurrency, items.length)).fill(0).map(async () => {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await handler(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
};

const normalizeSinkFailure = (
  events: AuditEvent[],
  error: unknown,
  errorType: AuditErrorType,
): WriteResult => {
  const message = error instanceof Error ? error.message : 'sink write failed';
  return {
    ok: false,
    written: 0,
    failed: events.length,
    failures: events.map((event) => ({
      eventId: event.eventId,
      errorType,
      message,
    })),
  };
};

const fillMissingFailures = (events: AuditEvent[], result: WriteResult): WriteFailure[] => {
  if (!result.ok && result.failures.length === 0) {
    return events.map((event) => ({
      eventId: event.eventId,
      errorType: 'TRANSIENT',
      message: 'sink returned failure without details',
    }));
  }
  return result.failures;
};

const buildFailureIndex = (
  events: AuditEvent[],
  failures: WriteFailure[],
): Map<string, WriteFailure> => {
  const ids = new Set(events.map((event) => event.eventId));
  const map = new Map<string, WriteFailure>();
  for (const failure of failures) {
    if (ids.has(failure.eventId)) {
      map.set(failure.eventId, failure);
    }
  }
  return map;
};

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

const createCircuitBreaker = (
  config: ResolvedCircuitBreakerConfig,
  onStateChange?: (wasOpen: boolean, isOpen: boolean) => void,
) => {
  let state: CircuitState = 'CLOSED';
  let consecutiveTransient = 0;
  let openedAt = 0;
  let halfOpenInFlight = 0;

  const setState = (next: CircuitState) => {
    if (state === next) {
      return;
    }
    const wasOpen = state === 'OPEN';
    const isOpen = next === 'OPEN';
    state = next;
    if (wasOpen !== isOpen) {
      onStateChange?.(wasOpen, isOpen);
    }
  };

  const allowRequest = (): boolean => {
    const now = Date.now();
    if (state === 'OPEN') {
      if (now - openedAt >= config.cooldownMs) {
        setState('HALF_OPEN');
      } else {
        return false;
      }
    }

    if (state === 'HALF_OPEN') {
      if (halfOpenInFlight >= config.halfOpenMaxInFlight) {
        return false;
      }
      halfOpenInFlight += 1;
    }

    return true;
  };

  const completeRequest = (hadTransientFailure: boolean) => {
    if (state === 'HALF_OPEN') {
      halfOpenInFlight = Math.max(0, halfOpenInFlight - 1);
    }

    if (!hadTransientFailure) {
      consecutiveTransient = 0;
      if (state !== 'CLOSED') {
        setState('CLOSED');
      }
      return;
    }

    consecutiveTransient += 1;
    if (state === 'HALF_OPEN' || consecutiveTransient >= config.failureThreshold) {
      openedAt = Date.now();
      setState('OPEN');
    }
  };

  return {
    allowRequest,
    completeRequest,
  };
};

export const multiSink = (
  sinks: AuditSink[],
  options: MultiSinkOptions = {},
): MultiSink => {
  const activeSinks = sinks.length > 0 ? sinks : [createNullSink()];
  const fanoutMode = options.fanoutMode ?? DEFAULT_FANOUT;
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_SINK_CONCURRENCY);
  const breakerConfig = resolveCircuitBreakerConfig(options.circuitBreaker);
  const sinkMetrics = options.metrics ? createSinkMetricHandles(options.metrics) : undefined;
  const openCount = { value: 0 };
  const handleStateChange = (wasOpen: boolean, isOpen: boolean) => {
    if (wasOpen === isOpen) {
      return;
    }
    openCount.value += isOpen ? 1 : -1;
    options.onCircuitStateChange?.(openCount.value);
  };
  const sinkStates = activeSinks.map((sink, index) => {
    const sinkName =
      sink.name ?? options.sinkNames?.[index] ?? `sink-${index + 1}`;
    sinkMetrics?.circuitOpen.set({ sinkName }, 0);
    return {
      sink,
      name: sinkName,
      breaker: createCircuitBreaker(breakerConfig, (wasOpen, isOpen) => {
        handleStateChange(wasOpen, isOpen);
        sinkMetrics?.circuitOpen.set({ sinkName }, isOpen ? 1 : 0);
      }),
    };
  });

  const writeBatch = async (
    events: AuditEvent[],
    signal?: AbortSignal,
  ): Promise<MultiSinkWriteResult> => {
    if (events.length === 0) {
      return { ok: true, written: 0, failed: 0, failures: [], results: [] };
    }

    if (signal?.aborted) {
      return {
        ...normalizeSinkFailure(events, 'abort', 'TRANSIENT'),
        results: [],
      };
    }

    const results = await runWithConcurrency(
      sinkStates,
      concurrency,
      async ({ sink, breaker, name }) => {
        const sinkName = name;
        if (!breaker.allowRequest()) {
          const result = normalizeSinkFailure(events, 'circuit open', 'TRANSIENT');
          const normalized = normalizeWriteResult(events, result);
          sinkMetrics?.batches.inc({ sinkName });
          sinkMetrics?.eventsWritten.inc({ sinkName }, normalized.written);
          sinkMetrics?.eventsFailed.inc({ sinkName }, normalized.failed);
          if (normalized.failed > 0) {
            sinkMetrics?.eventFailures.inc(
              { sinkName, errorType: 'TRANSIENT' },
              normalized.failed,
            );
          }
          return normalized;
        }

        try {
          const result = await sink.writeBatch(events, signal);
          const normalized = normalizeWriteResult(events, result);
          const sinkFailures = normalized.failures;
          const hadTransientFailure = sinkFailures.some(
            (failure) => failure.errorType === 'TRANSIENT',
          );
          breaker.completeRequest(hadTransientFailure);

          sinkMetrics?.batches.inc({ sinkName });
          sinkMetrics?.eventsWritten.inc({ sinkName }, normalized.written);
          sinkMetrics?.eventsFailed.inc({ sinkName }, normalized.failed);

          let transientCount = 0;
          let permanentCount = 0;
          for (const failure of sinkFailures) {
            if (failure.errorType === 'TRANSIENT') {
              transientCount += 1;
            } else {
              permanentCount += 1;
            }
          }
          if (transientCount > 0) {
            sinkMetrics?.eventFailures.inc(
              { sinkName, errorType: 'TRANSIENT' },
              transientCount,
            );
          }
          if (permanentCount > 0) {
            sinkMetrics?.eventFailures.inc(
              { sinkName, errorType: 'PERMANENT' },
              permanentCount,
            );
          }
          return normalized;
        } catch (error) {
          breaker.completeRequest(true);
          const result = normalizeSinkFailure(events, error, 'TRANSIENT');
          const normalized = normalizeWriteResult(events, result);
          sinkMetrics?.batches.inc({ sinkName });
          sinkMetrics?.eventsWritten.inc({ sinkName }, normalized.written);
          sinkMetrics?.eventsFailed.inc({ sinkName }, normalized.failed);
          if (normalized.failed > 0) {
            sinkMetrics?.eventFailures.inc(
              { sinkName, errorType: 'TRANSIENT' },
              normalized.failed,
            );
          }
          return normalized;
        }
      },
    );

    const perEvent = new Map<
      string,
      { success: number; transient: number; permanent: number; messages: Set<string> }
    >();
    for (const event of events) {
      perEvent.set(event.eventId, {
        success: 0,
        transient: 0,
        permanent: 0,
        messages: new Set<string>(),
      });
    }

    for (const result of results) {
      const sinkFailures = fillMissingFailures(events, result);
      const failureIndex = buildFailureIndex(events, sinkFailures);
      for (const event of events) {
        const stats = perEvent.get(event.eventId);
        if (!stats) {
          continue;
        }
        const failure = failureIndex.get(event.eventId);
        if (failure) {
          if (failure.errorType === 'TRANSIENT') {
            stats.transient += 1;
          } else {
            stats.permanent += 1;
          }
          if (failure.message) {
            stats.messages.add(failure.message);
          }
        } else {
          stats.success += 1;
        }
      }
    }

    const failures: WriteFailure[] = [];
    let written = 0;
    let failed = 0;

    for (const event of events) {
      const stats = perEvent.get(event.eventId);
      if (!stats) {
        continue;
      }

      const isWritten =
        fanoutMode === 'ALL_OR_NOTHING'
          ? stats.transient === 0 && stats.permanent === 0
          : stats.success > 0;

      if (isWritten) {
        written += 1;
        continue;
      }

      failed += 1;
      const errorType =
        fanoutMode === 'ALL_OR_NOTHING'
          ? stats.permanent > 0
            ? 'PERMANENT'
            : 'TRANSIENT'
          : stats.transient > 0
            ? 'TRANSIENT'
            : 'PERMANENT';

      const message =
        stats.messages.size > 0
          ? Array.from(stats.messages).join('; ')
          : 'sink write failed';

      failures.push({
        eventId: event.eventId,
        errorType,
        message,
      });
    }

    return {
      ok: failed === 0,
      written,
      failed,
      failures,
      results,
    };
  };

  const flush = async () => {
    await Promise.all(activeSinks.map((sink) => sink.flush?.()));
  };

  const shutdown = async () => {
    await Promise.all(activeSinks.map((sink) => sink.shutdown?.()));
  };

  const health = async () => {
    const results = await Promise.all(
      activeSinks.map((sink) => (sink.health ? sink.health() : Promise.resolve({ ok: true }))),
    );
    const ok = results.every((result) => result.ok);
    return { ok, details: ok ? undefined : 'one or more sinks unhealthy' };
  };

  return {
    writeBatch,
    flush,
    shutdown,
    health,
  };
};

const getRandomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
    return bytes;
  }
  for (let i = 0; i < length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
};

const encodeTime = (timeMs: number): string => {
  let time = timeMs;
  let encoded = '';
  for (let i = 0; i < 10; i += 1) {
    encoded = ULID_ENCODING[time % 32] + encoded;
    time = Math.floor(time / 32);
  }
  return encoded;
};

const encodeRandom = (): string => {
  const bytes = getRandomBytes(16);
  let encoded = '';
  for (let i = 0; i < 16; i += 1) {
    encoded += ULID_ENCODING[bytes[i] & 31];
  }
  return encoded;
};

const generateEventId = (): string => `${encodeTime(Date.now())}${encodeRandom()}`;

const enqueueMicrotask = (callback: () => void) => {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
  } else {
    Promise.resolve().then(callback);
  }
};

const normalizeEvent = (
  input: AuditEventInput,
  config: AuditLoggerResolvedConfig,
): AuditEvent => {
  const mergedContext: Partial<AuditContext> = {
    ...config.defaultContext,
    ...(input.context ?? {}),
  };
  const occurredAt = isNonEmptyString(mergedContext.occurredAt)
    ? mergedContext.occurredAt
    : new Date().toISOString();
  const context: AuditContext = {
    ...mergedContext,
    occurredAt,
  };

  return {
    schemaVersion: input.schemaVersion ?? config.schemaVersion,
    eventId: input.eventId ?? generateEventId(),
    action: input.action,
    outcome: input.outcome,
    actor: input.actor,
    target: input.target,
    context,
    metadata: input.metadata,
    diff: input.diff,
    integrity: input.integrity,
    retentionTag: input.retentionTag ?? config.retentionTag,
  };
};

const normalizeWriteResult = (events: AuditEvent[], result: WriteResult): WriteResult => {
  const failures = fillMissingFailures(events, result);
  const failed = Math.max(result.failed, failures.length);
  const written =
    result.written > 0 ? result.written : Math.max(0, events.length - failed);

  return {
    ok: result.ok && failed === 0,
    written,
    failed,
    failures,
  };
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

type QueueItem = {
  event: AuditEvent;
  attempt: number;
  nextAttemptAt: number;
  bytes: number;
  mode: Mode;
  deferred?: Deferred<WriteResult>;
};

type QueueWriterConfig = ResolvedQueueConfig & {
  batchSize: number;
  maxBatchBytes: number;
  retry: ResolvedRetryConfig;
};

type QueueEnqueueResult = {
  accepted: boolean;
  reason?: 'FULL' | 'SHUTDOWN';
  completion?: Promise<WriteResult>;
};

const createDeferred = <T>(): Deferred<T> => {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve: resolve! };
};

const getEventBytes = (event: AuditEvent): number => {
  const size = safeJsonByteSize(event);
  return size.ok ? size.bytes : 0;
};

const computeBackoffDelay = (attempt: number, retry: ResolvedRetryConfig): number => {
  const baseDelay = retry.baseBackoffMs * 2 ** Math.max(0, attempt - 1);
  const capped = Math.min(baseDelay, retry.maxBackoffMs);
  const jitter = 0.5 + Math.random();
  return Math.max(1, Math.min(retry.maxBackoffMs, Math.floor(capped * jitter)));
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

class QueueWriter {
  private queue: QueueItem[] = [];
  private queueBytes = 0;
  private processing: Promise<AuditFlushResult> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private nextFlushAt: number | null = null;
  private spaceWaiters: Array<{ bytes: number; resolve: () => void }> = [];
  private stopped = false;

  constructor(
    private state: AuditLoggerState,
    private writer: AuditWriter,
    private config: QueueWriterConfig,
  ) {}

  async enqueue(
    event: AuditEvent,
    mode: Mode,
    waitForResult: boolean,
    bytesOverride?: number,
  ): Promise<QueueEnqueueResult> {
    if (this.stopped) {
      return { accepted: false, reason: 'SHUTDOWN' };
    }

    const bytes = bytesOverride ?? getEventBytes(event);
    const hasCapacity = await this.ensureCapacity(bytes, mode);
    if (!hasCapacity) {
      return { accepted: false, reason: 'FULL' };
    }

    const deferred = waitForResult ? createDeferred<WriteResult>() : undefined;
    this.queue.push({
      event,
      attempt: 1,
      nextAttemptAt: Date.now(),
      bytes,
      mode,
      deferred,
    });
    this.queueBytes += bytes;
    this.updateQueueMetrics();
    this.schedule();

    return { accepted: true, completion: deferred?.promise };
  }

  async flush(): Promise<AuditFlushResult> {
    return this.processQueue(true);
  }

  async shutdown(timeoutMs: number): Promise<AuditFlushResult> {
    this.stopped = true;
    this.clearTimer();
    this.resolveSpaceWaiters();

    const deadline = Date.now() + timeoutMs;
    const summary: AuditFlushResult = { ok: true, written: 0, errors: [] };

    while (this.queue.length > 0 && Date.now() < deadline) {
      const result = await this.processQueue(true);
      summary.written += result.written;
      if (!result.ok) {
        summary.ok = false;
        summary.errors.push(...result.errors);
      }

      if (this.queue.length === 0) {
        break;
      }

      const delay = this.nextReadyDelay(Date.now());
      if (delay > 0) {
        await sleep(Math.min(delay, Math.max(0, deadline - Date.now())));
      }
    }

    if (this.queue.length > 0) {
      const remaining = this.queue.splice(0, this.queue.length);
      this.queueBytes = 0;
      this.updateQueueMetrics();
      this.notifySpaceWaiters();
      for (const item of remaining) {
        recordShutdownDrop(this.state, item.mode);
        if (item.deferred) {
          item.deferred.resolve({
            ok: false,
            written: 0,
            failed: 1,
            failures: [
              {
                eventId: item.event.eventId,
                errorType: 'PERMANENT',
                message: 'shutdown before write',
              },
            ],
          });
        }
      }
      summary.ok = false;
      summary.errors.push('shutdown before queue drained');
    }

    return summary;
  }

  stop(): void {
    this.stopped = true;
    this.clearTimer();
    this.resolveSpaceWaiters();
  }

  private async ensureCapacity(bytes: number, mode: Mode): Promise<boolean> {
    if (this.config.maxQueueBytes !== undefined && bytes > this.config.maxQueueBytes) {
      return false;
    }

    if (this.hasCapacity(bytes)) {
      return true;
    }

    if (mode === 'BLOCK') {
      return false;
    }

    if (mode === 'QUEUE' && this.config.overflowPolicy === 'BLOCK') {
      while (!this.hasCapacity(bytes)) {
        await this.waitForSpace(bytes);
        if (this.stopped) {
          return false;
        }
      }
      return true;
    }

    return false;
  }

  private hasCapacity(bytes: number): boolean {
    if (this.queue.length >= this.config.maxQueueSize) {
      return false;
    }
    if (
      this.config.maxQueueBytes !== undefined &&
      this.queueBytes + bytes > this.config.maxQueueBytes
    ) {
      return false;
    }
    return true;
  }

  private waitForSpace(bytes: number): Promise<void> {
    return new Promise((resolve) => {
      this.spaceWaiters.push({ bytes, resolve });
    });
  }

  private resolveSpaceWaiters(): void {
    if (this.spaceWaiters.length === 0) {
      return;
    }
    const waiters = this.spaceWaiters;
    this.spaceWaiters = [];
    for (const waiter of waiters) {
      waiter.resolve();
    }
  }

  private notifySpaceWaiters(): void {
    if (this.spaceWaiters.length === 0) {
      return;
    }
    const waiters = this.spaceWaiters;
    this.spaceWaiters = [];
    for (const waiter of waiters) {
      if (this.hasCapacity(waiter.bytes)) {
        waiter.resolve();
      } else {
        this.spaceWaiters.push(waiter);
      }
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedule(): void {
    if (this.stopped || this.processing) {
      return;
    }
    this.clearTimer();

    const now = Date.now();
    const readyCount = this.countReady(now);
    const readyBytes = this.readyBytes(now);

    if (readyCount > 0) {
      if (this.nextFlushAt === null) {
        this.nextFlushAt = now + this.config.flushIntervalMs;
      }

      if (
        readyCount >= this.config.batchSize ||
        readyBytes >= this.config.maxBatchBytes ||
        now >= this.nextFlushAt
      ) {
        enqueueMicrotask(() => {
          void this.processQueue(false);
        });
        return;
      }

      const delay = Math.max(0, this.nextFlushAt - now);
      this.timer = setTimeout(() => {
        void this.processQueue(false);
      }, delay);
      return;
    }

    this.nextFlushAt = null;
    const nextReady = this.nextReadyAt(now);
    if (nextReady !== null) {
      const delay = Math.max(0, nextReady - now);
      this.timer = setTimeout(() => {
        void this.processQueue(true);
      }, delay);
    }
  }

  private async processQueue(force: boolean): Promise<AuditFlushResult> {
    if (this.processing) {
      return force ? this.processing.then(() => this.processQueue(true)) : this.processing;
    }

    const run = async (): Promise<AuditFlushResult> => {
      const errors: string[] = [];
      let written = 0;
      this.clearTimer();

      while (true) {
        const now = Date.now();
        const readyCount = this.countReady(now);
        const readyBytes = this.readyBytes(now);

        if (readyCount === 0) {
          this.nextFlushAt = null;
          break;
        }

        if (!force) {
          if (this.nextFlushAt === null) {
            this.nextFlushAt = now + this.config.flushIntervalMs;
          }

          if (
            readyCount < this.config.batchSize &&
            readyBytes < this.config.maxBatchBytes &&
            now < this.nextFlushAt
          ) {
            break;
          }
        }

        const batch = this.takeBatch(now);
        if (batch.length === 0) {
          break;
        }

        const result = await this.writeBatch(batch);
        written += result.written;
        if (result.errors.length > 0) {
          errors.push(...result.errors);
        }

        if (!force) {
          const remainingReady = this.countReady(Date.now());
          const remainingBytes = this.readyBytes(Date.now());
          if (remainingReady < this.config.batchSize) {
            this.nextFlushAt =
              remainingReady > 0 ? Date.now() + this.config.flushIntervalMs : null;
            if (remainingReady > 0 && remainingBytes >= this.config.maxBatchBytes) {
              this.nextFlushAt = Date.now();
            }
            break;
          }
        }
      }

      this.schedule();
      return { ok: errors.length === 0, written, errors };
    };

    this.processing = run();
    try {
      return await this.processing;
    } finally {
      this.processing = null;
      this.schedule();
    }
  }

  private takeBatch(now: number): QueueItem[] {
    const batch: QueueItem[] = [];
    if (this.queue.length === 0) {
      return batch;
    }

    const remaining: QueueItem[] = [];
    let bytesRemoved = 0;
    let batchBytes = 0;

    for (let index = 0; index < this.queue.length; index += 1) {
      const item = this.queue[index];
      if (item.nextAttemptAt > now) {
        remaining.push(item);
        continue;
      }

      if (batch.length >= this.config.batchSize) {
        remaining.push(item);
        continue;
      }

      const nextBatchBytes = batchBytes + item.bytes;
      if (batch.length > 0 && nextBatchBytes > this.config.maxBatchBytes) {
        remaining.push(item);
        for (let j = index + 1; j < this.queue.length; j += 1) {
          remaining.push(this.queue[j]);
        }
        break;
      }

      batch.push(item);
      batchBytes += item.bytes;
      bytesRemoved += item.bytes;
    }

    if (batch.length === 0) {
      return batch;
    }

    this.queue = remaining;
    this.queueBytes = Math.max(0, this.queueBytes - bytesRemoved);
    this.updateQueueMetrics();
    this.notifySpaceWaiters();
    return batch;
  }

  private async writeBatch(
    batch: QueueItem[],
  ): Promise<{ written: number; errors: string[] }> {
    const events = batch.map((item) => item.event);
    let result: WriteResult;

    try {
      result = normalizeWriteResult(events, await this.writer.writeBatch(events));
    } catch (error) {
      result = normalizeWriteResult(
        events,
        normalizeSinkFailure(events, error, 'TRANSIENT'),
      );
    }

    const failureIndex = buildFailureIndex(events, result.failures);
    const errors: string[] = [];
    let written = 0;

    for (const item of batch) {
      const failure = failureIndex.get(item.event.eventId);
      if (!failure) {
        recordWritten(this.state, item.mode, 1);
        written += 1;
        if (item.deferred) {
          item.deferred.resolve({
            ok: true,
            written: 1,
            failed: 0,
            failures: [],
          });
        }
        continue;
      }

      if (failure.errorType === 'TRANSIENT' && item.attempt < this.config.retry.maxAttempts) {
        const delay = computeBackoffDelay(item.attempt, this.config.retry);
        item.attempt += 1;
        item.nextAttemptAt = Date.now() + delay;
        this.requeue(item);
        recordRetry(this.state, 1);
        errors.push(failure.message);
        continue;
      }

      const finalFailure =
        failure.errorType === 'TRANSIENT'
          ? {
              eventId: failure.eventId,
              errorType: 'PERMANENT' as const,
              message: `${failure.message}; retry limit exceeded`,
            }
          : failure;

      recordWriteFailure(this.state, 1);
      errors.push(finalFailure.message);
      if (item.deferred) {
        item.deferred.resolve({
          ok: false,
          written: 0,
          failed: 1,
          failures: [finalFailure],
        });
      }
    }

    return { written, errors };
  }

  private requeue(item: QueueItem): void {
    this.queue.push(item);
    this.queueBytes += item.bytes;
    this.updateQueueMetrics();
  }

  private countReady(now: number): number {
    let count = 0;
    for (const item of this.queue) {
      if (item.nextAttemptAt <= now) {
        count += 1;
      }
    }
    return count;
  }

  private readyBytes(now: number): number {
    let bytes = 0;
    for (const item of this.queue) {
      if (item.nextAttemptAt <= now) {
        bytes += item.bytes;
      }
    }
    return bytes;
  }

  private nextReadyAt(now: number): number | null {
    let next: number | null = null;
    for (const item of this.queue) {
      if (item.nextAttemptAt <= now) {
        return now;
      }
      if (next === null || item.nextAttemptAt < next) {
        next = item.nextAttemptAt;
      }
    }
    return next;
  }

  private nextReadyDelay(now: number): number {
    const next = this.nextReadyAt(now);
    if (next === null) {
      return 0;
    }
    return Math.max(0, next - now);
  }

  private updateQueueMetrics(): void {
    this.state.stats.gauges.audit_queue_size = this.queue.length;
    this.state.stats.gauges.audit_queue_bytes = this.queueBytes;
    this.state.metricHandles.gauges.queueSize.set(undefined, this.queue.length);
    this.state.metricHandles.gauges.queueBytes.set(undefined, this.queueBytes);
  }
}

const recordInvalid = (state: AuditLoggerState, mode: Mode): void => {
  state.stats.counters.audit_invalid_total += 1;
  state.stats.byMode[mode].invalid += 1;
  state.stats.byReason.invalid += 1;
  state.metricHandles.counters.invalid.inc();
};

const recordDrop = (state: AuditLoggerState, mode: Mode): void => {
  state.stats.counters.audit_events_dropped_total += 1;
  state.stats.byMode[mode].dropped += 1;
  state.stats.byReason.dropped += 1;
  state.metricHandles.counters.eventsDropped.inc();
};

const recordShutdownDrop = (state: AuditLoggerState, mode: Mode): void => {
  state.stats.counters.audit_events_dropped_total += 1;
  state.stats.byMode[mode].dropped += 1;
  state.stats.byReason.shutdown += 1;
  state.metricHandles.counters.eventsDropped.inc();
};

const recordShutdown = (state: AuditLoggerState): void => {
  state.stats.byReason.shutdown += 1;
};

const recordWriteFailure = (state: AuditLoggerState, count: number): void => {
  if (count <= 0) {
    return;
  }
  state.stats.counters.audit_write_failures_total += count;
  state.stats.byReason.write_failure += count;
  state.metricHandles.counters.writeFailures.inc(undefined, count);
};

const recordRetry = (state: AuditLoggerState, count: number): void => {
  if (count <= 0) {
    return;
  }
  state.stats.counters.audit_retries_total += count;
  state.metricHandles.counters.retries.inc(undefined, count);
};

const recordAttempt = (state: AuditLoggerState, mode: Mode): void => {
  state.stats.counters.audit_events_total += 1;
  state.stats.byMode[mode].attempted += 1;
  state.metricHandles.counters.eventsTotal.inc();
};

const recordAccepted = (state: AuditLoggerState, mode: Mode): void => {
  state.stats.byMode[mode].accepted += 1;
};

const recordWritten = (state: AuditLoggerState, mode: Mode, count: number): void => {
  if (count <= 0) {
    return;
  }
  state.stats.counters.audit_events_written_total += count;
  state.stats.byMode[mode].written += count;
  state.metricHandles.counters.eventsWritten.inc(undefined, count);
};

const createLogger = (
  config: AuditLoggerResolvedConfig,
  state: AuditLoggerState,
): AuditLogger => {
  const log = async (input: AuditEventInput): Promise<AuditLogResult> => {
    recordAttempt(state, config.mode);

    if (state.isShutdown) {
      recordShutdown(state);
      return {
        ok: false,
        error: {
          code: 'SHUTDOWN',
          message: 'Audit logger is shutdown',
        },
        warnings: [],
      };
    }

    const validation = validateEventInput(input, {
      strictActionNaming: config.strictActionNaming,
    });
    const warnings = validation.warnings;

    if (!validation.ok) {
      recordInvalid(state, config.mode);
      const error: AuditLogError = {
        code: 'INVALID_EVENT',
        message: 'Invalid audit event input',
        details: validation.errors,
      };

      if (config.strictValidation) {
        throw new AuditValidationError(validation.errors);
      }

      return { ok: false, error, warnings };
    }

    if (config.mode === 'DROP') {
      recordDrop(state, config.mode);
      return {
        ok: false,
        error: {
          code: 'DROPPED',
          message: 'Audit event dropped due to DROP mode',
        },
        warnings,
      };
    }

    const normalized = normalizeEvent(input, config);
    const redacted = applyRedaction(normalized, config.redaction);
    const payloadCheck = applyPayloadLimits(redacted, config.payloadLimits);

    if (!payloadCheck.ok) {
      recordInvalid(state, config.mode);
      const error: AuditLogError = {
        code: payloadCheck.code,
        message: 'Audit event rejected by payload limits',
        details: payloadCheck.errors,
      };

      if (config.strictValidation) {
        throw new AuditValidationError(payloadCheck.errors);
      }

      return { ok: false, error, warnings };
    }

    const processedEvent = payloadCheck.event;

    const enqueueAndReturn = async (
      event: AuditEvent,
      eventBytes: number,
      commitIntegrity?: () => void,
    ): Promise<AuditLogResult> => {
      const enqueueResult = await state.queueWriter.enqueue(
        event,
        config.mode,
        config.mode === 'BLOCK',
        eventBytes,
      );

      if (!enqueueResult.accepted) {
        if (enqueueResult.reason === 'SHUTDOWN') {
          recordShutdown(state);
          return {
            ok: false,
            error: {
              code: 'SHUTDOWN',
              message: 'Audit logger is shutdown',
            },
            warnings,
          };
        }

        recordDrop(state, config.mode);
        const code = config.mode === 'BLOCK' ? 'QUEUE_FULL' : 'DROPPED';
        const message =
          config.mode === 'BLOCK'
            ? 'Audit queue is full'
            : 'Audit event dropped because the queue is full';

        return {
          ok: false,
          error: {
            code,
            message,
          },
          warnings,
        };
      }

      if (commitIntegrity) {
        commitIntegrity();
      }

      recordAccepted(state, config.mode);

      if (config.mode === 'QUEUE') {
        return { ok: true, event, warnings };
      }

      const completion = enqueueResult.completion;
      if (!completion) {
        return {
          ok: false,
          error: {
            code: 'WRITE_FAILED',
            message: 'Audit sink write failed',
          },
          warnings,
        };
      }

      const result = await completion;
      if (!result.ok) {
        const messages = result.failures.map((failure) => failure.message);
        return {
          ok: false,
          error: {
            code: 'WRITE_FAILED',
            message: 'Audit sink write failed',
            details: messages.length > 0 ? messages : undefined,
          },
          warnings,
        };
      }

      return { ok: true, event, warnings };
    };

    if (config.integrity.mode === 'none') {
      return enqueueAndReturn(processedEvent, payloadCheck.eventBytes);
    }

    const scopeKey = getIntegrityScopeKey(processedEvent);
    return await withIntegrityScopeLock(state.integrityState, scopeKey, async () => {
      const prevHash = state.integrityState.lastHashByScope.get(scopeKey);
      const integrityResult = await applyIntegrity(
        processedEvent,
        config.integrity,
        prevHash,
      );

      if (!integrityResult.ok) {
        recordInvalid(state, config.mode);
        const error: AuditLogError = {
          code: 'INVALID_EVENT',
          message: 'Audit event failed integrity processing',
          details: integrityResult.errors,
        };

        if (config.strictValidation) {
          throw new AuditValidationError(integrityResult.errors);
        }

        return { ok: false, error, warnings };
      }

      const eventWithIntegrity = integrityResult.event;
      const eventBytes = getEventBytes(eventWithIntegrity);
      return enqueueAndReturn(eventWithIntegrity, eventBytes, () => {
        if (integrityResult.nextHash) {
          state.integrityState.lastHashByScope.set(scopeKey, integrityResult.nextHash);
        }
      });
    });
  };

  const flush = async (): Promise<AuditFlushResult> => {
    const result = await state.queueWriter.flush();
    await state.writer.flush();
    return result;
  };

  const shutdown = async (): Promise<AuditFlushResult> => {
    state.isShutdown = true;
    const result = await state.queueWriter.shutdown(config.shutdownTimeoutMs);
    await state.writer.shutdown();
    return result;
  };

  const child = (options: AuditLoggerChildOptions): AuditLogger => {
    const childConfig = {
      ...config,
      defaultContext: {
        ...config.defaultContext,
        ...options.defaultContext,
      },
    };
    return createLogger(childConfig, state);
  };

  const getStats = (): AuditStatsSnapshot => cloneStats(state.stats);
  const getMetrics = (): MetricsSnapshot => state.metrics.snapshot();
  const getMetricsPrometheus = (): string => state.metrics.toPrometheus();

  return {
    log,
    flush,
    shutdown,
    child,
    getStats,
    getMetrics,
    getMetricsPrometheus,
  };
};

export const createAuditLogger = (config: AuditLoggerConfig = {}): AuditLogger => {
  const resolved = resolveConfig(config);
  const sinks = resolved.sinks.length > 0 ? resolved.sinks : [createNullSink()];
  const metrics = config.metrics ?? createMetricsRegistry();
  const metricHandles = createAuditMetricHandles(metrics);
  metricHandles.gauges.circuitOpen.set(undefined, 0);
  metricHandles.gauges.queueSize.set(undefined, 0);
  metricHandles.gauges.queueBytes.set(undefined, 0);
  const stats = createInitialStats();
  const sinkWriter = multiSink(sinks, {
    fanoutMode: resolved.fanout,
    concurrency: resolved.sinkConcurrency,
    circuitBreaker: resolved.circuitBreaker,
    onCircuitStateChange: (openCount) => {
      stats.gauges.audit_circuit_open = openCount;
      metricHandles.gauges.circuitOpen.set(undefined, openCount);
    },
    metrics,
  });
  const state: AuditLoggerState = {
    stats,
    writer: createAuditWriter(sinkWriter),
    queueWriter: null as unknown as QueueWriter,
    integrityState: createIntegrityState(),
    metrics,
    metricHandles,
    isShutdown: false,
  };

  state.queueWriter = new QueueWriter(state, state.writer, {
    ...resolved.queue,
    batchSize: resolved.batchSize,
    maxBatchBytes: resolved.maxBatchBytes,
    retry: resolved.retry,
  });

  return createLogger(resolved, state);
};
