export const expectedExports = new Map([
  [
    '@hexmon_tech/audit-core',
    [
      'createAuditLogger',
      'multiSink',
      'createMetricsRegistry',
      'validateEventInput',
      'computeIntegrityHash',
    ],
  ],
  ['@hexmon_tech/audit-node', ['runWithAuditContext', 'getAuditContext', 'setAuditContextPartial']],
  ['@hexmon_tech/audit-express', ['createAuditMiddleware']],
  ['@hexmon_tech/audit-next', ['withAudit']],
  ['@hexmon_tech/audit-cli', ['verifyFile', 'verifyPostgres']],
  [
    '@hexmon_tech/audit-export-postgres',
    ['exportAuditLogs', 'buildExportQuery', 'encodeCursor', 'decodeCursor'],
  ],
  ['@hexmon_tech/audit-sink-http', ['createHttpAuditSink']],
  ['@hexmon_tech/audit-sink-postgres', ['createPostgresAuditSink']],
  ['@hexmon_tech/audit-sink-mongodb', ['createMongoAuditSink']],
  ['@hexmon_tech/audit-sink-file-jsonl', ['createFileJsonlSink']],
  ['@hexmon_tech/audit-buffer-disk', ['createDiskBuffer']],
]);
