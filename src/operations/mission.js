const SEVERITIES=new Set(["low","medium","high","critical"]);
export function validateMission(m){
 const errors=[];if(!m||typeof m!=="object")return {valid:false,errors:["mission_required"]};
 for(const k of ["missionId","tenantId","origin","createdBy"])if(typeof m[k]!=="string"||!m[k].trim())errors.push("invalid_"+k);
 if(!Number.isInteger(m.errorCode))errors.push("invalid_error_code");
 if(!SEVERITIES.has(m.severity))errors.push("invalid_severity");
 if(!Number.isSafeInteger(m.createdAtMs)||m.createdAtMs<=0)errors.push("invalid_created_at");
 let origin;try{origin=new URL(m.origin);}catch{errors.push("invalid_origin");}
 if(origin&&origin.protocol!=="https:")errors.push("origin_must_use_https");
 return {valid:errors.length===0,errors};
}
export function transitionMission(status,event){
 const map={created:["diagnosed","cancelled"],diagnosed:["approval_pending","no_action","failed"],approval_pending:["approved","rejected","expired"],approved:["executing","cancelled"],executing:["verifying","failed"],verifying:["completed","failed"],completed:[],failed:["created"],rejected:[],expired:[],cancelled:[],no_action:[]};
 if(!map[status]||!map[status].includes(event))return {valid:false,status,error:"invalid_transition"};
 return {valid:true,status:event};
}
export function classifyRecoveryAction({severity,diagnostic,proposal,approval,policy}){
 if(!SEVERITIES.has(severity)||!diagnostic||!policy)return {decision:"deny",action:"none",reason:"invalid_context"};
 if(diagnostic.reachable===true&&!diagnostic.degraded)return {decision:"no_action",action:"none",reason:"service_healthy"};
 if(!policy.allowedActions?.includes(proposal?.action))return {decision:"deny",action:"none",reason:"action_not_allowlisted"};
 if(severity==="critical"||policy.requireHumanApproval===true){
  if(approval?.approved!==true||approval?.tenantId!==policy.tenantId)return {decision:"approval_required",action:"none",reason:"explicit_human_approval_required"};
 }
 return {decision:"candidate_only",action:proposal.action,reason:"requires_separate_execution_adapter"};
}
