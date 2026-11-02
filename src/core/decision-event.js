const REQUIRED_TEXT = ["eventId", "tenantId", "actorId", "action", "decision"];

function canonicalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non_finite_number");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") throw new TypeError("unsupported_event_value");
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] === undefined) throw new TypeError("undefined_event_value");
    out[key] = canonicalize(value[key]);
  }
  return out;
}

export function validateDecisionEvent(event) {
  const errors = [];
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return { valid: false, errors: ["event_must_be_an_object"] };
  }
  for (const key of REQUIRED_TEXT) {
    if (typeof event[key] !== "string" || !event[key].trim()) errors.push("missing_" + key);
  }
  if (!Number.isSafeInteger(event.occurredAtMs) || event.occurredAtMs <= 0) errors.push("invalid_occurredAtMs");
  if (!["allow", "deny", "approval_required", "executed", "failed"].includes(event.decision)) errors.push("invalid_decision");
  if (event.reasonCodes !== undefined && (!Array.isArray(event.reasonCodes) || event.reasonCodes.some((x) => typeof x !== "string"))) errors.push("invalid_reason_codes");
  if (event.sourceIds !== undefined && (!Array.isArray(event.sourceIds) || event.sourceIds.some((x) => typeof x !== "string"))) errors.push("invalid_source_ids");
  return { valid: errors.length === 0, errors, eventVersion: "1.0" };
}

export async function fingerprintDecisionEvent(event) {
  const validation = validateDecisionEvent(event);
  if (!validation.valid) throw new TypeError(validation.errors.join(","));
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalize(event)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
