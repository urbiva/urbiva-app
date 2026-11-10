import { ASSUMPTIONS, METRES_PER_UNIT } from "@/data/pilot-network";
import type {
  Barrier,
  BarrierType,
  GraphEdge,
  GraphNode,
  MobilityProfile,
  Passability,
  PilotNetwork,
  Reachability,
  Route,
  RouteMode,
  RouteSegment,
} from "./types";

/** Which profiles each barrier type blocks. Pedestrians are only stopped by a closed path. */
export const BLOCKS: Record<BarrierType, MobilityProfile[]> = {
  stairs: ["wheelchair", "stroller"],
  blocked_path: ["pedestrian", "wheelchair", "stroller"],
  broken_surface: ["wheelchair", "stroller"],
  curb: ["wheelchair", "stroller"],
  obstruction: ["wheelchair", "stroller"],
  other: ["wheelchair", "stroller"],
};

export const blocksProfile = (b: Barrier, p: MobilityProfile) => BLOCKS[b.type].includes(p);

export function nodeMap(net: PilotNetwork): Map<string, GraphNode> {
  return new Map(net.nodes.map((n) => [n.id, n]));
}

export function edgeLengthM(net: PilotNetwork, e: GraphEdge, nodes = nodeMap(net)): number {
  const pts = edgePoints(e, nodes);
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return d * METRES_PER_UNIT;
}

export function edgePoints(e: GraphEdge, nodes: Map<string, GraphNode>): Array<[number, number]> {
  if (e.path && e.path.length >= 2) return e.path;
  const a = nodes.get(e.from)!;
  const b = nodes.get(e.to)!;
  return [
    [a.x, a.y],
    [b.x, b.y],
  ];
}

export function barriersOnEdge(net: PilotNetwork, edgeId: string): Barrier[] {
  return net.barriers.filter((b) => b.edgeId === edgeId && b.verification !== "rejected");
}

/** Core rule: how passable is this segment for this profile, given data + barriers. */
export function passability(net: PilotNetwork, e: GraphEdge, p: MobilityProfile): Passability {
  const relevant = barriersOnEdge(net, e.id).filter((b) => blocksProfile(b, p));
  if (relevant.some((b) => b.verification === "confirmed")) return "blocked";
  if (relevant.length > 0) return "uncertain";
  if (e.data === "unknown") return "unknown";
  return "ok";
}

export function minutesFor(lengthM: number, p: MobilityProfile): number {
  return (lengthM / 1000 / ASSUMPTIONS.speedsKmh[p]) * 60;
}

type Adj = Map<string, Array<{ to: string; edge: GraphEdge; lengthM: number }>>;

function adjacency(net: PilotNetwork): Adj {
  const nodes = nodeMap(net);
  const adj: Adj = new Map(net.nodes.map((n) => [n.id, []]));
  for (const e of net.edges) {
    const lengthM = edgeLengthM(net, e, nodes);
    adj.get(e.from)!.push({ to: e.to, edge: e, lengthM });
    adj.get(e.to)!.push({ to: e.from, edge: e, lengthM });
  }
  return adj;
}

/** Plain Dijkstra with a pluggable edge cost (Infinity = not traversable). */
export function dijkstra(
  net: PilotNetwork,
  source: string,
  cost: (e: GraphEdge, lengthM: number) => number,
): { dist: Map<string, number>; prev: Map<string, { node: string; edge: GraphEdge }> } {
  const adj = adjacency(net);
  const dist = new Map<string, number>([[source, 0]]);
  const prev = new Map<string, { node: string; edge: GraphEdge }>();
  const done = new Set<string>();
  // Network is small (tens of nodes); a linear-scan priority queue keeps this dependency-free.
  while (true) {
    let u: string | null = null;
    let best = Infinity;
    for (const [n, d] of dist) if (!done.has(n) && d < best) { best = d; u = n; }
    if (u === null) break;
    done.add(u);
    for (const { to, edge, lengthM } of adj.get(u) ?? []) {
      const c = cost(edge, lengthM);
      if (!Number.isFinite(c)) continue;
      const nd = best + c;
      if (nd < (dist.get(to) ?? Infinity)) { dist.set(to, nd); prev.set(to, { node: u, edge }); }
    }
  }
  return { dist, prev };
}

function buildRoute(net: PilotNetwork, mode: RouteMode, p: MobilityProfile, target: string, prev: Map<string, { node: string; edge: GraphEdge }>): Route | null {
  const nodes = nodeMap(net);
  const nodeIds = [target];
  const edges: GraphEdge[] = [];
  let cur = target;
  while (cur !== net.originId) {
    const step = prev.get(cur);
    if (!step) return null;
    edges.unshift(step.edge);
    nodeIds.unshift(step.node);
    cur = step.node;
  }
  const segments: RouteSegment[] = edges.map((edge) => ({
    edge,
    passability: passability(net, edge, p),
    barriers: barriersOnEdge(net, edge.id),
    lengthM: edgeLengthM(net, edge, nodes),
  }));
  const lengthM = segments.reduce((s, x) => s + x.lengthM, 0);
  const blocking = segments.flatMap((s) => s.barriers.filter((b) => blocksProfile(b, p)));
  return {
    mode,
    profile: p,
    nodeIds,
    segments,
    lengthM,
    minutes: minutesFor(lengthM, p),
    blockingConfirmed: blocking.filter((b) => b.verification === "confirmed"),
    blockingUnverified: blocking.filter((b) => b.verification !== "confirmed"),
    unknownSegments: segments.filter((s) => s.passability === "unknown").length,
  };
}

