"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/* Mirrors the Figma components: Button, Chip, Status Badge, Notice, Tab, Stat Tile. */

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-lime text-midnight hover:bg-lime-hover",
  secondary: "bg-raised text-fg border-[1.5px] border-line hover:border-line-strong",
  ghost: "text-fg hover:bg-raised",
  danger: "text-danger border-[1.5px] border-danger hover:bg-danger/10",
};

export function Button({
  variant = "primary",
  size = "lg",
  icon,
  children,
  className = "",
  ...rest
}: { variant?: BtnVariant; size?: "lg" | "md"; icon?: IconName; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold text-[14px] leading-5 transition-colors
        ${size === "lg" ? "h-[52px] px-6" : "h-10 px-4"}
        disabled:bg-disabled-bg disabled:text-disabled-fg disabled:border-transparent disabled:cursor-not-allowed
        ${BTN[variant]} ${className}`}
    >
      {icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  );
}

export function Chip({ selected, icon, children, onClick, ariaLabel }: { selected: boolean; icon?: IconName; children: ReactNode; onClick?: () => void; ariaLabel?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-1 rounded-full border px-3 text-[14px] font-semibold transition-colors
        ${selected ? "bg-lime border-lime text-midnight" : "bg-surface border-line text-fg-2 hover:border-line-strong"}`}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
      {selected && <Icon name="check" size={16} />}
    </button>
  );
}

export type BadgeTone = "confirmed" | "unverified" | "ai" | "barrier" | "sample" | "recommended" | "unknown";
const BADGE: Record<BadgeTone, [string, IconName]> = {
  confirmed: ["text-success border-success", "check-circle"],
  unverified: ["text-warning border-warning", "clock"],
  unknown: ["text-warning border-warning", "info"],
  ai: ["text-info border-info", "sparkle"],
  barrier: ["text-danger border-danger", "alert"],
  sample: ["text-fg-2 border-fg-2", "flag"],
  recommended: ["bg-lime text-midnight border-lime", "check"],
};
export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  const [cls, icon] = BADGE[tone];
  return (
    <span className={`inline-flex h-[26px] items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[12px] font-semibold tracking-[0.01em] ${tone === "recommended" ? "" : "bg-raised"} ${cls}`}>
      <Icon name={icon} size={14} />
      {children}
    </span>
  );
}

const NOTE: Record<"warning" | "info" | "sample" | "danger", [string, IconName]> = {
  warning: ["border-warning text-warning", "alert"],
  info: ["border-info text-info", "info"],
  sample: ["border-fg-2 text-fg-2", "flag"],
  danger: ["border-danger text-danger", "alert"],
};
export function Notice({ tone, children, className = "" }: { tone: keyof typeof NOTE; children: ReactNode; className?: string }) {
  const [cls, icon] = NOTE[tone];
  return (
    <div role={tone === "danger" ? "alert" : "note"} className={`flex items-start gap-2 rounded-sm border-l-[3px] bg-surface p-3 ${cls} ${className}`}>
      <Icon name={icon} size={18} className="mt-px" />
      <div className="text-[12px] leading-4 text-fg">{children}</div>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-md bg-sunken p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 shrink-0 rounded-sm px-4 text-[14px] font-semibold transition-colors ${value === o.value ? "bg-raised text-fg border border-line-strong" : "text-fg-2 hover:text-fg"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StatTile({ label, value, caption }: { label: string; value: ReactNode; caption: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line-subtle bg-surface p-4">
      <span className="eyebrow text-fg-3">{label}</span>
      <span className="h1">{value}</span>
      <span className="text-[12px] leading-4 text-fg-2">{caption}</span>
    </div>
  );
}

export function SampleTag({ children = "Nümunə xəritə · Pilot zona A" }: { children?: ReactNode }) {
  return <span className="eyebrow inline-block rounded-sm bg-canvas/90 px-2 py-1 text-fg-2">{children}</span>;
}
