"use client";
import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { pilotNetwork } from "@/data/pilot-network";
import { applyScenario, emptyScenario, nextBarrierId, type ScenarioState } from "@/lib/engine/scenario";
import type { Barrier, BarrierType, MobilityProfile, PilotNetwork, Verification } from "@/lib/engine/types";

/**
 * Client-side demo state. There is no backend database in this MVP: reports and
 * reviews live in this browser (localStorage) so the demo is reproducible and
 * can be reset. Photos are never persisted.
 */
export interface AppState {
  profile: MobilityProfile;
  destinationId: string | null;
  scenario: ScenarioState;
  demo: { routeViewed: boolean; stairsDetected: boolean; urbanViewed: boolean; simulatedBarrierId: string | null; impactViewed: boolean };
}

const initial: AppState = {
  profile: "wheelchair",
  destinationId: null,
  scenario: emptyScenario,
  demo: { routeViewed: false, stairsDetected: false, urbanViewed: false, simulatedBarrierId: null, impactViewed: false },
};

type Action =
  | { type: "hydrate"; state: AppState }
  | { type: "profile"; profile: MobilityProfile }
  | { type: "destination"; id: string | null }
  | { type: "routeViewed" }
  | { type: "stairsDetected" }
  | { type: "report"; edgeId: string; barrierType: BarrierType; aiAssisted: boolean; note?: string }
  | { type: "review"; barrierId: string; verification: Verification }
  | { type: "urbanViewed" }
  | { type: "simulate"; barrierId: string | null }
  | { type: "impactViewed" }
  | { type: "reset" };

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case "hydrate": return a.state;
    case "profile": return { ...s, profile: a.profile };
    case "destination": return { ...s, destinationId: a.id };
    case "routeViewed": return s.demo.routeViewed ? s : { ...s, demo: { ...s.demo, routeViewed: true } };
    case "stairsDetected": return { ...s, demo: { ...s.demo, stairsDetected: true } };
    case "report": {
      const net = applyScenario(pilotNetwork, s.scenario);
      const b: Barrier = {
        id: nextBarrierId(net, a.edgeId),
        edgeId: a.edgeId,
        type: a.barrierType,
        verification: "unverified",
        source: "user_report",
        note: (a.aiAssisted ? "AI təxmini istifadəçi tərəfindən təsdiqləndi." : "İstifadəçi əl ilə seçdi.") + (a.note ? " " + a.note : ""),
        at: 0.25,
        reportedAt: new Date().toISOString(),
      };
      return { ...s, scenario: { ...s.scenario, reports: [...s.scenario.reports, b] } };
    }
    case "review": return { ...s, scenario: { ...s.scenario, reviews: { ...s.scenario.reviews, [a.barrierId]: a.verification } } };
    case "urbanViewed": return s.demo.urbanViewed ? s : { ...s, demo: { ...s.demo, urbanViewed: true } };
    case "simulate": return { ...s, demo: { ...s.demo, simulatedBarrierId: a.barrierId } };
    case "impactViewed": return s.demo.impactViewed ? s : { ...s, demo: { ...s.demo, impactViewed: true } };
    case "reset": return initial;
  }
}

const KEY = "urbiva-demo-v1";
const Ctx = createContext<{ state: AppState; net: PilotNetwork; dispatch: (a: Action) => void; hydrated: boolean } | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) dispatch({ type: "hydrate", state: { ...initial, ...JSON.parse(raw) } });
    } catch { /* storage unavailable: run in memory */ }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state, hydrated]);
  const net = useMemo(() => applyScenario(pilotNetwork, state.scenario), [state.scenario]);
  return <Ctx.Provider value={{ state, net, dispatch, hydrated }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppStateProvider");
  return v;
}
