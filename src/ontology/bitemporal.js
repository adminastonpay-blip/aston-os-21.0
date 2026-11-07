export function isValidAt(record,validAtMs,systemAtMs=Date.now()){
 if(!record||!Number.isFinite(validAtMs)||!Number.isFinite(systemAtMs))return false;
 const valid=record.validFromMs<=validAtMs&&(record.validToMs==null||validAtMs<record.validToMs);
 const system=record.systemFromMs<=systemAtMs&&(record.systemToMs==null||systemAtMs<record.systemToMs);
 return valid&&system;
}
export function closeBitemporalVersion(record,{validToMs,systemToMs}){
 if(!record||!Number.isFinite(validToMs)||!Number.isFinite(systemToMs)||validToMs<record.validFromMs||systemToMs<record.systemFromMs)throw new TypeError("invalid_temporal_bounds");
 return {...record,validToMs,systemToMs};
}
export function selectBitemporalVersion(records,{validAtMs,systemAtMs=Date.now(),tenantId}){
 if(!Array.isArray(records)||!tenantId)return null;
 return records.filter(r=>r.tenantId===tenantId&&isValidAt(r,validAtMs,systemAtMs)).sort((a,b)=>b.systemFromMs-a.systemFromMs)[0]??null;
}
