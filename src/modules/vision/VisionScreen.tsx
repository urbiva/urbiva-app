"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { MobileShell } from "@/components/Shells";
import { Badge, Button, Chip, Notice } from "@/components/ui";
import type { BarrierType } from "@/lib/engine/types";
import { CATEGORY_LABEL, CONFIDENCE_LABEL, type VisionCategory, type VisionResponse } from "@/lib/vision/categories";
import { prepareFile, prepareSampleIllustration, requestAnalysis, type PreparedImage } from "@/lib/vision/client";
import { AppLink, useQueryParam } from "@/lib/nav";
import { useApp } from "@/lib/store";

const CHOICES: { id: BarrierType; icon: IconName }[] = [
  { id: "stairs", icon: "stairs" },
  { id: "blocked_path", icon: "barrier" },
  { id: "broken_surface", icon: "broken-surface" },
  { id: "curb", icon: "curb" },
  { id: "obstruction", icon: "alert" },
  { id: "other", icon: "more" },
];

type Phase = "idle" | "preparing" | "analyzing" | "done";

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const items = ["Şəkil", "Analiz", "Təsdiq"];
  return (
    <ol className="flex items-center gap-2" aria-label="Addımlar">
      {items.map((l, i) => {
        const n = i + 1; const done = n < step; const active = n === step;
        return (
          <li key={l} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            {i > 0 && <span className="h-0.5 w-5 bg-line" aria-hidden />}
            <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px] font-semibold ${done ? "bg-lime text-midnight" : active ? "border-2 border-lime" : "border border-line text-fg-3"}`}>
              {done ? <Icon name="check" size={14} /> : n}
            </span>
            <span className={`text-[14px] ${active ? "font-semibold" : done ? "" : "text-fg-3"}`}>{l}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function VisionScreen() {
  const { net, dispatch } = useApp();
  const segParam = useQueryParam("segment");
  const [segment, setSegment] = useState("");
  const [img, setImg] = useState<PreparedImage | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [resp, setResp] = useState<VisionResponse | null>(null);
  const [category, setCategory] = useState<BarrierType | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const segId = useId(), noteId = useId();

  useEffect(() => { if (segParam && net.edges.some((e) => e.id === segParam)) setSegment(segParam); }, [segParam, net.edges]);
  useEffect(() => () => { if (img) URL.revokeObjectURL(img.previewUrl); abortRef.current?.abort(); }, [img]);

  const load = async (p: Promise<PreparedImage>) => {
    setErr(null); setResp(null); setCategory(null); setPhase("preparing");
    try { setImg(await p); setPhase("idle"); } catch (e) { setErr((e as Error).message); setPhase("idle"); }
  };

  const analyze = async () => {
    if (!img) return;
    abortRef.current?.abort(); const ctrl = new AbortController(); abortRef.current = ctrl;
    setPhase("analyzing"); setErr(null);
    try {
      const r = await requestAnalysis(img, ctrl.signal);
      setResp(r);
      if (r.status === "ok") {
        const c = r.result.category;
        setCategory(c === "none" ? null : c);
        if (c === "stairs") dispatch({ type: "stairsDetected" });
      }
    } catch { /* aborted */ }
    setPhase("done");
  };

  const pick = (c: BarrierType) => { setCategory(c); if (c === "stairs" && resp?.status !== "ok") dispatch({ type: "stairsDetected" }); };

  const submit = () => {
    if (!segment || !category) return;
    const before = net.barriers.length;
    dispatch({ type: "report", edgeId: segment, barrierType: category, aiAssisted: resp?.status === "ok", note: note.trim() || undefined });
    setSubmitted(`${segment}:${before}`);
  };

  const aiCat: VisionCategory | null = resp?.status === "ok" ? resp.result.category : null;
  const step: 1 | 2 | 3 = !img ? 1 : resp ? 3 : 2;
  const report = submitted ? net.barriers.filter((b) => b.edgeId === submitted.split(":")[0]).at(-1) : null;

  if (submitted && report) {
    return (
      <MobileShell title="Urbiva Vision: hesabat göndərildi">
        <div className="flex flex-col gap-4 p-4 pt-8" role="status">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lime text-midnight"><Icon name="check" size={28} /></span>
          <h2 className="h1">Maneə bildirildi</h2>
          <p className="text-[14px] text-fg-2">{report.id}: {CATEGORY_LABEL[report.type]}, seqment {report.edgeId}. Planlaşdırıcı yoxlayana qədər hesabat <strong>yoxlanılmamış</strong> kimi göstərilir və marşrutlarda ehtiyatla nəzərə alınır.</p>
          <div><Badge tone="unverified">Yoxlanılmayıb</Badge></div>
          <AppLink href="/urban" className="inline-flex h-[52px] items-center justify-center gap-2 rounded-md bg-lime px-6 text-[14px] font-semibold text-midnight">Urban panelində bax</AppLink>
          <Button variant="secondary" icon="plus" onClick={() => { setSubmitted(null); setImg(null); setResp(null); setCategory(null); setNote(""); setPhase("idle"); }}>Yeni bildiriş</Button>
          <p className="text-[12px] text-fg-3">Şəkil saxlanılmır. Bu demoda hesabat yalnız bu brauzerdə saxlanılır.</p>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Urbiva Vision: maneəni bildirin">
      <div className="flex items-center gap-1 px-2 pt-2">
        <AppLink href="/go" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-raised" aria-label="Geri"><Icon name="arrow-left" size={24} /></AppLink>
        <h2 className="h3">Maneəni bildirin</h2>
      </div>
      <div className="flex flex-col gap-4 px-4 pb-6 pt-2">
        <Stepper step={step} />

        <div className="flex flex-col gap-1">
          <label htmlFor={segId} className="text-[12px] font-semibold text-fg-2">Məkan (pilot zona seqmenti)</label>
          <select id={segId} value={segment} onChange={(e) => setSegment(e.target.value)} data-testid="segment-select"
            className="h-[52px] rounded-md border border-line bg-surface px-3 text-[14px] text-fg">
            <option value="">Seqment seçin</option>
            {net.edges.map((e) => <option key={e.id} value={e.id}>{e.id} · {e.label}</option>)}
          </select>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-line-subtle bg-surface">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.previewUrl} alt="Yüklənmiş şəklin önizləməsi" className="h-[200px] w-full object-cover" />
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-fg-2">
              <Icon name="camera" size={32} />
              <span className="text-[14px]">Şəkil əlavə edin</span>
            </div>
          )}
          {phase === "analyzing" && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-canvas/70" role="status" aria-live="polite">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-lime border-t-transparent" aria-hidden />Məlumat yoxlanılır...
            </div>
          )}
          {aiCat && aiCat !== "none" && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-sm border border-info bg-canvas px-2 py-0.5 text-[12px] font-semibold text-info">
              <Icon name="sparkle" size={14} />{CATEGORY_LABEL[aiCat]} · AI təxmini
            </span>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" aria-label="Şəkil seç"
          data-testid="file-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) load(prepareFile(f)); e.target.value = ""; }} />
        <div className="flex gap-2">
          <Button variant="secondary" size="md" icon="upload" onClick={() => fileRef.current?.click()} disabled={phase === "preparing" || phase === "analyzing"}>{img ? "Başqa şəkil" : "Şəkil seç"}</Button>
          <Button variant="ghost" size="md" icon="flag" onClick={() => load(prepareSampleIllustration())} data-testid="use-sample">Nümunə şəkil</Button>
        </div>
        {err && <Notice tone="danger">{err}</Notice>}

        {img && !resp && (
          <Button icon="sparkle" onClick={analyze} disabled={phase === "analyzing"} data-testid="analyze">{phase === "analyzing" ? "Analiz edilir..." : "AI ilə analiz et"}</Button>
        )}

        {resp?.status === "ok" && (
          <section className="flex flex-col gap-2 rounded-lg border border-line-subtle bg-surface p-4" aria-label="AI nəticəsi" data-testid="ai-result">
            <div className="flex items-center justify-between"><span className="eyebrow text-fg-3">AI nəticəsi</span><Badge tone="ai">AI təxmini</Badge></div>
            <p className="h3">{resp.result.category === "none" ? "Maneə aşkarlanmadı (ehtimal)" : `Aşkarlanmış maneə: ${CATEGORY_LABEL[resp.result.category].toLowerCase()} (ehtimal)`}</p>
            <p className="text-[12px] text-fg-2">Etibarlılıq: {CONFIDENCE_LABEL[resp.result.confidence]}. {resp.result.rationale}</p>
            <p className="text-[12px] text-fg-3">Meyl və en kimi ölçülər adi şəkildən dəqiq müəyyən edilmir. Nəticəni yoxlayın. Model: {resp.model}</p>
          </section>
        )}
        {resp?.status === "not_configured" && <Notice tone="info">{resp.message}</Notice>}
        {resp?.status === "error" && (
          <Notice tone="danger">{resp.message} <button className="font-semibold underline" onClick={analyze}>Yenidən cəhd et</button> və ya maneəni əl ilə seçin.</Notice>
        )}

        {resp && (
          <>
            <fieldset>
              <legend className="mb-2 text-[14px] font-semibold">{resp.status === "ok" ? "Maneəni təsdiqləyin və ya düzəldin" : "Maneəni əl ilə seçin"}</legend>
              <div role="radiogroup" className="flex flex-wrap gap-2">
                {CHOICES.map((c) => <Chip key={c.id} icon={c.icon} selected={category === c.id} onClick={() => pick(c.id)}>{CATEGORY_LABEL[c.id]}</Chip>)}
              </div>
            </fieldset>
            <div className="flex flex-col gap-1">
              <label htmlFor={noteId} className="text-[12px] font-semibold text-fg-2">Qısa təsvir (istəyə bağlı)</label>
              <textarea id={noteId} value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} rows={2} className="rounded-md border border-line bg-surface p-3 text-[14px]" />
            </div>
            <Button icon="check" onClick={submit} disabled={!segment || !category} data-testid="confirm-report">Maneəni təsdiqləyin</Button>
            {!segment && <p className="text-[12px] text-warning">Göndərmək üçün seqment seçin.</p>}
            <p className="flex items-center gap-1.5 text-[12px] text-fg-2"><Icon name="info" size={14} className="text-info" />Moderator yoxlayana qədər hesabat “yoxlanılmamış” qalır.</p>
          </>
        )}
      </div>
    </MobileShell>
  );
}
