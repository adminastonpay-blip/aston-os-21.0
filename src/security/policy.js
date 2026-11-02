const CLEARANCE = Object.freeze({ public: 0, internal: 1, confidential: 2, secret: 3 });

export function evaluatePolicy(input) {
  const { identity, action, resource, policy, context = {} } = input ?? {};
  const deny = (reason) => ({ decision: "deny", allowed: false, requiresApproval: false, reasons: [reason] });

  if (!identity || !resource || !policy || typeof action !== "string") return deny("invalid_policy_input");
  if (!identity.tenantId || identity.tenantId !== resource.tenantId || identity.tenantId !== policy.tenantId) {
    return deny("tenant_scope_mismatch");
  }
  if (policy.enabled !== true || policy.status !== "active") return deny("policy_not_active");
  if (!Array.isArray(policy.allowedActions) || !policy.allowedActions.includes(action)) return deny("action_not_allowed");
  if (Array.isArray(policy.allowedResourceTypes) && !policy.allowedResourceTypes.includes(resource.type)) {
    return deny("resource_type_not_allowed");
  }
  if (Array.isArray(policy.allowedRoles) &&
      !policy.allowedRoles.some((role) => Array.isArray(identity.roles) && identity.roles.includes(role))) {
    return deny("role_not_allowed");
  }

  const actualClearance = CLEARANCE[identity.clearance];
  const requiredClearance = CLEARANCE[policy.minimumClearance ?? "public"];
  if (actualClearance === undefined || requiredClearance === undefined || actualClearance < requiredClearance) {
    return deny("insufficient_clearance");
  }

  if (Array.isArray(policy.allowedJurisdictions)) {
    if (!context.jurisdiction || !policy.allowedJurisdictions.includes(context.jurisdiction)) {
      return deny("jurisdiction_not_allowed");
    }
  }
  if (Array.isArray(policy.deniedJurisdictions) && context.jurisdiction &&
      policy.deniedJurisdictions.includes(context.jurisdiction)) {
    return deny("jurisdiction_denied");
  }
  if (policy.requireHumanApproval === true) {
    return { decision: "approval_required", allowed: false, requiresApproval: true, reasons: ["human_approval_required"] };
  }
  return { decision: "allow", allowed: true, requiresApproval: false, reasons: [] };
}

export function clearanceRank(clearance) {
  return CLEARANCE[clearance] ?? -1;
}
