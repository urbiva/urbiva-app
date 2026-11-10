import { analyzeImage, VisionError } from "./analyze";
import type { VisionResponse } from "./categories";

/**
 * Framework-agnostic handler (Web Request -> Response). Used by the Next.js
 * route handler at src/app/api/vision/route.ts.
 *
 * Safety:
 * - accepts only JPEG / PNG / WebP, checks magic bytes, max 5 MB decoded
 * - the browser already re-encodes the photo, which drops EXIF/GPS metadata
 * - nothing is written to disk or logged; the image only goes to the model provider
 * - best-effort in-memory rate limit per client
 */
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;
const RATE = { windowMs: 60_000, max: 10 };
const hits = new Map<string, number[]>();

const json = (body: VisionResponse, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function magicOk(buf: Uint8Array, type: string) {
  if (type === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (type === "image/png") return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (type === "image/webp") return String.fromCharCode(...buf.slice(0, 4)) === "RIFF" && String.fromCharCode(...buf.slice(8, 12)) === "WEBP";
  return false;
}

export interface HandlerEnv {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export async function handleVisionRequest(req: Request, env: HandlerEnv = { apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.URBIVA_VISION_MODEL }): Promise<Response> {
  if (req.method !== "POST") return json({ status: "error", message: "Yalnız POST qəbul edilir." }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE.windowMs);
  if (recent.length >= RATE.max) return json({ status: "error", message: "Çox sayda sorğu. Bir dəqiqə sonra yenidən cəhd edin." }, 429);
  recent.push(now);
  hits.set(ip, recent);

  if (!env.apiKey) {
    return json({ status: "not_configured", message: "AI analizi bu quraşdırmada aktiv deyil (API açarı təyin edilməyib). Maneəni əl ilə seçə bilərsiniz." }, 503);
  }

  let body: { image?: string; mediaType?: string };
  try {
    const text = await req.text();
    if (text.length > Math.ceil((MAX_BYTES * 4) / 3) + 1024) return json({ status: "error", message: "Şəkil çox böyükdür (maksimum 5 MB)." }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ status: "error", message: "Sorğu formatı yanlışdır." }, 400);
  }
  const mediaType = String(body.mediaType ?? "");
  if (!(ALLOWED as readonly string[]).includes(mediaType)) return json({ status: "error", message: "Yalnız JPEG, PNG və ya WebP şəkillər qəbul edilir." }, 415);
  const b64 = String(body.image ?? "").replace(/^data:[^,]+,/, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(b64)) return json({ status: "error", message: "Şəkil məlumatı yanlışdır." }, 400);
  const bytes = Uint8Array.from(Buffer.from(b64, "base64"));
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return json({ status: "error", message: "Şəkil ölçüsü uyğun deyil (maksimum 5 MB)." }, 413);
  if (!magicOk(bytes, mediaType)) return json({ status: "error", message: "Fayl şəkil formatına uyğun gəlmir." }, 415);

  try {
    const { result, model } = await analyzeImage(b64, mediaType, { apiKey: env.apiKey, model: env.model, fetchImpl: env.fetchImpl });
    return json({ status: "ok", result, model }, 200);
  } catch (e) {
    return json({ status: "error", message: e instanceof VisionError ? e.message : "Gözlənilməz xəta baş verdi." }, 502);
  }
}
