import { validateTaskPlan } from "./task-plan.js";
export function planExecutionLayers(plan){
 const validation=validateTaskPlan(plan);if(!validation.valid)return {valid:false,errors:validation.errors,layers:[]};
 const remaining=new Set(plan.tasks.map((_,i)=>i)),done=new Set(),layers=[];
 while(remaining.size){const ready=[...remaining].filter(i=>(plan.tasks[i].dependsOn??[]).every(d=>done.has(d)));
  if(!ready.length)return {valid:false,errors:["dependency_cycle_detected"],layers:[]};
  layers.push(ready);for(const i of ready){remaining.delete(i);done.add(i);}
 }
 return {valid:true,layers,taskCount:plan.tasks.length,maxParallelism:Math.max(...layers.map(x=>x.length))};
}
export function authorizeToolCall({role,tool,args,allowedTools,mutating=false,approval}){
 if(!Array.isArray(allowedTools)||!allowedTools.includes(tool))return {allowed:false,reason:"tool_not_allowlisted"};
 if(!args||typeof args!=="object"||Array.isArray(args))return {allowed:false,reason:"invalid_tool_arguments"};
 if(mutating&&approval?.approved!==true)return {allowed:false,reason:"human_approval_required"};
 if(mutating&&approval?.tenantId!==args.tenantId)return {allowed:false,reason:"approval_tenant_mismatch"};
 return {allowed:true,role,tool};
}
