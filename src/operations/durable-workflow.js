import { validateApproval } from "./approval.js";
const STATES=new Set(["created","diagnosing","approval_pending","approved","rejected","executing","verifying","completed","failed","expired","cancelled"]);
export function validateWorkflowSnapshot(s){
 const errors=[];if(!s||typeof s!=="object")return {valid:false,errors:["workflow_required"]};
 for(const k of ["tenantId","workflowId","requestId","status"])if(typeof s[k]!=="string"||!s[k])errors.push("invalid_"+k);
 if(!STATES.has(s.status))errors.push("unknown_status");
 if(!Number.isSafeInteger(s.deadlineMs)||s.deadlineMs<=0)errors.push("invalid_deadline");
 return {valid:errors.length===0,errors};
}
export function acceptApprovalEvent({workflow,request,approval,signatureVerified,nowMs=Date.now()}){
 const valid=validateWorkflowSnapshot(workflow);if(!valid.valid)return {accepted:false,reason:valid.errors.join(",")};
 if(workflow.status!=="approval_pending")return {accepted:false,reason:"workflow_not_waiting_for_approval"};
 if(nowMs>=workflow.deadlineMs)return {accepted:false,reason:"approval_deadline_expired"};
 if(signatureVerified!==true)return {accepted:false,reason:"approval_signature_not_verified"};
 const check=validateApproval({request,approval,nowMs});if(!check.valid)return {accepted:false,reason:check.reasons.join(",")};
 if(approval.requestId!==workflow.requestId||approval.tenantId!==workflow.tenantId)return {accepted:false,reason:"workflow_scope_mismatch"};
 return {accepted:true,nextStatus:"approved",approvalId:approval.approvalId};
}
export function resolveWorkflowTimeout(workflow,nowMs=Date.now()){
 const valid=validateWorkflowSnapshot(workflow);if(!valid.valid)return {status:"failed",reason:"invalid_workflow"};
 if(nowMs<workflow.deadlineMs)return {status:workflow.status,reason:"not_timed_out"};
 return {status:"expired",reason:"approval_timeout_fail_closed",requiresOperatorEscalation:true};
}
