"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { EdgeLine, MapCallout, OriginMarker, PilotMap, PoiMarker, barrierPoint, BarrierMarker } from "@/components/PilotMap";
import { DesktopShell } from "@/components/Shells";
import { Badge, Notice, Tabs } from "@/components/ui";
import { ASSUMPTIONS } from "@/data/pilot-network";
import { blocksProfile, findRoute, metrics, passability, reachability, simulateIntervention } from "@/lib/engine/graph";
import type { PilotNetwork, Reachability } from "@/lib/engine/types";
import { CATEGORY_LABEL } from "@/lib/vision/categories";
import { AppLink, useQueryParam } from "@/lib/nav";
import { useApp } from "@/lib/store";
import { km } from "../go/GoScreen";

const PROFILE = "wheelchair" as const;
const KEY_DEST = "N11"; // Poliklinika

function ReachMap({ net, reach, barrierId, after }: { net: PilotNetwork; reach: Reachability; barrierId: string; after: boolean }) {
  const pois = net.nodes.filter((n) => n.poi && n.id !== net.originId);
  const b = net.barriers.find((x) => x.id === barrierId);
  return (
    <PilotMap label={after ? "Müdaxilədən sonra əlçatanlıq" : "Müdaxilədən əvvəl əlçatanlıq"} viewBox={[120, 128, 520, 350]}>
      {net.edges.map((e) => {
        const s = passability(net, e, PROFILE);
        if (s === "ok") return <EdgeLine key={e.id} net={net} edgeId={e.id} tone="faint" />;
        return <EdgeLine key={e.id} net={net} edgeId={e.id} tone={s === "blocked" ? "barrier" : "unknown"} />;
      })}
      {Object.entries(reach.edgeCoverage).flatMap(([edgeId, parts]) => parts.map((p) => <EdgeLine key={edgeId + p.from} net={net} edgeId={edgeId} tone="accessible" fromNode={p.from} fraction={p.fraction} />))}
      <OriginMarker node={net.nodes.find((n) => n.id === net.originId)!} />
      {pois.map((n, i) => <PoiMarker key={n.id} node={n} number={i + 1} highlight={reach.reachablePois.includes(n.id)} dim={!reach.reachablePois.includes(n.id)} />)}
      {!after && b && <BarrierMarker net={net} barrier={b} />}
      {after && b && (() => { const [x, y] = barrierPoint(net, b); return <MapCallout x={x - 10} y={y + 26} tone="lime">Rampa (ssenari)</MapCallout>; })()}
    </PilotMap>
  );
}

