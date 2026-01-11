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

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const args = parseArgs(process.argv.slice(2));
const durationSeconds = parseNumber(args.seconds ?? args.duration, 10);
const ratePerSec = parseNumber(args.rate, 0);
const concurrency = parseNumber(args.concurrency, 100);
const batchSize = parseNumber(args.batchSize, 50);
const maxBatchBytes = parseNumber(args.maxBatchBytes, 1024 * 1024);
const flushIntervalMs = parseNumber(args.flushIntervalMs, 200);
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
  action: 'bench.load',
  outcome: 'SUCCESS',
  actor: { type: 'user', id: 'bench-user' },
};

const durationMs = durationSeconds * 1000;
const start = performance.now();
const endAt = start + durationMs;
let nextSendAt = start;

let sent = 0;
let ok = 0;
let failed = 0;
const inFlight = new Set();

while (performance.now() < endAt) {
  if (inFlight.size >= concurrency) {
    await Promise.race(inFlight);
    continue;
  }

  const now = performance.now();
  if (ratePerSec > 0 && now < nextSendAt) {
    await sleep(Math.max(0, nextSendAt - now));
    continue;
  }

  const promise = audit.log(baseInput).then((result) => {
    if (result.ok) {
      ok += 1;
    } else {
      failed += 1;
    }
    inFlight.delete(promise);
  });
  inFlight.add(promise);
  sent += 1;

  if (ratePerSec > 0) {
    nextSendAt += 1000 / ratePerSec;
  }
}

await Promise.all(inFlight);
await audit.flush();

const end = performance.now();
const totalMs = end - start;
const formatRate = (count, duration) => (count / (duration / 1000)).toFixed(1);

console.log('Audit load test results');
console.log(`duration_seconds: ${durationSeconds}`);
console.log(`sent: ${sent}`);
console.log(`ok: ${ok}`);
console.log(`failed: ${failed}`);
console.log(`total_ms: ${totalMs.toFixed(2)}`);
console.log(`events_per_sec: ${formatRate(sent, totalMs)}`);
console.log('stats:', audit.getStats().counters);
