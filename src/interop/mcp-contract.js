const TOOL_NAME = /^[a-z][a-z0-9_]{1,63}$/;

export function validateMcpToolDefinition(tool) {
  const errors = [];
  if (!tool || typeof tool !== "object" || Array.isArray(tool)) {
    return { valid: false, errors: ["tool_must_be_an_object"] };
  }
  if (typeof tool.name !== "string" || !TOOL_NAME.test(tool.name)) errors.push("invalid_tool_name");
  if (typeof tool.description !== "string" || !tool.description.trim()) errors.push("missing_description");
  if (!tool.inputSchema || typeof tool.inputSchema !== "object" ||
      tool.inputSchema.type !== "object" || tool.inputSchema.additionalProperties !== false) {
    errors.push("strict_input_schema_required");
  }
  if (tool.mutating === true && tool.requiresHumanApproval !== true) {
    errors.push("mutating_tool_requires_human_approval");
  }
  return { valid: errors.length === 0, errors };
}

export function authorizeMcpInvocation({ identity, tool, policyDecision, approval }) {
  if (!identity || !tool || !policyDecision) return { allowed: false, reason: "invalid_invocation_context" };
  if (policyDecision.allowed !== true) return { allowed: false, reason: "policy_denied" };
  if (tool.mutating === true &&
      (!tool.requiresHumanApproval || !approval || approval.approved !== true || approval.signatureVerified !== true ||
       !approval.operatorId || approval.tenantId !== identity.tenantId)) {
    return { allowed: false, reason: "mutating_tool_approval_required" };
  }
  return { allowed: true, reason: "authorized_by_policy" };
}

// This contract is not an MCP server and exposes no network endpoint by itself.
