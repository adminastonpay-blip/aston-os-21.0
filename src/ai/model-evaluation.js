export function evaluateModelRun({expected,actual,latencyMs,costMinor,maxLatencyMs,maxCostMinor}){
 const errors=[];if(!Array.isArray(expected)||!Array.isArray(actual)||expected.length!==actual.length||!expected.length)errors.push("invalid_evaluation_pairs");
 if(!Number.isFinite(latencyMs)||latencyMs<0||!Number.isSafeInteger(costMinor)||costMinor<0)errors.push("invalid_run_metrics");
 if(!Number.isFinite(maxLatencyMs)||maxLatencyMs<=0||!Number.isSafeInteger(maxCostMinor)||maxCostMinor<0)errors.push("invalid_limits");
 if(errors.length)return {valid:false,passed:false,errors};
 let matches=0;for(let i=0;i<expected.length;i++)if(expected[i]===actual[i])matches++;
 const accuracy=matches/expected.length,latencyPass=latencyMs<=maxLatencyMs,costPass=costMinor<=maxCostMinor;
 return {valid:true,passed:accuracy>=0.95&&latencyPass&&costPass,accuracy,latencyPass,costPass,latencyMs,costMinor};
}
