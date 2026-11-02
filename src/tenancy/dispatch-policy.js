export function resolveTenantRuntime({verifiedIdentity,tenantDeployment,dispatchNamespaceReady=false}){
 if(!verifiedIdentity||verifiedIdentity.verified!==true||!verifiedIdentity.tenantId)return {allowed:false,reason:"verified_tenant_identity_required"};
 if(!tenantDeployment||tenantDeployment.tenantId!==verifiedIdentity.tenantId||tenantDeployment.status!=="active")return {allowed:false,reason:"tenant_runtime_not_active"};
 if(dispatchNamespaceReady!==true)return {allowed:false,reason:"workers_for_platforms_not_configured"};
 if(tenantDeployment.isolation!=="untrusted")return {allowed:false,reason:"tenant_runtime_must_be_untrusted"};
 return {allowed:true,scriptName:tenantDeployment.scriptName,tenantId:verifiedIdentity.tenantId};
}
