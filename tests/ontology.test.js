import test from "node:test";
import assert from "node:assert/strict";
import { getOntologyModel, validateOntologyEntity } from "../src/ontology/model.js";

test("ontology model exposes versioned types, relations and disabled actions", () => {
  const model = getOntologyModel();
  assert.equal(model.modelVersion, "1.0.0");
  assert.ok(model.entityTypes.organization);
  assert.ok(model.relationshipTypes.owns);
  assert.equal(model.actions.create_entity.enabled, false);
});

test("valid tenant-scoped asset passes validation", () => {
  const result = validateOntologyEntity({ tenantId: "tenant_01", entityId: "asset_01", entityType: "asset", properties: { name: "Warehouse", category: "logistics" } });
  assert.equal(result.valid, true);
});

test("invalid tenant and unknown property are rejected", () => {
  const result = validateOntologyEntity({ tenantId: "../other", entityId: "asset_01", entityType: "asset", properties: { name: "Warehouse", secretField: "no" } });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("invalid_tenant_id"));
  assert.ok(result.errors.includes("unknown_property:secretField"));
});

test("missing required fields are rejected", () => {
  const result = validateOntologyEntity({ tenantId: "tenant_01", entityId: "event_01", entityType: "event", properties: { source: "api" } });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("missing_required_property:eventType"));
});
