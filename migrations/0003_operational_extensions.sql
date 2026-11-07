-- ASTON OS 21.0 — operational extension schema.
-- Additive proposal only. Apply first to a dedicated staging D1 database after review.
-- No Worker binding or remote migration is activated by this file.

CREATE TABLE IF NOT EXISTS aston_schema_registry (
  tenant_id TEXT NOT NULL,
  schema_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  definition_json TEXT NOT NULL CHECK (json_valid(definition_json)),
  status TEXT NOT NULL CHECK (status IN ('draft','active','retired')),
  created_by TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, schema_id, version)
);

CREATE TABLE IF NOT EXISTS aston_idempotency (
  tenant_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload_digest TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted','processing','completed','failed')),
  result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
  created_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, idempotency_key),
  CHECK (expires_at_ms > created_at_ms)
);

CREATE TABLE IF NOT EXISTS aston_lineage_events (
  tenant_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  parent_artifact_ids_json TEXT NOT NULL CHECK (json_valid(parent_artifact_ids_json)),
  transformation TEXT NOT NULL,
  pipeline_version TEXT NOT NULL,
  model_id TEXT,
  actor_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  occurred_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_aston_lineage_artifact
  ON aston_lineage_events(tenant_id, artifact_id, occurred_at_ms);

CREATE TABLE IF NOT EXISTS aston_graph_edges (
  tenant_id TEXT NOT NULL,
  edge_id TEXT NOT NULL,
  from_entity_id TEXT NOT NULL,
  to_entity_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  properties_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(properties_json)),
  valid_from_ms INTEGER NOT NULL,
  valid_to_ms INTEGER,
  system_from_ms INTEGER NOT NULL,
  system_to_ms INTEGER,
  PRIMARY KEY (tenant_id, edge_id),
  CHECK (valid_to_ms IS NULL OR valid_to_ms > valid_from_ms),
  CHECK (system_to_ms IS NULL OR system_to_ms > system_from_ms)
);
CREATE INDEX IF NOT EXISTS idx_aston_graph_from
  ON aston_graph_edges(tenant_id, from_entity_id, relationship_type, valid_from_ms);
CREATE INDEX IF NOT EXISTS idx_aston_graph_to
  ON aston_graph_edges(tenant_id, to_entity_id, relationship_type, valid_from_ms);

CREATE TABLE IF NOT EXISTS aston_session_messages (
  tenant_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  sequence_no INTEGER NOT NULL CHECK (sequence_no > 0),
  actor_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('system','user','assistant','tool')),
  content_digest TEXT NOT NULL,
  content_reference TEXT,
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, session_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS aston_missions (
  tenant_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  error_code INTEGER NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status TEXT NOT NULL CHECK (status IN ('created','diagnosed','approval_pending','approved','rejected','executing','verifying','completed','failed','expired','cancelled','no_action')),
  created_by TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  journal_reference TEXT,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, mission_id),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_aston_missions_status
  ON aston_missions(tenant_id, status, updated_at_ms);

CREATE TABLE IF NOT EXISTS aston_approval_records (
  tenant_id TEXT NOT NULL,
  approval_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  scope_digest TEXT NOT NULL,
  approved_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  consumed_at_ms INTEGER,
  PRIMARY KEY (tenant_id, approval_id),
  UNIQUE (tenant_id, request_id),
  CHECK (expires_at_ms > approved_at_ms)
);

CREATE TABLE IF NOT EXISTS aston_stream_assets (
  tenant_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  provider_asset_id TEXT,
  rights_license_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','ready','blocked','deleted')),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, asset_id)
);

CREATE TABLE IF NOT EXISTS aston_telemetry_events (
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success','failure','denied','skipped')),
  duration_ms REAL NOT NULL CHECK (duration_ms >= 0),
  attributes_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(attributes_json)),
  occurred_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_aston_telemetry_name_time
  ON aston_telemetry_events(tenant_id, event_name, occurred_at_ms);

CREATE TABLE IF NOT EXISTS aston_external_adapters (
  tenant_id TEXT NOT NULL,
  adapter_id TEXT NOT NULL,
  adapter_type TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL CHECK (status IN ('draft','staging','active','paused','revoked')),
  configuration_reference TEXT NOT NULL,
  approved_by TEXT,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, adapter_id)
);
