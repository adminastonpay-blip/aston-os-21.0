const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,119}$/;
export function validateA2AMessage(message){
 const errors=[];if(!message||typeof message!=="object"||Array.isArray(message))return {valid:false,errors:["message_object_required"]};
 for(const k of ["messageId","tenantId","fromAgent","toAgent","taskId"])if(typeof message[k]!=="string"||!ID.test(message[k]))errors.push("invalid_"+k);
 if(!["task","status","artifact","cancel"].includes(message.kind))errors.push("invalid_kind");
 if(!Number.isSafeInteger(message.createdAtMs)||message.createdAtMs<=0)errors.push("invalid_created_at");
 if(message.payload!==undefined&&(!message.payload||typeof message.payload!=="object"||Array.isArray(message.payload)))errors.push("invalid_payload");
 return {valid:errors.length===0,errors,protocolVersion:"1.0"};
}
export function authorizeA2ARoute({message,authenticatedTenant,allowedPeers=[]}){
 const v=validateA2AMessage(message);if(!v.valid)return {allowed:false,reason:"invalid_message"};
 if(message.tenantId!==authenticatedTenant)return {allowed:false,reason:"tenant_mismatch"};
 if(!allowedPeers.includes(message.fromAgent)||!allowedPeers.includes(message.toAgent))return {allowed:false,reason:"peer_not_allowlisted"};
 return {allowed:true};
}
