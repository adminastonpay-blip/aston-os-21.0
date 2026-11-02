export function validateExecutionPermit(permit,{tenantId,deviceId,commandDigest,nowMs=Date.now()}={}){
 const errors=[];if(!permit||typeof permit!=="object")return {valid:false,errors:["permit_required"]};
 for(const k of ["permitId","tenantId","deviceId","commandDigest","policyVersion","algorithm","signature"])if(typeof permit[k]!=="string"||!permit[k])errors.push("invalid_"+k);
 if(permit.tenantId!==tenantId||permit.deviceId!==deviceId||permit.commandDigest!==commandDigest)errors.push("permit_scope_mismatch");
 if(!Number.isSafeInteger(permit.issuedAtMs)||!Number.isSafeInteger(permit.expiresAtMs)||permit.issuedAtMs>nowMs||permit.expiresAtMs<=nowMs||permit.expiresAtMs<=permit.issuedAtMs||permit.expiresAtMs-permit.issuedAtMs>30000)errors.push("permit_expired_or_invalid_window");
 return {valid:errors.length===0,errors};
}
export async function verifyExecutionPermit({permit,context,revocation,verifier}){
 const v=validateExecutionPermit(permit,context);if(!v.valid)return {valid:false,reason:v.errors.join(",")};
 if(!revocation||typeof revocation.isRevoked!=="function"||await revocation.isRevoked(permit.permitId))return {valid:false,reason:"permit_revoked_or_revocation_unavailable"};
 if(!verifier||typeof verifier.verify!=="function")return {valid:false,reason:"trusted_signature_verifier_missing"};
 const ok=await verifier.verify(permit);return {valid:ok===true,reason:ok===true?null:"permit_signature_invalid"};
}
// Permit validation is not a substitute for an independent hardware emergency stop.
