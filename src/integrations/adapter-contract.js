const ADAPTER_STATES=new Set(["draft","staging","active","paused","revoked"]);
export function validateAdapterManifest(manifest){
 const errors=[];if(!manifest||typeof manifest!=="object")return {valid:false,errors:["manifest_required"]};
 for(const k of ["adapterId","tenantId","provider","version","capabilities"])if(manifest[k]===undefined)errors.push("missing_"+k);
 if(typeof manifest.adapterId!=="string"||!manifest.adapterId.trim())errors.push("invalid_adapter_id");
 if(typeof manifest.tenantId!=="string"||!/^[a-zA-Z0-9_-]{2,80}$/.test(manifest.tenantId))errors.push("invalid_tenant_id");
 if(typeof manifest.provider!=="string"||!manifest.provider.trim())errors.push("invalid_provider");
 if(!Number.isSafeInteger(manifest.version)||manifest.version<1)errors.push("invalid_version");
 if(!Array.isArray(manifest.capabilities)||manifest.capabilities.some(x=>typeof x!=="string"))errors.push("invalid_capabilities");
 if(!ADAPTER_STATES.has(manifest.status))errors.push("invalid_status");
 if(manifest.secretValues!==undefined)errors.push("secrets_must_not_be_in_manifest");
 return {valid:errors.length===0,errors};
}
export function adapterCanRun(manifest,capability,tenantId){
 const v=validateAdapterManifest(manifest);return v.valid&&manifest.status==="active"&&manifest.tenantId===tenantId&&manifest.capabilities.includes(capability);
}
