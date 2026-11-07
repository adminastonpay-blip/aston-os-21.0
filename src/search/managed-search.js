export async function tenantScopedSearch({provider,tenantId,query,limit=10,filters={}}){
 if(typeof tenantId!=="string"||!/^[a-zA-Z0-9_-]{2,80}$/.test(tenantId))return {ok:false,reason:"verified_tenant_required",results:[]};
 if(typeof query!=="string"||!query.trim()||query.length>4000)return {ok:false,reason:"invalid_query",results:[]};
 if(!Number.isInteger(limit)||limit<1||limit>20)return {ok:false,reason:"limit_out_of_bounds",results:[]};
 if(!provider||typeof provider.search!=="function")return {ok:false,reason:"managed_search_provider_not_configured",results:[]};
 const response=await provider.search({query,limit,filter:{...filters,tenantId}});
 const results=Array.isArray(response?.results)?response.results.filter(r=>r?.tenantId===tenantId):[];
 return {ok:true,results,provider:response?.provider??"external_search_adapter",droppedCrossTenant:(response?.results?.length??0)-results.length};
}
