export function authorizeStreamOperation({tenantId,assetId,operation,territory,nowMs=Date.now(),rights,viewerClearance="public"}){
 const deny=reason=>({allowed:false,reason});
 if(!tenantId||!assetId||!operation||!territory||!rights)return deny("context_missing");
 if(rights.tenantId!==tenantId||rights.assetId!==assetId)return deny("tenant_or_asset_mismatch");
 if(rights.status!=="active"||!Array.isArray(rights.operations)||!rights.operations.includes(operation))return deny("operation_not_licensed");
 if(!Array.isArray(rights.territories)||(!rights.territories.includes("*")&&!rights.territories.includes(territory)))return deny("territory_not_licensed");
 if(!Number.isSafeInteger(rights.validFromMs)||!Number.isSafeInteger(rights.validUntilMs)||nowMs<rights.validFromMs||nowMs>=rights.validUntilMs)return deny("license_outside_validity_window");
 const rank={public:0,internal:1,confidential:2,secret:3};if(rank[viewerClearance]===undefined||rank[viewerClearance]<(rank[rights.minimumClearance??"public"]??99))return deny("clearance_insufficient");
 if(operation==="create_derivative"&&rights.derivativesApproved!==true)return deny("derivative_not_approved");
 return {allowed:true,reason:null,licenseId:rights.licenseId??null};
}
