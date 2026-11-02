export async function verifyPaymentReceipt({tenantId,agentId,expectedAmountMinor,expectedCurrency,receipt,provider}){
 const deny=reason=>({verified:false,reason});if(!tenantId||!agentId||!receipt)return deny("receipt_context_missing");
 if(receipt.tenantId!==tenantId||receipt.agentId!==agentId||receipt.amountMinor!==expectedAmountMinor||receipt.currency!==expectedCurrency)return deny("receipt_mismatch");
 if(!provider||typeof provider.verifyReceipt!=="function")return deny("payment_provider_verifier_missing");
 const result=await provider.verifyReceipt(receipt);if(result?.verified!==true||result?.settled!==true)return deny("settlement_not_verified");
 return {verified:true,transactionId:result.transactionId,settledAtMs:result.settledAtMs};
}
