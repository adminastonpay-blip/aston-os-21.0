# ASTON OS 21.0 — Phase 3: Data Fabric

## Objective

Create the tenant-safe data foundation that accepts source data, validates it, tracks provenance, and makes it available to later ontology, search and decision modules without connecting unapproved production systems.

## Added groundwork

- `src/data/ingestion.js` validates tenant/source IDs, actor, content type, payload and idempotency key.
- `src/core/decision-event.js` validates the event envelope and creates a deterministic SHA-256 fingerprint.
- `migrations/0002_trust_layer.sql` proposes tenant-scoped source, ingestion-job and decision-event tables.
- The schema is additive and has not been applied to any Cloudflare database.

## Work to complete in Phase 3

1. Define versioned connector contracts with explicit source identity, tenant ownership, data classification, retention and allowed fields.
2. Add a bounded ingestion state machine: accepted → queued → processing → completed / failed / dead-letter.
3. Enforce idempotency at the tenant boundary and make retries safe.
4. Add provenance and lineage references to every normalization, transformation, embedding, model inference and output.
5. Implement tenant-filtered D1 and search adapters only after dedicated staging resources are provisioned.
6. Add R2 archival and retention policy; add Basin/Iceberg integration only after service availability, cost and access model are verified.
7. Add schema-version compatibility and replay/reconciliation procedures.
8. Add audit queries and operational metrics without exposing customer payloads or secrets.

## Acceptance criteria

- Valid payloads are accepted; malformed, oversized and cross-tenant payloads are rejected.
- Replaying an idempotency key does not create duplicate jobs or duplicate business effects.
- Every derived artifact records its source IDs, actor, transformation and schema/model version.
- Vector retrieval is tenant constrained, with explicit negative tests proving tenant A cannot retrieve tenant B data.
- Queue retries and dead-letter handling are bounded and observable.
- No credential is accepted as ordinary request payload or written to logs.
- Migration can be applied to a dedicated staging database and rolled back/recovered according to a reviewed plan.
- Tests and a staging dry-run pass before any production binding or deployment is considered.

## Not part of this phase

No production connector, database binding, Vectorize index, queue, R2 bucket, AI Search, Basin, Hyperdrive or scheduled trigger is enabled in this phase. No production schema or customer data is changed.
