# ASTON OS 21.0

Independent Cloudflare Workers foundation. ES Modules only.

## Start

```bash
npm install
npm test
npm run check
npm run dev
```

## Endpoints
- `GET /health` — runtime health and binding-presence diagnostics.
- `GET /v1/health` — same health contract under the versioned API.
- `GET /v1/meta` — release metadata.

## Important
No production bindings, Durable Object migrations, or secrets are configured in this starter. Do not connect this Worker to production until the existing resource inventory, authentication, tenant isolation, and staging validation are complete.

See [Phase 1 Foundation](docs/PHASE-1-FOUNDATION.md).
