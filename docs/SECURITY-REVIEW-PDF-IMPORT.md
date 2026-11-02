# ASTON OS 21.0 — Security review of the reference implementation

The uploaded reference is useful as an architecture blueprint. Its code samples must not be copied into a public Worker unchanged.

## Patterns deliberately not reproduced

1. **Default-allow / wildcard browser access:** the reference router uses wildcard CORS and a broad unauthenticated operational surface. ASTON OS keeps the new capabilities off the public router until authentication, origin policy and authorization are complete.
2. **Caller-supplied identity:** internal Durable Object handlers accept identity objects in JSON. Identity must be derived from a verified credential at a trusted boundary and passed through authenticated internal calls.
3. **Default tenant fallback:** falling back to a `default` tenant after failed identity parsing can collapse tenant boundaries. Missing tenant claims must be rejected.
4. **Unscoped graph and lineage queries:** graph nodes, links, document retrieval and lineage reads must be tenant-filtered and authorized on every access, not merely partitioned by naming convention.
5. **LLM-generated tool execution:** a model's tool plan is untrusted input. Every tool name, argument schema, policy, delegation, resource and approval must be checked before execution.
6. **Unbounded dependency polling:** a loop that waits indefinitely for task dependencies can consume request time and resources. Use bounded durable orchestration, explicit deadlines, cancellation and dead-letter handling.
7. **PII masking after generation:** masking the model response does not prevent the original prompt from leaving the system. Sensitive input must be classified and minimized before inference; restoration of tokens must be policy-controlled and must not expose secrets to unauthorized recipients.
8. **Automatic approval on timeout:** critical severity is not consent. A timeout or missing operator response must fail closed and escalate; it must not auto-approve a remediation.
9. **Dangerous automatic infrastructure changes:** model-suggested load-balancer changes or pool disabling require explicit deterministic policy, scope checks, human authorization and verified rollback. No such action is enabled by the new modules.
10. **Simulation commit without concurrency control:** a simulation must be tied to a specific resource version. Commit must reject stale snapshots, require independent verification and record authorization separately from an LLM evaluation.
11. **Destructive Durable Object cleanup:** deleting all state on an alarm is not a safe general retention policy. Retention must be scoped and explicitly versioned.
12. **Queue + Workflow duplicate processing:** dual dispatch needs a shared idempotency key and state machine so the same mission cannot execute twice.
13. **Global vector retrieval:** similarity results without a tenant filter can leak documents across customers. Tenant scope must be part of the index/query design and tested with negative cross-tenant cases.
14. **Secrets and placeholders in configuration:** placeholder database IDs, access audiences, team domains or secrets must not enter production. Secret material belongs in Cloudflare secrets or an approved vault, never in Git.

## Controls added in this import

- Deny-by-default policy evaluator with tenant, role, action, resource, clearance and jurisdiction conditions.
- Delegation claim validator; rejects authorization unless an independent verifier proves the signature.
- Spend policy using integer minor units and merchant allowlists; does not move funds.
- Jurisdiction- and clearance-aware model candidate selection; does not call a provider.
- Ingestion validation including tenant and idempotency metadata.
- Canonical decision event validation and SHA-256 fingerprinting.
- Simulation commit eligibility gate with version check, trusted verifier and human approval.
- Media rights/territory/time-window gate.
- Physical command safety policy gate; never directly actuates equipment.
- Agent registry contract that rejects private-key registration.
- MCP tool contract and approval gate.
- Limited deterministic PII tokenization helper.
- Additive tenant-scoped D1 schema proposal.

## Required before production

- Verify Access JWT using a maintained verifier and issuer's current key set; validate issuer, audience, expiry, not-before, algorithm, token type and tenant/role claims.
- Replace sample API-key identity with per-tenant service credentials, scoped permissions, rotation and revocation.
- Implement authenticated internal service-to-service calls and tenant-scoped bindings.
- Add request-size limits, method/path allowlists, rate limits, replay protection and strict input schemas.
- Independently validate PQC algorithm support and semantics in the selected Workers compatibility date; do not assume TypeScript casts create cryptographic support.
- Use formal threat modeling, cross-tenant negative tests, fuzzing, prompt-injection red teaming, dependency scans, backups and recovery tests.
- Require operator approvals to be authenticated, tenant-bound, one-time, time-bounded and recorded.
- Ensure all production mutations have idempotency keys, version preconditions and audit evidence.

The imported modules are contracts and policy scaffolding. They are not a security certification or a claim that every listed control is currently active.
