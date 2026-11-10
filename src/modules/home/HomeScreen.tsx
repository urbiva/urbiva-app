"use client";
import { DemoGuide } from "@/components/DemoGuide";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui";
import { AppLink } from "@/lib/nav";

const MODULES: { href: string; name: string; desc: string; icon: IconName; who: string }[] = [
  { href: "/go", name: "Urbiva Go", desc: "Hərəkət profilinə görə uyğun piyada marşrutu", icon: "route", who: "Vətəndaş · mobil" },
  { href: "/vision", name: "Urbiva Vision", desc: "Şəkildən maneənin AI təxmini və insan təsdiqi", icon: "camera", who: "Vətəndaş · mobil" },
  { href: "/urban", name: "Urbiva Urban", desc: "Pilot zona xəritəsi, maneə qeydləri, yoxlama", icon: "layers", who: "Planlaşdırıcı · masaüstü" },
  { href: "/impact", name: "Urbiva Impact", desc: "Maneə aradan qalxsa nə dəyişir: qraf simulyasiyası", icon: "play", who: "Planlaşdırıcı · masaüstü" },
];

const TRUTH: [string, string, "confirmed" | "ai" | "sample"][] = [
  ["Qraf əsaslı marşrut və əlçatanlıq hesablaması", "Real (brauzerdə işləyir)", "confirmed"],
  ["Maneə bildirişi, planlaşdırıcı yoxlaması, simulyasiya", "Real məntiq, brauzerdə saxlanılır", "confirmed"],
  ["Şəkil analizi (Claude vision)", "Real AI, API açarı tələb olunur; nəticə təxmindir", "ai"],
  ["Pilot zona, seqmentlər, maneə qeydləri", "Nümunə məlumat (sahədə ölçülməyib)", "sample"],
];

export function HomeScreen() {
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoGuide />
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-10 px-4 py-10 sm:px-8">
        <header className="flex flex-col gap-4">
          <Logo height={48} />
          <h1 className="font-display text-[40px] leading-[44px] font-extrabold tracking-[-0.02em]">AI for Accessible Cities</h1>
          <p className="max-w-[640px] text-[16px] leading-6 text-fg-2">Ən qısa yol hər kəs üçün keçilə bilən yol deyil. Urbiva insanlara daha uyğun piyada marşrutu tapmağa, şəhər planlaşdırıcılarına isə hansı maneəni əvvəlcə aradan qaldırmağı seçməyə kömək edir.</p>
          <p className="eyebrow text-lime">Every city. Every possibility.</p>
          <div className="flex flex-wrap gap-3">
            <AppLink href="/go" className="inline-flex h-[52px] items-center gap-2 rounded-md bg-lime px-6 text-[14px] font-semibold text-midnight"><Icon name="play" />Demo ssenarisini başla</AppLink>
            <AppLink href="/urban" className="inline-flex h-[52px] items-center gap-2 rounded-md border-[1.5px] border-line bg-raised px-6 text-[14px] font-semibold"><Icon name="layers" />Planlaşdırıcı paneli</AppLink>
          </div>
        </header>
        <section aria-labelledby="mod-h" className="flex flex-col gap-3">
          <h2 id="mod-h" className="h2">Modullar</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {MODULES.map((m) => (
              <li key={m.href}>
                <AppLink href={m.href} className="flex h-full items-start gap-4 rounded-lg border border-line-subtle bg-surface p-5 hover:border-line-strong">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-raised text-lime"><Icon name={m.icon} size={22} /></span>
                  <span className="flex flex-col gap-1"><span className="h3">{m.name}</span><span className="text-[14px] text-fg-2">{m.desc}</span><span className="eyebrow text-fg-3">{m.who}</span></span>
                </AppLink>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="truth-h" className="flex flex-col gap-3">
          <h2 id="truth-h" className="h2">Nə realdır, nə nümunədir</h2>
          <ul className="flex flex-col divide-y divide-line-subtle rounded-lg border border-line-subtle bg-surface">
            {TRUTH.map(([a, b, t]) => (
              <li key={a} className="flex flex-wrap items-center gap-3 p-4"><span className="flex-1 text-[14px] font-semibold">{a}</span><Badge tone={t}>{b}</Badge></li>
            ))}
          </ul>
        </section>
        <footer className="text-[12px] text-fg-3">“İnsanyönümlü şəhərlər” hakatonu, Bakı, 2026 · prototip · Şəhər hər kəs üçün işləsin.</footer>
      </main>
    </div>
  );
}
