const ALLOWED_OPS=new Set(["set_property","delete_property"]);
export function createSimulationSnapshot({tenantId,resourceId,version,properties}){
 if(!tenantId||!resourceId||!Number.isSafeInteger(version)||version<1||!properties||typeof properties!=="object"||Array.isArray(properties))throw new TypeError("invalid_snapshot");
 return Object.freeze({tenantId,resourceId,baseVersion:version,properties:structuredClone(properties),createdAtMs:Date.now()});
}
export function applySimulationDelta(snapshot,delta){
 if(!snapshot||!delta||delta.tenantId!==snapshot.tenantId||delta.resourceId!==snapshot.resourceId||!ALLOWED_OPS.has(delta.op))return {valid:false,error:"invalid_delta_scope_or_operation"};
 const properties=structuredClone(snapshot.properties);
 if(delta.op==="set_property"){if(typeof delta.key!=="string"||!delta.key||delta.key.length>120)return {valid:false,error:"invalid_property_key"};properties[delta.key]=delta.value;}
 if(delta.op==="delete_property"){if(typeof delta.key!=="string"||!Object.hasOwn(properties,delta.key))return {valid:false,error:"property_not_found"};delete properties[delta.key];}
 return {valid:true,snapshot:{...snapshot,properties},delta:{op:delta.op,key:delta.key},requiresCommitGate:true};
}
export function compareSimulation({before,after,highImpactKeys=[]}){
 if(!before||!after||before.tenantId!==after.tenantId||before.resourceId!==after.resourceId)return {valid:false,risk:"unknown",changes:[]};
 const keys=new Set([...Object.keys(before.properties),...Object.keys(after.properties)]),changes=[];
 for(const key of keys)if(JSON.stringify(before.properties[key])!==JSON.stringify(after.properties[key]))changes.push({key,before:before.properties[key]??null,after:after.properties[key]??null,highImpact:highImpactKeys.includes(key)});
 return {valid:true,risk:changes.some(c=>c.highImpact)?"high":changes.length>10?"medium":"low",changes};
}
