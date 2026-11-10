"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { BarrierMarker, EdgeLine, OriginMarker, PilotMap, PoiMarker } from "@/components/PilotMap";
import { DesktopShell } from "@/components/Shells";
import { Badge, Button, Notice, SampleTag, StatTile, Tabs, type BadgeTone } from "@/components/ui";
import { blocksProfile, metrics, passability } from "@/lib/engine/graph";
import type { Barrier, MobilityProfile, Verification } from "@/lib/engine/types";
import { CATEGORY_LABEL } from "@/lib/vision/categories";
import { useNav } from "@/lib/nav";
import { useApp } from "@/lib/store";
import { PROFILES } from "../go/GoScreen";

export const VERIF: Record<Verification, [BadgeTone, string]> = {
  confirmed: ["confirmed", "Təsdiqlənib"],
  unverified: ["unverified", "Yoxlanılmayıb"],
  ai_estimate: ["ai", "AI təxmini"],
  rejected: ["sample", "Rədd edilib"],
};
const SOURCE = { survey: "Sahə sorğusu (nümunə)", user_report: "İstifadəçi bildirişi", ai: "AI aşkarlaması" };

type Filter = "all" | "confirmed" | "pending";

function BarrierRow({ b, selected, onSelect, edgeLabel }: { b: Barrier; selected: boolean; onSelect: () => void; edgeLabel: string }) {
  const [tone, label] = VERIF[b.verification];
  const confirmed = b.verification === "confirmed";
  return (
    <li>
      <button onClick={onSelect} aria-pressed={selected} data-testid={`barrier-${b.id}`}
        className={`flex w-full items-center gap-3 rounded-md p-3 text-left ${selected ? "border-2 border-lime bg-raised" : "border border-line-subtle hover:border-line"}`}>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center text-canvas ${confirmed ? "bg-danger" : "bg-warning"}`} style={{ clipPath: "polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)" }} aria-hidden>
          <Icon name={confirmed ? "alert" : "clock"} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{CATEGORY_LABEL[b.type]}</span>
          <span className="data block truncate text-fg-3">{b.id}  ·  {b.edgeId}  ·  {edgeLabel}</span>
        </span>
        <Badge tone={tone}>{label}</Badge>
      </button>
    </li>
  );
}

export function UrbanScreen() {
  const { net, dispatch, hydrated } = useApp();
  const nav = useNav();
  const [profile, setProfile] = useState<MobilityProfile>("wheelchair");
  const [filter, setFilter] = useState<Filter>("all");
  const [selId, setSelId] = useState<string | null>(null);
  useEffect(() => { dispatch({ type: "urbanViewed" }); }, [dispatch]);

  const m = useMemo(() => metrics(net, profile), [net, profile]);
  const list = net.barriers.filter((b) => (filter === "all" ? true : filter === "confirmed" ? b.verification === "confirmed" : b.verification === "unverified" || b.verification === "ai_estimate"));
  const sorted = [...list].sort((a, b) => Number(!!b.reportedAt) - Number(!!a.reportedAt));
  // Wait for saved demo state before auto-selecting, so a refresh selects the newest report (e.g. B-07), not a base record.
  useEffect(() => { if (hydrated && !selId && sorted.length) setSelId(sorted[0].id); }, [hydrated, sorted, selId]);
  const sel = net.barriers.find((b) => b.id === selId) ?? null;
  const selEdge = sel ? net.edges.find((e) => e.id === sel.edgeId) : null;
  const edgeLabel = (id: string) => net.edges.find((e) => e.id === id)?.label ?? id;
  const plab = PROFILES.find((p) => p.id === profile)!.label.toLowerCase();
  const canSimulate = !!sel && sel.verification === "confirmed" && blocksProfile(sel, "wheelchair");

  return (
    <DesktopShell>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h1 className="h1">Pilot zona icmalı</h1>
            <p className="text-[14px] text-fg-2">Urbiva Urban  ·  bütün göstəricilər qrafdan hesablanır  ·  ssenari məlumatı</p>
          </div>
          <Tabs label="Profil" value={profile} onChange={setProfile} options={PROFILES.map((p) => ({ value: p.id, label: p.label }))} />
        </header>
        <Notice tone="sample">Nümunə məlumat: xəritə, seqmentlər və maneə qeydləri demo ssenarisidir. Real sahə ölçmələri deyil.</Notice>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4" data-testid="urban-stats">
          <StatTile label="Araşdırılmış seqmentlər" value={`${m.segmentsSurveyed} / ${m.segmentsTotal}`} caption={`${m.segmentsUnknown} seqment üçün məlumat yoxdur`} />
          <StatTile label="Maneə qeydləri" value={m.barrierRecords} caption={`${m.barriersConfirmed} təsdiqlənib · ${m.barriersPending} gözləyir`} />
          <StatTile label="Keçilə bilən seqmentlər" value={`${m.passableForProfile} / ${m.segmentsTotal}`} caption={`Yalnız yoxlanılmış, ${plab} profili`} />
          <StatTile label="15 dəq əlçatan təyinat" value={`${m.reachablePois} / ${m.poisTotal}`} caption="Başlanğıc: yaşayış məhəlləsi" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_392px]">
          <div className="relative h-[360px] min-w-0 overflow-hidden rounded-lg border border-line-subtle lg:h-[600px]">
            <PilotMap label="Pilot zona seqmentlərinin vəziyyəti" viewBox={[40, 20, 740, 600]}>
              {sel && <EdgeLine net={net} edgeId={sel.edgeId} tone="halo" />}
              {net.edges.map((e) => {
                const s = passability(net, e, profile);
                return <EdgeLine key={e.id} net={net} edgeId={e.id} tone={s === "ok" ? "accessible" : s === "blocked" ? "barrier" : "unknown"} />;
              })}
              <OriginMarker node={net.nodes.find((n) => n.id === net.originId)!} />
              {net.nodes.filter((n) => n.poi && n.id !== net.originId).map((n) => <PoiMarker key={n.id} node={n} />)}
              {net.barriers.filter((b) => b.verification !== "rejected").map((b) => <BarrierMarker key={b.id} net={net} barrier={b} selected={b.id === selId} onSelect={setSelId} />)}
            </PilotMap>
            <div className="absolute left-4 top-4"><SampleTag /></div>
            <ul className="absolute bottom-4 left-4 flex flex-col gap-2 rounded-md border border-line-subtle bg-overlay/95 p-3 text-[12px] text-fg-2" aria-label="Xəritə izahı">
              <li className="flex items-center gap-2"><span className="h-1 w-7 rounded-full bg-lime" />Keçilə bilən ({plab})</li>
              <li className="flex items-center gap-2"><span className="h-1 w-7 rounded-full bg-danger" />Təsdiqlənmiş maneə</li>
              <li className="flex items-center gap-2"><span className="w-7 border-t-4 border-dotted border-warning" />Yoxlanılmamış / məlumat yoxdur</li>
            </ul>
          </div>

          <section aria-labelledby="barriers-h" className="flex min-w-0 flex-col gap-3 rounded-lg border border-line-subtle bg-surface p-4">
            <div className="flex items-center justify-between"><h2 id="barriers-h" className="h3">Maneələr</h2><span className="data text-fg-3">{net.barriers.length} qeyd</span></div>
            <Tabs label="Filtr" value={filter} onChange={setFilter} options={[{ value: "all", label: "Hamısı" }, { value: "confirmed", label: "Təsdiqlənib" }, { value: "pending", label: "Gözləyir" }]} />
            {sorted.length === 0 ? (
              <p className="rounded-md border border-dashed border-line p-4 text-[14px] text-fg-2">Bu filtrdə qeyd yoxdur.</p>
            ) : (
              <ul className="flex flex-col gap-2">{sorted.map((b) => <BarrierRow key={b.id} b={b} selected={b.id === selId} onSelect={() => setSelId(b.id)} edgeLabel={edgeLabel(b.edgeId)} />)}</ul>
            )}
            {sel && selEdge && (
              <div className="mt-1 flex flex-col gap-2 border-t border-line-subtle pt-3" data-testid="barrier-detail">
                <p className="text-[14px] font-semibold">{sel.id}: {CATEGORY_LABEL[sel.type]}</p>
                <p className="text-[12px] text-fg-2">Seqment {selEdge.id} ({selEdge.label}). Mənbə: {SOURCE[sel.source]}.{sel.note ? ` ${sel.note}` : ""}</p>
                {(sel.verification === "unverified" || sel.verification === "ai_estimate") && (
                  <div className="flex gap-2">
                    <Button size="md" variant="secondary" icon="check-circle" onClick={() => dispatch({ type: "review", barrierId: sel.id, verification: "confirmed" })} data-testid="verify">Təsdiqlə</Button>
                    <Button size="md" variant="danger" icon="close" onClick={() => dispatch({ type: "review", barrierId: sel.id, verification: "rejected" })}>Rədd et</Button>
                  </div>
                )}
                <Button size="md" icon="play" disabled={!canSimulate} data-testid="simulate"
                  onClick={() => { dispatch({ type: "simulate", barrierId: sel.id }); nav.push(`/impact?barrier=${sel.id}`); }}>
                  Müdaxiləni simulyasiya et
                </Button>
                {!canSimulate && <p className="text-[12px] text-fg-3">Simulyasiya yalnız təsdiqlənmiş və əlil arabası üçün keçidi bağlayan maneələr üçün aktivdir.</p>}
              </div>
            )}
          </section>
        </div>
      </div>
    </DesktopShell>
  );
}
