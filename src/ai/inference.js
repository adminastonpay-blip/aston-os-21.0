import { selectModelRoute } from "./model-routing.js";
export async function governedInference({env,candidates,identity,jurisdiction,messages,requiredCapabilities=["chat"],budgetRemainingMinor=0}){
 if(!env?.AI||typeof env.AI.run!=="function")return {ok:false,status:"unavailable",reason:"workers_ai_binding_missing"};
 const route=selectModelRoute({candidates,jurisdiction,clearance:identity?.clearance,budgetRemainingMinor,requiredCapabilities});
 if(!route.selected)return {ok:false,status:"denied",reason:"no_approved_model_route"};
 const candidate=candidates.find(c=>c.id===route.selected);
 if(!candidate?.modelId)return {ok:false,status:"denied",reason:"model_id_not_approved"};
 if(!Array.isArray(messages)||messages.length===0)return {ok:false,status:"denied",reason:"messages_required"};
 const response=await env.AI.run(candidate.modelId,{messages,max_tokens:Math.min(candidate.maxOutputTokens??1024,4096),temperature:0.2});
 return {ok:true,status:"completed",model:route.selected,response};
}
