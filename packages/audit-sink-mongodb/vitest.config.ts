import { defineConfig } from 'vitest/config';

const isIntegration = Boolean(process.env.AUDIT_INTEGRATION);

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: isIntegration ? [] : ['src/**/*.int.test.ts']
  }
});
