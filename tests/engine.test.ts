import { test } from "node:test";
import assert from "node:assert/strict";
import { pilotNetwork as base } from "@/data/pilot-network";
import { findRoute, metrics, passability, reachability, routeAlternatives, simulateIntervention } from "@/lib/engine/graph";
import { applyScenario, emptyScenario, nextBarrierId } from "@/lib/engine/scenario";
import type { Barrier } from "@/lib/engine/types";

const ids = (r: { segments: { edge: { id: string } }[] } | null) => r?.segments.map((s) => s.edge.id) ?? [];
const poiNames = (net: typeof base, nodeIds: string[]) => nodeIds.map((id) => net.nodes.find((n) => n.id === id)!.poi).sort();

test("graph integrity: every edge references existing nodes", () => {
  const n = new Set(base.nodes.map((x) => x.id));
  for (const e of base.edges) assert.ok(n.has(e.from) && n.has(e.to), e.id);
  for (const b of base.barriers) assert.ok(base.edges.some((e) => e.id === b.edgeId), b.id);
});

test("passability distinguishes confirmed, unverified and unknown", () => {
  const e = (id: string) => base.edges.find((x) => x.id === id)!;
  assert.equal(passability(base, e("S-11"), "wheelchair"), "blocked"); // confirmed closure
  assert.equal(passability(base, e("S-11"), "pedestrian"), "blocked");
  assert.equal(passability(base, e("S-14"), "wheelchair"), "uncertain"); // unverified curb
  assert.equal(passability(base, e("S-14"), "pedestrian"), "ok"); // a curb does not stop a pedestrian
  assert.equal(passability(base, e("S-22"), "wheelchair"), "uncertain"); // AI estimate only
  assert.equal(passability(base, e("S-07"), "wheelchair"), "unknown"); // never surveyed
  assert.equal(passability(base, e("S-01"), "wheelchair"), "ok");
});

test("initial demo: shortest route uses the unsurveyed underpass, suitable route avoids it", () => {
  const { suitable, shortest } = routeAlternatives(base, "N11", "wheelchair");
  assert.deepEqual(ids(shortest), ["S-07", "S-21"]);
  assert.ok(shortest!.lengthM > 800 && shortest!.lengthM < 820, String(shortest!.lengthM));
  assert.equal(shortest!.unknownSegments, 1);
  assert.ok(!ids(suitable).includes("S-07"));
  assert.ok(Math.abs(suitable!.lengthM - 1144) < 1, String(suitable!.lengthM));
  assert.equal(suitable!.blockingConfirmed.length, 0);
});

test("full demo scenario: report -> planner confirms -> simulate ramp -> recalculated reachability", () => {
  // Step 3/4: user reports stairs on S-07 (AI-assisted, user confirmed the category)
  let state = { ...emptyScenario };
  const net0 = applyScenario(base, state);
  const report: Barrier = { id: nextBarrierId(net0, "S-07"), edgeId: "S-07", type: "stairs", verification: "unverified", source: "user_report" };
  assert.equal(report.id, "B-07");
  state = { ...state, reports: [report] };
  const net1 = applyScenario(base, state);
  assert.equal(passability(net1, net1.edges.find((e) => e.id === "S-07")!, "wheelchair"), "uncertain");
  const m1 = metrics(net1, "wheelchair");
  assert.equal(m1.barrierRecords, 5);
  assert.equal(m1.barriersPending, 4);

  // Step 5: planner confirms
  state = { ...state, reviews: { "B-07": "confirmed" } };
  const net2 = applyScenario(base, state);
  const sh = findRoute(net2, "N11", "wheelchair", "shortest")!;
  assert.equal(sh.blockingConfirmed[0]?.id, "B-07");
  const before = reachability(net2, "wheelchair");
  assert.deepEqual(poiNames(net2, before.reachablePois), ["Avtobus dayanacağı", "Məktəb"]);

  // Step 6-8: simulate ramp, graph recalculated
  const after = simulateIntervention(net2, "B-07");
  const r2 = reachability(after, "wheelchair");
  assert.deepEqual(poiNames(after, r2.reachablePois), ["Avtobus dayanacağı", "Kitabxana", "Məktəb", "Park girişi", "Poliklinika"]);
  assert.equal(metrics(after, "wheelchair").passableForProfile, metrics(net2, "wheelchair").passableForProfile + 1);
  const suitAfter = findRoute(after, "N11", "wheelchair", "suitable")!;
  assert.deepEqual(ids(suitAfter), ["S-07", "S-21"]);
  // input network not mutated
  assert.ok(net2.barriers.some((b) => b.id === "B-07"));
});

test("rejected reports are ignored by routing", () => {
  const net = applyScenario(base, { reports: [], reviews: { "B-14": "rejected" } });
  assert.equal(passability(net, net.edges.find((e) => e.id === "S-14")!, "wheelchair"), "ok");
});

test("stroller and pedestrian profiles", () => {
  const p = routeAlternatives(base, "N11", "pedestrian");
  assert.ok(p.suitable);
  const r = reachability(base, "pedestrian");
  assert.ok(r.reachablePois.length >= 2);
});
