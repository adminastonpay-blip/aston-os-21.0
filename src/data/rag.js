const MAX_TOP_K=20;
export function buildTenantVectorQuery({tenantId,topK=5,filter={}}){
 if(typeof tenantId!=="string"||!/^[a-zA-Z0-9_-]{2,80}$/.test(tenantId))throw new TypeError("verified_tenant_required");
 if(!Number.isInteger(topK)||topK<1||topK>MAX_TOP_K)throw new RangeError("top_k_out_of_bounds");
 return {topK,filter:{...filter,tenantId},returnMetadata:true};
}
export function filterTenantMatches(matches,tenantId){
 if(!Array.isArray(matches)||typeof tenantId!=="string")return [];
 return matches.filter(m=>m&&m.metadata&&m.metadata.tenantId===tenantId);
}
export function buildGroundedContext(matches,{tenantId,maxCharacters=12000}={}){
 const safe=filterTenantMatches(matches,tenantId);let out="",sources=[];
 for(const m of safe){const chunk=typeof m.metadata.chunk==="string"?m.metadata.chunk:"";if(!chunk)continue;
 const piece="["+String(m.metadata.sourceId??"unknown")+"] "+chunk;
 if(out.length+piece.length>maxCharacters)break;out+=(out?"\n---\n":"")+piece;sources.push(String(m.metadata.sourceId??"unknown"));
 }
 return {context:out,sources:[...new Set(sources)],matchCount:safe.length};
}
