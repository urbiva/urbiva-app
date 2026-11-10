import { handleVisionRequest } from "@/lib/vision/handler";

// Server-only: the Anthropic key is read from process.env and never shipped to the browser.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleVisionRequest(req);
}
