const MAX_TEXT_LENGTH = 1_000_000;

export function validateIngestionRequest(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["body_must_be_an_object"] };
  }
  if (typeof input.tenantId !== "string" || !/^[a-zA-Z0-9_-]{2,80}$/.test(input.tenantId)) errors.push("invalid_tenant_id");
  if (typeof input.sourceId !== "string" || !/^[a-zA-Z0-9_-]{2,120}$/.test(input.sourceId)) errors.push("invalid_source_id");
  if (typeof input.idempotencyKey !== "string" || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 160) errors.push("invalid_idempotency_key");
  if (typeof input.actorId !== "string" || !input.actorId.trim()) errors.push("invalid_actor_id");
  if (typeof input.contentType !== "string" || !input.contentType.trim()) errors.push("invalid_content_type");
  if (typeof input.payload !== "string" || input.payload.length === 0 || input.payload.length > MAX_TEXT_LENGTH) errors.push("invalid_payload");
  return { valid: errors.length === 0, errors, limits: { maxPayloadCharacters: MAX_TEXT_LENGTH } };
}
