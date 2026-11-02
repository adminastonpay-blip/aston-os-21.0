import test from "node:test";
import assert from "node:assert/strict";
import { validateSchemaDefinition, validateRecordAgainstSchema, isBackwardCompatible } from "../src/data/schema-registry.js";
import { resolveIdempotency } from "../src/data/idempotency.js";
import { buildTenantVectorQuery, filterTenantMatches, buildGroundedContext } from "../src/data/rag.js";
import { traverseTenantGraph } from "../src/ontology/graph.js";
import { isValidAt, selectBitemporalVersion } from "../src/ontology/bitemporal.js";
import { planExecutionLayers, authorizeToolCall } from "../src/agents/orchestrator.js";
import { createSimulationSnapshot, applySimulationDelta, compareSimulation } from "../src/simulation/twin.js";
import { validateMission, transitionMission, classifyRecoveryAction } from "../src/operations/mission.js";
import { verifyAccessJwt } from "../src/security/access-jwt.js";
import { probePostQuantumSupport, requirePostQuantumProvider } from "../src/crypto/pq.js";
import { authorizeStreamOperation } from "../src/streaming/stream-policy.js";
import { validateA2AMessage, authorizeA2ARoute } from "../src/interop/a2a-contract.js";
import { createTelemetryEvent, aggregateTelemetry } from "../src/observability/telemetry.js";

