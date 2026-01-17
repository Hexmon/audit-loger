import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expectedExports } from '../scripts/expected-exports.mjs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const loadPackages = () => {
  const packagesDir = join(rootDir, 'packages');
  return readdirSync(packagesDir)
    .map((dir) => {
      const pkgPath = join(packagesDir, dir, 'package.json');
      if (!existsSync(pkgPath)) {
        return null;
      }
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      return { name: pkg.name, dir: join(packagesDir, dir), pkg };
    })
    .filter(Boolean);
};

const run = async () => {
  const failures = [];
  const packages = loadPackages();

  for (const pkg of packages) {
    const errors = [];
    const exportEntry = pkg.pkg.exports?.['.'];
    const importPath =
      typeof exportEntry === 'string'
        ? exportEntry
        : exportEntry?.import ?? pkg.pkg.module ?? pkg.pkg.main;
    const requirePath =
      typeof exportEntry === 'string'
        ? exportEntry
        : exportEntry?.require ?? pkg.pkg.main ?? pkg.pkg.module;

    if (!importPath) {
      errors.push('Missing ESM entrypoint');
    } else if (!existsSync(join(pkg.dir, importPath))) {
      errors.push(`Missing ESM file: ${importPath}`);
    }

    if (!requirePath) {
      errors.push('Missing CJS entrypoint');
    } else if (!existsSync(join(pkg.dir, requirePath))) {
      errors.push(`Missing CJS file: ${requirePath}`);
    }

    let esmModule;
    try {
      if (importPath) {
        const resolved = pathToFileURL(join(pkg.dir, importPath)).href;
        esmModule = await import(resolved);
      }
    } catch (error) {
      errors.push(
        `ESM import failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    try {
      const pkgRequire = createRequire(join(pkg.dir, 'package.json'));
      pkgRequire(pkg.name);
    } catch (error) {
      errors.push(
        `CJS require failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    const expected = expectedExports.get(pkg.name) ?? [];
    for (const key of expected) {
      if (esmModule && !(key in esmModule)) {
        errors.push(`ESM missing export: ${key}`);
      }
    }

    if (errors.length > 0) {
      failures.push({ name: pkg.name, errors });
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`\n${failure.name}`);
      for (const error of failure.errors) {
        console.error(`- ${error}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log('smoke-tests import-check ok');
};

await run();
