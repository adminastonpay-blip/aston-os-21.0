import test from "node:test";
import assert from "node:assert/strict";
import { tenantScopedSearch } from "../src/search/managed-search.js";
import { appendForensicRecord } from "../src/data/iceberg-journal.js";
import { createDecisionBook, verifyDecisionBook } from "../src/crypto/decision-book.js";
import { validateExecutionPermit, verifyExecutionPermit } from "../src/physical/permit.js";
import { handleMcpRequest } from "../src/agents/mcp-server.js";
import { governedInference } from "../src/ai/inference.js";
import { validateLicenseRequest } from "../src/media/drm-license.js";
import { transitionRecording, validateRecordingSegment } from "../src/media/recording-session.js";
import { buildAudienceProfile, rankRecommendations } from "../src/recommendations/engine.js";
import { evaluateSandboxRequest } from "../src/sandbox/execution-policy.js";
import { evaluateX402Request } from "../src/commerce/x402-policy.js";
import { resolveTenantRuntime } from "../src/tenancy/dispatch-policy.js";
import { validateAdapterManifest, adapterCanRun } from "../src/integrations/adapter-contract.js";

test("managed search enforces tenant filter and strips cross-tenant results",async()=>{
 const result=await tenantScopedSearch({tenantId:"tenant_01",query:"pump",provider:{search:async()=>({results:[{tenantId:"tenant_01",id:"a"},{tenantId:"tenant_02",id:"b"}]})}});
 assert.equal(result.results.length,1);assert.equal(result.droppedCrossTenant,1);
 const unavailable=await tenantScopedSearch({tenantId:"tenant_01",query:"pump"});assert.equal(unavailable.ok,false);
});
test("forensic journal requires durable provider and validates hash",async()=>{
 const record={tenantId:"tenant_01",eventId:"evt_01",eventType:"decision",eventHash:"a".repeat(64),occurredAtMs:100};
 assert.equal((await appendForensicRecord({record})).stored,false);
 const saved=await appendForensicRecord({record,store:{append:async()=>({durable:true,reference:"r2://journal/evt_01"})}});
 assert.equal(saved.stored,true);assert.equal(saved.anchored,false);
});
test("Decision Book requires external signing and verification adapters",async()=>{
 const book=await createDecisionBook({tenantId:"tenant_01",events:[{tenantId:"tenant_01"}],signer:{algorithm:"TEST",sign:async()=>new Uint8Array([1,2])}});
 assert.equal(book.created,true);
 const verified=await verifyDecisionBook({book:book.book,signature:book.signature,verifier:{verify:async()=>true}});
 assert.equal(verified.valid,true);
 assert.equal((await createDecisionBook({tenantId:"tenant_01",events:[{tenantId:"tenant_02"}],signer:{algorithm:"x",sign:async()=>new Uint8Array()}})).created,false);
});
test("physical permit is short lived, scoped and independently verified",async()=>{
 const permit={permitId:"p1",tenantId:"tenant_01",deviceId:"d1",commandDigest:"a".repeat(64),policyVersion:"1",algorithm:"ML-DSA-65",signature:"sig",issuedAtMs:10,expiresAtMs:200};
 const context={tenantId:"tenant_01",deviceId:"d1",commandDigest:"a".repeat(64),nowMs:100};
 assert.equal(validateExecutionPermit(permit,context).valid,true);
 const result=await verifyExecutionPermit({permit,context,revocation:{isRevoked:async()=>false},verifier:{verify:async()=>true}});
 assert.equal(result.valid,true);
 assert.equal((await verifyExecutionPermit({permit,context,revocation:null,verifier:{verify:async()=>true}})).valid,false);
});
test("MCP handler requires tenant, policy approval and executor",async()=>{
 const tool={name:"read_asset",description:"Read asset",inputSchema:{type:"object",additionalProperties:false},mutating:false};
 const tools=[{tenantId:"tenant_01",status:"active",definition:tool}];
 const request={jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"read_asset",arguments:{}}};
 const denied=await handleMcpRequest({request,tenantId:"tenant_01",identity:{tenantId:"tenant_01"},tools,evaluatePolicy:async()=>({allowed:false})});
 assert.equal(denied.error.code,-32001);
 const ok=await handleMcpRequest({request,tenantId:"tenant_01",identity:{tenantId:"tenant_01"},tools,evaluatePolicy:async()=>({allowed:true}),executeTool:async()=>"ok"});
 assert.equal(ok.result.content[0].text,"ok");
});
test("governed inference refuses missing binding and routes only approved model",async()=>{
 const args={candidates:[{id:"m1",modelId:"approved/model",enabled:true,jurisdictions:["AR"],maxClearance:"confidential",maxCostMinor:5,capabilities:["chat"]}],identity:{clearance:"internal"},jurisdiction:"AR",budgetRemainingMinor:10,messages:[{role:"user",content:"hi"}]};
 assert.equal((await governedInference({...args,env:{}})).status,"unavailable");
 const r=await governedInference({...args,env:{AI:{run:async()=>({response:"hello"})}}});
 assert.equal(r.status,"completed");assert.equal(r.model,"m1");
});
test("DRM license validation checks window, territory and device context",()=>{
 const rights={tenantId:"tenant_01",assetId:"asset_01",status:"active",territories:["AR"],validFromMs:1,validUntilMs:100};
 const req={tenantId:"tenant_01",assetId:"asset_01",territory:"AR",deviceId:"device_01",nowMs:50,rights,drmSystem:"widevine"};
 assert.equal(validateLicenseRequest(req).valid,true);
 assert.equal(validateLicenseRequest({...req,territory:"US"}).valid,false);
});
test("recording state machine and segment digest validation",()=>{
 assert.equal(transitionRecording("created","recording").valid,true);
 assert.equal(transitionRecording("recording","ready").valid,false);
 assert.equal(validateRecordingSegment({tenantId:"tenant_01",sessionId:"s1",segmentId:"seg1",objectKey:"r2/key",sequence:1,durationMs:1000,sha256:"b".repeat(64)}).valid,true);
});
test("audience recommendation stays inside tenant",()=>{
 const profile=buildAudienceProfile([{tenantId:"tenant_01",viewerId:"v1",genre:"science",watchSeconds:60},{tenantId:"tenant_02",viewerId:"v1",genre:"sports",watchSeconds:900}],{tenantId:"tenant_01",viewerId:"v1"});
 const ranked=rankRecommendations({profile,tenantId:"tenant_01",candidates:[{tenantId:"tenant_01",assetId:"a",genre:"science",status:"published"},{tenantId:"tenant_02",assetId:"b",genre:"science",status:"published"}]});
 assert.equal(ranked.length,1);assert.equal(ranked[0].assetId,"a");
});
test("sandbox policy does not execute and requires approval for high risk",()=>{
 const req={tenantId:"tenant_01",agentId:"agent_01",language:"python",command:"print(1)",risk:"critical"};
 assert.equal(evaluateSandboxRequest(req).allowed,false);
 assert.equal(evaluateSandboxRequest({...req,approval:{approved:true,tenantId:"tenant_01",agentId:"agent_01"}}).allowed,true);
});
test("x402 policy refuses unverified delegation and unconfigured payment",()=>{
 const input={tenantId:"tenant_01",agentId:"agent_01",merchant:"api.example",currency:"USD",amountMinor:100,spentTodayMinor:0,spentMonthMinor:0,policy:{enabled:true,tenantId:"tenant_01",agentId:"agent_01",currency:"USD",allowedMerchants:["api.example"],perTransactionLimitMinor:1000,dailyLimitMinor:1000,monthlyLimitMinor:10000},delegationVerified:false,paymentProviderReady:true};
 assert.equal(evaluateX402Request(input).authorized,false);
 assert.equal(evaluateX402Request({...input,delegationVerified:true,paymentProviderReady:false}).authorized,false);
});
test("tenant dispatch requires verified identity and untrusted runtime",()=>{
 const base={verifiedIdentity:{verified:true,tenantId:"tenant_01"},tenantDeployment:{tenantId:"tenant_01",status:"active",isolation:"untrusted",scriptName:"aston-tenant-1"},dispatchNamespaceReady:true};
 assert.equal(resolveTenantRuntime(base).allowed,true);
 assert.equal(resolveTenantRuntime({...base,dispatchNamespaceReady:false}).allowed,false);
});
test("adapter manifests prohibit secret values and enforce tenant/capability",()=>{
 const manifest={adapterId:"cf_ai",tenantId:"tenant_01",provider:"cloudflare-ai",version:1,capabilities:["chat"],status:"active"};
 assert.equal(validateAdapterManifest(manifest).valid,true);
 assert.equal(adapterCanRun(manifest,"chat","tenant_01"),true);
 assert.equal(validateAdapterManifest({...manifest,secretValues:{token:"x"}}).valid,false);
});
