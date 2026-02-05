import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    target: 'es2020',
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    treeshake: true,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.cjs' };
    },
    external: ['@hexmon_tech/audit-core', '@hexmon_tech/audit-export-postgres', 'pg'],
  },
  {
    entry: ['src/cli.ts'],
    format: ['cjs'],
    target: 'es2020',
    sourcemap: true,
    outDir: 'dist',
    treeshake: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
    outExtension() {
      return { js: '.cjs' };
    },
    external: ['@hexmon_tech/audit-core', '@hexmon_tech/audit-export-postgres', 'pg'],
  },
]);
