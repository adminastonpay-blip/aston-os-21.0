export function evaluatePhysicalCommand({ identity, device, command, policy, simulation, signatureVerified }) {
  const deny = (reason) => ({ decision: "deny", permitCandidate: false, reasons: [reason] });
  if (!identity || !device || !command || !policy) return deny("invalid_safety_context");
  if (identity.tenantId !== device.tenantId || identity.tenantId !== policy.tenantId) return deny("tenant_scope_mismatch");
  if (policy.enabled !== true || device.enabled !== true) return deny("safety_interlock_disabled");
  if (device.emergencyStop === true || policy.emergencyStop === true) return deny("emergency_stop_active");
  if (signatureVerified !== true) return deny("command_signature_not_verified");
  if (typeof command.action !== "string" || !Array.isArray(policy.allowedActions) ||
      !policy.allowedActions.includes(command.action)) return deny("command_not_allowlisted");
  if (!command.parameters || typeof command.parameters !== "object" || Array.isArray(command.parameters)) {
    return deny("invalid_command_parameters");
  }
  const limits = policy.numericLimits ?? {};
  for (const [key, value] of Object.entries(command.parameters)) {
    const bound = limits[key];
    if (!bound || !Number.isFinite(value) ||
        !Number.isFinite(bound.min) || !Number.isFinite(bound.max) ||
        value < bound.min || value > bound.max) return deny("physical_limit_exceeded:" + key);
  }
  if (!simulation || simulation.passed !== true ||
      simulation.deviceId !== device.deviceId ||
      simulation.tenantId !== identity.tenantId) return deny("verified_simulation_required");
  if (["high", "critical"].includes(command.risk) &&
      (!command.approval || command.approval.approved !== true || command.approval.signatureVerified !== true ||
       command.approval.tenantId !== identity.tenantId || !command.approval.operatorId)) {
    return { decision: "approval_required", permitCandidate: false, reasons: ["human_approval_required"] };
  }
  return {
    decision: "allow_candidate",
    permitCandidate: true,
    reasons: [],
    executionTokenRequired: true,
    failClosed: true
  };
}

// No actuator call, token signing, emergency-stop guarantee, or real-time safety certification is implemented here.
