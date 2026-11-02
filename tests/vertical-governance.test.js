import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkflowSnapshot, acceptApprovalEvent, resolveWorkflowTimeout } from "../src/operations/durable-workflow.js";
import { validateOfflineMissionEnvelope } from "../src/domains/edge-mission.js";
import { evaluateMaritimeCondition } from "../src/domains/maritime-safety.js";
import { authorizeSatelliteCommand } from "../src/domains/satellite-mission.js";
import { authorizeHealthDataUse } from "../src/domains/health-consent.js";

test("durable workflow requires signed approval and fails closed on timeout",()=>{
 const workflow={tenantId:"tenant_01",workflowId:"wf1",requestId:"req1",status:"approval_pending",deadlineMs:10000};
 const request={tenantId:"tenant_01",requestId:"req1",status:"pending"};
 const approval={approved:true,tenantId:"tenant_01",operatorId:"human",approvalId:"ap1",requestId:"req1",approvedAtMs:1000};
 assert.equal(validateWorkflowSnapshot(workflow).valid,true);
 assert.equal(acceptApprovalEvent({workflow,request,approval,signatureVerified:true,nowMs:2000}).accepted,true);
 assert.equal(acceptApprovalEvent({workflow,request,approval,signatureVerified:false,nowMs:2000}).accepted,false);
 assert.equal(resolveWorkflowTimeout(workflow,11000).status,"expired");
});
test("offline edge mission rejects replay and policy drift",()=>{
 const m={tenantId:"tenant_01",missionId:"m1",deviceId:"d1",commandDigest:"a".repeat(64),policyVersion:"v1",sequence:5,issuedAtMs:100,expiresAtMs:200,signatureVerified:true,localPolicyVersion:"v1"};
 assert.equal(validateOfflineMissionEnvelope(m,{tenantId:"tenant_01",lastAcceptedSequence:4,nowMs:150}).valid,true);
 assert.equal(validateOfflineMissionEnvelope(m,{tenantId:"tenant_01",lastAcceptedSequence:5,nowMs:150}).valid,false);
 assert.equal(validateOfflineMissionEnvelope({...m,localPolicyVersion:"v2"},{tenantId:"tenant_01",lastAcceptedSequence:4,nowMs:150}).valid,false);
});
test("maritime safety denies measurements outside deterministic bounds",()=>{
 const input={tenantId:"tenant_01",assetId:"mooring1",measurements:[{metric:"tension",value:80}],limits:{tension:{min:10,max:70}}};
 assert.equal(evaluateMaritimeCondition(input).decision,"deny");
 assert.equal(evaluateMaritimeCondition({...input,measurements:[{metric:"tension",value:50}],operatorApproval:{approved:true,tenantId:"tenant_01"}}).decision,"safe_candidate");
});
test("satellite command requires signature, revocation and onboard controller",()=>{
 const base={tenantId:"tenant_01",satelliteId:"sat1",command:{tenantId:"tenant_01",satelliteId:"sat1",policyVersion:"v1",executeAtMs:150,risk:"low"},window:{startsAtMs:100,endsAtMs:200},signatureVerified:true,revocationChecked:true,localPolicyVersion:"v1"};
 assert.equal(authorizeSatelliteCommand(base).authorized,true);
 assert.equal(authorizeSatelliteCommand({...base,revocationChecked:false}).authorized,false);
});
test("health data use requires explicit purpose and category consent",()=>{
 const base={tenantId:"tenant_01",subjectId:"person1",purpose:"care",dataCategories:["lab"],consent:{tenantId:"tenant_01",subjectId:"person1",status:"active",validUntilMs:1000,allowedPurposes:["care"],allowedDataCategories:["lab"]},nowMs:100};
 assert.equal(authorizeHealthDataUse(base).allowed,true);
 assert.equal(authorizeHealthDataUse({...base,purpose:"marketing"}).allowed,false);
});
