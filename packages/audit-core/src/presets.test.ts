import { describe, expect, it } from 'vitest';
import { highThroughput, onPremSelfHosted, saasMultiTenantStrict } from './index';

describe('presets', () => {
  it('provides a strict multi-tenant baseline', () => {
    const preset = saasMultiTenantStrict();
    expect(preset.mode).toBe('BLOCK');
    expect(preset.fanout).toBe('ALL_OR_NOTHING');
    expect(preset.strictValidation).toBe(true);
    expect(preset.strictActionNaming).toBe(true);
    expect(preset.integrityMode).toBe('hash-chain');
    expect(preset.queue?.overflowPolicy).toBe('BLOCK');
  });

  it('provides an on-prem baseline', () => {
    const preset = onPremSelfHosted();
    expect(preset.mode).toBe('QUEUE');
    expect(preset.fanout).toBe('BEST_EFFORT');
    expect(preset.queue?.overflowPolicy).toBe('BLOCK');
    expect(preset.retry?.maxAttempts).toBe(10);
  });

  it('provides a high throughput baseline', () => {
    const preset = highThroughput();
    expect(preset.mode).toBe('QUEUE');
    expect(preset.batchSize).toBe(500);
    expect(preset.maxBatchBytes).toBe(2 * 1024 * 1024);
    expect(preset.sinkConcurrency).toBe(8);
    expect(preset.queue?.overflowPolicy).toBe('DROP');
  });
});
