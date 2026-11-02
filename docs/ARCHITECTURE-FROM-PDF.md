# ASTON OS 21.0 — Architecture mapped from the 108-page reference

## Purpose

This document maps the uploaded **Aston OS. 21.0.pdf** into the independent `adminastonpay-blip/aston-os-21.0` repository. It preserves the reference's architecture and intended capabilities while separating implemented, proposed, and externally provisioned components.

ASTON OS is designed as a vendor-neutral decision and trust layer. It governs identities, policies, decisions, simulations, execution approvals, data lineage, and evidence across cloud services and business domains. It does not own or replace every model, database, media service, payment rail, robot controller, or customer system.

## Current repository boundary

- This is an independent ASTON OS 21.0 repository.
- The existing ASTON Worker and its bindings remain outside this repository and must not be changed by this plan.
- `wrangler.toml` remains intentionally minimal. No production binding, secret, Durable Object migration, queue, or resource identifier was added.
- The SQL file `migrations/0002_trust_layer.sql` is an additive proposal only. It has not been applied to D1.
- No production deployment, billing, media delivery, external payment, or physical command has been enabled.
- New modules are pure policy/validation contracts unless stated otherwise. They are not yet wired into the Worker router.

## Architecture layers

### 0. Trust root and identity

Reference concepts: Cloudflare Access identity, tenant and actor identities, ABAC, public-key identity for agents, ML-DSA signatures, ML-KEM key establishment, delegation tokens, and post-quantum migration.

Repository modules:
- `src/agents/registry.js`: validates an agent registration request, accepts public-key material only, and marks registration pending proof/review.
- `src/security/delegation.js`: validates delegation claim shape, expiry, tenant, agent and action scope. It refuses authorization unless an independent cryptographic verifier has confirmed the signature.
- `src/security/policy.js`: tenant-bound, deny-by-default authorization decisions.

Not yet implemented: key generation/storage lifecycle, signature verification adapter, revocation registry, hardware-backed key protection, hybrid ML-KEM channel establishment, device attestation, or a production identity provider integration. Do not claim that these modules currently provide post-quantum protection.

### 1. Sovereign inference and AI governance

Reference concepts: AI Gateway, dynamic routing, model fallback, jurisdiction-aware inference, data-loss prevention, PII tokenization, Workers AI, and lightweight decision classifiers such as Clef.

Repository modules:
- `src/ai/model-routing.js`: selects only from explicitly supplied model candidates that satisfy jurisdiction, clearance, budget and required-capability constraints.
- `src/security/pii.js`: limited deterministic masking for selected data patterns.
- `src/security/policy.js`: shared decision policy contract.

Not yet implemented: Cloudflare AI Gateway configuration, live model/provider adapters, automatic failover, real DLP engine, Clef classifier, model evaluation suite, prompt-injection controls, provider residency verification, or cost metering. A candidate model list must come from an administratively approved inventory, not from an LLM.

### 2. Data Fabric, ingestion and lineage

Reference concepts: ETL, asynchronous queues, D1 metadata, Vectorize or AI Search, R2, Hyperdrive/Postgres, Basin/Apache Iceberg, provenance, and bitemporal records.

Repository modules:
- `src/data/ingestion.js`: validates tenant-scoped source, actor, payload, content type and idempotency metadata.
- `src/core/decision-event.js`: validates a canonical decision event and creates a SHA-256 fingerprint.
- `migrations/0002_trust_layer.sql`: proposes tenant-scoped source, ingestion-job, decision-event and evidence tables.

Not yet implemented: queue dispatch/consumer, D1 adapter, vector search, document parsing, AI Search adapter, R2 journal writer, Iceberg/Basin pipeline, hash-chain anchoring, retention lifecycle, source connectors, schema registry, retry/dead-letter handling, and reconciliation. A SHA-256 fingerprint is not by itself a tamper-proof immutable ledger; append-only permissions, externally anchored hashes, retention controls, and independent verification are still required.

### 3. Ontology and graph

