import type { Barrier, PilotNetwork, Verification } from "./types";

/** User-generated state layered on top of the base demo network. */
export interface ScenarioState {
  /** Barrier reports created in Urbiva Vision. */
  reports: Barrier[];
  /** Planner review decisions, by barrier id. */
  reviews: Record<string, Verification>;
}

export const emptyScenario: ScenarioState = { reports: [], reviews: {} };

/** Effective network = base data + reports + planner reviews. Pure function. */
export function applyScenario(base: PilotNetwork, s: ScenarioState): PilotNetwork {
  const all = [...base.barriers, ...s.reports];
  return {
    ...base,
    barriers: all.map((b) => (s.reviews[b.id] ? { ...b, verification: s.reviews[b.id] } : b)),
  };
}

export function nextBarrierId(net: PilotNetwork, edgeId: string): string {
  const base = "B-" + edgeId.replace("S-", "");
  if (!net.barriers.some((b) => b.id === base)) return base;
  let i = 2;
  while (net.barriers.some((b) => b.id === `${base}.${i}`)) i++;
  return `${base}.${i}`;
}
