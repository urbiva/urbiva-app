"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { BarrierMarker, EdgeLine, MapCallout, OriginMarker, PilotMap, PoiMarker } from "@/components/PilotMap";
import { MobileShell } from "@/components/Shells";
import { Badge, Button, Chip, Notice, SampleTag } from "@/components/ui";
import { routeAlternatives } from "@/lib/engine/graph";
import type { MobilityProfile, Route } from "@/lib/engine/types";
import { CATEGORY_LABEL } from "@/lib/vision/categories";
import { AppLink } from "@/lib/nav";
import { useApp } from "@/lib/store";

export const PROFILES: { id: MobilityProfile; label: string; icon: IconName }[] = [
  { id: "pedestrian", label: "Piyada", icon: "walk" },
  { id: "wheelchair", label: "Əlil arabası", icon: "wheelchair" },
  { id: "stroller", label: "Uşaq arabası", icon: "stroller" },
];
export const km = (m: number) => `${(m / 1000).toFixed(1).replace(".", ",")} km`;
export const mins = (x: number) => `≈ ${Math.round(x)} dəq`;

function TrustBadges({ r }: { r: Route }) {
  const out = [];
  if (r.blockingConfirmed.length) out.push(<Badge key="c" tone="barrier">{`${r.blockingConfirmed.length} təsdiqlənmiş maneə: ${CATEGORY_LABEL[r.blockingConfirmed[0].type].toLowerCase()}`}</Badge>);
  if (r.blockingUnverified.length) out.push(<Badge key="u" tone="unverified">{`${r.blockingUnverified.length} yoxlanılmamış maneə qeydi`}</Badge>);
  if (r.unknownSegments) out.push(<Badge key="k" tone="unknown">{`${r.unknownSegments} seqment: məlumat yoxdur`}</Badge>);
  if (!out.length) out.push(<Badge key="ok" tone="confirmed">Bütün seqmentlər yoxlanılıb</Badge>);
  return <div className="flex flex-wrap gap-1.5">{out}</div>;
}

function RouteCard({ r, title, recommended, selected, onSelect }: { r: Route; title: string; recommended: boolean; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      data-testid={`route-${r.mode}`}
      className={`flex w-[300px] shrink-0 flex-col gap-2 rounded-lg p-4 text-left transition-colors ${selected ? "border-2 border-lime bg-raised" : "border border-line-subtle bg-surface hover:border-line"}`}
    >
      <span className="flex items-center gap-2">
        <span aria-hidden className={`h-1 w-5 rounded-full ${r.mode === "suitable" ? "bg-lime" : "border-t-4 border-dashed border-lavender"}`} />
        <span className="h3">{title}</span>
      </span>
      <span className="data text-fg-2">{km(r.lengthM)}  ·  {mins(r.minutes)}</span>
      <div className="flex flex-wrap gap-1.5">
        {recommended && <Badge tone="recommended">Tövsiyə</Badge>}
        <TrustBadges r={r} />
      </div>
    </button>
  );
}

const PASS_LABEL = { ok: ["confirmed", "Yoxlanılıb"], uncertain: ["unverified", "Yoxlanılmamış maneə"], unknown: ["unknown", "Məlumat yoxdur"], blocked: ["barrier", "Keçilməz"] } as const;

