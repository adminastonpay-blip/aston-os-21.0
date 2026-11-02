import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

import { evaluatePolicy } from "../src/security/policy.js";
import { validateDelegationClaims, authorizeDelegatedAction } from "../src/security/delegation.js";
import { authorizeSpend } from "../src/commerce/spend-policy.js";
import { selectModelRoute } from "../src/ai/model-routing.js";
import { validateIngestionRequest } from "../src/data/ingestion.js";
import { validateDecisionEvent, fingerprintDecisionEvent } from "../src/core/decision-event.js";
import { evaluateSimulationCommit } from "../src/simulation/commit-gate.js";
import { evaluateMediaRights } from "../src/media/rights-policy.js";
import { evaluatePhysicalCommand } from "../src/physical/safety-interlock.js";
import { validateAgentRegistration } from "../src/agents/registry.js";
import { validateMcpToolDefinition, authorizeMcpInvocation } from "../src/interop/mcp-contract.js";
import { tokenizeSensitiveText } from "../src/security/pii.js";

const identity = {
  tenantId: "tenant_01",
  roles: ["operator"],
  clearance: "confidential",
  canCommit: true
};

test("ABAC policy allows only matching tenant, action, role and clearance", () => {
  const policy = {
    tenantId: "tenant_01", status: "active", enabled: true,
    allowedActions: ["read"], allowedResourceTypes: ["asset"],
    allowedRoles: ["operator"], minimumClearance: "internal"
  };
  const resource = { tenantId: "tenant_01", type: "asset" };
  assert.equal(evaluatePolicy({ identity, action: "read", resource, policy }).decision, "allow");
  assert.equal(evaluatePolicy({ identity, action: "delete", resource, policy }).decision, "deny");
  assert.equal(evaluatePolicy({ identity: { ...identity, tenantId: "tenant_02" }, action: "read", resource, policy }).decision, "deny");
});

test("ABAC can require a human approval without granting the action", () => {
  const result = evaluatePolicy({
    identity, action: "write", resource: { tenantId: "tenant_01", type: "asset" },
    policy: { tenantId: "tenant_01", status: "active", enabled: true, allowedActions: ["write"], requireHumanApproval: true }
  });
  assert.equal(result.decision, "approval_required");
  assert.equal(result.allowed, false);
});

test("delegation claims require trusted signature verification and exact scope", () => {
  const claims = {
    delegationId: "del_01", tenantId: "tenant_01", issuerId: "user_01", agentId: "agent_01",
    issuedAtMs: 1_000, expiresAtMs: 10_000, allowedActions: ["search"]
  };
  assert.equal(validateDelegationClaims(claims, 2_000).valid, true);
  assert.equal(authorizeDelegatedAction({
    claims, signatureVerified: false, tenantId: "tenant_01", agentId: "agent_01", action: "search", nowMs: 2_000
  }).allowed, false);
  assert.equal(authorizeDelegatedAction({
    claims, signatureVerified: true, tenantId: "tenant_01", agentId: "agent_01", action: "search", nowMs: 2_000
  }).allowed, true);
  assert.equal(authorizeDelegatedAction({
    claims, signatureVerified: true, tenantId: "tenant_02", agentId: "agent_01", action: "search", nowMs: 2_000
  }).allowed, false);
});

test("spend policy enforces allowlist and amount limits", () => {
  const base = {
    tenantId: "tenant_01", agentId: "agent_01", merchant: "api.example", currency: "USD",
    amountMinor: 500, spentTodayMinor: 100, spentMonthMinor: 200,
    policy: {
      enabled: true, tenantId: "tenant_01", agentId: "agent_01", currency: "USD",
      allowedMerchants: ["api.example"], perTransactionLimitMinor: 1000,
      dailyLimitMinor: 2000, monthlyLimitMinor: 5000, approvalAboveMinor: 900
    }
  };
  assert.equal(authorizeSpend(base).decision, "allow");
  assert.equal(authorizeSpend({ ...base, merchant: "other.example" }).decision, "deny");
  assert.equal(authorizeSpend({ ...base, amountMinor: 1000 }).decision, "approval_required");
});

test("model routing excludes wrong jurisdiction or insufficient clearance", () => {
  const candidates = [
    { id: "model_eu", enabled: true, jurisdictions: ["EU"], maxClearance: "confidential", maxCostMinor: 10, capabilities: ["chat"] },
    { id: "model_global", enabled: true, jurisdictions: ["*"], maxClearance: "internal", maxCostMinor: 1, capabilities: ["chat"] },
    { id: "model_expensive", enabled: true, jurisdictions: ["EU"], maxClearance: "secret", maxCostMinor: 50, capabilities: ["chat"] }
  ];
  assert.equal(selectModelRoute({
    candidates, jurisdiction: "EU", clearance: "confidential", budgetRemainingMinor: 20, requiredCapabilities: ["chat"]
  }).selected, "model_eu");
  assert.equal(selectModelRoute({
    candidates, jurisdiction: "US", clearance: "secret", budgetRemainingMinor: 20, requiredCapabilities: ["chat"]
  }).selected, null);
});

