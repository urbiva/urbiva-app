"use client";
import type { VisionResponse } from "./categories";

/**
 * Browser-side image preparation. Re-encoding through a canvas:
 * - downsizes to max 1280 px (keeps the request under provider limits)
 * - drops EXIF metadata, including GPS location, before anything leaves the device
 */
export const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_EDGE = 1280;

export interface PreparedImage { base64: string; mediaType: "image/jpeg"; previewUrl: string; bytes: number }

async function canvasToPrepared(canvas: HTMLCanvasElement): Promise<PreparedImage> {
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.85));
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { base64: btoa(bin), mediaType: "image/jpeg", previewUrl: URL.createObjectURL(blob), bytes: buf.length };
}

export async function prepareFile(file: File): Promise<PreparedImage> {
  if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type)) throw new Error("Yalnız JPEG, PNG və ya WebP şəkil seçin.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("Şəkil çox böyükdür (maksimum 15 MB).");
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); } catch { throw new Error("Bu şəkil açıla bilmədi. Başqa şəkil seçin."); }
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return canvasToPrepared(c);
}

/** Draws the labelled sample illustration (underpass stairs) for demos without a real photo. */
export async function prepareSampleIllustration(): Promise<PreparedImage> {
  const c = document.createElement("canvas"); c.width = 716; c.height = 420;
  const g = c.getContext("2d")!; g.scale(2, 2);
  const poly = (pts: number[][], fill: string) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); };
  g.fillStyle = "#4A4266"; g.fillRect(0, 0, 358, 210);
  g.fillStyle = "#5E567D"; [14, 58, 266, 310].forEach((x) => g.fillRect(x, 14, 34, 44));
  g.fillStyle = "#2E2747"; g.fillRect(0, 96, 358, 114);
  poly([[118, 96], [240, 96], [232, 66], [126, 66]], "#3A3258");
  g.fillStyle = "#120C24"; g.fillRect(128, 70, 102, 30);
  poly([[60, 210], [118, 100], [240, 100], [298, 210]], "#3A3258");
  [[100, 110, 113, 245], [116, 128, 104, 254], [136, 150, 93, 265], [160, 176, 80, 278], [186, 204, 65, 293]].forEach(([y0, y1, xl, xr]) => {
    const w0 = (xr - xl) * 0.96; poly([[xl + 5, y0], [xl + 5 + w0, y0], [xr, y1], [xl, y1]], "#7A7299");
  });
  g.strokeStyle = "#B9B1CE"; g.lineWidth = 3; g.lineCap = "round";
  g.beginPath(); g.moveTo(62, 206); g.lineTo(120, 92); g.moveTo(296, 206); g.lineTo(238, 92); g.stroke();
  g.fillStyle = "#F7F5F0"; g.font = "600 9px monospace"; g.fillText("NÜMUNƏ İLLÜSTRASİYA", 10, 200);
  return canvasToPrepared(c);
}

export async function requestAnalysis(img: PreparedImage, signal?: AbortSignal): Promise<VisionResponse> {
  try {
    const res = await fetch("/api/vision", { method: "POST", signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ image: img.base64, mediaType: img.mediaType }) });
    const data = (await res.json()) as VisionResponse;
    return data;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return { status: "error", message: "Serverə qoşulmaq mümkün olmadı. İnternet bağlantınızı yoxlayın." };
  }
}
