import { test } from "node:test";
import assert from "node:assert/strict";
import { handleVisionRequest } from "@/lib/vision/handler";
import { parseModelOutput } from "@/lib/vision/analyze";

// 1x1 PNG
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
const req = (body: unknown, ip = String(Math.random())) =>
  new Request("http://localhost/api/vision", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) });

test("no API key -> explicit not_configured (never a fake result)", async () => {
  const r = await handleVisionRequest(req({ image: PNG, mediaType: "image/png" }), {});
  assert.equal(r.status, 503);
  assert.equal((await r.json()).status, "not_configured");
});

test("rejects wrong type and mismatched bytes", async () => {
  const env = { apiKey: "k", fetchImpl: (async () => { throw new Error("should not be called"); }) as unknown as typeof fetch };
  assert.equal((await handleVisionRequest(req({ image: PNG, mediaType: "image/gif" }), env)).status, 415);
  assert.equal((await handleVisionRequest(req({ image: PNG, mediaType: "image/jpeg" }), env)).status, 415);
  assert.equal((await handleVisionRequest(req({ image: "%%%", mediaType: "image/png" }), env)).status, 400);
});

test("calls the model with the key server-side and returns a constrained estimate", async () => {
  let sent: { headers: Record<string, string>; body: { model: string } } | null = null;
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    sent = { headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) };
    return new Response(JSON.stringify({ content: [{ type: "text", text: '{"category":"stairs","confidence":"medium","rationale_az":"Pilləkən görünür."}' }] }), { status: 200 });
  }) as unknown as typeof fetch;
  const r = await handleVisionRequest(req({ image: PNG, mediaType: "image/png" }), { apiKey: "secret", model: "m", fetchImpl });
  const j = await r.json();
  assert.equal(j.status, "ok");
  assert.equal(j.result.category, "stairs");
  assert.equal(j.result.requiresHumanReview, true);
  assert.equal(sent!.headers["x-api-key"], "secret");
  assert.equal(sent!.body.model, "m");
  assert.ok(!JSON.stringify(j).includes("secret"));
});

test("provider errors are mapped to safe messages", async () => {
  const fetchImpl = (async () => new Response("internal details", { status: 500 })) as unknown as typeof fetch;
  const j = await (await handleVisionRequest(req({ image: PNG, mediaType: "image/png" }), { apiKey: "k", fetchImpl })).json();
  assert.equal(j.status, "error");
  assert.ok(!j.message.includes("internal details"));
});

test("output parsing clamps unknown values", () => {
  assert.deepEqual(parseModelOutput('x {"category":"lava","confidence":"sure","rationale_az":"a"} y'), { category: "other", confidence: "low", rationale: "a", requiresHumanReview: true });
  assert.throws(() => parseModelOutput("no json"));
});

test("rate limit per client", async () => {
  const ip = "rate-test";
  let last = 0;
  for (let i = 0; i < 11; i++) last = (await handleVisionRequest(req({ image: PNG, mediaType: "image/png" }, ip), {})).status;
  assert.equal(last, 429);
});
