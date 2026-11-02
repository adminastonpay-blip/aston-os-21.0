export function validateJournalRecord(record){
 const errors=[];for(const k of ["tenantId","eventId","eventType","eventHash","occurredAtMs"])if(record?.[k]===undefined||record[k]===null)errors.push("missing_"+k);
 if(typeof record?.eventHash!=="string"||!/^[a-f0-9]{64}$/.test(record.eventHash))errors.push("invalid_event_hash");
 if(!Number.isSafeInteger(record?.occurredAtMs)||record.occurredAtMs<=0)errors.push("invalid_timestamp");
 if(record?.payload!==undefined&&(!record.payload||typeof record.payload!=="object"||Array.isArray(record.payload)))errors.push("invalid_payload");
 return {valid:errors.length===0,errors};
}
export async function appendForensicRecord({record,store,anchor}){
 const v=validateJournalRecord(record);if(!v.valid)return {stored:false,reason:v.errors.join(",")};
 if(!store||typeof store.append!=="function")return {stored:false,reason:"journal_store_not_configured"};
 const result=await store.append(record);if(result?.durable!==true)return {stored:false,reason:"journal_store_not_confirmed"};
 let anchorResult={anchored:false};
 if(anchor&&typeof anchor.anchorHead==="function")anchorResult=await anchor.anchorHead({tenantId:record.tenantId,eventHash:record.eventHash});
 return {stored:true,anchored:anchorResult?.anchored===true,reference:result.reference??null};
}
// An R2 object or Iceberg table is only immutable if retention, access and deletion controls enforce it.
