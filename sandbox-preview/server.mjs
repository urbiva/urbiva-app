// Sandbox-only static server + /api/vision using the SAME handler as the Next.js route.
// `--stub-provider` swaps ONLY the outbound HTTP call to Anthropic for a canned response,
// to test the UI path in this offline sandbox. It is never part of the Next.js app.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleVisionRequest } from "./dist/handler.mjs";

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const port = Number(process.env.PORT || 4321);
const stub = process.argv.includes("--stub-provider");
const env = stub
  ? { apiKey: "sandbox-stub", model: "STUB (sandbox test, not a real model)", fetchImpl: async () => new Response(JSON.stringify({ content: [{ type: "text", text: '{"category":"stairs","confidence":"medium","rationale_az":"SINAQ CAVABI: real model çağırılmayıb."}' }] }), { status: 200 }) }
  : { apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.URBIVA_VISION_MODEL };
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };

http.createServer(async (req, res) => {
  if (req.url.startsWith("/api/vision")) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = await handleVisionRequest(new Request("http://x" + req.url, { method: req.method, headers: req.headers, body: req.method === "POST" ? Buffer.concat(chunks) : undefined }), env);
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(await r.text()); return;
  }
  const f = path.join(dist, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  if (!f.startsWith(dist) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log(`preview on http://localhost:${port} ${stub ? "(stub provider)" : env.apiKey ? "(live AI)" : "(AI not configured)"}`));
