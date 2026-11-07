import { authorizeSpend } from "./spend-policy.js";
export function evaluateX402Request(input){
 const spend=authorizeSpend(input);
 if(spend.decision!=="allow")return {authorized:false,decision:spend.decision,reasons:spend.reasons??[]};
 if(input.delegationVerified!==true)return {authorized:false,decision:"deny",reasons:["delegation_not_verified"]};
 if(input.paymentProviderReady!==true)return {authorized:false,decision:"deny",reasons:["payment_provider_not_configured"]};
 return {authorized:true,decision:"allow_candidate",paymentProtocol:"x402",execution:"external_wallet_provider_required"};
}
export async function requestX402Payment({authorization,provider,payment}){
 if(!authorization?.authorized||authorization.execution!=="external_wallet_provider_required")return {paid:false,reason:"payment_not_authorized"};
 if(!provider||typeof provider.requestPayment!=="function")return {paid:false,reason:"wallet_provider_not_configured"};
 const result=await provider.requestPayment(payment);return {paid:result?.settled===true,receipt:result?.receipt??null};
}
