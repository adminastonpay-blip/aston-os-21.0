import { validateMcpToolDefinition, authorizeMcpInvocation } from "../interop/mcp-contract.js";
const response=(id,result,error)=>({jsonrpc:"2.0",id,result,error});
export async function handleMcpRequest({request,tenantId,identity,tools,approval,evaluatePolicy,executeTool}){
 if(!request||request.jsonrpc!=="2.0"||typeof request.method!=="string")return response(request?.id??null,null,{code:-32600,message:"Invalid Request"});
 if(request.method==="initialize")return response(request.id,{protocolVersion:"2025-03-26",capabilities:{tools:{listChanged:false}},serverInfo:{name:"aston-os-governance",version:"21.0"}});
 if(request.method==="tools/list")return response(request.id,{tools:(tools??[]).filter(t=>t.tenantId===tenantId&&t.status==="active").map(t=>t.definition)});
 if(request.method!=="tools/call")return response(request.id,null,{code:-32601,message:"Method not found"});
 const name=request.params?.name,args=request.params?.arguments??{};
 const entry=(tools??[]).find(t=>t.tenantId===tenantId&&t.status==="active"&&t.definition?.name===name);
 if(!entry)return response(request.id,null,{code:-32602,message:"Tool unavailable"});
 const def=validateMcpToolDefinition(entry.definition);if(!def.valid)return response(request.id,null,{code:-32602,message:"Tool definition invalid"});
 if(typeof evaluatePolicy!=="function")return response(request.id,null,{code:-32001,message:"Policy evaluator not configured"});
 const policyDecision=await evaluatePolicy({identity,tool:entry.definition,arguments:args,tenantId});
 const auth=authorizeMcpInvocation({identity,tool:entry.definition,approval,policyDecision});
 if(!auth.allowed)return response(request.id,null,{code:-32001,message:"Policy denied",data:auth.reasons??[auth.reason]});
 if(typeof executeTool!=="function")return response(request.id,null,{code:-32002,message:"Tool executor not configured"});
 try{const result=await executeTool(name,args,{tenantId,identity});return response(request.id,{content:[{type:"text",text:typeof result==="string"?result:JSON.stringify(result)}]});}
 catch{return response(request.id,null,{code:-32003,message:"Tool execution failed"});}
}
