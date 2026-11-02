# ASTON OS 21.0

Independent, add-only Cloudflare Workers foundation for a vendor-neutral enterprise decision and trust layer. ES Modules only.

## Start locally

```bash
npm install
npm test
npm run check
python scripts/validate-migrations.py
npm run dev
```

## Current public API

- `GET /health` and `GET /v1/health` — health and binding-presence diagnostics.
- `GET /v1/meta` — release metadata.
- `GET /v1/ontology/model` — versioned ontology contract.
- `POST /v1/ontology/validate` — opt-in validation; disabled unless `ASTON_ONTOLOGY_VALIDATE_ENABLED=true`.

All newly added engines are code-level modules and provider contracts. They are not automatically exposed as public endpoints. Business writes, payment execution, media publishing, infrastructure remediation and physical commands remain disabled.

## Architecture coverage added from the 108-page reference PDF

- **Trust and identity:** ABAC, policy versioning, Access JWT verification, tenant context, delegation and approval gates.
- **Data Fabric:** source/job contracts, schema registry, tenant-scoped D1 repository, idempotency, ETL, chunking, embeddings/vector adapter, provenance and forensic journal interface.
- **Ontology:** entity and relationship validation, graph traversal, bitemporal validity and tenant isolation.
- **AI:** jurisdiction/clearance/budget-aware model routing, governed inference adapter, model evaluation, tenant-scoped RAG and managed search adapter.
- **Agents:** bounded DAG planning, task execution layers, agent identity signing interface, MCP handler and A2A message contracts.
- **Decision Twin:** isolated snapshots, simulated deltas, risk evaluation and a separate commit gate.
- **Resilience:** mission state machine, approval gates, retry/idempotency contracts and telemetry.
- **Commerce:** spend limits, x402 policy and independent payment receipt verification interface.
- **Media:** rights/territory windows, DRM license validation, recording state machine, segment integrity and audience recommendations.
- **Physical AI:** device attestation, emergency-stop release gate, safety interlock and short-lived signed permit verification interface.
- **Enterprise runtime:** tenant dispatch policy for Workers for Platforms and isolated sandbox execution policy.
- **Evidence:** SHA-256 audit chain, Decision Book signing/verifying interfaces and additive SQL proposals.

## Documentation

- [PDF implementation coverage and remaining gates](docs/PDF-IMPLEMENTATION-COVERAGE.md)
- [PDF architecture mapping](docs/ARCHITECTURE-FROM-PDF.md)
- [Security review of reference code](docs/SECURITY-REVIEW-PDF-IMPORT.md)
- [Phase 1 — Foundation](docs/PHASE-1-FOUNDATION.md)
- [Phase 2 — Ontology Engine](docs/PHASE-2-ONTOLOGY.md)
- [Phase 3 — Data Fabric](docs/PHASE-3-DATA-FABRIC.md)
- [Implementation roadmap](docs/ROADMAP-21.0.md)

## Cloudflare and production boundary

No Cloudflare resource binding or production secret was added by this implementation branch. D1 migrations 0001–0003 are proposals; CI validates them against an in-memory SQLite database only. There is no remote D1 write, Cloudflare deployment, production migration, Queue/DO/Workflow/Stream/Vectorize/Hyperdrive/AI Gateway/Workers for Platforms/Sandbox/Wallet connection, payment, media publication or actuator call.

The previous ASTON Worker and all of its bindings remain outside this repository and are not modified.

## Status language

- **Code implemented:** module exists in this repository.
- **Unit-tested:** the test suite passes for the covered behavior.
- **Provisioned:** exact Cloudflare resource and binding have been verified.
- **Staging-integrated:** end-to-end tests pass using the actual staging resource.
- **Production-enabled:** explicitly approved deployment and runtime health verified.
- **Certified:** independent assessment completed for a defined scope.

Do not interpret code scaffolding or a unit-test pass as proof of live service integration, production readiness, safety certification, or superiority over another platform.
