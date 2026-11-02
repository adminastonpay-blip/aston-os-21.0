import { json, withSecurityHeaders } from "./core/http.js";
import { getRuntimeCapabilities } from "./core/capabilities.js";
import { getOntologyModel, validateOntologyEntity } from "./ontology/model.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const requestId = request.headers.get("cf-ray") || crypto.randomUUID();
    let response;

    if (request.method === "OPTIONS") {
      response = new Response(null, { status: 204, headers: corsHeaders(env) });
    } else if ((url.pathname === "/health" || url.pathname === "/v1/health") && request.method === "GET") {
      response = json({
        ok: true,
        service: "ASTON OS",
        version: env.ASTON_RELEASE || "21.0.0",
        runtime: "cloudflare-workers",
        environment: env.ASTON_ENV || "unknown",
        capabilities: getRuntimeCapabilities(env),
        request_id: requestId
      });
    } else if (url.pathname === "/v1/meta" && request.method === "GET") {
      response = json({ service: "ASTON OS", api_version: "v1", release: env.ASTON_RELEASE || "21.0.0" });
    } else if (url.pathname === "/v1/ontology/model" && request.method === "GET") {
      response = json({ ok: true, ontology: getOntologyModel(), request_id: requestId });
    } else if (url.pathname === "/v1/ontology/validate" && request.method === "POST") {
      if (env.ASTON_ONTOLOGY_VALIDATE_ENABLED !== "true") {
        response = json({ ok: false, error: "FEATURE_DISABLED", request_id: requestId }, 404);
      } else {
        try {
          const input = await request.json();
          const validation = validateOntologyEntity(input);
          response = validation.valid
            ? json({ ok: true, validation, request_id: requestId })
            : json({ ok: false, error: "ONTOLOGY_VALIDATION_FAILED", validation, request_id: requestId }, 400);
        } catch {
          response = json({ ok: false, error: "INVALID_JSON", request_id: requestId }, 400);
        }
      }
    } else {
      response = json({ ok: false, error: "NOT_FOUND", request_id: requestId }, 404);
    }

    response = withSecurityHeaders(response);
    const headers = new Headers(response.headers);
    headers.set("x-aston-request-id", requestId);
    for (const [key, value] of Object.entries(corsHeaders(env))) headers.set(key, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
};

function corsHeaders(env) {
  const origin = env.ALLOWED_ORIGIN;
  return origin ? {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-aston-tenant,x-request-id",
    "vary": "Origin"
  } : {};
}
