export function validatePolicyVersion(policy){
 const errors=[];if(!policy||typeof policy!=="object")return {valid:false,errors:["policy_required"]};
 for(const k of ["tenantId","policyId","createdBy"])if(typeof policy[k]!=="string"||!policy[k].trim())errors.push("invalid_"+k);
 if(!Number.isSafeInteger(policy.version)||policy.version<1)errors.push("invalid_version");
 if(!["draft","active","retired"].includes(policy.status))errors.push("invalid_status");
 if(!Array.isArray(policy.allowedActions)||policy.allowedActions.some(a=>typeof a!=="string"||!a.trim()))errors.push("invalid_allowed_actions");
 if(policy.status==="active"&&policy.enabled!==true)errors.push("active_policy_must_be_enabled");
 return {valid:errors.length===0,errors};
}
export function canActivatePolicy({candidate,current,review}){
 const v=validatePolicyVersion(candidate);if(!v.valid)return {allowed:false,reasons:v.errors};
 if(candidate.status!=="active"||candidate.enabled!==true)return {allowed:false,reasons:["candidate_not_active"]};
 if(current&&(candidate.tenantId!==current.tenantId||candidate.policyId!==current.policyId||candidate.version<=current.version))return {allowed:false,reasons:["policy_version_not_monotonic"]};
 if(review?.approved!==true||review.tenantId!==candidate.tenantId||!review.operatorId)return {allowed:false,reasons:["independent_policy_review_required"]};
 return {allowed:true,reasons:[]};
}
