"use client";
import type { ReactNode } from "react";
import { AppLink, usePath } from "@/lib/nav";
import { useApp } from "@/lib/store";
import { DemoGuide } from "./DemoGuide";
import { Icon, type IconName } from "./Icon";
import { Logo } from "./Logo";
import { Badge } from "./ui";

const MOBILE_NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/go", label: "Xəritə", icon: "map" },
  { href: "/vision", label: "Bildir", icon: "camera" },
  { href: "/urban", label: "Urban", icon: "layers" },
  { href: "/", label: "Ana səhifə", icon: "home" },
];

/** Mobile-first column used by Urbiva Go and Urbiva Vision (390 px design, centred on desktop). */
export function MobileShell({ children, title }: { children: ReactNode; title: string }) {
  const path = usePath();
  return (
    <div className="flex min-h-dvh flex-col bg-sunken">
      <DemoGuide />
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col bg-canvas sm:my-4 sm:rounded-xl sm:border sm:border-line-subtle sm:overflow-hidden">
        <h1 className="sr-only">{title}</h1>
        <main className="flex flex-1 flex-col">{children}</main>
        <nav aria-label="Əsas naviqasiya" className="sticky bottom-0 z-20 flex h-[72px] items-start justify-between border-t border-line-subtle bg-overlay px-4 pt-2">
          {MOBILE_NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <AppLink key={n.href} href={n.href} aria-current={active ? "page" : undefined} className="flex w-20 flex-col items-center gap-1">
                <span className={`flex h-[30px] w-14 items-center justify-center rounded-full ${active ? "bg-raised text-lime" : "text-fg-3"}`}><Icon name={n.icon} size={22} /></span>
                <span className={`text-[12px] font-semibold ${active ? "text-fg" : "text-fg-3"}`}>{n.label}</span>
              </AppLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

const DESK_NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/urban", label: "İcmal", icon: "layers" },
  { href: "/impact", label: "Impact simulyasiyası", icon: "play" },
];
const CITIZEN_NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/go", label: "Urbiva Go", icon: "route" },
  { href: "/vision", label: "Urbiva Vision", icon: "camera" },
];

/** Planner layout used by Urbiva Urban and Urbiva Impact (1440 px design, responsive). */
export function DesktopShell({ children }: { children: ReactNode }) {
  const path = usePath();
  const { net } = useApp();
  const item = (n: (typeof DESK_NAV)[number]) => {
    const active = path.startsWith(n.href);
    return (
      <AppLink key={n.href} href={n.href} aria-current={active ? "page" : undefined}
        className={`flex h-11 items-center gap-3 rounded-sm px-3 text-[14px] ${active ? "border-l-[3px] border-lime bg-raised font-semibold text-fg" : "text-fg-2 hover:bg-surface"}`}>
        <Icon name={n.icon} size={20} className={active ? "text-lime" : ""} />{n.label}
      </AppLink>
    );
  };
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoGuide />
      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="flex shrink-0 flex-col gap-1 border-b border-line-subtle bg-sunken p-4 lg:w-[248px] lg:border-b-0 lg:border-r lg:p-6 lg:pb-6">
          <AppLink href="/" className="mb-2 inline-block w-fit"><Logo height={32} /></AppLink>
          <nav aria-label="Urbiva Urban" className="flex flex-wrap gap-1 lg:mt-6 lg:flex-col">
            <span className="eyebrow hidden px-3 pb-2 text-fg-3 lg:block">Urbiva Urban</span>
            {DESK_NAV.map(item)}
            <span className="eyebrow hidden px-3 pb-2 pt-5 text-fg-3 lg:block">Vətəndaş tətbiqi</span>
            {CITIZEN_NAV.map(item)}
          </nav>
          <div className="mt-auto hidden flex-col gap-2 rounded-md border border-line-subtle bg-surface p-3 lg:flex">
            <span className="text-[14px] font-semibold">{net.name}</span>
            <span className="text-[12px] text-fg-2">{net.edges.length} seqment · nümunə qraf</span>
            <span><Badge tone="sample">Nümunə məlumat</Badge></span>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