test("schema registry validates records and safe backward compatibility",()=>{
 const a={schemaId:"asset",version:1,fields:[{name:"name",type:"string",required:true}]};
 const b={schemaId:"asset",version:2,fields:[{name:"name",type:"string",required:true},{name:"tag",type:"string",required:false}]};
 assert.equal(validateSchemaDefinition(a).valid,true);
 assert.equal(validateRecordAgainstSchema({name:"pump"},a).valid,true);
 assert.equal(validateRecordAgainstSchema({name:2},a).valid,false);
 assert.equal(isBackwardCompatible(a,b),true);
});
test("idempotency prevents replay side effects and key payload substitution",()=>{
 const incoming={tenantId:"tenant_01",key:"key_123456",payloadDigest:"abc"};
 assert.equal(resolveIdempotency(null,incoming).decision,"accept_new");
 assert.equal(resolveIdempotency({...incoming,status:"completed",result:{ok:true}},incoming).decision,"replay_result");
 assert.equal(resolveIdempotency({...incoming,status:"completed",payloadDigest:"different"},incoming).decision,"conflict");
});
test("RAG always filters retrieval by tenant and bounds topK",()=>{
 assert.throws(()=>buildTenantVectorQuery({tenantId:"../bad"}));
 const query=buildTenantVectorQuery({tenantId:"tenant_01",topK:5});
 assert.equal(query.filter.tenantId,"tenant_01");
 const matches=[{metadata:{tenantId:"tenant_01",sourceId:"s1",chunk:"safe"}},{metadata:{tenantId:"tenant_02",sourceId:"s2",chunk:"secret"}}];
 const ctx=buildGroundedContext(matches,{tenantId:"tenant_01"});
 assert.equal(ctx.matchCount,1);assert.equal(ctx.sources[0],"s1");assert.equal(ctx.context.includes("secret"),false);
 assert.equal(filterTenantMatches(matches,"tenant_02").length,1);
});
test("graph traversal is tenant scoped, temporal and bounded",()=>{
 const edges=[
 {tenantId:"tenant_01",fromId:"a",toId:"b",validFromMs:1,validToMs:null},
 {tenantId:"tenant_02",fromId:"a",toId:"secret",validFromMs:1,validToMs:null},
 {tenantId:"tenant_01",fromId:"b",toId:"c",validFromMs:1,validToMs:5}
 ];
 const r=traverseTenantGraph({tenantId:"tenant_01",rootId:"a",edges,atMs:10});
 assert.deepEqual(r.nodes.sort(),["a","b"]);assert.equal(r.nodes.includes("secret"),false);
 assert.equal(traverseTenantGraph({tenantId:"tenant_01",rootId:"a",edges,maxDepth:99}).valid,false);
});
test("bitemporal query checks both valid and system time and tenant",()=>{
 const r={tenantId:"tenant_01",validFromMs:10,validToMs:30,systemFromMs:5,systemToMs:null};
 assert.equal(isValidAt(r,20,20),true);assert.equal(isValidAt(r,40,20),false);
 assert.equal(selectBitemporalVersion([r],{tenantId:"tenant_02",validAtMs:20}),null);
});
test("orchestrator creates dependency layers and guards mutating tools",()=>{
 const p=planExecutionLayers({tasks:[{role:"analyst",goal:"A",dependsOn:[]},{role:"verifier",goal:"B",dependsOn:[0]},{role:"analyst",goal:"C",dependsOn:[]}]});
 assert.equal(p.valid,true);assert.deepEqual(p.layers,[[0,2],[1]]);
 assert.equal(authorizeToolCall({role:"executor",tool:"write",args:{tenantId:"tenant_01"},allowedTools:["write"],mutating:true}).allowed,false);
 assert.equal(authorizeToolCall({role:"executor",tool:"write",args:{tenantId:"tenant_01"},allowedTools:["write"],mutating:true,approval:{approved:true,tenantId:"tenant_01"}}).allowed,true);
});
test("Decision Twin applies only tenant-scoped simulated deltas",()=>{
 const s=createSimulationSnapshot({tenantId:"tenant_01",resourceId:"asset_1",version:3,properties:{state:"on",count:1}});
 assert.equal(applySimulationDelta(s,{tenantId:"tenant_02",resourceId:"asset_1",op:"set_property",key:"state",value:"off"}).valid,false);
 const a=applySimulationDelta(s,{tenantId:"tenant_01",resourceId:"asset_1",op:"set_property",key:"state",value:"off"});
 assert.equal(a.valid,true);assert.equal(s.properties.state,"on");
 assert.equal(compareSimulation({before:s,after:a.snapshot,highImpactKeys:["state"]}).risk,"high");
});
test("mission state machine fails closed and requires approval for critical remediation",()=>{
 const m={missionId:"mis_01",tenantId:"tenant_01",origin:"https://example.com",errorCode:503,severity:"critical",createdBy:"operator",createdAtMs:100};
 assert.equal(validateMission(m).valid,true);assert.equal(validateMission({...m,origin:"http://example.com"}).valid,false);
 assert.equal(transitionMission("approval_pending","approved").valid,true);assert.equal(transitionMission("approval_pending","executing").valid,false);
 const candidate=classifyRecoveryAction({severity:"critical",diagnostic:{reachable:false},proposal:{action:"failover"},policy:{tenantId:"tenant_01",allowedActions:["failover"]}});
 assert.equal(candidate.decision,"approval_required");
});
test("Access JWT verification fails closed when config or tenant claim is missing",async()=>{
 assert.equal((await verifyAccessJwt("bad",{})).valid,false);
 assert.equal((await verifyAccessJwt("a.b.c",{jwks:{keys:[]},issuer:"https://issuer",audience:"aston"})).valid,false);
});
test("post-quantum capability never silently downgrades",async()=>{
 const p=await requirePostQuantumProvider(null);assert.equal(p.ready,false);
 const probe=await probePostQuantumSupport({generateKey:async()=>{throw new Error("unsupported");}});
 assert.equal(probe.supported,false);assert.equal(probe.signature,false);
});
test("stream policy requires rights, territory, operation and validity window",()=>{
 const rights={tenantId:"tenant_01",assetId:"movie_01",status:"active",operations:["play"],territories:["AR"],validFromMs:1,validUntilMs:100,minimumClearance:"public"};
 assert.equal(authorizeStreamOperation({tenantId:"tenant_01",assetId:"movie_01",operation:"play",territory:"AR",nowMs:50,rights}).allowed,true);
 assert.equal(authorizeStreamOperation({tenantId:"tenant_01",assetId:"movie_01",operation:"play",territory:"US",nowMs:50,rights}).allowed,false);
});
test("A2A messages require tenant and peer allowlists",()=>{
 const m={messageId:"msg_01",tenantId:"tenant_01",fromAgent:"agent_a",toAgent:"agent_b",taskId:"task_01",kind:"task",createdAtMs:100,payload:{}};
 assert.equal(validateA2AMessage(m).valid,true);
 assert.equal(authorizeA2ARoute({message:m,authenticatedTenant:"tenant_01",allowedPeers:["agent_a","agent_b"]}).allowed,true);
 assert.equal(authorizeA2ARoute({message:m,authenticatedTenant:"tenant_02",allowedPeers:["agent_a","agent_b"]}).allowed,false);
});
test("telemetry excludes sensitive attributes and aggregates outcomes",()=>{
 const e=createTelemetryEvent({tenantId:"tenant_01",requestId:"req_01",name:"chat",outcome:"success",durationMs:10,attributes:{region:"EU",email:"private@example.com",api_token:"secret"}});
 assert.equal("email" in e.attributes,false);assert.equal("api_token" in e.attributes,false);
 assert.equal(aggregateTelemetry([e]).success,1);
});
