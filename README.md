# ASTON OS 21.0

Independent, add-only Cloudflare Workers foundation for a vendor-neutral enterprise decision and trust layer. ES Modules only.

## Start

```bash
npm install
npm test
npm run check
npm run dev
```

## Current API surface

- `GET /health` — runtime health and binding-presence diagnostics.
- `GET /v1/health` — same health contract under the versioned API.
- `GET /v1/meta` — release metadata.
- `GET /v1/ontology/model` — versioned ontology contract.
- `POST /v1/ontology/validate` — opt-in payload validation; disabled unless `ASTON_ONTOLOGY_VALIDATE_ENABLED=true`.

New Trust Layer modules are policy/validation contracts, not public API routes. No business write endpoint has been activated.

## Added from the ASTON OS 21.0 reference PDF

- Tenant-scoped deny-by-default ABAC policy evaluation and verified-identity tenant context.
- Agent registration, bounded task-plan validation, delegation claim validation and fail-closed approvals.
- Spend policy controls for agent commerce (no payment execution).
- Jurisdiction/clearance/budget-aware model routing policy (no live model adapter).
- Tenant-safe ingestion envelope, provenance validation and idempotency metadata.
- Canonical decision events, SHA-256 fingerprints and verifiable audit-chain helpers.
- Simulation commit gate with resource version check, independent verification and approval.
- Media rights, territory and validity-window gate.
- Physical AI safety interlock policy (no actuator control).
- MCP tool contract and approval gate (not an MCP server).
- Limited deterministic PII tokenization helper.
- Additive D1 schema proposal for Data Fabric, policy, agents, spend, simulation, safety, media, MCP and compliance evidence.
- Automated Node test workflow without deployment steps.

## Architecture and safety documents

- [Phase 1 — Foundation](docs/PHASE-1-FOUNDATION.md)
- [Phase 2 — Ontology Engine](docs/PHASE-2-ONTOLOGY.md)
- [Phase 3 — Data Fabric](docs/PHASE-3-DATA-FABRIC.md)
- [PDF architecture mapping](docs/ARCHITECTURE-FROM-PDF.md)
- [Security review of reference code](docs/SECURITY-REVIEW-PDF-IMPORT.md)
- [ASTON OS 21.0 implementation roadmap](docs/ROADMAP-21.0.md)

## Cloudflare / production boundary

No production bindings, Durable Object migrations, queues, secrets, D1 databases, Vectorize indexes, R2 buckets, Workflows, Hyperdrive, Stream, Workers for Platforms, Sandboxes, Wallets or AI Gateway routes are configured by this change. The new SQL migration is a proposal only and has not been applied.

The existing ASTON production Worker and its bindings are separate and are not modified by this repository. Do not deploy production or connect existing resources until a binding inventory, dedicated staging environment, authentication review, isolation tests and dry-run approval are complete.

## Implementation status

Code being present in GitHub does not mean that it is tested, provisioned or deployed. Run the tests and controlled staging checks before enabling any capability. No certification or competitor-performance claim is made.
