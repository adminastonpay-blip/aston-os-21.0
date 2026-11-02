import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import { createTenantContext, assertTenantMatch } from "../src/security/tenant-scope.js";
import { validateTaskPlan } from "../src/agents/task-plan.js";
import { validateApproval } from "../src/operations/approval.js";
import { validateProvenanceEvent } from "../src/data/provenance.js";
import { createChainedDecisionEvent, verifyDecisionEventChain } from "../src/core/audit-chain.js";

test("tenant context requires verified identity and binds tenant", () => {
  assert.equal(createTenantContext({ tenantId: "tenant_01", actorId: "user_01", roles: ["operator"] }).valid, false);
  const result = createTenantContext({
    verified: true, tenantId: "tenant_01", actorId: "user_01", roles: ["operator"]
  });
  assert.equal(result.valid, true);
  assert.equal(assertTenantMatch(result.context, { tenantId: "tenant_01" }), true);
  assert.equal(assertTenantMatch(result.context, { tenantId: "tenant_02" }), false);
});

test("task plan is bounded, role checked and cycle safe", () => {
  const valid = { tasks: [
    { role: "investigator", goal: "Collect source facts", dependsOn: [] },
    { role: "verifier", goal: "Check the result", dependsOn: [0] }
  ] };
  assert.equal(validateTaskPlan(valid).valid, true);
  assert.equal(validateTaskPlan({ tasks: [
    { role: "analyst", goal: "A", dependsOn: [1] },
    { role: "analyst", goal: "B", dependsOn: [0] }
  ] }).valid, false);
  assert.equal(validateTaskPlan({ tasks: [{ role: "root", goal: "unapproved", dependsOn: [] }] }).valid, false);
});

test("approval requires an explicit, scoped, fresh, matching human decision", () => {
  const request = { tenantId: "tenant_01", requestId: "req_01", status: "pending" };
  const approval = {
    approved: true, tenantId: "tenant_01", operatorId: "human_01",
    approvalId: "approval_01", requestId: "req_01", approvedAtMs: 1_000
  };
  assert.equal(validateApproval({ request, approval, nowMs: 2_000 }).valid, true);
  assert.equal(validateApproval({ request, approval: { ...approval, tenantId: "tenant_02" }, nowMs: 2_000 }).valid, false);
  assert.equal(validateApproval({ request, approval, nowMs: 100_000_000 }).valid, false);
  assert.equal(validateApproval({ request, approval: { ...approval, approved: false }, nowMs: 2_000 }).valid, false);
});

test("provenance event requires source lineage and actor", () => {
  const valid = {
    tenantId: "tenant_01", artifactId: "artifact_01", transformation: "normalize",
    pipelineVersion: "1.0.0", actorId: "worker", parentArtifactIds: ["source_01"],
    occurredAtMs: 1_800_000_000_000, metadata: { format: "json" }
  };
  assert.equal(validateProvenanceEvent(valid).valid, true);
  assert.equal(validateProvenanceEvent({ ...valid, parentArtifactIds: "source_01" }).valid, false);
});

test("audit chain detects content changes, missing links and valid sequence", async () => {
  const base = {
    eventId: "evt_01", tenantId: "tenant_01", actorId: "agent_01",
    action: "inspect", decision: "allow", occurredAtMs: 1_800_000_000_000
  };
  const first = await createChainedDecisionEvent(base);
  const second = await createChainedDecisionEvent({
    ...base, eventId: "evt_02", action: "verify"
  }, first.eventHash);
  assert.equal((await verifyDecisionEventChain([first, second])).valid, true);
  assert.equal((await verifyDecisionEventChain([first, { ...second, action: "tampered" }])).valid, false);
  assert.equal((await verifyDecisionEventChain([second])).valid, false);
});