export function GoScreen() {
  const { state, net, dispatch, hydrated } = useApp();
  const [view, setView] = useState<"setup" | "routes" | "detail">("setup");
  const [choice, setChoice] = useState<"suitable" | "shortest">("suitable");
  const pois = net.nodes.filter((n) => n.poi && n.id !== net.originId);
  const dest = net.nodes.find((n) => n.id === state.destinationId) ?? null;
  const origin = net.nodes.find((n) => n.id === net.originId)!;

  useEffect(() => { if (hydrated && state.destinationId) setView((v) => (v === "setup" ? "routes" : v)); }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const alt = useMemo(() => (dest ? routeAlternatives(net, dest.id, state.profile) : null), [net, dest, state.profile]);
  const routes = [alt?.suitable, alt?.shortest].filter(Boolean) as Route[];
  const selected = routes.find((r) => r.mode === choice) ?? routes[0];
  useEffect(() => { if (view === "routes" && alt?.suitable) dispatch({ type: "routeViewed" }); }, [view, alt, dispatch]);

  if (view === "setup" || !dest) {
    return (
      <MobileShell title="Urbiva Go">
        <div className="flex flex-col gap-6 p-4 pt-6">
          <div>
            <p className="eyebrow text-fg-3">Urbiva Go</p>
            <h2 className="h1 mt-1">Hara gedirsiniz?</h2>
            <p className="mt-2 text-[14px] text-fg-2">Yalnız ən qısa yolu deyil, sizin üçün daha uyğun yolu tapın.</p>
          </div>
          <fieldset>
            <legend className="mb-2 text-[14px] font-semibold">Hərəkət tərcihi</legend>
            <div role="radiogroup" className="flex flex-wrap gap-2">
              {PROFILES.map((p) => <Chip key={p.id} icon={p.icon} selected={state.profile === p.id} onClick={() => dispatch({ type: "profile", profile: p.id })}>{p.label}</Chip>)}
            </div>
            <p className="mt-2 text-[12px] text-fg-3">Bu, marşrut tərcihidir, əlçatanlığa zəmanət deyil.</p>
          </fieldset>
          <div>
            <span className="text-[12px] font-semibold text-fg-2">Başlanğıc</span>
            <div className="mt-1 flex h-[52px] items-center gap-3 rounded-md border border-line bg-surface px-4">
              <span className="h-3 w-3 rounded-full bg-lime" aria-hidden />
              <span className="text-[14px]">Cari məkan <span className="text-fg-3">(nümunə: yaşayış məhəlləsi)</span></span>
            </div>
          </div>
          <fieldset>
            <legend className="mb-2 text-[14px] font-semibold">Təyinat</legend>
            <div role="radiogroup" className="flex flex-col gap-2">
              {pois.map((p) => (
                <button key={p.id} role="radio" aria-checked={state.destinationId === p.id} onClick={() => dispatch({ type: "destination", id: p.id })}
                  className={`flex h-[52px] items-center gap-3 rounded-md border px-4 text-left text-[14px] ${state.destinationId === p.id ? "border-2 border-lime bg-raised font-semibold" : "border-line bg-surface hover:border-line-strong"}`}>
                  <Icon name="flag" size={18} className="text-fg-2" />{p.poi} <span className="text-fg-3">(nümunə)</span>
                </button>
              ))}
            </div>
          </fieldset>
          <Button icon="route" disabled={!state.destinationId} onClick={() => setView("routes")} data-testid="show-routes">Marşrutları göstər</Button>
        </div>
      </MobileShell>
    );
  }

  const profileLabel = PROFILES.find((p) => p.id === state.profile)!;
  const onRoute = new Set(selected?.segments.map((s) => s.edge.id));

  return (
    <MobileShell title="Urbiva Go: marşrut seçimi">
      <div className="relative h-[420px] shrink-0 overflow-hidden">
        <PilotMap label={`Nümunə xəritə: ${origin.poi} → ${dest.poi}`} viewBox={[140, 70, 420, 420]}>
          {routes.filter((r) => r !== selected).map((r) => r.segments.map((s) => <EdgeLine key={r.mode + s.edge.id} net={net} edgeId={s.edge.id} tone="shortest" fromNode={undefined} />))}
          {selected?.segments.map((s) => (
            <EdgeLine key={s.edge.id} net={net} edgeId={s.edge.id} casing tone={s.passability === "blocked" ? "barrier" : s.passability === "ok" ? (selected.mode === "suitable" ? "accessible" : "shortest") : "unknown"} />
          ))}
          {net.barriers.filter((b) => b.verification !== "rejected" && (onRoute.has(b.edgeId) || routes.some((r) => r.segments.some((s) => s.edge.id === b.edgeId)))).map((b) => <BarrierMarker key={b.id} net={net} barrier={b} />)}
          <OriginMarker node={origin} />
          <PoiMarker node={dest} />
          <MapCallout x={dest.x - 22} y={dest.y + 30} anchor="end">{`${dest.poi} (nümunə)`}</MapCallout>
        </PilotMap>
        <div className="absolute inset-x-4 top-3 flex flex-col rounded-lg border border-line-subtle bg-overlay/95 px-4 py-1">
          <div className="flex h-11 items-center gap-3"><span className="h-3 w-3 rounded-full bg-lime" aria-hidden /><span className="flex-1 text-[14px]">Cari məkan</span>
            <span className="inline-flex h-8 items-center gap-1 rounded-full bg-lime px-3 text-[12px] font-semibold text-midnight"><Icon name={profileLabel.icon} size={16} />{profileLabel.label}</span></div>
          <div className="h-px bg-line-subtle" />
          <div className="flex h-11 items-center gap-3"><Icon name="flag" size={16} className="text-fg-2" /><span className="flex-1 text-[14px] font-semibold">{dest.poi}</span>
            <button onClick={() => setView("setup")} className="text-[12px] font-semibold text-link" aria-label="Təyinatı və ya profili dəyiş">Dəyiş</button></div>
        </div>
        <div className="absolute bottom-3 left-4"><SampleTag /></div>
      </div>

      {view === "routes" && (
        <section aria-labelledby="routes-h" className="-mt-4 flex flex-1 flex-col gap-3 rounded-t-xl border-t border-line-subtle bg-overlay px-4 pb-4 pt-3">
          <div className="mx-auto h-1 w-9 rounded-full bg-line-strong" aria-hidden />
          <div className="flex items-center gap-2"><h2 id="routes-h" className="h2 flex-1">Marşrut seçin</h2><Badge tone="sample">Nümunə məlumat</Badge></div>
          {!alt?.suitable ? (
            <Notice tone="danger">{profileLabel.label} profili üçün bu təyinata keçilə bilən marşrut tapılmadı. Başqa təyinat seçin və ya maneəni bildirin.</Notice>
          ) : (
            <>
              <div role="radiogroup" aria-label="Marşrut variantları" className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                <RouteCard r={alt.suitable} title="Sizin üçün uyğun marşrut" recommended={alt.suitable.blockingConfirmed.length === 0} selected={choice === "suitable"} onSelect={() => setChoice("suitable")} />
                {alt.shortest && <RouteCard r={alt.shortest} title="Ən qısa marşrut" recommended={false} selected={choice === "shortest"} onSelect={() => setChoice("shortest")} />}
              </div>
              {alt.identical && <p className="text-[12px] text-fg-2">Ən qısa marşrut da bu profil üçün uyğundur.</p>}
              <Button icon="route" onClick={() => setView("detail")} data-testid="route-detail">Marşrut təfərrüatları</Button>
              {(selected.unknownSegments > 0 || selected.blockingUnverified.length > 0) && (
                <p className="flex items-center gap-1.5 text-[12px] text-fg-2"><Icon name="clock" size={14} className="text-warning" />Bu marşrutun əlçatanlığı tam təsdiqlənməyib.</p>
              )}
            </>
          )}
        </section>
      )}

      {view === "detail" && selected && (
        <section aria-labelledby="detail-h" className="-mt-4 flex flex-1 flex-col gap-3 rounded-t-xl border-t border-line-subtle bg-overlay px-4 pb-4 pt-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setView("routes")} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-raised" aria-label="Marşrut seçiminə qayıt"><Icon name="arrow-left" size={22} /></button>
            <div className="flex-1"><h2 id="detail-h" className="h3">{selected.mode === "suitable" ? "Sizin üçün uyğun marşrut" : "Ən qısa marşrut"}</h2>
              <p className="data text-fg-2">{km(selected.lengthM)}  ·  {mins(selected.minutes)}  ·  {profileLabel.label}</p></div>
          </div>
          <ol className="flex flex-col gap-2" aria-label="Marşrut seqmentləri">
            {selected.segments.map((s) => {
              const [tone, txt] = PASS_LABEL[s.passability];
              const needsReport = s.passability === "unknown" || s.passability === "uncertain";
              return (
                <li key={s.edge.id} data-testid={`seg-${s.edge.id}`} className="flex flex-col gap-2 rounded-md border border-line-subtle bg-surface p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1"><p className="text-[14px] font-semibold">{s.edge.label}</p><p className="data text-fg-3">{s.edge.id}  ·  {Math.round(s.lengthM)} m</p></div>
                    <Badge tone={tone}>{txt}</Badge>
                  </div>
                  {s.barriers.map((b) => <p key={b.id} className="text-[12px] text-fg-2">{b.id}: {CATEGORY_LABEL[b.type]}. {b.note}</p>)}
                  {needsReport && (
                    <AppLink href={`/vision?segment=${s.edge.id}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-link"><Icon name="camera" size={16} />Bu seqmentdə maneə bildir</AppLink>
                  )}
                </li>
              );
            })}
          </ol>
          <Notice tone="warning">Marşrut nümunə şəbəkə üzərində hesablanıb. Real naviqasiya üçün istifadə etməyin.</Notice>
        </section>
      )}
    </MobileShell>
  );
}
