import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index';

describe('package metadata', () => {
  it('exports the package name', () => {
    expect(PACKAGE_NAME).toBe('@yourorg/audit-buffer-disk');
  });
});