The existing Phase 2 code provides the first versioned ontology contract for organizations, people, assets and events, plus declared relationships and disabled write actions. It also contains a tenant-scoped D1 migration proposal.

The reference's graph resolver, relationship traversal, impact analysis and bitemporal model are future implementation targets. They must use authenticated tenant scope on every read and write, tenant-scoped graph records, bounded traversal, query limits, and version checks. A tenant-specific Durable Object name alone is not a substitute for authorization and database scoping.

### 4. Agent governance and orchestration

Reference concepts: Supervisor, investigator/analyst/verifier/executor roles, task graph, delegated authority, MCP and multi-agent planning.

Repository modules:
- `src/interop/mcp-contract.js`: validates strict MCP-style tool definitions and requires human approval for mutating tools.
- `src/agents/registry.js` and `src/security/delegation.js`: registration and delegation contracts.
- `src/security/policy.js`: policy gate.

Not yet implemented: agent runtime, durable task scheduler, MCP server/client, A2A transport, bounded planner, tool-call schema validation at runtime, execution sandbox, budgets, cancellation, retry budgets, agent audit and independent signature verification. Tool calls must be treated as untrusted proposals until authenticated, schema-validated and authorized.

### 5. Decision Twin and verified execution

Reference concepts: isolated snapshots, proposed deltas, evaluation, independent verification, and a commit only after authorization and approval.

Repository module:
- `src/simulation/commit-gate.js`: checks tenant, evaluated status, resource version, independent verifier result, commit permission, and human approval for high/critical risk.

The module does not commit data. A future executor must re-read the resource and enforce optimistic concurrency, idempotency, transaction boundaries, immutable approval records and replay protection. Simulation state must be isolated from production state. No AI-generated evaluation alone is sufficient evidence to commit.

### 6. Physical AI safety

Reference concepts: SafetyInterlock, device identity, emergency stop, physical limits, simulation, signed short-lived execution permits and human approval.

Repository module:
- `src/physical/safety-interlock.js`: deterministic policy checks for tenant/device, emergency stop state, action allowlist, numeric parameter bounds, signature-verification result, trusted simulation and approval.

This is a policy gate, not a certified safety controller. It does not issue signed permits, control an actuator, guarantee a latency bound, implement a hardware emergency stop, or meet a robotics safety standard. Real deployments require independent safety engineering, hardware fail-safe design, ROS 2/PLC integration, hazard analysis and certification testing. Cloud services must never be the sole emergency stop path.

### 7. Agentic commerce and financial governance

Reference concepts: delegated agent authority, spend budgets, merchant allowlists, Wallets, x402 and monetization.

Repository module:
- `src/commerce/spend-policy.js`: evaluates spend requests using integer minor-unit amounts, merchant allowlists, currency, per-transaction, daily and monthly caps, and approval thresholds.

No wallet binding, signing, payment execution, stablecoin settlement, x402 endpoint, billing account, or financial key is connected. This module only evaluates a policy. Amounts and merchant identity must be verified by a trusted payment adapter before any eventual execution.

### 8. Media, streaming and rights governance

Reference concepts: Stream live/VOD, Streamline, media transformations, generated clips, audience recommendations, DRM packaging/license proxy and territory-based content rights.

Repository module:
- `src/media/rights-policy.js`: checks asset tenant, licensed action, territory, validity window and derivative approval.

Not yet implemented: Cloudflare Stream integration, upload/recording, live ingest, transcode, R2 media storage, DRM, license proxy, signed playback URLs, AI media generation, subtitles, audience analytics or recommendation. Rights authorization is a precondition, not a DRM license.

### 9. Resilience, missions and durable operations

Reference concepts: Durable Objects for hot state, Queues and DLQs, Workflows with human approval, mission journaling, recovery operations and observability.

These remain future modules. Any remediation or infrastructure control must fail closed on timeout or ambiguity. A missing approval, Workflow timeout, unavailable model, or invalid output must never be interpreted as consent. Recovery must be idempotent, reversible where possible, and approved against a target inventory.

