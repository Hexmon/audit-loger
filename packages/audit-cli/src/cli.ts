import { Client } from 'pg';
import { exportAuditLogs } from '@hexmon/audit-export-postgres';
import { verifyFile, verifyPostgres } from './verify';

const printHelp = () => {
  console.log(`audit-cli

Commands:
  verify-file --path <jsonl>
  verify-postgres --connection <connectionString> [--from <ts>] [--to <ts>] [--tenantId <id>] [--table <name>]
  export-postgres --connection <connectionString> --from <ts> --to <ts> [--tenantId <id>] [--actorId <id>] [--action <name>] [--outcome <value>] [--format <json|csv>] [--pageSize <n>] [--cursor <token>] [--table <name>] [--multiTenantStrict]
  retention-postgres --connection <connectionString> --before <ts> [--table <name>] [--dry-run]
`);
};

const getFlagValue = (args: string[], flag: string): string | undefined => {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) {
    return undefined;
  }
  return args[index + 1];
};

const hasFlag = (args: string[], flag: string): boolean => args.includes(flag);

const parseNumber = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const assertSafeIdentifier = (value: string) => {
  if (!/^[a-zA-Z0-9_.]+$/.test(value)) {
    throw new Error('Invalid table name');
  }
};

const report = (ok: boolean, total: number, failures: string[]) => {
  if (ok) {
    console.log(`OK: verified ${total} events`);
    return;
  }
  console.error(`FAIL: ${failures.length} issues found across ${total} events`);
  const limit = 20;
  for (const line of failures.slice(0, limit)) {
    console.error(`- ${line}`);
  }
  if (failures.length > limit) {
    console.error(`...and ${failures.length - limit} more`);
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  const command = args[0];
  if (command === 'verify-file') {
    const path = getFlagValue(args, '--path');
    if (!path) {
      console.error('Missing --path for verify-file');
      printHelp();
      process.exitCode = 1;
      return;
    }

    const result = await verifyFile({ path });
    const failures = result.failures.map(
      (failure) =>
        `${failure.index} ${failure.eventId ?? 'unknown'} (${failure.scope}): ${failure.reason}`,
    );
    report(result.ok, result.total, failures);
    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === 'verify-postgres') {
    const connectionString = getFlagValue(args, '--connection');
    if (!connectionString) {
      console.error('Missing --connection for verify-postgres');
      printHelp();
      process.exitCode = 1;
      return;
    }

    const from = getFlagValue(args, '--from');
    const to = getFlagValue(args, '--to');
    const tenantId = getFlagValue(args, '--tenantId');
    const table = getFlagValue(args, '--table');

    const result = await verifyPostgres({
      connectionString,
      from,
      to,
      tenantId,
      table,
    });

    const failures = result.failures.map(
      (failure) =>
        `${failure.index} ${failure.eventId ?? 'unknown'} (${failure.scope}): ${failure.reason}`,
    );
    report(result.ok, result.total, failures);
    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === 'export-postgres') {
    const connectionString = getFlagValue(args, '--connection');
    if (!connectionString) {
      console.error('Missing --connection for export-postgres');
      printHelp();
      process.exitCode = 1;
      return;
    }

    const formatArg = getFlagValue(args, '--format');
    const format = formatArg === 'csv' ? 'csv' : 'json';

    const result = await exportAuditLogs({
      connectionString,
      from: getFlagValue(args, '--from') ?? '',
      to: getFlagValue(args, '--to') ?? '',
      tenantId: getFlagValue(args, '--tenantId'),
      actorId: getFlagValue(args, '--actorId'),
      action: getFlagValue(args, '--action'),
      outcome: getFlagValue(args, '--outcome') as
        | 'SUCCESS'
        | 'FAILURE'
        | 'DENIED'
        | 'ERROR'
        | undefined,
      format,
      pageSize: parseNumber(getFlagValue(args, '--pageSize')),
      cursor: getFlagValue(args, '--cursor'),
      table: getFlagValue(args, '--table'),
      multiTenantStrict: hasFlag(args, '--multiTenantStrict'),
    });

    if (!result.ok) {
      console.error(result.error.message);
      if (result.error.details?.length) {
        for (const detail of result.error.details) {
          console.error(`- ${detail}`);
        }
      }
      process.exitCode = 1;
      return;
    }

    if (result.format === 'csv') {
      process.stdout.write(String(result.data));
      if (result.nextCursor) {
        console.error(`nextCursor: ${result.nextCursor}`);
      }
      return;
    }

    console.log(
      JSON.stringify(
        {
          rowCount: result.rowCount,
          nextCursor: result.nextCursor,
          data: result.data,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === 'retention-postgres') {
    const connectionString = getFlagValue(args, '--connection');
    const before = getFlagValue(args, '--before');
    if (!connectionString || !before) {
      console.error('Missing --connection or --before for retention-postgres');
      printHelp();
      process.exitCode = 1;
      return;
    }

    const table = getFlagValue(args, '--table') ?? 'audit_events';
    const dryRun = hasFlag(args, '--dry-run');
    try {
      assertSafeIdentifier(table);
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Invalid table name');
      process.exitCode = 1;
      return;
    }

    const client = new Client({ connectionString });
    await client.connect();
    try {
      const countResult = await client.query(
        `SELECT COUNT(*)::int AS count FROM ${table} WHERE occurred_at < $1`,
        [before],
      );
      const count = Number(countResult.rows[0]?.count ?? 0);
      if (dryRun) {
        console.log(`dry-run: ${count} rows would be deleted from ${table}`);
        return;
      }

      const deleteResult = await client.query(
        `DELETE FROM ${table} WHERE occurred_at < $1`,
        [before],
      );
      const deleted = deleteResult.rowCount ?? 0;
      console.log(`deleted ${deleted} rows from ${table}`);
    } finally {
      await client.end();
    }
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exitCode = 1;
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unexpected error');
  process.exitCode = 1;
});
