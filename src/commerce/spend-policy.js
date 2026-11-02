export function authorizeSpend(input) {
  const { tenantId, agentId, merchant, currency, amountMinor, spentTodayMinor, spentMonthMinor, policy } = input ?? {};
  const deny = (reason) => ({ decision: "deny", allowed: false, requiresApproval: false, reasons: [reason] });
  if (!tenantId || !agentId || !merchant || !currency || !policy) return deny("invalid_spend_request");
  if (policy.enabled !== true || policy.tenantId !== tenantId || policy.agentId !== agentId) return deny("policy_scope_mismatch");
  for (const n of [amountMinor, spentTodayMinor, spentMonthMinor]) {
    if (!Number.isSafeInteger(n) || n < 0) return deny("invalid_minor_unit_amount");
  }
  if (currency !== policy.currency) return deny("currency_mismatch");
  if (!Array.isArray(policy.allowedMerchants) || !policy.allowedMerchants.includes(merchant)) return deny("merchant_not_allowlisted");
  if (amountMinor > policy.perTransactionLimitMinor) return deny("per_transaction_limit_exceeded");
  if (spentTodayMinor + amountMinor > policy.dailyLimitMinor) return deny("daily_limit_exceeded");
  if (spentMonthMinor + amountMinor > policy.monthlyLimitMinor) return deny("monthly_limit_exceeded");
  if (Number.isSafeInteger(policy.approvalAboveMinor) && amountMinor >= policy.approvalAboveMinor) {
    return { decision: "approval_required", allowed: false, requiresApproval: true, reasons: ["spend_requires_human_approval"] };
  }
  return { decision: "allow", allowed: true, requiresApproval: false, reasons: [] };
}

// Amounts are integer minor units (for example, cents); this module never moves funds.
