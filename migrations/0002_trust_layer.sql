-- ASTON OS 21.0 — additive Trust Layer / Data Fabric schema.
-- REVIEW AND APPLY ONLY TO A DEDICATED ASTON OS 21.0 STAGING D1 DATABASE.
-- This migration is intentionally NOT referenced by wrangler.toml and is NOT applied.
-- Tenant-scoped composite keys prevent accidental cross-tenant joins at the schema layer.

CREATE TABLE IF NOT EXISTS aston_data_sources (
  tenant_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused','revoked')),
  config_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(config_json)),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, source_id)
);

CREATE TABLE IF NOT EXISTS aston_ingestion_jobs (
  tenant_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted','queued','processing','completed','failed','dead_letter')),
  payload_digest TEXT,
  error_code TEXT,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, job_id),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, source_id) REFERENCES aston_data_sources(tenant_id, source_id)
);
CREATE INDEX IF NOT EXISTS idx_aston_ingestion_status
  ON aston_ingestion_jobs(tenant_id, status, updated_at_ms);

CREATE TABLE IF NOT EXISTS aston_decision_events (
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_version TEXT NOT NULL,
  occurred_at_ms INTEGER NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow','deny','approval_required','executed','failed')),
  reason_codes_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reason_codes_json)),
  source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
  parent_event_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(parent_event_ids_json)),
  policy_version TEXT,
  payload_digest TEXT,
  previous_event_hash TEXT,
  event_hash TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_aston_decision_time
  ON aston_decision_events(tenant_id, occurred_at_ms);
CREATE INDEX IF NOT EXISTS idx_aston_decision_actor
  ON aston_decision_events(tenant_id, actor_id, occurred_at_ms);

CREATE TABLE IF NOT EXISTS aston_agents (
  tenant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  signature_algorithm TEXT NOT NULL,
  public_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_proof_of_possession'
    CHECK (status IN ('pending_proof_of_possession','pending_review','active','suspended','revoked')),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, agent_id)
);

CREATE TABLE IF NOT EXISTS aston_delegations (
  tenant_id TEXT NOT NULL,
  delegation_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  issuer_id TEXT NOT NULL,
  claims_json TEXT NOT NULL CHECK (json_valid(claims_json)),
  issued_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','expired','revoked')),
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, delegation_id),
  FOREIGN KEY (tenant_id, agent_id) REFERENCES aston_agents(tenant_id, agent_id),
  CHECK (expires_at_ms > issued_at_ms)
);
CREATE INDEX IF NOT EXISTS idx_aston_delegations_agent
  ON aston_delegations(tenant_id, agent_id, status, expires_at_ms);

CREATE TABLE IF NOT EXISTS aston_policy_versions (
  tenant_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL CHECK (status IN ('draft','active','retired')),
  policy_json TEXT NOT NULL CHECK (json_valid(policy_json)),
  created_by TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, policy_id, version)
);
CREATE INDEX IF NOT EXISTS idx_aston_policy_active
  ON aston_policy_versions(tenant_id, policy_id, status, version);

CREATE TABLE IF NOT EXISTS aston_spend_entries (
  tenant_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  delegation_id TEXT,
  merchant TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  status TEXT NOT NULL CHECK (status IN ('proposed','approval_required','authorized','settled','rejected','reversed')),
  idempotency_key TEXT NOT NULL,
  occurred_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, entry_id),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, agent_id) REFERENCES aston_agents(tenant_id, agent_id),
  FOREIGN KEY (tenant_id, delegation_id) REFERENCES aston_delegations(tenant_id, delegation_id)
);
CREATE INDEX IF NOT EXISTS idx_aston_spend_agent_time
  ON aston_spend_entries(tenant_id, agent_id, occurred_at_ms);

CREATE TABLE IF NOT EXISTS aston_simulations (
  tenant_id TEXT NOT NULL,
  simulation_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  base_version INTEGER NOT NULL,
  scenario_json TEXT NOT NULL CHECK (json_valid(scenario_json)),
  result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
  risk TEXT NOT NULL CHECK (risk IN ('low','medium','high','critical','unknown')),
  status TEXT NOT NULL CHECK (status IN ('created','running','evaluated','rejected','expired')),
  created_by TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, simulation_id)
);
CREATE INDEX IF NOT EXISTS idx_aston_simulations_resource
  ON aston_simulations(tenant_id, resource_id, created_at_ms);

CREATE TABLE IF NOT EXISTS aston_media_rights (
  tenant_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  license_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','active','expired','revoked')),
  rights_json TEXT NOT NULL CHECK (json_valid(rights_json)),
  valid_from_ms INTEGER NOT NULL,
  valid_until_ms INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, asset_id, license_id),
  CHECK (valid_until_ms > valid_from_ms)
);

CREATE TABLE IF NOT EXISTS aston_safety_decisions (
  tenant_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  command_digest TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  simulation_id TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('deny','approval_required','allow_candidate')),
  signature_algorithm TEXT,
  event_hash TEXT NOT NULL,
  occurred_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, decision_id)
);
CREATE INDEX IF NOT EXISTS idx_aston_safety_device_time
  ON aston_safety_decisions(tenant_id, device_id, occurred_at_ms);

CREATE TABLE IF NOT EXISTS aston_mcp_tools (
  tenant_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL CHECK (status IN ('draft','active','revoked')),
  mutating INTEGER NOT NULL DEFAULT 0 CHECK (mutating IN (0,1)),
  definition_json TEXT NOT NULL CHECK (json_valid(definition_json)),
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, tool_name, version)
);

CREATE TABLE IF NOT EXISTS aston_compliance_evidence (
  tenant_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  control_reference TEXT NOT NULL,
  artifact_reference TEXT NOT NULL,
  artifact_digest TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','collected','reviewed','accepted','rejected')),
  collected_at_ms INTEGER NOT NULL,
  reviewed_by TEXT,
  reviewed_at_ms INTEGER,
  PRIMARY KEY (tenant_id, evidence_id)
);
CREATE INDEX IF NOT EXISTS idx_aston_compliance_control
  ON aston_compliance_evidence(tenant_id, control_reference, status);
