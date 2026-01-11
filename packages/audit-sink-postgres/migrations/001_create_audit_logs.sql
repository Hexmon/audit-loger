CREATE TABLE IF NOT EXISTS audit_events (
  event_id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_display_name TEXT,
  actor_roles TEXT[],
  actor_ip TEXT,
  actor_user_agent TEXT,
  target_id TEXT,
  target_type TEXT,
  target_display_name TEXT,
  tenant_id TEXT,
  org_id TEXT,
  target JSONB,
  context JSONB,
  metadata JSONB,
  diff JSONB,
  integrity JSONB,
  retention_tag TEXT,
  metadata_truncated BOOLEAN DEFAULT FALSE,
  diff_truncated BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS audit_events_occurred_at_idx ON audit_events (occurred_at);
