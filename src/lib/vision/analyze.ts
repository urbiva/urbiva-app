import { VISION_CATEGORIES, type Confidence, type VisionCategory, type VisionResult } from "./categories";

/**
 * Server-only. Sends one image to Anthropic's Messages API (Claude vision) and
 * returns a constrained classification. The API key is read from the server
 * environment and never sent to the browser. Images are not stored or logged.
 */
export const DEFAULT_VISION_MODEL = "claude-sonnet-5-5";

const SYSTEM_PROMPT = `You assess sidewalk photos for pedestrian accessibility barriers in a city.
Classify the MAIN barrier visible for a wheelchair or stroller user into exactly one category:
stairs, blocked_path, broken_surface, curb, obstruction, other, none.
- stairs: steps without a usable ramp
- blocked_path: the walkway is closed or fully blocked (fences, construction)
- broken_surface: damaged, uneven or missing paving
- curb: high curb or missing curb ramp at a crossing
- obstruction: objects or parked vehicles narrowing the walkway
- other: a different accessibility problem, or the photo is unclear
- none: no barrier is visible
Never estimate slopes, widths or heights in numbers; a single photo cannot measure them.
Use confidence "low" when the photo is unclear, partial or ambiguous.
Reply with ONLY a JSON object: {"category": "...", "confidence": "low|medium|high", "rationale_az": "one or two short sentences in Azerbaijani describing what is visible"}`;

export interface AnalyzeOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class VisionError extends Error {}

export function parseModelOutput(text: string): VisionResult {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new VisionError("Model cavabı oxuna bilmədi.");
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    throw new VisionError("Model cavabı oxuna bilmədi.");
  }
  const category = (VISION_CATEGORIES as string[]).includes(String(raw.category)) ? (raw.category as VisionCategory) : "other";
  const confidence: Confidence = ["low", "medium", "high"].includes(String(raw.confidence)) ? (raw.confidence as Confidence) : "low";
  const rationale = typeof raw.rationale_az === "string" ? raw.rationale_az.slice(0, 400) : "";
  return { category, confidence, rationale, requiresHumanReview: true };
}

export async function analyzeImage(base64: string, mediaType: string, opts: AnalyzeOptions): Promise<{ result: VisionResult; model: string }> {
  const model = opts.model || DEFAULT_VISION_MODEL;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30_000);
  try {
    const res = await (opts.fetchImpl ?? fetch)("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": opts.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: "Classify the sidewalk barrier in this photo. JSON only." },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      // Do not forward provider error bodies to the client; they can contain request details.
      throw new VisionError(res.status === 429 ? "AI xidməti hazırda məşğuldur. Bir az sonra yenidən cəhd edin." : `AI xidməti xəta qaytardı (${res.status}).`);
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
    return { result: parseModelOutput(text), model };
  } catch (e) {
    if (e instanceof VisionError) throw e;
    if ((e as Error).name === "AbortError") throw new VisionError("AI analizi vaxtında tamamlanmadı.");
    throw new VisionError("AI xidmətinə qoşulmaq mümkün olmadı.");
  } finally {
    clearTimeout(timer);
  }
}
