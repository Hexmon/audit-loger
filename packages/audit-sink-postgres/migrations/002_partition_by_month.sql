-- Optional: monthly partitions for audit_events
-- This template is intended for new installations. For existing tables, create a new
-- partitioned table and swap during maintenance.

CREATE TABLE IF NOT EXISTS audit_events (
  event_id TEXT NOT NULL,
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
  diff_truncated BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (event_id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE INDEX IF NOT EXISTS audit_events_occurred_at_idx ON audit_events (occurred_at);

-- Example partition (repeat monthly)
CREATE TABLE IF NOT EXISTS audit_events_2024_01 PARTITION OF audit_events
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Create indexes on partitions as needed.
CREATE INDEX IF NOT EXISTS audit_events_2024_01_action_idx ON audit_events_2024_01 (action);
