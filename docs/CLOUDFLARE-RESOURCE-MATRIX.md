# ASTON OS 21.0 — Cloudflare resource and binding matrix

This is a provisioning checklist for the **new ASTON OS 21.0 Worker only**. It is not permission to reuse, rename, delete, or modify any resource bound to the previous ASTON Worker.

| PDF capability | Proposed binding / resource | Required setup before wiring |
|---|---|---|
| Workers AI | `AI` | Confirm account entitlement, approved model IDs and Gateway routing |
| AI Gateway | Gateway ID in secret-free config | Create gateway/routes, configure jurisdiction and fallback policy |
| AI Search | Provider adapter; binding name to confirm | Confirm product/account availability, index schema and tenant filter support |
| Vectorize | `VECTORIZE` | Create index with embedding dimensions and mandatory tenant metadata |
| D1 hot metadata | `DB` | Create a dedicated database for this repo and verify its database ID |
| Hyperdrive / PostgreSQL | `HYPERDRIVE` | Create dedicated connection and review egress, credentials and bitemporal schema |
| R2 forensic journal | `JOURNAL` | Create bucket and configure retention, access controls and external hash anchoring |
| ETL Queue | `ETL_QUEUE` | Create producer, consumer, retries and dead-letter queue |
| Mission Queue | `MISSIONS` | Create producer, consumer, retries and dead-letter queue |
| Dead-letter queues | `ETL_DLQ`, `MISSIONS_DLQ` | Create and define redrive/reconciliation operations |
| Durable session memory | `SESSION` | Create namespace and additive SQLite migration |
| Graph resolver | `GRAPH` | Create namespace, per-tenant identity strategy and migration |
| Agent supervisor | `SUPERVISOR` | Create namespace and bounded orchestration state model |
| Agent runtime | `AGENT` | Create namespace and isolated tool execution controls |
| Decision Twin | `SIMULATION` | Create namespace; isolate snapshots from production and enforce version checks |
| Mission journal | `MISSION` | Create namespace and retention/recovery policy |
| Durable approvals | `RECOVERY_WF` | Create Workflow binding and authenticated approval event path |
| Tenant runtime isolation | `DISPATCHER` (proposed) | Provision Workers for Platforms dispatch namespace and untrusted scripts |
| Sandbox execution | `SANDBOX` (provider adapter) | Confirm product availability, egress controls, CPU/time quotas and secrets isolation |
| Streaming | `STREAM` (provider adapter) | Confirm Stream account entitlement, ingest/playback APIs and rights enforcement |
| Wallet / x402 | `WALLETS` (provider adapter) | Account setup, legal review, custody, limits, receipts and settlement reconciliation |
| Basin / Iceberg | `BASIN` (provider adapter) | Confirm product availability, catalog/table permissions and query model |
| KV Instant | `KV_INSTANT` (provider adapter) | Confirm entitlement, consistency and cache invalidation semantics |

## Binding rules

1. The names above are proposals for ASTON OS 21.0, not current binding declarations.
2. No placeholder IDs, account IDs, credentials, or secrets are to be committed to Git.
3. Add bindings only after the exact resource is created for this repository and verified in a dedicated staging environment.
4. Use Cloudflare secrets for credentials. Never place secret values in `wrangler.toml`, D1 rows, adapter manifests, logs, or Git history.
5. Do not edit the previous ASTON Worker or its Durable Object bindings/migrations as part of this project.
6. A binding-presence boolean is diagnostic only. It does not prove authorization, service health, tenant isolation, billing readiness, or data durability.
7. Before production, run tenant-crossing negative tests, backup/restore, failure/retry, rate/abuse, and rollback exercises.

## Resource provisioning status

At the time this checklist was added, this implementation branch has not created or connected any of these Cloudflare resources. No remote D1 migration or Worker deployment has occurred.
