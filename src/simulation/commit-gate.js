export function evaluateSimulationCommit(input) {
  const { identity, simulation, currentResourceVersion, verification, approval } = input ?? {};
  const deny = (reason) => ({ commitEligible: false, reasons: [reason] });
  if (!identity || !simulation || !verification) return deny("missing_commit_context");
  if (identity.tenantId !== simulation.tenantId) return deny("tenant_scope_mismatch");
  if (simulation.status !== "evaluated") return deny("simulation_not_evaluated");
  if (!Number.isSafeInteger(simulation.baseVersion) ||
      !Number.isSafeInteger(currentResourceVersion) ||
      simulation.baseVersion !== currentResourceVersion) return deny("stale_simulation_baseline");
  if (verification.passed !== true || verification.source !== "trusted_verifier") {
    return deny("independent_verification_required");
  }
  if (identity.canCommit !== true) return deny("commit_permission_missing");
  if (simulation.risk === "high" || simulation.risk === "critical") {
    if (!approval || approval.approved !== true ||
        approval.tenantId !== identity.tenantId ||
        typeof approval.operatorId !== "string" || !approval.operatorId) {
      return deny("human_approval_required");
    }
  }
  return { commitEligible: true, reasons: [], requiresSeparateExecutionAuthorization: true };
}

// This gate never performs a database write. A separately authenticated executor must commit.
