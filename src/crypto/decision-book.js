export async function createDecisionBook({tenantId,events,signer}){
 if(!tenantId||!Array.isArray(events)||events.some(e=>e.tenantId!==tenantId))return {created:false,reason:"tenant_scope_or_events_invalid"};
 if(!signer||typeof signer.sign!=="function"||typeof signer.algorithm!=="string")return {created:false,reason:"reviewed_signer_not_configured"};
 const payload={version:"1.0",tenantId,createdAtMs:Date.now(),events};
 const bytes=new TextEncoder().encode(JSON.stringify(payload));const signature=await signer.sign(bytes);
 if(!(signature instanceof Uint8Array))return {created:false,reason:"signer_returned_invalid_signature"};
 return {created:true,book:payload,signature:Array.from(signature),algorithm:signer.algorithm};
}
export async function verifyDecisionBook({book,signature,verifier}){
 if(!book||!Array.isArray(book.events)||!book.tenantId||!Array.isArray(signature))return {valid:false,reason:"invalid_book"};
 if(book.events.some(e=>e.tenantId!==book.tenantId))return {valid:false,reason:"tenant_mismatch"};
 if(!verifier||typeof verifier.verify!=="function")return {valid:false,reason:"reviewed_verifier_not_configured"};
 const bytes=new TextEncoder().encode(JSON.stringify(book));const ok=await verifier.verify(bytes,new Uint8Array(signature));
 return {valid:ok===true,reason:ok===true?null:"signature_invalid"};
}
