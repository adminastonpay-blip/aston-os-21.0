const MAX_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export function validateDelegationClaims(claims, nowMs = Date.now()) {
  const errors = [];
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    return { valid: false, errors: ["claims_must_be_an_object"] };
  }
  for (const key of ["delegationId", "tenantId", "issuerId", "agentId"]) {
    if (typeof claims[key] !== "string" || !claims[key].trim()) errors.push("missing_" + key);
  }
  if (!Number.isSafeInteger(claims.issuedAtMs) || !Number.isSafeInteger(claims.expiresAtMs)) {
    errors.push("invalid_time_bounds");
  } else {
    if (claims.issuedAtMs > nowMs + 60_000) errors.push("issued_in_future");
    if (claims.expiresAtMs <= nowMs) errors.push("delegation_expired");
    if (claims.expiresAtMs <= claims.issuedAtMs ||
        claims.expiresAtMs - claims.issuedAtMs > MAX_TOKEN_LIFETIME_MS) errors.push("invalid_lifetime");
  }
  if (!Array.isArray(claims.allowedActions) || claims.allowedActions.length === 0 ||
      claims.allowedActions.some((x) => typeof x !== "string" || !x.trim())) {
    errors.push("invalid_allowed_actions");
  }
  if (claims.maxAmountMinor !== undefined &&
      (!Number.isSafeInteger(claims.maxAmountMinor) || claims.maxAmountMinor < 0)) {
    errors.push("invalid_spend_limit");
  }
  return { valid: errors.length === 0, errors };
}

// Signature verification is deliberately delegated to a separately reviewed crypto adapter.
// This function fails closed unless the caller supplies a result from that trusted verifier.
export function authorizeDelegatedAction({ claims, signatureVerified, tenantId, agentId, action, nowMs = Date.now() }) {
  const validation = validateDelegationClaims(claims, nowMs);
  if (!validation.valid) return { allowed: false, reasons: validation.errors };
  if (signatureVerified !== true) return { allowed: false, reasons: ["signature_not_verified"] };
  if (claims.tenantId !== tenantId || claims.agentId !== agentId) {
    return { allowed: false, reasons: ["delegation_subject_mismatch"] };
  }
  if (!claims.allowedActions.includes(action)) return { allowed: false, reasons: ["action_out_of_scope"] };
  return { allowed: true, reasons: [] };
}
