export function validateApproval({ request, approval, nowMs = Date.now() }) {
  const deny = (reason) => ({ valid: false, approved: false, reasons: [reason] });
  if (!request || !approval) return deny("approval_context_missing");
  if (approval.approved !== true) return deny("not_approved");
  if (typeof approval.tenantId !== "string" || approval.tenantId !== request.tenantId) {
    return deny("tenant_scope_mismatch");
  }
  if (typeof approval.operatorId !== "string" || !approval.operatorId.trim()) {
    return deny("operator_identity_missing");
  }
  if (typeof approval.approvalId !== "string" || !approval.approvalId.trim()) {
    return deny("approval_id_missing");
  }
  if (approval.requestId !== request.requestId) return deny("request_mismatch");
  if (!Number.isSafeInteger(approval.approvedAtMs) || approval.approvedAtMs > nowMs + 60_000 ||
      nowMs - approval.approvedAtMs > 24 * 60 * 60 * 1000) {
    return deny("approval_expired_or_invalid");
  }
  if (request.status === "expired" || request.status === "cancelled" || request.status === "completed") {
    return deny("request_not_approvable");
  }
  return { valid: true, approved: true, reasons: [] };
}

// No timeout path can produce an approval. Timeout means denial/escalation outside this helper.
