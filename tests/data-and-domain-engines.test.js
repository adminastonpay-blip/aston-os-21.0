import test from "node:test";
import assert from "node:assert/strict";
import { createTenantRepository } from "../src/data/tenant-repository.js";
import { runIngestionPipeline, chunkText } from "../src/data/etl-pipeline.js";
import { validateRelationship } from "../src/ontology/relationships.js";
import { createAgentIdentity, signAgentMessage, verifyAgentMessage } from "../src/agents/identity.js";
import { evaluateModelRun } from "../src/ai/model-evaluation.js";
import { validatePolicyVersion, canActivatePolicy } from "../src/security/policy-registry.js";
import { verifyPaymentReceipt } from "../src/commerce/payment-receipt.js";
import { verifyDeviceAttestation, releaseEmergencyStop } from "../src/physical/device-registry.js";

test("tenant D1 repository requires tenant scope and constrains every lookup",async()=>{
 const calls=[];const db={prepare(sql){return {bind(...args){calls.push({sql,args});return {first:async()=>({tenant_id:args[0]}),run:async()=>({success:true}),all:async()=>({results:[]})};}};}};
 const repo=createTenantRepository(db);await repo.getSource("tenant_01","src_01");
 assert.equal(calls[0].sql.includes("tenant_id = ?"),true);assert.equal(calls[0].args[0],"tenant_01");
 await assert.rejects(()=>repo.getSource("../tenant","src_01"));
});
test("ETL pipeline masks before embedding and records provenance",async()=>{
 const seen=[];const job={tenantId:"tenant_01",sourceId:"src_01",idempotencyKey:"request-0001",actorId:"actor_01",contentType:"text/plain",payload:"hello\r\nworld"};
 const result=await runIngestionPipeline({job,masker:{run:async(text)=>({text:"MASKED:"+text,maskedCount:1})},embedder:{run:async(chunks)=>{seen.push(chunks);return chunks.map(()=>[0.1,0.2]);}},vectorStore:{run:async(records)=>({stored:records.every(r=>r.metadata.tenantId==="tenant_01")})},lineage:{run:async(events)=>({stored:events.every(e=>e.tenantId==="tenant_01")})}});
 assert.equal(result.status,"completed");assert.equal(seen[0][0].startsWith("MASKED:"),true);assert.equal(result.chunkCount,1);
 assert.equal(chunkText("a".repeat(1000),{size:500,overlap:50}).length,3);
});
test("ontology relationship enforces endpoint types and tenant",()=>{
 const a={tenantId:"tenant_01",entityType:"organization"},b={tenantId:"tenant_01",entityType:"person"};
 assert.equal(validateRelationship({tenantId:"tenant_01",relationshipId:"r1",fromEntity:a,toEntity:b,relationshipType:"employs"}).valid,true);
 assert.equal(validateRelationship({tenantId:"tenant_01",relationshipId:"r1",fromEntity:b,toEntity:a,relationshipType:"employs"}).valid,false);
});
test("agent identity requires key provider and signs tenant-bound messages",async()=>{
 const provider={algorithm:"TEST",generateKeyPair:async()=>({publicKey:"pub",keyHandle:"handle"}),sign:async()=>new Uint8Array([1]),verify:async()=>true};
 const created=await createAgentIdentity({tenantId:"tenant_01",agentId:"agent_01",provider});
 assert.equal(created.created,true);assert.equal(created.identity.status,"pending_proof_of_possession");
 const active={...created.identity,status:"active"};const signed=await signAgentMessage({identity:active,message:{action:"read"},provider});
 assert.equal(signed.signed,true);
 assert.equal((await verifyAgentMessage({signed,publicKey:"pub",provider,expectedTenantId:"tenant_01"})).valid,true);
});
test("model evaluation enforces accuracy, latency and cost budgets",()=>{
 const result=evaluateModelRun({expected:["a","b"],actual:["a","b"],latencyMs:100,costMinor:2,maxLatencyMs:200,maxCostMinor:5});
 assert.equal(result.passed,true);
 assert.equal(evaluateModelRun({expected:["a","b"],actual:["a","x"],latencyMs:100,costMinor:2,maxLatencyMs:200,maxCostMinor:5}).passed,false);
});
test("policy activation requires monotonically increasing version and independent review",()=>{
 const candidate={tenantId:"tenant_01",policyId:"p1",version:2,status:"active",enabled:true,createdBy:"admin",allowedActions:["read"]};
 assert.equal(validatePolicyVersion(candidate).valid,true);
 assert.equal(canActivatePolicy({candidate,current:{tenantId:"tenant_01",policyId:"p1",version:1},review:{approved:true,tenantId:"tenant_01",operatorId:"human"}}).allowed,true);
 assert.equal(canActivatePolicy({candidate,review:{approved:false}}).allowed,false);
});
test("payment receipt is never trusted without settlement verifier",async()=>{
 const receipt={tenantId:"tenant_01",agentId:"agent_01",amountMinor:100,currency:"USD"};
 assert.equal((await verifyPaymentReceipt({tenantId:"tenant_01",agentId:"agent_01",expectedAmountMinor:100,expectedCurrency:"USD",receipt})).verified,false);
 assert.equal((await verifyPaymentReceipt({tenantId:"tenant_01",agentId:"agent_01",expectedAmountMinor:100,expectedCurrency:"USD",receipt,provider:{verifyReceipt:async()=>({verified:true,settled:true,transactionId:"tx1",settledAtMs:10})}})).verified,true);
});
test("device attestation never clears emergency stop without separate operator and hardware ack",async()=>{
 const device={tenantId:"tenant_01",deviceId:"dev1",publicKey:"pub",keyAlgorithm:"ML-DSA-65",safetyProfileId:"safe1",status:"pending_attestation",emergencyStop:true};
 const attested=await verifyDeviceAttestation({device,attestation:{tenantId:"tenant_01",deviceId:"dev1",passed:true},verifier:{verify:async()=>true}});
 assert.equal(attested.verified,true);assert.equal(attested.device.emergencyStop,true);
 assert.equal(releaseEmergencyStop({device:attested.device,operatorApproval:{approved:true,tenantId:"tenant_01",operatorId:"human"},hardwareAcknowledgement:{safeToEnable:true,deviceId:"dev1"}}).released,true);
});
