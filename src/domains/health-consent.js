export function authorizeHealthDataUse({tenantId,subjectId,purpose,dataCategories,consent,nowMs=Date.now()}){
 const deny=reason=>({allowed:false,reason});
 if(!tenantId||!subjectId||!purpose||!Array.isArray(dataCategories)||!dataCategories.length)return deny("request_context_missing");
 if(!consent||consent.tenantId!==tenantId||consent.subjectId!==subjectId)return deny("consent_scope_mismatch");
 if(consent.status!=="active"||!Number.isSafeInteger(consent.validUntilMs)||consent.validUntilMs<=nowMs)return deny("consent_inactive_or_expired");
 if(!Array.isArray(consent.allowedPurposes)||!consent.allowedPurposes.includes(purpose))return deny("purpose_not_consented");
 if(!Array.isArray(consent.allowedDataCategories)||dataCategories.some(c=>!consent.allowedDataCategories.includes(c)))return deny("data_category_not_consented");
 return {allowed:true,reason:null,minimumNecessaryOnly:true,secondaryUse:false};
}
