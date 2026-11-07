export async function createAgentIdentity({tenantId,agentId,provider}){
 if(!tenantId||!agentId||!provider||typeof provider.generateKeyPair!=="function")return {created:false,reason:"trusted_agent_key_provider_required"};
 const pair=await provider.generateKeyPair({extractablePrivateKey:false});if(!pair?.publicKey||!pair?.keyHandle)return {created:false,reason:"invalid_key_provider_result"};
 return {created:true,identity:{tenantId,agentId,algorithm:provider.algorithm,publicKey:pair.publicKey,keyHandle:pair.keyHandle,status:"pending_proof_of_possession"}};
}
export async function signAgentMessage({identity,message,provider}){
 if(identity?.status!=="active"||!provider||typeof provider.sign!=="function")return {signed:false,reason:"active_identity_and_signer_required"};
 const payload={tenantId:identity.tenantId,agentId:identity.agentId,message};const signature=await provider.sign(identity.keyHandle,new TextEncoder().encode(JSON.stringify(payload)));
 return {signed:true,payload,algorithm:provider.algorithm,signature:Array.from(signature)};
}
export async function verifyAgentMessage({signed,publicKey,provider,expectedTenantId}){
 if(!signed?.payload||signed.payload.tenantId!==expectedTenantId||!Array.isArray(signed.signature)||!provider||typeof provider.verify!=="function")return {valid:false,reason:"invalid_signature_context"};
 const ok=await provider.verify(publicKey,new TextEncoder().encode(JSON.stringify(signed.payload)),new Uint8Array(signed.signature));
 return {valid:ok===true,reason:ok===true?null:"signature_invalid"};
}
