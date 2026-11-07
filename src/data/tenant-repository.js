const TENANT=/^[a-zA-Z0-9_-]{2,80}$/;
function assertTenant(tenantId){if(typeof tenantId!=="string"||!TENANT.test(tenantId))throw new TypeError("verified_tenant_required");}
export function createTenantRepository(db){
 if(!db||typeof db.prepare!=="function")throw new TypeError("D1_database_binding_required");
 return Object.freeze({
  async getSource(tenantId,sourceId){assertTenant(tenantId);return db.prepare("SELECT tenant_id, source_id, source_type, status, created_at_ms, updated_at_ms FROM aston_data_sources WHERE tenant_id = ? AND source_id = ?").bind(tenantId,sourceId).first();},
  async createIngestionJob(tenantId,job){assertTenant(tenantId);return db.prepare("INSERT OR IGNORE INTO aston_ingestion_jobs (tenant_id,job_id,source_id,idempotency_key,status,payload_digest,created_at_ms,updated_at_ms) VALUES (?,?,?,?,?,?,?,?)").bind(tenantId,job.jobId,job.sourceId,job.idempotencyKey,"accepted",job.payloadDigest,job.nowMs,job.nowMs).run();},
  async transitionIngestion(tenantId,jobId,fromStatus,toStatus,nowMs){assertTenant(tenantId);const allowed={accepted:["queued","failed"],queued:["processing","failed"],processing:["completed","failed","dead_letter"],failed:["queued"],dead_letter:[]};if(!allowed[fromStatus]?.includes(toStatus))throw new TypeError("invalid_ingestion_transition");return db.prepare("UPDATE aston_ingestion_jobs SET status = ?, updated_at_ms = ? WHERE tenant_id = ? AND job_id = ? AND status = ?").bind(toStatus,nowMs,tenantId,jobId,fromStatus).run();},
  async listDecisionEvents(tenantId,limit=50){assertTenant(tenantId);if(!Number.isInteger(limit)||limit<1||limit>200)throw new RangeError("limit_out_of_bounds");return db.prepare("SELECT event_id,event_version,occurred_at_ms,actor_id,action,decision,reason_codes_json,event_hash FROM aston_decision_events WHERE tenant_id = ? ORDER BY occurred_at_ms DESC LIMIT ?").bind(tenantId,limit).all();}
 });
}
