import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

test("health endpoint reports release and does not expose binding values", async () => {
  const secret = "do-not-leak";
  const response = await worker.fetch(new Request("https://aston.test/health"), {
    ASTON_RELEASE: "21.0.0",
    DB: { secret },
    JWT_SECRET: secret
  }, {});
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.version, "21.0.0");
  assert.equal(body.capabilities.d1, true);
  assert.equal(JSON.stringify(body).includes(secret), false);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("unknown route returns structured 404", async () => {
  const response = await worker.fetch(new Request("https://aston.test/nope"), {}, {});
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, "NOT_FOUND");
});
