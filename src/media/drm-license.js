export function validateLicenseRequest({tenantId,assetId,territory,deviceId,nowMs=Date.now(),rights,drmSystem}){
 const errors=[];if(!tenantId||!assetId||!territory||!deviceId)errors.push("request_context_missing");
 if(!rights||rights.tenantId!==tenantId||rights.assetId!==assetId)errors.push("rights_scope_mismatch");
 if(rights?.status!=="active")errors.push("rights_not_active");
 if(rights&&(!Array.isArray(rights.territories)||(!rights.territories.includes("*")&&!rights.territories.includes(territory))))errors.push("territory_not_licensed");
 if(rights&&(!Number.isSafeInteger(rights.validFromMs)||!Number.isSafeInteger(rights.validUntilMs)||nowMs<rights.validFromMs||nowMs>=rights.validUntilMs))errors.push("outside_license_window");
 if(!["widevine","fairplay","playready"].includes(drmSystem))errors.push("unsupported_drm_system");
 return {valid:errors.length===0,errors,licenseIssuance:"external_drm_provider_required"};
}
export async function issueDrmLicense({request,provider}){
 if(!provider||typeof provider.issueLicense!=="function")return {issued:false,reason:"certified_drm_provider_not_configured"};
 const check=validateLicenseRequest(request);if(!check.valid)return {issued:false,reason:check.errors.join(",")};
 const result=await provider.issueLicense(request);if(!result||typeof result.license!=="string")return {issued:false,reason:"invalid_provider_response"};
 return {issued:true,license:result.license,expiresAtMs:result.expiresAtMs};
}
