import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

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
      return { name: pkg.name, dir: join(packagesDir, dir) };
    })
    .filter(Boolean);
};

const parsePackOutput = (output) => {
  const trimmed = output.trim();
  const jsonStart = trimmed.indexOf('[');
  if (jsonStart === -1) {
    throw new Error('npm pack did not return JSON output');
  }
  const jsonText = trimmed.slice(jsonStart);
  const parsed = JSON.parse(jsonText);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('npm pack JSON output is empty');
  }
  return parsed[0];
};

const extraAllowed = {
  '@stackio/audit-sink-postgres': ['migrations/'],
};

const run = () => {
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
    let result;
    try {
      const stdout = execFileSync('npm', ['pack', '--dry-run', '--json'], {
        cwd: pkg.dir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      result = parsePackOutput(stdout);
    } catch (error) {
      failures.push({
        name: pkg.name,
        errors: [
          error instanceof Error ? error.message : 'npm pack failed',
        ],
      });
      continue;
    }

    const fileEntries = result.files ?? [];
    const files = fileEntries.map((entry) => entry.path);

    const allowedPrefixes = [
      'dist/',
      ...(extraAllowed[pkg.name] ?? []),
    ];

    const isAllowed = (file) => {
      if (file === 'package.json') return true;
      if (file === 'README.md') return true;
      if (file === 'LICENSE' || file === 'LICENSE.md') return true;
      return allowedPrefixes.some((prefix) => file.startsWith(prefix));
    };

    const errors = [];
    const unexpected = files.filter((file) => !isAllowed(file));
    if (unexpected.length > 0) {
      errors.push(`Unexpected files in pack output: ${unexpected.join(', ')}`);
    }
    if (!files.some((file) => file.startsWith('dist/'))) {
      errors.push('Missing dist/ output in package tarball');
    }
    if (!files.includes('README.md')) {
      errors.push('Missing README.md in package tarball');
    }
    if (!files.includes('LICENSE') && !files.includes('LICENSE.md')) {
      errors.push('Missing LICENSE in package tarball');
    }
    if (pkg.name === '@stackio/audit-sink-postgres') {
      if (!files.some((file) => file.startsWith('migrations/'))) {
        errors.push('Missing migrations/ in package tarball');
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

  console.log('pack:check ok');
};

run();
