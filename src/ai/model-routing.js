import { clearanceRank } from "../security/policy.js";

export function selectModelRoute({ candidates, jurisdiction, clearance, budgetRemainingMinor, requiredCapabilities = [], preferredModel }) {
  if (!Array.isArray(candidates) || candidates.length === 0) return { selected: null, reason: "no_models_configured" };
  if (!jurisdiction || clearanceRank(clearance) < 0 ||
      !Number.isSafeInteger(budgetRemainingMinor) || budgetRemainingMinor < 0) {
    return { selected: null, reason: "invalid_routing_context" };
  }
  const eligible = candidates.filter((model) => {
    if (!model || typeof model.id !== "string" || model.enabled !== true) return false;
    if (!Array.isArray(model.jurisdictions) ||
        !(model.jurisdictions.includes("*") || model.jurisdictions.includes(jurisdiction))) return false;
    if (clearanceRank(model.maxClearance ?? "public") < clearanceRank(clearance)) return false;
    if (!Number.isSafeInteger(model.maxCostMinor) || model.maxCostMinor > budgetRemainingMinor) return false;
    return requiredCapabilities.every((capability) =>
      Array.isArray(model.capabilities) && model.capabilities.includes(capability));
  });
  eligible.sort((a, b) => {
    if (a.id === preferredModel) return -1;
    if (b.id === preferredModel) return 1;
    return a.maxCostMinor - b.maxCostMinor;
  });
  return eligible.length
    ? { selected: eligible[0].id, reason: "policy_eligible", fallbackCandidates: eligible.slice(1).map((x) => x.id) }
    : { selected: null, reason: "no_policy_eligible_model" };
}
