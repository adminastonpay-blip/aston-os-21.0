const MODEL_VERSION = "1.0.0";
const ENTITY_TYPES = Object.freeze({
  organization: { description: "A tenant or business organization represented in ASTON.", required: ["name"], properties: { name: "string", externalRef: "string", industry: "string", status: "string" } },
  person: { description: "A person record owned by an organization.", required: ["displayName"], properties: { displayName: "string", externalRef: "string", role: "string" } },
  asset: { description: "A physical or digital asset owned or managed by an organization.", required: ["name"], properties: { name: "string", externalRef: "string", category: "string", status: "string" } },
  event: { description: "A timestamped business or operational event.", required: ["eventType", "occurredAt"], properties: { eventType: "string", occurredAt: "string", source: "string" } }
});
const RELATIONSHIP_TYPES = Object.freeze({
  employs: { from: "organization", to: "person" },
  owns: { from: "organization", to: "asset" },
  assigned_to: { from: "asset", to: "person" },
  generated: { from: "organization", to: "event" },
  relates_to: { from: "*", to: "*" }
});
const ACTION_TYPES = Object.freeze({
  create_entity: { mode: "write", requiresAuthorization: true, enabled: false },
  update_entity: { mode: "write", requiresAuthorization: true, enabled: false },
  link_entities: { mode: "write", requiresAuthorization: true, enabled: false },
  archive_entity: { mode: "write", requiresAuthorization: true, enabled: false }
});
export function getOntologyModel() {
  return {
    modelVersion: MODEL_VERSION, status: "foundation",
    tenantIsolation: "tenant_id_required_on_all_persisted_records",
    entityTypes: ENTITY_TYPES, relationshipTypes: RELATIONSHIP_TYPES, actions: ACTION_TYPES,
    guarantees: [
      "Every persisted object is scoped to one tenant.",
      "Entity and relationship identifiers are unique within a tenant.",
      "Writes remain disabled until authentication and authorization are active.",
      "Schema changes are versioned and migration-backed."
    ]
  };
}
export function validateOntologyEntity(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return { valid: false, errors: ["body_must_be_an_object"] };
  const { tenantId, entityType, entityId, properties } = input;
  if (typeof tenantId !== "string" || !/^[a-zA-Z0-9_-]{2,80}$/.test(tenantId)) errors.push("invalid_tenant_id");
  if (typeof entityId !== "string" || !/^[a-zA-Z0-9_-]{2,120}$/.test(entityId)) errors.push("invalid_entity_id");
  const definition = ENTITY_TYPES[entityType];
  if (!definition) errors.push("unknown_entity_type");
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) errors.push("properties_must_be_an_object");
  else if (definition) {
    for (const key of definition.required) if (typeof properties[key] !== "string" || !properties[key].trim()) errors.push("missing_required_property:" + key);
    for (const [key, value] of Object.entries(properties)) {
      if (!(key in definition.properties)) errors.push("unknown_property:" + key);
      else if (typeof value !== definition.properties[key]) errors.push("invalid_property_type:" + key);
    }
  }
  return { valid: errors.length === 0, errors, modelVersion: MODEL_VERSION };
}
