export function validateDeviceRegistration(device){
 const errors=[];for(const k of ["tenantId","deviceId","publicKey","keyAlgorithm","safetyProfileId"])if(typeof device?.[k]!=="string"||!device[k].trim())errors.push("invalid_"+k);
 if(device?.status!=="pending_attestation")errors.push("device_must_start_pending_attestation");
 if(device?.emergencyStop!==true)errors.push("device_must_default_to_emergency_stop");
 return {valid:errors.length===0,errors};
}
export function activateDevice({device,attestation,verifier}){
 const valid=validateDeviceRegistration(device);if(!valid.valid)return {activated:false,reasons:valid.errors};
 if(!attestation||attestation.tenantId!==device.tenantId||attestation.deviceId!==device.deviceId||attestation.passed!==true)return {activated:false,reasons:["device_attestation_failed"]};
 if(!verifier||typeof verifier.verify!=="function")return {activated:false,reasons:["trusted_attestation_verifier_missing"]};
 return {activated:false,reasons:["activation_requires_async_verified_attestation"],verify:async()=>{const ok=await verifier.verify(attestation,device.publicKey);return ok?{activated:true,device:{...device,status:"active",emergencyStop:false}}:{activated:false,reasons:["attestation_signature_invalid"]};}};
}
