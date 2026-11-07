export function authorizeSatelliteCommand({tenantId,satelliteId,command,window,signatureVerified,revocationChecked,localPolicyVersion}){
 const deny=reason=>({authorized:false,reason});
 if(!tenantId||!satelliteId||!command||!window)return deny("context_missing");
 if(command.tenantId!==tenantId||command.satelliteId!==satelliteId)return deny("command_scope_mismatch");
 if(signatureVerified!==true)return deny("signature_not_verified");
 if(revocationChecked!==true)return deny("revocation_status_unavailable");
 if(command.policyVersion!==localPolicyVersion)return deny("policy_version_mismatch");
 if(!Number.isSafeInteger(window.startsAtMs)||!Number.isSafeInteger(window.endsAtMs)||window.endsAtMs<=window.startsAtMs)return deny("invalid_execution_window");
 if(command.executeAtMs<window.startsAtMs||command.executeAtMs>=window.endsAtMs)return deny("outside_execution_window");
 if(command.risk==="critical"){
  const a=command.humanApproval;
  if(!a||a.approved!==true||a.signatureVerified!==true||!a.operatorId||a.tenantId!==tenantId)return deny("critical_command_requires_approval");
 }
 return {authorized:true,execution:"independent_onboard_controller_required"};
}
