import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsconfigBase from './tsconfig.base.json';

const rootDir = dirname(fileURLToPath(import.meta.url));
type PathMap = Record<string, string>;

const paths = (tsconfigBase.compilerOptions?.paths ?? {}) as Record<string, string[]>;
export const vitestAliases: PathMap = Object.fromEntries(
  Object.entries(paths).map(([name, [relative]]) => [name, resolve(rootDir, relative)]),
);
