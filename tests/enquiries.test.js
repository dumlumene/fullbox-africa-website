import { test } from "node:test";
import assert from "node:assert/strict";
import { enquiries } from "../api/enquiries.js";

const origin = "https://preview.example.test";
const env = {
  LEAD_ALLOWED_ORIGINS: origin, LEAD_COLLECTOR_URL: "https://collector.example.test/leads",
  LEAD_COLLECTOR_TOKEN: "fixture-token", TURNSTILE_SITE_KEY: "fixture-public", TURNSTILE_SECRET: "fixture-private"
};
const payload = {
  intent: "quote", company: "Example Co", contact: "Example Buyer", email: "buyer@example.test",
  website: "https://example.test", country: "Canada", markets: "Nigeria", category: "Home goods", orders: "200",
  services: "Storage and pick and pack", consent: "yes", challenge: "fixture-proof"
};
async function call(handler, overrides = {}) {
  const res = {
    setHeader() {}, status(code) { this.code = code; return this; },
    json(body) { return { code: this.code, body }; }
  };
  return handler({ method: "POST", headers: { origin, "content-type": "application/json" }, body: payload, ...overrides }, res);
}
const verified = () => Response.json({ success: true, hostname: "preview.example.test", action: "merchant_enquiry" });

test("unconfigured form never sends or claims to save an enquiry", async () => {
  const handler = enquiries({}, () => assert.fail("unexpected fetch"));
  assert.deepEqual((await call(handler, { method: "GET" })).body, { available: false, siteKey: null, analytics: false });
  assert.equal((await call(handler)).code, 503);
});

test("rejects foreign origins, malformed payloads and bots before forwarding", async () => {
  const handler = enquiries(env, () => assert.fail("unexpected fetch"));
  assert.equal((await call(handler, { headers: { origin: "https://other.example.test" } })).code, 403);
  for (const update of [{ email: "invalid" }, { orders: "-1" }, { website: "javascript:alert(1)" }, { fax: "bot" },
    { consent: "no" }, { challenge: "" }, { details: "x".repeat(2001) }]) {
    assert.equal((await call(handler, { body: { ...payload, ...update } })).code, 400);
  }
  assert.equal((await call(handler, { body: { ...payload, details: "x".repeat(12001) } })).code, 413);
});

test("rejects a failed or wrong-host spam check without submitting a lead", async () => {
  for (const verification of [{ success: false }, { success: true, hostname: "wrong.example.test", action: "merchant_enquiry" }]) {
    const handler = enquiries(env, async (url) => {
      assert.match(String(url), /cloudflare/);
      return Response.json(verification);
    });
    assert.equal((await call(handler)).code, 400);
  }
});

test("returns confirmation only after the authorized collector explicitly accepts", async () => {
  for (const receipt of [{ accepted: true }, {}, { accepted: false }]) {
    const handler = enquiries(env, async (url, request) => {
      if (String(url).includes("cloudflare")) return verified();
      assert.equal(String(url), env.LEAD_COLLECTOR_URL);
      assert.equal(request.headers.Authorization, "Bearer fixture-token");
      const body = JSON.parse(request.body);
      assert.equal(body.intent, "quote");
      assert.equal(body.orders, 200);
      assert.equal(body.consent, true);
      assert.equal(body.challenge, undefined);
      return Response.json(receipt);
    });
    assert.equal((await call(handler)).code, receipt.accepted ? 201 : 502);
  }
});

test("reports a collector outage without revealing provider data", async () => {
  const handler = enquiries(env, async (url) => {
    if (String(url).includes("cloudflare")) return verified();
    throw new Error("fixture secret");
  });
  const result = await call(handler);
  assert.equal(result.code, 502);
  assert.doesNotMatch(result.body.message, /fixture secret/);
});
