const MAX_DEPTH=8,MAX_NODES=500;
export function traverseTenantGraph({tenantId,rootId,edges,direction="out",maxDepth=4,maxNodes=100,atMs=Date.now()}){
 if(typeof tenantId!=="string"||!tenantId||typeof rootId!=="string"||!rootId||!Array.isArray(edges))return {valid:false,error:"invalid_graph_input",nodes:[],paths:[]};
 if(!Number.isInteger(maxDepth)||maxDepth<1||maxDepth>MAX_DEPTH||!Number.isInteger(maxNodes)||maxNodes<1||maxNodes>MAX_NODES)return {valid:false,error:"traversal_limit_out_of_bounds",nodes:[],paths:[]};
 if(!["out","in","both"].includes(direction))return {valid:false,error:"invalid_direction",nodes:[],paths:[]};
 const queue=[{id:rootId,depth:0,path:[rootId]}],visited=new Set([rootId]),paths=[];
 while(queue.length&&visited.size<=maxNodes){const cur=queue.shift();if(cur.depth>=maxDepth)continue;
  for(const e of edges){if(e.tenantId!==tenantId||!Number.isFinite(e.validFromMs)||e.validFromMs>atMs||(e.validToMs!==null&&e.validToMs!==undefined&&e.validToMs<=atMs))continue;
   const next=direction==="out"?(e.fromId===cur.id?e.toId:null):direction==="in"?(e.toId===cur.id?e.fromId:null):(e.fromId===cur.id?e.toId:e.toId===cur.id?e.fromId:null);
   if(!next||cur.path.includes(next))continue;const path=[...cur.path,next];paths.push(path);if(!visited.has(next)){visited.add(next);queue.push({id:next,depth:cur.depth+1,path});}
   if(visited.size>=maxNodes)break;
  }
 }
 return {valid:true,nodes:[...visited],paths,truncated:queue.length>0,maxDepth,maxNodes};
}
