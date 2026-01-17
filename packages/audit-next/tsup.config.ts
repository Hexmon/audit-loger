import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2020',
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  treeshake: true,
  external: ['@hexmon_tech/audit-core', '@hexmon_tech/audit-node', 'next/server'],
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.cjs' };
  }
});