/**
 * "suitable": avoids confirmed blocking barriers for the profile and prefers
 *   verified segments (unverified barriers and unsurveyed segments cost more).
 * "shortest": geometric shortest path for a pedestrian (only a closed path stops it),
 *   evaluated against the chosen profile so its problems can be shown honestly.
 */
export function findRoute(net: PilotNetwork, target: string, p: MobilityProfile, mode: RouteMode): Route | null {
  const cost =
    mode === "shortest"
      ? (e: GraphEdge, l: number) => (passability(net, e, "pedestrian") === "blocked" ? Infinity : l)
      : (e: GraphEdge, l: number) => {
          const s = passability(net, e, p);
          if (s === "blocked") return Infinity;
          if (s === "uncertain") return l * ASSUMPTIONS.penalty.uncertain;
          if (s === "unknown") return l * ASSUMPTIONS.penalty.unknown;
          return l;
        };
  const { prev } = dijkstra(net, net.originId, cost);
  return buildRoute(net, mode, p, target, prev);
}

export function routeAlternatives(net: PilotNetwork, target: string, p: MobilityProfile) {
  const suitable = findRoute(net, target, p, "suitable");
  const shortest = findRoute(net, target, p, "shortest");
  const same = !!suitable && !!shortest && suitable.segments.map((s) => s.edge.id).join() === shortest.segments.map((s) => s.edge.id).join();
  return { suitable, shortest: same ? null : shortest, identical: same };
}

/**
 * Conservative reachability for planners: only segments that are surveyed and
 * free of any barrier for the profile count ("ok"). Unknown or unverified
 * information never counts as accessible.
 */
export function reachability(net: PilotNetwork, p: MobilityProfile, minutes: number = ASSUMPTIONS.reachabilityMinutes): Reachability {
  const maxM = (ASSUMPTIONS.speedsKmh[p] * 1000 * minutes) / 60;
  const { dist } = dijkstra(net, net.originId, (e, l) => (passability(net, e, p) === "ok" ? l : Infinity));
  const nodes = nodeMap(net);
  const distances: Record<string, number> = {};
  for (const [n, d] of dist) if (d <= maxM + 1e-6) distances[n] = d;
  const reachableNodeIds = Object.keys(distances);
  const edgeCoverage: Reachability["edgeCoverage"] = {};
  for (const e of net.edges) {
    if (passability(net, e, p) !== "ok") continue;
    const len = edgeLengthM(net, e, nodes);
    const parts: { from: string; fraction: number }[] = [];
    for (const end of [e.from, e.to]) {
      const d = dist.get(end);
      if (d === undefined || d > maxM) continue;
      parts.push({ from: end, fraction: Math.min(1, (maxM - d) / len) });
    }
    if (parts.length) edgeCoverage[e.id] = parts;
  }
  return {
    thresholdMinutes: minutes,
    distances,
    reachableNodeIds,
    reachablePois: net.nodes.filter((n) => n.poi && n.id !== net.originId && distances[n.id] !== undefined).map((n) => n.id),
    edgeCoverage,
  };
}

export interface NetworkMetrics {
  segmentsTotal: number;
  segmentsSurveyed: number;
  segmentsUnknown: number;
  passableForProfile: number;
  barrierRecords: number;
  barriersConfirmed: number;
  barriersPending: number;
  reachablePois: number;
  poisTotal: number;
}

export function metrics(net: PilotNetwork, p: MobilityProfile): NetworkMetrics {
  const active = net.barriers.filter((b) => b.verification !== "rejected");
  const r = reachability(net, p);
  return {
    segmentsTotal: net.edges.length,
    segmentsSurveyed: net.edges.filter((e) => e.data === "surveyed").length,
    segmentsUnknown: net.edges.filter((e) => e.data === "unknown").length,
    passableForProfile: net.edges.filter((e) => passability(net, e, p) === "ok").length,
    barrierRecords: active.length,
    barriersConfirmed: active.filter((b) => b.verification === "confirmed").length,
    barriersPending: active.filter((b) => b.verification !== "confirmed").length,
    reachablePois: r.reachablePois.length,
    poisTotal: net.nodes.filter((n) => n.poi && n.id !== net.originId).length,
  };
}

/**
 * What-if: the barrier is removed by an intervention (e.g. a compliant ramp).
 * The segment is treated as surveyed and passable afterwards. Returns a new
 * network; the input is never mutated.
 */
export function simulateIntervention(net: PilotNetwork, barrierId: string): PilotNetwork {
  const target = net.barriers.find((b) => b.id === barrierId);
  if (!target) throw new Error(`Unknown barrier ${barrierId}`);
  const sameEdgeStairs = (b: Barrier) => b.edgeId === target.edgeId && b.type === target.type;
  return {
    ...net,
    barriers: net.barriers.filter((b) => !sameEdgeStairs(b)),
    edges: net.edges.map((e) => (e.id === target.edgeId ? { ...e, data: "surveyed" as const } : e)),
  };
}
