# Reliability

Audit logging favors at-least-once delivery with bounded memory use. The core logger provides a queue, retries for transient failures, and a circuit breaker per sink.

## Modes and Backpressure
- `QUEUE` (default): enqueue quickly and write in the background. If the queue is full, events are dropped by default or can block if `queue.overflowPolicy` is `BLOCK`.
- `BLOCK`: enqueue and wait for the write pipeline to finish. If the queue is full, `audit.log` rejects immediately with `QUEUE_FULL`.
- `DROP`: drop immediately and increment drop metrics.

## Queue
The in-memory queue flushes when:
- `batchSize` is reached, or
- `queue.flushIntervalMs` elapses.

Defaults:
- `queue.maxQueueSize`: 5000 events
- `queue.flushIntervalMs`: 250ms

Optional `queue.maxQueueBytes` provides a second guardrail for memory usage.
`queue.overflowPolicy` controls behavior when the queue is full (`DROP` or `BLOCK`).
The default overflow policy is `DROP` for non-blocking queueing.

## Retry
Transient failures are retried with exponential backoff and jitter:
- `retry.maxAttempts` (default 8)
- `retry.baseBackoffMs` (default 250ms)
- `retry.maxBackoffMs` (default 30s)

Permanent failures are not retried. If retries are exhausted, the event is marked as a final write failure.

## Circuit Breaker
Each sink is protected by a circuit breaker:
- Opens after `failureThreshold` consecutive transient failures (default 5)
- Cooldown period `cooldownMs` (default 10s)
- Half-open allows a single test batch before closing

While open, the sink is skipped and returns a transient failure, preventing thundering herds.

## Failure Scenarios
- **Database down (QUEUE)**: events accumulate until `maxQueueSize`/`maxQueueBytes`; then drop or block depending on overflow policy.
- **Database down (BLOCK)**: `audit.log` returns `WRITE_FAILED` after retries or immediately if the queue is full.
- **Database down (DROP)**: events are discarded immediately.

Use `audit.getStats()` to monitor queue depth, retries, failures, and circuit state.