export function ImpactScreen() {
  const { state, net, dispatch } = useApp();
  const param = useQueryParam("barrier");
  const candidates = net.barriers.filter((b) => b.verification === "confirmed" && blocksProfile(b, PROFILE));
  const [chosen, setChosen] = useState<string | null>(null);
  const barrierId = chosen ?? param ?? state.demo.simulatedBarrierId;
  const barrier = net.barriers.find((b) => b.id === barrierId) ?? null;
  const [view, setView] = useState<"compare" | "before" | "after">("compare");

  const sim = useMemo(() => {
    if (!barrier) return null;
    const afterNet = simulateIntervention(net, barrier.id);
    const rb = reachability(net, PROFILE), ra = reachability(afterNet, PROFILE);
    const mb = metrics(net, PROFILE), ma = metrics(afterNet, PROFILE);
    const routeB = findRoute(net, KEY_DEST, PROFILE, "suitable"), routeA = findRoute(afterNet, KEY_DEST, PROFILE, "suitable");
    const newly = ra.reachablePois.filter((id) => !rb.reachablePois.includes(id));
    return { afterNet, rb, ra, mb, ma, routeB, routeA, newly };
  }, [net, barrier]);

  useEffect(() => {
    if (!sim || !barrier) return;
    if (state.demo.simulatedBarrierId !== barrier.id) dispatch({ type: "simulate", barrierId: barrier.id });
    dispatch({ type: "impactViewed" });
  }, [sim, barrier, state.demo.simulatedBarrierId, dispatch]);

  const pois = net.nodes.filter((n) => n.poi && n.id !== net.originId);
  const poiName = (id: string) => net.nodes.find((n) => n.id === id)?.poi ?? id;

  return (
    <DesktopShell>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h1 className="h1">Müdaxilə simulyasiyası</h1>
            <p className="text-[14px] text-fg-2">Urbiva Impact  ·  {barrier ? `Ssenari: ${barrier.id} (${CATEGORY_LABEL[barrier.type].toLowerCase()}) aradan qaldırılır, məsələn standarta uyğun rampa` : "maneə seçilməyib"}</p>
          </div>
          {barrier && <Tabs label="Görünüş" value={view} onChange={setView} options={[{ value: "compare", label: "Müqayisə" }, { value: "before", label: "Əvvəl" }, { value: "after", label: "Müdaxilədən sonra" }]} />}
        </header>
        <Notice tone="sample">Ssenari məlumatı: nəticə nümunə şəbəkə üzərində qraf alqoritmi ilə hesablanır ({ASSUMPTIONS.reachabilityMinutes} dəqiqə, {ASSUMPTIONS.speedsKmh.wheelchair} km/saat, əlil arabası). Bu, real dünyada ölçülmüş təsir deyil.</Notice>

        {candidates.length > 0 && (
          <label className="flex flex-wrap items-center gap-2 text-[14px]">
            <span className="text-fg-2">Simulyasiya üçün maneə:</span>
            <select value={barrier?.id ?? ""} onChange={(e) => setChosen(e.target.value || null)} className="h-10 rounded-md border border-line bg-surface px-3" data-testid="impact-barrier">
              <option value="">Seçin</option>
              {candidates.map((b) => <option key={b.id} value={b.id}>{b.id} · {CATEGORY_LABEL[b.type]} · {b.edgeId}</option>)}
            </select>
          </label>
        )}

        {!barrier || !sim ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line p-8">
            <Icon name="play" size={28} className="text-fg-3" />
            <p className="h3">{barrierId ? `${barrierId} bu məlumatda tapılmadı` : "Hələ simulyasiya yoxdur"}</p>
            <p className="text-[14px] text-fg-2">Urban panelində təsdiqlənmiş maneə seçin və “Müdaxiləni simulyasiya et” düyməsini basın.</p>
            <AppLink href="/urban" className="inline-flex h-10 items-center gap-2 rounded-md bg-lime px-4 text-[14px] font-semibold text-midnight">Urban panelinə keç</AppLink>
          </div>
        ) : (
          <>
            <div className={`grid gap-4 ${view === "compare" ? "lg:grid-cols-2" : ""}`}>
              {(["before", "after"] as const).filter((m) => view === "compare" || view === m).map((mode) => {
                const after = mode === "after";
                const r = after ? sim.ra : sim.rb;
                return (
                  <section key={mode} aria-label={after ? "Müdaxilədən sonra" : "Əvvəl"} data-testid={`impact-${mode}`}
                    className={`flex flex-col overflow-hidden rounded-lg bg-surface ${after ? "border-2 border-lime" : "border border-line-subtle"}`}>
                    <div className="flex items-center gap-2 px-4 py-3">
                      <h2 className="h3 flex-1">{after ? "Müdaxilədən sonra" : "Əvvəl"}</h2>
                      <span className={`data ${after ? "text-lime" : "text-fg-2"}`} data-testid={`reach-${mode}`}>15 dəq zonasında: {r.reachablePois.length} / {pois.length} təyinat</span>
                    </div>
                    <div className="h-[280px]"><ReachMap net={after ? sim.afterNet : net} reach={r} barrierId={barrier.id} after={after} /></div>
                    <ul className="flex flex-wrap gap-1.5 p-3" aria-label="Təyinatlar">
                      {pois.map((p, i) => {
                        const ok = r.reachablePois.includes(p.id); const isNew = after && sim.newly.includes(p.id);
                        return (
                          <li key={p.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ${isNew ? "bg-lime text-midnight" : ok ? "border border-success bg-raised" : "border border-line bg-raised text-fg-3"}`}>
                            <Icon name={ok ? "check-circle" : "close"} size={14} className={isNew ? "" : ok ? "text-success" : ""} />
                            {i + 1} {p.poi}{isNew ? " · yeni" : ok ? "" : " · əlçatan deyil"}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section aria-labelledby="res-h" className="flex flex-col gap-3 rounded-lg border border-line-subtle bg-surface p-5">
                <div className="flex items-center gap-2"><h2 id="res-h" className="h3 flex-1">Nəticə (nümunə şəbəkə)</h2><Badge tone="sample">Ssenari</Badge></div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["15 dəq zonasında təyinat", String(sim.rb.reachablePois.length), String(sim.ra.reachablePois.length)],
                    ["Keçilə bilən seqment", String(sim.mb.passableForProfile), String(sim.ma.passableForProfile)],
                    ["Poliklinikaya uyğun yol", sim.routeB ? km(sim.routeB.lengthM) : "yoxdur", sim.routeA ? km(sim.routeA.lengthM) : "yoxdur"],
                  ].map(([l, a, b]) => (
                    <div key={l} className="flex flex-col gap-1 rounded-md bg-raised p-3" data-testid="delta">
                      <span className="eyebrow text-fg-3">{l}</span>
                      <span className="flex flex-wrap items-center gap-x-2"><span className="h2 whitespace-nowrap text-fg-2">{a}</span><Icon name="chevron-right" size={18} className="text-fg-3" /><span className="h2 whitespace-nowrap text-lime">{b}</span></span>
                    </div>
                  ))}
                </div>
                <p className="text-[14px] text-fg-2" data-testid="impact-explanation">
                  {sim.newly.length > 0
                    ? `${barrier.id} aradan qaldırılsa, əlil arabası istifadəçisi üçün nümunə şəbəkədə ${sim.newly.length} yeni təyinat (${sim.newly.map(poiName).join(", ")}) ${ASSUMPTIONS.reachabilityMinutes} dəqiqəlik məsafəyə düşür.`
                    : `${barrier.id} aradan qaldırılsa da, ${ASSUMPTIONS.reachabilityMinutes} dəqiqəlik zonada yeni təyinat yaranmır.`}{" "}
                  Bu nəticə yalnız ssenari modelinə əsaslanır.
                </p>
              </section>
              <section aria-labelledby="asm-h" className="flex flex-col gap-2 rounded-lg border border-line-subtle bg-surface p-5">
                <h2 id="asm-h" className="h3">Fərziyyələr</h2>
                {[
                  "Müdaxilə standarta uyğundur və maneəni tam aradan qaldırır.",
                  `Hərəkət sürəti sabit ${ASSUMPTIONS.speedsKmh.wheelchair} km/saat qəbul edilir.`,
                  "Yalnız yoxlanılmış, maneəsiz seqmentlər əlçatan sayılır.",
                  "Digər seqmentlərin vəziyyəti dəyişmir.",
                  "Xərc və əhali təsiri hesablanmır.",
                ].map((a) => <p key={a} className="flex items-start gap-2 text-[12px] text-fg-2"><Icon name="info" size={16} className="text-fg-3" />{a}</p>)}
                <AppLink href="/urban" className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-md border-[1.5px] border-line bg-raised px-4 text-[14px] font-semibold">Urban panelinə qayıt</AppLink>
              </section>
            </div>
          </>
        )}
      </div>
    </DesktopShell>
  );
}
