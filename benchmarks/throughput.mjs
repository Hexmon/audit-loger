import { performance } from 'node:perf_hooks';

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = value;
    i += 1;
  }
  return args;
};

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const args = parseArgs(process.argv.slice(2));
const events = parseNumber(args.events, 100_000);
const batchSize = parseNumber(args.batchSize, 100);
const maxBatchBytes = parseNumber(args.maxBatchBytes, 1024 * 1024);
const flushIntervalMs = parseNumber(args.flushIntervalMs, 250);
const maxQueueSize = parseNumber(args.maxQueueSize, 5000);
const mode = typeof args.mode === 'string' ? args.mode : 'QUEUE';

let createAuditLogger;
try {
  ({ createAuditLogger } = await import('../packages/audit-core/dist/index.mjs'));
} catch (error) {
  console.error('Failed to load audit-core. Build first with `pnpm -r build`.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const audit = createAuditLogger({
  mode,
  batchSize,
  maxBatchBytes,
  queue: {
    maxQueueSize,
    flushIntervalMs,
  },
});

const baseInput = {
  action: 'bench.event',
  outcome: 'SUCCESS',
  actor: { type: 'user', id: 'bench-user' },
};

const start = performance.now();
for (let i = 0; i < events; i += 1) {
  await audit.log(baseInput);
}
const enqueueDone = performance.now();

await audit.flush();
const end = performance.now();

const enqueueMs = enqueueDone - start;
const totalMs = end - start;

const formatRate = (count, durationMs) =>
  (count / (durationMs / 1000)).toFixed(1);

console.log('Audit benchmark results');
console.log(`events: ${events}`);
console.log(`enqueue_ms: ${enqueueMs.toFixed(2)}`);
console.log(`enqueue_events_per_sec: ${formatRate(events, enqueueMs)}`);
console.log(`total_ms: ${totalMs.toFixed(2)}`);
console.log(`total_events_per_sec: ${formatRate(events, totalMs)}`);
console.log('stats:', audit.getStats().counters);
