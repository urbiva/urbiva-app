import type { PilotNetwork } from "@/lib/engine/types";

/**
 * DEMONSTRATION DATA. "Pilot zona A" is a simplified, invented street network
 * drawn for the hackathon prototype. It is NOT a survey of real Baku streets,
 * and none of its states or barriers were measured in the field.
 *
 * Coordinates are in map units on the 800 x 640 sample map.
 * 1 map unit = 2.2 m (so the 140-unit block is about 300 m).
 *
 * Story built into the data:
 * - S-07 is a pedestrian underpass (diagonal shortcut) from the residential
 *   block (origin) to the park entrance. Nobody has surveyed it yet.
 * - In the demo a user photographs its stairs, the planner confirms the barrier,
 *   and Urbiva Impact simulates adding a ramp.
 */
export const METRES_PER_UNIT = 2.2;

export const ASSUMPTIONS = {
  speedsKmh: { pedestrian: 4.8, wheelchair: 4.0, stroller: 4.0 },
  reachabilityMinutes: 15,
  /** Cost multipliers used by the "suitable" route for less certain segments. */
  penalty: { uncertain: 3.0, unknown: 2.0 },
} as const;

export const pilotNetwork: PilotNetwork = {
  name: "Pilot zona A (nümunə)",
  isDemoData: true,
  originId: "N2",
  nodes: [
    { id: "N1", x: 80, y: 440 },
    { id: "N2", x: 220, y: 440, poi: "Başlanğıc: yaşayış məhəlləsi" },
    { id: "N3", x: 360, y: 440 },
    { id: "N4", x: 500, y: 440 },
    { id: "N5", x: 220, y: 320 },
    { id: "N6", x: 360, y: 320, poi: "Avtobus dayanacağı" },
    { id: "N7", x: 500, y: 320, poi: "Məktəb" },
    { id: "N8", x: 640, y: 320 },
    { id: "N9", x: 220, y: 200 },
    { id: "N10", x: 360, y: 200 },
    { id: "N11", x: 500, y: 200, poi: "Poliklinika" },
    { id: "N12", x: 580, y: 200, poi: "Kitabxana" },
    { id: "N13", x: 640, y: 200 },
    { id: "N14", x: 430, y: 260, poi: "Park girişi" },
    { id: "N15", x: 360, y: 540 },
    { id: "N16", x: 500, y: 540 },
    { id: "N17", x: 640, y: 440 },
  ],
  edges: [
    { id: "S-01", from: "N2", to: "N3", label: "Cənub küçəsi, 1-ci məhəllə", data: "surveyed" },
    { id: "S-02", from: "N3", to: "N4", label: "Cənub küçəsi, 2-ci məhəllə", data: "surveyed" },
    { id: "S-03", from: "N4", to: "N7", label: "Şərq keçidi", data: "unknown" },
    { id: "S-04", from: "N7", to: "N11", label: "Məktəb - Poliklinika", data: "surveyed" },
    { id: "S-05", from: "N2", to: "N5", label: "Qərb küçəsi", data: "surveyed" },
    { id: "S-06", from: "N5", to: "N6", label: "Mərkəz küçəsi, qərb", data: "surveyed" },
    { id: "S-07", from: "N2", to: "N14", label: "Yeraltı keçid (məhəllə - park)", data: "unknown" },
    { id: "S-08", from: "N6", to: "N10", label: "Dayanacaq küçəsi", data: "surveyed" },
    { id: "S-09", from: "N10", to: "N11", label: "Şimal küçəsi", data: "surveyed" },
    { id: "S-10", from: "N11", to: "N12", label: "Poliklinika - Kitabxana", data: "surveyed" },
    { id: "S-11", from: "N13", to: "N8", label: "Şərq küçəsi (tikinti)", data: "surveyed" },
    { id: "S-12", from: "N8", to: "N17", label: "Şərq küçəsi, cənub", data: "unknown" },
    { id: "S-13", from: "N6", to: "N7", label: "Mərkəz küçəsi, şərq", data: "surveyed" },
    { id: "S-14", from: "N5", to: "N9", label: "Qərb küçəsi, şimal", data: "surveyed" },
    { id: "S-15", from: "N9", to: "N10", label: "Şimal küçəsi, qərb", data: "surveyed" },
    { id: "S-16", from: "N7", to: "N8", label: "Mərkəz küçəsi, son", data: "unknown" },
    { id: "S-17", from: "N1", to: "N2", label: "Cənub küçəsi, qərb", data: "surveyed" },
    { id: "S-18", from: "N3", to: "N15", label: "Bulvara çıxış", data: "surveyed" },
    { id: "S-19", from: "N4", to: "N17", label: "Cənub küçəsi, şərq", data: "unknown" },
    { id: "S-20", from: "N15", to: "N16", label: "Bulvar yolu", data: "surveyed" },
    { id: "S-21", from: "N14", to: "N11", label: "Park yolu", data: "surveyed" },
    { id: "S-22", from: "N12", to: "N13", label: "Kitabxana - Şərq küçəsi", data: "surveyed" },
  ],
  barriers: [
    { id: "B-11", edgeId: "S-11", type: "blocked_path", verification: "confirmed", source: "survey", note: "Tikinti səbəbindən səki bağlıdır.", at: 0.5 },
    { id: "B-14", edgeId: "S-14", type: "curb", verification: "unverified", source: "user_report", note: "Keçiddə hündür bordür, rampa yoxdur.", at: 0.5 },
    { id: "B-03", edgeId: "S-03", type: "broken_surface", verification: "unverified", source: "user_report", note: "Səki örtüyü dağılıb.", at: 0.5 },
    { id: "B-05", edgeId: "S-22", type: "obstruction", verification: "ai_estimate", source: "ai", note: "Səkidə park edilmiş avtomobillər (AI təxmini).", at: 0.5 },
  ],
};