test("ingestion envelope validates tenant, source and idempotency key", () => {
  const valid = {
    tenantId: "tenant_01", sourceId: "erp_main", idempotencyKey: "request-00001",
    actorId: "operator_01", contentType: "text/plain", payload: "inventory event"
  };
  assert.equal(validateIngestionRequest(valid).valid, true);
  assert.equal(validateIngestionRequest({ ...valid, tenantId: "../other" }).valid, false);
  assert.equal(validateIngestionRequest({ ...valid, idempotencyKey: "x" }).valid, false);
});

test("decision event validates and creates a stable SHA-256 fingerprint", async () => {
  const event = {
    eventId: "evt_01", tenantId: "tenant_01", actorId: "agent_01",
    action: "read_asset", decision: "allow", occurredAtMs: 1_800_000_000_000,
    reasonCodes: [], sourceIds: ["source_01"]
  };
  assert.equal(validateDecisionEvent(event).valid, true);
  const a = await fingerprintDecisionEvent(event);
  const b = await fingerprintDecisionEvent({ ...event });
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.equal(a, b);
});

test("simulation commit gate requires current baseline and trusted verification", () => {
  const context = {
    identity, simulation: {
      tenantId: "tenant_01", status: "evaluated", baseVersion: 4, risk: "low"
    },
    currentResourceVersion: 4,
    verification: { passed: true, source: "trusted_verifier" }
  };
  assert.equal(evaluateSimulationCommit(context).commitEligible, true);
  assert.equal(evaluateSimulationCommit({ ...context, currentResourceVersion: 5 }).commitEligible, false);
  assert.equal(evaluateSimulationCommit({ ...context, verification: { passed: true, source: "llm" } }).commitEligible, false);
});

test("high risk simulation commit requires matching human approval", () => {
  const context = {
    identity, simulation: { tenantId: "tenant_01", status: "evaluated", baseVersion: 1, risk: "critical" },
    currentResourceVersion: 1, verification: { passed: true, source: "trusted_verifier" }
  };
  assert.equal(evaluateSimulationCommit(context).commitEligible, false);
  assert.equal(evaluateSimulationCommit({
    ...context, approval: { approved: true, tenantId: "tenant_01", operatorId: "human_01" }
  }).commitEligible, true);
});

test("media rights reject unlicensed territory and dates", () => {
  const asset = {
    tenantId: "tenant_01",
    rights: { status: "active", allowedActions: ["play"], territories: ["AR"], validFromMs: 100, validUntilMs: 500, licenseId: "lic_01" }
  };
  assert.equal(evaluateMediaRights({ identity, asset, action: "play", territory: "AR", nowMs: 200 }).allowed, true);
  assert.equal(evaluateMediaRights({ identity, asset, action: "play", territory: "US", nowMs: 200 }).allowed, false);
  assert.equal(evaluateMediaRights({ identity, asset, action: "play", territory: "AR", nowMs: 600 }).allowed, false);
});

test("physical safety interlock is deny-by-default and only returns a permit candidate", () => {
  const base = {
    identity, device: { tenantId: "tenant_01", deviceId: "robot_01", enabled: true },
    command: { action: "move", parameters: { speed: 2 }, risk: "low" },
    policy: { tenantId: "tenant_01", enabled: true, allowedActions: ["move"], numericLimits: { speed: { min: 0, max: 3 } } },
    simulation: { passed: true, deviceId: "robot_01", tenantId: "tenant_01" },
    signatureVerified: true
  };
  assert.equal(evaluatePhysicalCommand(base).permitCandidate, true);
  assert.equal(evaluatePhysicalCommand({ ...base, command: { ...base.command, parameters: { speed: 9 } } }).decision, "deny");
  assert.equal(evaluatePhysicalCommand({ ...base, signatureVerified: false }).decision, "deny");
});

test("agent registration accepts public keys only and never private keys", () => {
  const valid = {
    tenantId: "tenant_01", agentId: "agent_01", displayName: "Verifier",
    signatureAlgorithm: "ML-DSA-44", publicKey: "A".repeat(64), proofOfPossessionVerified: false
  };
  assert.equal(validateAgentRegistration(valid).valid, true);
  assert.equal(validateAgentRegistration({ ...valid, privateKey: "do-not-accept" }).valid, false);
});

test("MCP contract blocks mutating tools without mandatory approval", () => {
  const tool = {
    name: "update_asset", description: "Update an asset",
    inputSchema: { type: "object", additionalProperties: false },
    mutating: true, requiresHumanApproval: true
  };
  assert.equal(validateMcpToolDefinition(tool).valid, true);
  assert.equal(authorizeMcpInvocation({
    identity, tool, policyDecision: { allowed: true }
  }).allowed, false);
  assert.equal(authorizeMcpInvocation({
    identity, tool, policyDecision: { allowed: true },
    approval: { approved: true, signatureVerified: true, operatorId: "human_01", tenantId: "tenant_01" }
  }).allowed, true);
});

test("PII helper deterministically masks email and does not return raw text as masked", async () => {
  const secret = "test-secret-with-at-least-32-characters-long";
  const one = await tokenizeSensitiveText("Contact person@example.com", secret);
  const two = await tokenizeSensitiveText("Contact person@example.com", secret);
  assert.equal(one.masked.includes("person@example.com"), false);
  assert.equal(one.masked, two.masked);
  assert.equal(one.tokenCount, 1);
});
