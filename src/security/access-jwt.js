const decode=(s)=>{const b=s.replace(/-/g,"+").replace(/_/g,"/");return JSON.parse(atob(b.padEnd(Math.ceil(b.length/4)*4,"=")));};
export async function verifyAccessJwt(token,{jwks,issuer,audience,nowSeconds=Math.floor(Date.now()/1000)}={}){
 const deny=(reason)=>({valid:false,reason,claims:null});
 if(typeof token!=="string"||!Array.isArray(jwks?.keys)||!issuer||!audience)return deny("verification_config_missing");
 const parts=token.split(".");if(parts.length!==3)return deny("malformed_jwt");
 try{
  const header=decode(parts[0]),claims=decode(parts[1]);if(header.alg!=="RS256"||typeof header.kid!=="string")return deny("unsupported_jwt_algorithm");
  if(claims.iss!==issuer)return deny("issuer_mismatch");
  const aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];if(!aud.includes(audience))return deny("audience_mismatch");
  if(!Number.isFinite(claims.exp)||claims.exp<=nowSeconds)return deny("token_expired");
  if(claims.nbf!==undefined&&(!Number.isFinite(claims.nbf)||claims.nbf>nowSeconds))return deny("token_not_yet_valid");
  if(claims.iat!==undefined&&(!Number.isFinite(claims.iat)||claims.iat>nowSeconds+60))return deny("invalid_issued_at");
  const jwk=jwks.keys.find(k=>k.kid===header.kid&&k.kty==="RSA"&&k.use!=="enc");if(!jwk)return deny("signing_key_not_found");
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const signature=Uint8Array.from(atob(parts[2].replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
  const ok=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,signature,new TextEncoder().encode(parts[0]+"."+parts[1]));
  if(!ok)return deny("invalid_signature");
  const tenantId=claims.custom?.tenantId??claims.tenantId;
  if(typeof tenantId!=="string"||!/^[a-zA-Z0-9_-]{2,80}$/.test(tenantId))return deny("tenant_claim_missing");
  return {valid:true,reason:null,claims:{subject:claims.sub,tenantId,roles:Array.isArray(claims.custom?.roles)?claims.custom.roles:[],clearance:claims.custom?.clearance??"public",expiresAt:claims.exp}};
 }catch{return deny("jwt_verification_failed");}
}
