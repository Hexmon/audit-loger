import { defineConfig } from 'vitest/config';
import { vitestAliases } from '../../vitest.aliases';

export default defineConfig({
  resolve: {
    alias: vitestAliases,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
