const NEXT={created:["recording","cancelled"],recording:["stopping","failed"],stopping:["archiving","failed"],archiving:["ready","failed"],ready:[],failed:["created"],cancelled:[]};
export function transitionRecording(state,event){
 if(!NEXT[state]||!NEXT[state].includes(event))return {valid:false,state,error:"invalid_recording_transition"};
 return {valid:true,state:event};
}
export function validateRecordingSegment(segment){
 const errors=[];for(const k of ["tenantId","sessionId","segmentId","objectKey"])if(typeof segment?.[k]!=="string"||!segment[k].trim())errors.push("invalid_"+k);
 if(!Number.isSafeInteger(segment?.sequence)||segment.sequence<1)errors.push("invalid_sequence");
 if(!Number.isSafeInteger(segment?.durationMs)||segment.durationMs<1||segment.durationMs>600000)errors.push("invalid_duration");
 if(typeof segment?.sha256!=="string"||!/^[a-f0-9]{64}$/.test(segment.sha256))errors.push("invalid_digest");
 return {valid:errors.length===0,errors};
}
