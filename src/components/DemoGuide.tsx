"use client";
import { useMemo, useState } from "react";
import { reachability, simulateIntervention } from "@/lib/engine/graph";
import { AppLink } from "@/lib/nav";
import { useApp } from "@/lib/store";
import { Icon } from "./Icon";

/**
 * Guided demo: the nine steps of the hackathon scenario. Each step is derived
 * from real app state (graph, reports, reviews), not from a script.
 */
export function useDemoSteps() {
  const { state, net } = useApp();
  return useMemo(() => {
    const stairsReport = net.barriers.find((b) => b.edgeId === "S-07" && b.type === "stairs");
    const confirmed = stairsReport?.verification === "confirmed";
    let increased = false;
    if (state.demo.simulatedBarrierId && net.barriers.some((b) => b.id === state.demo.simulatedBarrierId)) {
      const before = reachability(net, "wheelchair").reachablePois.length;
      const after = reachability(simulateIntervention(net, state.demo.simulatedBarrierId), "wheelchair").reachablePois.length;
      increased = after > before;
    }
    const steps = [
      { label: "Əlil arabası profili ilə təyinat seçin (Poliklinika)", done: state.profile === "wheelchair" && state.destinationId === "N11", href: "/go" },
      { label: "Urbiva uyğun marşrutu hesablayır", done: state.demo.routeViewed, href: "/go" },
      { label: "Yeraltı keçiddə pilləkən aşkarlanır (Vision)", done: state.demo.stairsDetected || !!stairsReport, href: "/vision?segment=S-07" },
      { label: "İstifadəçi maneəni təsdiqləyib bildirir", done: !!stairsReport, href: "/vision?segment=S-07" },
      { label: "Urban panelində görünür, planlaşdırıcı təsdiqləyir", done: state.demo.urbanViewed && confirmed, href: "/urban" },
      { label: "Planlaşdırıcı rampa əlavə etməyi simulyasiya edir", done: !!state.demo.simulatedBarrierId, href: "/urban" },
      { label: "Qraf yenidən hesablanır", done: !!state.demo.simulatedBarrierId, href: "/impact" },
      { label: "Əlçatan təyinatların sayı artır (qraf hesablaması)", done: increased, href: "/impact" },
      { label: "Impact paneli yenilənmiş nəticəni göstərir", done: state.demo.impactViewed && increased, href: "/impact" },
    ];
    const current = steps.findIndex((s) => !s.done);
    return { steps, current: current === -1 ? steps.length : current };
  }, [state, net]);
}

export function DemoGuide() {
  const { dispatch } = useApp();
  const { steps, current } = useDemoSteps();
  const [open, setOpen] = useState(false);
  const finished = current >= steps.length;
  const step = steps[Math.min(current, steps.length - 1)];
  return (
    <section aria-label="Demo ssenarisi" className="border-b border-line-subtle bg-overlay text-[12px]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
        <span className="eyebrow text-fg-3">Demo ssenarisi · nümunə məlumat</span>
        <span className="flex items-center gap-1" aria-hidden>
          {steps.map((s, i) => <span key={i} className={`h-1.5 w-5 rounded-full ${s.done ? "bg-lime" : i === current ? "bg-line-strong" : "bg-line"}`} />)}
        </span>
        <span data-testid="demo-progress" className="font-semibold text-fg">
          {finished ? "Ssenari tamamlandı: 9 / 9" : `Addım ${current + 1} / 9: ${step.label}`}
        </span>
        {!finished && <AppLink href={step.href} className="font-semibold text-link underline-offset-2 hover:underline">Bu addıma keç</AppLink>}
        <span className="ml-auto flex items-center gap-2">
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="rounded-sm px-2 py-1 text-fg-2 hover:bg-raised">Addımlar</button>
          <button onClick={() => { if (window.confirm("Demo məlumatları sıfırlansın?")) dispatch({ type: "reset" }); }} className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-fg-2 hover:bg-raised" data-testid="demo-reset">
            <Icon name="reset" size={14} /> Sıfırla
          </button>
        </span>
      </div>
      {open && (
        <ol className="mx-auto grid max-w-[1440px] gap-1 px-4 pb-3 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={i} className={`flex items-center gap-2 ${s.done ? "text-fg" : "text-fg-3"}`}>
              <Icon name={s.done ? "check-circle" : "clock"} size={14} className={s.done ? "text-success" : ""} />
              {i + 1}. {s.label}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
