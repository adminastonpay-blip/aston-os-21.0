export function evaluateMediaRights({ identity, asset, action, territory, nowMs = Date.now() }) {
  const deny = (reason) => ({ allowed: false, reasons: [reason] });
  if (!identity || !asset || typeof action !== "string") return deny("invalid_rights_context");
  if (!identity.tenantId || identity.tenantId !== asset.tenantId) return deny("tenant_scope_mismatch");
  const rights = asset.rights;
  if (!rights || rights.status !== "active") return deny("rights_not_active");
  if (!Array.isArray(rights.allowedActions) || !rights.allowedActions.includes(action)) return deny("action_not_licensed");
  if (!territory || !Array.isArray(rights.territories) ||
      !(rights.territories.includes("*") || rights.territories.includes(territory))) {
    return deny("territory_not_licensed");
  }
  if (!Number.isSafeInteger(rights.validFromMs) || !Number.isSafeInteger(rights.validUntilMs) ||
      nowMs < rights.validFromMs || nowMs >= rights.validUntilMs) return deny("outside_license_window");
  if (["clip", "edit", "generate_derivative"].includes(action) && rights.derivativeApprovalRequired &&
      rights.derivativeApproved !== true) return deny("derivative_approval_required");
  return { allowed: true, reasons: [], licenseId: rights.licenseId ?? null };
}

// This is a policy check only; it does not issue playback URLs, DRM licenses, or Stream tokens.
