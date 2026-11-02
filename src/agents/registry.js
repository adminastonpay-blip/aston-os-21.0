const SUPPORTED_SIGNATURE_ALGORITHMS = new Set(["ML-DSA-44", "ML-DSA-65", "Ed25519"]);

export function validateAgentRegistration(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["registration_must_be_an_object"] };
  }
  if (typeof input.tenantId !== "string" || !input.tenantId.trim()) errors.push("invalid_tenant_id");
  if (typeof input.agentId !== "string" || !/^[a-zA-Z0-9_-]{2,120}$/.test(input.agentId)) errors.push("invalid_agent_id");
  if (typeof input.displayName !== "string" || !input.displayName.trim()) errors.push("invalid_display_name");
  if (typeof input.signatureAlgorithm !== "string" ||
      !SUPPORTED_SIGNATURE_ALGORITHMS.has(input.signatureAlgorithm)) errors.push("unsupported_signature_algorithm");
  if (typeof input.publicKey !== "string" || input.publicKey.length < 32 || input.publicKey.length > 16_384) {
    errors.push("invalid_public_key");
  }
  if (Object.hasOwn(input, "privateKey")) errors.push("private_key_must_never_be_registered");
  return {
    valid: errors.length === 0,
    errors,
    initialStatus: input.proofOfPossessionVerified === true ? "pending_review" : "pending_proof_of_possession",
    privateKeyStorage: "never_store_private_keys_in_aston"
  };
}
