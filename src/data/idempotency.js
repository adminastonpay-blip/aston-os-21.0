export function validateIdempotencyRecord(record,nowMs=Date.now()){
 const errors=[];if(!record||typeof record!=="object")return {valid:false,errors:["record_required"]};
 for(const k of ["tenantId","key","operation","payloadDigest"])if(typeof record[k]!=="string"||!record[k].trim())errors.push("invalid_"+k);
 if(!Number.isSafeInteger(record.createdAtMs)||record.createdAtMs>nowMs+60000)errors.push("invalid_created_at");
 if(!["accepted","processing","completed","failed"].includes(record.status))errors.push("invalid_status");
 return {valid:errors.length===0,errors};
}
export function resolveIdempotency(existing,incoming){
 if(!incoming||!incoming.tenantId||!incoming.key||!incoming.payloadDigest)return {decision:"reject",reason:"invalid_request"};
 if(!existing)return {decision:"accept_new"};
 if(existing.tenantId!==incoming.tenantId)return {decision:"reject",reason:"tenant_mismatch"};
 if(existing.payloadDigest!==incoming.payloadDigest)return {decision:"conflict",reason:"key_reused_with_different_payload"};
 if(existing.status==="completed")return {decision:"replay_result",result:existing.result??null};
 if(existing.status==="processing")return {decision:"in_progress"};
 if(existing.status==="failed")return {decision:"retry_allowed"};
 return {decision:"duplicate_pending"};
}
