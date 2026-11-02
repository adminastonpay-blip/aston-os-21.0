# ASTON OS 21.0 — Phase 1 Foundation

## Scope
- ES Modules-only Worker entrypoint.
- Minimal versioned HTTP surface: `/health`, `/v1/health`, `/v1/meta`.
- Security response headers and request correlation ID.
- Runtime binding presence checks that never reveal secret values.
- Node built-in tests; no external service required for the starter tests.

## Safety boundary
This repository is independent from the existing ASTON production Worker. The initial Wrangler configuration intentionally declares no D1, KV, R2, AI, Queue, Vectorize, or Durable Object bindings and no migrations. This avoids accidentally creating, renaming, or disconnecting production resources.

## Required inventory before binding integration
Record each existing binding's exact Cloudflare binding name, resource identifier, class name (for Durable Objects), migration history, environment, and current Worker association. Do not copy secret values into Git.

## Security work still required before production
Authentication/JWT verification, tenant authorization, rate limiting, audit persistence, origin allowlisting, schema validation, abuse controls, and threat-model review must be implemented and tested before exposing business endpoints. The starter health route is diagnostic, not an authenticated business API.

## Validation
Run `npm test`, `npm run check`, and `npx wrangler deploy --dry-run` in a controlled environment. A dry run is not a production deployment.
