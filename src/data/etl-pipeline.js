import { validateIngestionRequest } from "./ingestion.js";
import { validateProvenanceEvent } from "./provenance.js";
export function normalizeText(text){return text.replace(/\r\n?/g,"\n").replace(/[ \t]+/g," ").trim();}
export function chunkText(text,{size=800,overlap=100,maxChunks=500}={}){
 if(typeof text!=="string"||!Number.isInteger(size)||size<100||!Number.isInteger(overlap)||overlap<0||overlap>=size)throw new TypeError("invalid_chunk_configuration");
 const chunks=[];for(let i=0;i<text.length&&chunks.length<maxChunks;i+=size-overlap){chunks.push(text.slice(i,i+size));if(i+size>=text.length)break;}
 if(text.length>0&&chunks.length===maxChunks&&chunks.at(-1).length<size)throw new RangeError("chunk_limit_exceeded");
 return chunks;
}
export async function runIngestionPipeline({job,masker,embedder,vectorStore,lineage,nowMs=Date.now()}){
 const valid=validateIngestionRequest(job);if(!valid.valid)return {ok:false,status:"rejected",errors:valid.errors};
 for(const [name,provider] of Object.entries({masker,embedder,vectorStore,lineage}))if(!provider||typeof provider.run!=="function")return {ok:false,status:"unavailable",reason:name+"_provider_missing"};
 const masked=await masker.run(job.payload,{tenantId:job.tenantId,actorId:job.actorId});
 if(typeof masked?.text!=="string")return {ok:false,status:"failed",reason:"masker_invalid_output"};
 const chunks=chunkText(normalizeText(masked.text));if(!chunks.length)return {ok:false,status:"rejected",reason:"empty_normalized_payload"};
 const vectors=await embedder.run(chunks);if(!Array.isArray(vectors)||vectors.length!==chunks.length||vectors.some(v=>!Array.isArray(v)||!v.every(Number.isFinite)))return {ok:false,status:"failed",reason:"embedding_output_invalid"};
 const ids=chunks.map((_,i)=>job.sourceId+"_"+job.idempotencyKey+"_"+i);
 const records=chunks.map((chunk,i)=>({id:ids[i],values:vectors[i],metadata:{tenantId:job.tenantId,sourceId:job.sourceId,actorId:job.actorId,chunk}}));
 const stored=await vectorStore.run(records);if(stored?.stored!==true)return {ok:false,status:"failed",reason:"vector_store_not_confirmed"};
 const provenance=chunks.map((_,i)=>({tenantId:job.tenantId,artifactId:ids[i],transformation:"etl.chunk.embed",pipelineVersion:"1.0",actorId:job.actorId,parentArtifactIds:[job.sourceId],occurredAtMs:nowMs,metadata:{schemaVersion:"1.0"}}));
 if(provenance.some(e=>!validateProvenanceEvent(e).valid))return {ok:false,status:"failed",reason:"provenance_invalid_after_storage"};
 const lineageResult=await lineage.run(provenance);if(lineageResult?.stored!==true)return {ok:false,status:"partial",reason:"lineage_not_confirmed",storedChunkIds:ids};
 return {ok:true,status:"completed",storedChunkIds:ids,chunkCount:chunks.length,maskedItems:masked.maskedCount??null};
}
