const ALLOWED_LANGUAGES=new Set(["javascript","python"]);
export function evaluateSandboxRequest({tenantId,agentId,language,command,networkEgress=[],risk="unknown",approval}){
 const deny=reason=>({allowed:false,reason,execution:"not_started"});
 if(!tenantId||!agentId||!ALLOWED_LANGUAGES.has(language)||typeof command!=="string"||!command.trim()||command.length>8000)return deny("invalid_request");
 if(networkEgress.some(host=>typeof host!=="string"||!/^([a-z0-9-]+\.)*[a-z0-9-]+$/.test(host)))return deny("invalid_egress_host");
 if(risk==="critical"||risk==="high"){
  if(approval?.approved!==true||approval.tenantId!==tenantId||approval.agentId!==agentId)return deny("human_approval_required");
 }
 return {allowed:true,reason:null,execution:"requires_isolated_sandbox_provider",networkEgress:[...new Set(networkEgress)]};
}
export async function executeInSandbox({decision,provider,request}){
 if(!decision?.allowed||decision.execution!=="requires_isolated_sandbox_provider")return {executed:false,reason:"policy_not_allowing_execution"};
 if(!provider||typeof provider.execute!=="function")return {executed:false,reason:"sandbox_provider_not_configured"};
 const result=await provider.execute({...request,networkEgress:decision.networkEgress});
 return {executed:true,result};
}
