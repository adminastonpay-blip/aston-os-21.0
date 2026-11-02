const ALGORITHMS=Object.freeze({signature:"ML-DSA-65",kem:"ML-KEM-768"});
export async function probePostQuantumSupport(subtle=globalThis.crypto?.subtle){
 if(!subtle)return {supported:false,signature:false,kem:false,algorithms:ALGORITHMS,reason:"webcrypto_unavailable"};
 const result={signature:false,kem:false};
 try{const k=await subtle.generateKey(ALGORITHMS.signature,false,["sign","verify"]);result.signature=Boolean(k?.privateKey&&k?.publicKey);}catch{}
 try{const k=await subtle.generateKey(ALGORITHMS.kem,false,["encapsulateBits","decapsulateBits"]);result.kem=Boolean(k?.privateKey&&k?.publicKey);}catch{}
 return {supported:result.signature&&result.kem,...result,algorithms:ALGORITHMS,reason:result.signature&&result.kem?null:"runtime_algorithm_support_not_confirmed"};
}
export async function requirePostQuantumProvider(provider){
 if(!provider||typeof provider.sign!=="function"||typeof provider.verify!=="function"||typeof provider.encapsulate!=="function"||typeof provider.decapsulate!=="function")return {ready:false,reason:"reviewed_pq_provider_required"};
 const probe=await provider.selfTest?.();if(probe?.passed!==true)return {ready:false,reason:"provider_self_test_failed"};
 return {ready:true,algorithms:ALGORITHMS};
}
// Never downgrade silently to classical crypto and never claim PQ security from algorithm-name strings.
