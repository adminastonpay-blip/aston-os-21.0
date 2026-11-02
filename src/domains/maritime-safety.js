export function evaluateMaritimeCondition({tenantId,assetId,measurements,limits,emergencyStop=false,operatorApproval}){
 const reasons=[];if(!tenantId||!assetId||!Array.isArray(measurements)||!limits)return {decision:"deny",reasons:["invalid_context"]};
 if(emergencyStop)return {decision:"deny",reasons:["emergency_stop_active"]};
 for(const m of measurements){const b=limits[m.metric];if(!b||!Number.isFinite(m.value)||m.value<b.min||m.value>b.max)reasons.push("out_of_bounds:"+(m.metric??"unknown"));}
 if(reasons.length)return {decision:"deny",reasons};
 if(operatorApproval?.approved!==true||operatorApproval.signatureVerified!==true||operatorApproval.tenantId!==tenantId||!operatorApproval.operatorId)return {decision:"approval_required",reasons:["human_review_required_before_physical_action"]};
 return {decision:"safe_candidate",reasons:[],execution:"external_certified_controller_required"};
}
