import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm', 'cjs'],
  target: 'es2020',
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  treeshake: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.cjs' };
  },
  external: ['@stackio/audit-core', '@stackio/audit-export-postgres', 'pg'],
});
