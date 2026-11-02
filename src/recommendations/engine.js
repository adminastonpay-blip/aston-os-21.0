export function buildAudienceProfile(events,{tenantId,viewerId}={}){
 if(!Array.isArray(events)||!tenantId||!viewerId)return {valid:false,profile:null};
 const relevant=events.filter(e=>e.tenantId===tenantId&&e.viewerId===viewerId&&typeof e.genre==="string"&&Number.isFinite(e.watchSeconds)&&e.watchSeconds>=0);
 const scores={};for(const e of relevant)scores[e.genre]=(scores[e.genre]??0)+Math.min(e.watchSeconds,14400);
 return {valid:true,profile:{tenantId,viewerId,genreScores:scores,eventCount:relevant.length}};
}
export function rankRecommendations({profile,candidates,tenantId,excludeAssetIds=[]}){
 if(!profile||profile.tenantId!==tenantId||!Array.isArray(candidates))return [];
 const excluded=new Set(excludeAssetIds);
 return candidates.filter(c=>c.tenantId===tenantId&&c.status==="published"&&!excluded.has(c.assetId))
 .map(c=>({...c,score:(profile.genreScores?.[c.genre]??0)+(c.semanticScore??0)}))
 .sort((a,b)=>b.score-a.score).slice(0,20);
}
