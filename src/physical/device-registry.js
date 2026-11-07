export function validateDeviceRegistration(device){
 const errors=[];for(const k of ["tenantId","deviceId","publicKey","keyAlgorithm","safetyProfileId"])if(typeof device?.[k]!=="string"||!device[k].trim())errors.push("invalid_"+k);
 if(device?.status!=="pending_attestation")errors.push("device_must_start_pending_attestation");
 if(device?.emergencyStop!==true)errors.push("device_must_default_to_emergency_stop");
 return {valid:errors.length===0,errors};
}
export async function verifyDeviceAttestation({device,attestation,verifier}){
 const valid=validateDeviceRegistration(device);if(!valid.valid)return {verified:false,reasons:valid.errors};
 if(!attestation||attestation.tenantId!==device.tenantId||attestation.deviceId!==device.deviceId||attestation.passed!==true)return {verified:false,reasons:["device_attestation_failed"]};
 if(!verifier||typeof verifier.verify!=="function")return {verified:false,reasons:["trusted_attestation_verifier_missing"]};
 const ok=await verifier.verify(attestation,device.publicKey);
 return ok?{verified:true,device:{...device,status:"active",emergencyStop:true}}:{verified:false,reasons:["attestation_signature_invalid"]};
}
export function releaseEmergencyStop({device,operatorApproval,hardwareAcknowledgement}){
 if(!device||device.status!=="active"||device.emergencyStop!==true)return {released:false,reason:"device_not_in_stopped_active_state"};
 if(operatorApproval?.approved!==true||operatorApproval.signatureVerified!==true||operatorApproval.tenantId!==device.tenantId||!operatorApproval.operatorId)return {released:false,reason:"operator_approval_required"};
 if(hardwareAcknowledgement?.safeToEnable!==true||hardwareAcknowledgement.signatureVerified!==true||hardwareAcknowledgement.deviceId!==device.deviceId)return {released:false,reason:"hardware_safety_acknowledgement_required"};
 return {released:true,device:{...device,emergencyStop:false}};
}
