/**
 * Urbiva routing engine types.
 * Coordinates are in map units (the 800 x 640 sample pilot map). Distances are
 * converted to metres with METRES_PER_UNIT (see src/data/pilot-network.ts).
 */

export type MobilityProfile = "pedestrian" | "wheelchair" | "stroller";

/** Survey state of a segment: has anyone checked it on the ground? */
export type SegmentData = "surveyed" | "unknown";

export type BarrierType =
  | "stairs"
  | "blocked_path"
  | "broken_surface"
  | "curb"
  | "obstruction"
  | "other";

/**
 * Verification of a barrier record.
 * - confirmed: verified by survey or planner/moderator review
 * - unverified: reported by a person (optionally AI-assisted), awaiting review
 * - ai_estimate: produced by the vision model only, not yet confirmed by a person
 * - rejected: reviewed and found not to be a barrier (kept for audit, ignored by routing)
 */
export type Verification = "confirmed" | "unverified" | "ai_estimate" | "rejected";

export type BarrierSource = "survey" | "user_report" | "ai";

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  /** Named destination (point of interest) in the pilot zone. */
  poi?: string;
}

export interface GraphEdge {
  id: string; // e.g. "S-07"
  from: string;
  to: string;
  label: string; // human readable, Azerbaijani
  data: SegmentData;
  /** Optional polyline for drawing (defaults to straight from -> to). */
  path?: Array<[number, number]>;
}

export interface Barrier {
  id: string; // e.g. "B-07"
  edgeId: string;
  type: BarrierType;
  verification: Verification;
  source: BarrierSource;
  note?: string;
  /** Position along the edge for drawing, 0..1 */
  at?: number;
  reportedAt?: string;
}

export interface PilotNetwork {
  name: string;
  isDemoData: true;
  nodes: GraphNode[];
  edges: GraphEdge[];
  barriers: Barrier[];
  originId: string;
}

/** How a segment behaves for a given profile after applying barriers and data state. */
export type Passability =
  | "ok" // surveyed, no barrier for this profile
  | "uncertain" // an unverified / AI-estimated barrier may block this profile
  | "unknown" // never surveyed
  | "blocked"; // a confirmed barrier blocks this profile

export interface RouteSegment {
  edge: GraphEdge;
  passability: Passability;
  barriers: Barrier[];
  lengthM: number;
}

export type RouteMode = "suitable" | "shortest";

export interface Route {
  mode: RouteMode;
  profile: MobilityProfile;
  nodeIds: string[];
  segments: RouteSegment[];
  lengthM: number;
  minutes: number;
  /** Barriers on the route that block the profile, grouped by verification. */
  blockingConfirmed: Barrier[];
  blockingUnverified: Barrier[];
  unknownSegments: number;
}

export interface Reachability {
  thresholdMinutes: number;
  /** distance in metres from origin for each reachable node */
  distances: Record<string, number>;
  reachableNodeIds: string[];
  reachablePois: string[];
  /** edges (fully or partly) inside the threshold, with covered fraction 0..1 from the nearer end */
  edgeCoverage: Record<string, { from: string; fraction: number }[]>;
}
