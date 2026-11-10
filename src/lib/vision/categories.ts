import type { BarrierType } from "@/lib/engine/types";

export type VisionCategory = BarrierType | "none";
export type Confidence = "low" | "medium" | "high";

export const CATEGORY_LABEL: Record<VisionCategory, string> = {
  stairs: "Pilləkən",
  blocked_path: "Bağlı keçid",
  broken_surface: "Sınıq səki",
  curb: "Bordür problemi",
  obstruction: "Səkidə əşya / avtomobil",
  other: "Digər",
  none: "Maneə görünmür",
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = { low: "aşağı", medium: "orta", high: "yüksək" };

export const VISION_CATEGORIES = Object.keys(CATEGORY_LABEL) as VisionCategory[];

export interface VisionResult {
  category: VisionCategory;
  confidence: Confidence;
  /** Short rationale in Azerbaijani, written by the model. */
  rationale: string;
  /** Always true: a person must confirm before the estimate becomes a report. */
  requiresHumanReview: true;
}

export type VisionResponse =
  | { status: "ok"; result: VisionResult; model: string }
  | { status: "not_configured"; message: string }
  | { status: "error"; message: string };
