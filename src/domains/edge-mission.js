export function validateOfflineMissionEnvelope(mission,{tenantId,lastAcceptedSequence=-1,nowMs=Date.now()}={}){
 const errors=[];if(!mission||typeof mission!=="object")return {valid:false,errors:["mission_required"]};
 if(mission.tenantId!==tenantId)errors.push("tenant_mismatch");
 for(const k of ["missionId","deviceId","commandDigest","policyVersion"])if(typeof mission[k]!=="string"||!mission[k])errors.push("invalid_"+k);
 if(!Number.isSafeInteger(mission.sequence)||mission.sequence<=lastAcceptedSequence)errors.push("replayed_or_nonmonotonic_sequence");
 if(!Number.isSafeInteger(mission.issuedAtMs)||!Number.isSafeInteger(mission.expiresAtMs)||mission.issuedAtMs>nowMs||mission.expiresAtMs<=nowMs||mission.expiresAtMs<=mission.issuedAtMs)errors.push("invalid_mission_window");
 if(mission.signatureVerified!==true)errors.push("signature_not_verified");
 if(mission.localPolicyVersion!==mission.policyVersion)errors.push("local_policy_version_mismatch");
 return {valid:errors.length===0,errors,offlineSafe:errors.length===0};
}
