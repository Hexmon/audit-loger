import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

const getArgValue = (name) => {
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex !== -1 && exactIndex + 1 < process.argv.length) {
    return process.argv[exactIndex + 1];
  }
  const prefix = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (prefix) {
    return prefix.slice(name.length + 1);
  }
  return undefined;
};

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

const expectedExports = new Map([
  [
    '@hexmon/audit-core',
    [
      'createAuditLogger',
      'multiSink',
      'createMetricsRegistry',
      'validateEventInput',
      'computeIntegrityHash',
    ],
  ],
  ['@hexmon/audit-node', ['runWithAuditContext', 'getAuditContext', 'setAuditContextPartial']],
  ['@hexmon/audit-express', ['createAuditMiddleware']],
  ['@hexmon/audit-next', ['withAudit']],
  ['@hexmon/audit-cli', ['verifyFile', 'verifyPostgres']],
  [
    '@hexmon/audit-export-postgres',
    ['exportAuditLogs', 'buildExportQuery', 'encodeCursor', 'decodeCursor'],
  ],
  ['@hexmon/audit-sink-http', ['createHttpAuditSink']],
  ['@hexmon/audit-sink-postgres', ['createPostgresAuditSink']],
  ['@hexmon/audit-sink-mongodb', ['createMongoAuditSink']],
  ['@hexmon/audit-sink-file-jsonl', ['createFileJsonlSink']],
  ['@hexmon/audit-buffer-disk', ['createDiskBuffer']],
]);

const run = async () => {
  const packageFilter = getArgValue('--package');
  const packages = loadPackages();
  const targets = packageFilter
    ? packages.filter((pkg) => pkg.name === packageFilter)
    : packages;

  if (targets.length === 0) {
    console.error(`No packages matched --package ${packageFilter ?? ''}`.trim());
    process.exitCode = 1;
    return;
  }

  const failures = [];

  for (const pkg of targets) {
    const errors = [];
    let esmModule;
    let cjsModule;

    const exportEntry = pkg.pkg.exports?.['.'];
    const importPath =
      typeof exportEntry === 'string'
        ? exportEntry
        : exportEntry?.import ?? pkg.pkg.module ?? pkg.pkg.main;
    const requirePath =
      typeof exportEntry === 'string'
        ? exportEntry
        : exportEntry?.require ?? pkg.pkg.main ?? pkg.pkg.module;
    const typesPath =
      typeof exportEntry === 'object' && exportEntry?.types
        ? exportEntry.types
        : pkg.pkg.types;

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

    if (!typesPath) {
      errors.push('Missing types entrypoint');
    } else if (!existsSync(join(pkg.dir, typesPath))) {
      errors.push(`Missing types file: ${typesPath}`);
    }

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
      cjsModule = pkgRequire(pkg.name);
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
      if (cjsModule && !(key in cjsModule)) {
        errors.push(`CJS missing export: ${key}`);
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

  console.log('exports:check ok');
};

await run();
