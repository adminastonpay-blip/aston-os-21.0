export function validateProvenanceEvent(event) {
  const errors = [];
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return { valid: false, errors: ["event_must_be_an_object"] };
  }
  for (const key of ["tenantId", "artifactId", "transformation", "pipelineVersion", "actorId"]) {
    if (typeof event[key] !== "string" || !event[key].trim()) errors.push("missing_" + key);
  }
  if (!Array.isArray(event.parentArtifactIds) ||
      event.parentArtifactIds.some((id) => typeof id !== "string" || !id.trim())) {
    errors.push("invalid_parent_artifact_ids");
  }
  if (!Number.isSafeInteger(event.occurredAtMs) || event.occurredAtMs <= 0) {
    errors.push("invalid_occurred_at");
  }
  if (event.model !== undefined && (typeof event.model !== "string" || !event.model.trim())) {
    errors.push("invalid_model");
  }
  if (event.metadata !== undefined &&
      (!event.metadata || typeof event.metadata !== "object" || Array.isArray(event.metadata))) {
    errors.push("invalid_metadata");
  }
  return { valid: errors.length === 0, errors, provenanceVersion: "1.0" };
}
