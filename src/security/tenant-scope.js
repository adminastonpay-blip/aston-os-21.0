export function createTenantContext(identity) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    return { valid: false, error: "identity_missing" };
  }
  if (identity.verified !== true) return { valid: false, error: "identity_not_verified" };
  if (typeof identity.tenantId !== "string" || !/^[a-zA-Z0-9_-]{2,80}$/.test(identity.tenantId)) {
    return { valid: false, error: "invalid_tenant_id" };
  }
  if (typeof identity.actorId !== "string" || !identity.actorId.trim()) {
    return { valid: false, error: "invalid_actor_id" };
  }
  if (!Array.isArray(identity.roles) || identity.roles.some((role) => typeof role !== "string")) {
    return { valid: false, error: "invalid_roles" };
  }
  return {
    valid: true,
    context: Object.freeze({
      tenantId: identity.tenantId,
      actorId: identity.actorId,
      roles: Object.freeze([...identity.roles]),
      clearance: identity.clearance ?? "public",
      authMethod: identity.authMethod ?? "unknown"
    })
  };
}

export function assertTenantMatch(context, record) {
  return Boolean(context && context.tenantId && record &&
    typeof record.tenantId === "string" && context.tenantId === record.tenantId);
}

// Caller must supply an identity created by a trusted authentication adapter.