### 10. Multi-tenant isolation and customer environments

Reference concepts: Workers for Platforms, Dispatch Namespaces and tenant-specific deployments.

No Workers for Platforms binding or dispatch namespace is configured. Logical tenant checks in pure modules do not equal physical tenant isolation. The deployment topology, per-tenant data partitions, quotas, secrets and abuse boundaries must be designed and tested before selling tenant isolation as a product feature.

### 11. Compliance, evidence and vertical adapters

Reference concepts: audit evidence, AIUC-1, SOC 2, ISO 27001, NIST Zero Trust, FedRAMP, regulated health/energy/space/robotics, and sovereignty requirements.

The new SQL proposal contains a compliance evidence register, but no certification is claimed. Certifications apply to a defined organization, scope, controls, operating procedures, evidence and independent assessment; hosting on an accredited platform does not certify ASTON OS automatically. Each vertical requires its own data classification, legal review, safety constraints and domain validation.

## Cloudflare resource inventory required before runtime integration

The reference names these primitives. None should be added to `wrangler.toml` until the resource is confirmed to exist and is intended for this new Worker:

| Capability | Candidate Cloudflare resource | Binding / configuration still required |
|---|---|---|
| Model inference | Workers AI / AI Gateway | AI binding, gateway ID, approved model inventory |
| Semantic search | Vectorize or AI Search | index details, dimensions/schema, tenant filtering |
| Operational metadata | D1 | dedicated database ID and migration plan |
| Content / audit archive | R2 | bucket name and immutable-retention strategy |
| Policy cache | KV / KV Instant if account-supported | namespace ID and consistency model |
| Asynchronous ingestion | Queues and DLQs | producer/consumer names, retry and dead-letter policy |
| Durable state | Durable Objects | namespace bindings, class names and additive migration tags |
| Long-running approvals | Workflows | workflow name, class and event authorization |
| Historical analytical lake | Basin / Iceberg or Hyperdrive/Postgres | product availability, IDs, schema, query path |
| Tenant runtime isolation | Workers for Platforms | dispatch namespace, untrusted settings, tenant lifecycle |
| Streaming | Cloudflare Stream | account entitlement, Stream configuration and rights integration |
| Isolated execution | Sandboxes / Containers | availability, isolation, egress and cost limits |
| Financial rails | Wallets / x402 | account and legal controls, signing keys, limits, settlement policy |
| External agent tools | MCP / Agents SDK | protocol implementation, OAuth, tool schema and policy enforcement |

This table is an inventory checklist, not a declaration that the current Cloudflare account has these products enabled or that every named item is GA or appropriate for the current plan.

## Recommended implementation sequence

1. **Foundation and ontology** — already present as Phase 1 and Phase 2 code; execution checks still pending.
2. **Data Fabric** — source registry, ingestion contracts, idempotency, provenance, queue adapter, tenant-filtered search and event archive.
3. **Trust Layer** — authenticated identity, delegated authority, ABAC policy lifecycle, DLP and independent cryptographic verification.
4. **Agent governance** — bounded orchestrator, MCP interfaces, tool registry, sandbox-only execution and auditable approvals.
5. **Decision Twin** — isolated simulations, independent verifier, optimistic commit gate and rollback plan.
6. **Sovereign inference** — model inventory, jurisdiction policy, approved gateway routes, evaluation and cost accounting.
7. **Domain extensions** — media rights/streaming, agentic commerce, physical AI, health, energy and space as separate adapters.
8. **Enterprise validation** — tenant isolation tests, threat model, load tests, recovery exercises, independent security review and certification evidence.

## Status language

- **Implemented in code:** a module exists in this repository and has been re-read from GitHub.
- **Tested:** only after a test command or CI job has actually executed and passed.
- **Provisioned:** only after the resource exists in Cloudflare and its binding has been verified.
- **Deployed:** only after the deployment result and runtime health are checked.
- **Certified:** only after the relevant external assessment has been completed.

Do not describe a designed or proposed capability as deployed, production-ready, certified, or superior to a named competitor.
