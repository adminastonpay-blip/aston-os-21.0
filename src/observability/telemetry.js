export function createTelemetryEvent({tenantId,requestId,name,outcome,durationMs,attributes={}}){
 if(!tenantId||!requestId||!name||!["success","failure","denied","skipped"].includes(outcome)||!Number.isFinite(durationMs)||durationMs<0)throw new TypeError("invalid_telemetry_event");
 const safe={};for(const [k,v] of Object.entries(attributes)){if(/token|secret|password|email|payload|content|prompt|authorization/i.test(k))continue;if(["string","number","boolean"].includes(typeof v))safe[k]=typeof v==="string"?v.slice(0,120):v;}
 return {version:"1.0",tenantId,requestId,name,outcome,durationMs,attributes:safe,occurredAtMs:Date.now()};
}
export function aggregateTelemetry(events){
 const summary={count:0,success:0,failure:0,denied:0,skipped:0,totalDurationMs:0};
 for(const e of events??[]){if(!e||!Object.hasOwn(summary,e.outcome))continue;summary.count++;summary[e.outcome]++;summary.totalDurationMs+=e.durationMs??0;}
 summary.averageDurationMs=summary.count?summary.totalDurationMs/summary.count:0;return summary;
}
