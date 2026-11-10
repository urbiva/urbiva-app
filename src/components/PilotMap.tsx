"use client";
import type { ReactNode } from "react";
import { edgePoints, nodeMap } from "@/lib/engine/graph";
import type { Barrier, GraphNode, PilotNetwork } from "@/lib/engine/types";
import { ICON_PATHS, type IconName } from "./Icon";

/**
 * Original, simplified vector map of the SAMPLE pilot zone (same geometry as the
 * Figma component "Map / Pilot Zone A (sample)"). Not real Baku streets.
 * Everything is drawn in the 800 x 640 map coordinate space.
 */
const XS = [80, 220, 360, 500, 640, 760];
const YS = [80, 200, 320, 440, 540];
const PARKS = new Set(["3,1", "4,3"]);

function BaseMap() {
  const xe = [0, ...XS, 800];
  const ye = [0, ...YS];
  const blocks: ReactNode[] = [];
  for (let i = 0; i < xe.length - 1; i++)
    for (let j = 0; j < ye.length - 1; j++) {
      const x0 = xe[i] + 10, x1 = xe[i + 1] - 10, y0 = ye[j] + 10, y1 = ye[j + 1] - 10;
      if (x1 - x0 < 20 || y1 - y0 < 20) continue;
      blocks.push(<rect key={`${i}-${j}`} x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={6} className={PARKS.has(`${i},${j}`) ? "fill-map-park" : "fill-map-block"} />);
    }
  return (
    <g aria-hidden>
      <rect width={800} height={640} className="fill-map-land" />
      <path d="M0 575 C160 590 300 600 420 596 C560 592 680 580 800 570 L800 640 L0 640 Z" className="fill-map-water" />
      <path d="M0 552 L800 552 L800 568 C680 578 560 590 420 594 C300 598 160 588 0 573 Z" className="fill-map-park" />
      {blocks}
      <path d="M103 540 L640 80" className="stroke-map-land" strokeWidth={20} fill="none" />
      <path d="M103 540 L640 80" className="stroke-map-street" strokeWidth={2} fill="none" />
      {XS.map((x) => <path key={"v" + x} d={`M${x} 0 V540`} className="stroke-map-street" strokeWidth={2} fill="none" />)}
      {YS.map((y) => <path key={"h" + y} d={`M0 ${y} H800`} className="stroke-map-street" strokeWidth={2} fill="none" />)}
    </g>
  );
}

export function PilotMap({ viewBox = [0, 0, 800, 640], children, label, className = "" }: { viewBox?: [number, number, number, number]; children?: ReactNode; label: string; className?: string }) {
  return (
    <svg viewBox={viewBox.join(" ")} preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} className={`block h-full w-full ${className}`}>
      <BaseMap />
      {children}
    </svg>
  );
}

export type LineTone = "accessible" | "shortest" | "unknown" | "barrier" | "faint" | "halo";
const TONE: Record<LineTone, { cls: string; w: number; dash?: string; opacity?: number }> = {
  accessible: { cls: "stroke-lime", w: 7 },
  shortest: { cls: "stroke-lavender", w: 5, dash: "10 10" },
  unknown: { cls: "stroke-warning", w: 6, dash: "2 8" },
  barrier: { cls: "stroke-danger", w: 6 },
  faint: { cls: "stroke-line-strong", w: 3, opacity: 0.55 },
  halo: { cls: "stroke-lime", w: 16, opacity: 0.3 },
};

/** Draws one network edge (optionally only a fraction from one end, for reachability). */
export function EdgeLine({ net, edgeId, tone, fraction = 1, fromNode, casing = false }: { net: PilotNetwork; edgeId: string; tone: LineTone; fraction?: number; fromNode?: string; casing?: boolean }) {
  const e = net.edges.find((x) => x.id === edgeId);
  if (!e) return null;
  let pts = edgePoints(e, nodeMap(net));
  if (fromNode && fromNode === e.to) pts = [...pts].reverse();
  if (fraction < 1) {
    const [a, b] = [pts[0], pts[pts.length - 1]];
    pts = [a, [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction]];
  }
  const d = "M" + pts.map((p) => p.join(" ")).join(" L");
  const t = TONE[tone];
  return (
    <g data-edge={edgeId} data-tone={tone}>
      {casing && <path d={d} className="stroke-map-land" strokeWidth={t.w + 6} fill="none" strokeLinecap="round" />}
      <path d={d} className={t.cls} strokeWidth={t.w} strokeDasharray={t.dash} opacity={t.opacity} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, k) => {
    const a = ((-90 + 60 * k) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

function MapGlyph({ name, cx, cy, size, className }: { name: IconName; cx: number; cy: number; size: number; className: string }) {
  return (
    <svg x={cx - size / 2} y={cy - size / 2} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className} dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }} />
  );
}

export function barrierPoint(net: PilotNetwork, b: Barrier): [number, number] {
  const e = net.edges.find((x) => x.id === b.edgeId)!;
  const pts = edgePoints(e, nodeMap(net));
  const t = b.at ?? 0.5;
  const [a, c] = [pts[0], pts[pts.length - 1]];
  return [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
}

/** Hexagon marker from the core of the Urbiva mark. Shape + glyph carry meaning, colour is secondary. */
export function BarrierMarker({ net, barrier, selected, onSelect }: { net: PilotNetwork; barrier: Barrier; selected?: boolean; onSelect?: (id: string) => void }) {
  const [cx, cy] = barrierPoint(net, barrier);
  const confirmed = barrier.verification === "confirmed";
  const r = selected ? 22 : 16;
  const label = `${barrier.id}: ${confirmed ? "təsdiqlənmiş maneə" : "yoxlanılmamış məlumat"}`;
  const interactive = !!onSelect;
  return (
    <g
      data-barrier={barrier.id}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
      aria-pressed={interactive ? !!selected : undefined}
      onClick={() => onSelect?.(barrier.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(barrier.id); } }}
      className={interactive ? "cursor-pointer" : undefined}
    >
      {selected && <polygon points={hexPoints(cx, cy, r + 6)} className="fill-none stroke-lime" strokeWidth={3} />}
      <polygon points={hexPoints(cx, cy, r)} className={`${confirmed ? "fill-danger" : "fill-warning"} stroke-canvas`} strokeWidth={2} />
      <MapGlyph name={confirmed ? "alert" : "clock"} cx={cx} cy={cy} size={r} className="text-canvas" />
    </g>
  );
}

export function PoiMarker({ node, dim = false, number, highlight = false }: { node: GraphNode; dim?: boolean; number?: number; highlight?: boolean }) {
  return (
    <g data-poi={node.id} opacity={dim ? 0.45 : 1} aria-label={node.poi}>
      <polygon points={hexPoints(node.x, node.y, 16)} className="fill-porcelain stroke-canvas" strokeWidth={2} />
      <MapGlyph name="flag" cx={node.x} cy={node.y} size={16} className="text-canvas" />
      {number !== undefined && (
        <g>
          <circle cx={node.x + 17} cy={node.y - 15} r={9} className={highlight ? "fill-lime" : "fill-raised"} />
          <text x={node.x + 17} y={node.y - 11} textAnchor="middle" className={`font-sans text-[11px] font-semibold ${highlight ? "fill-midnight" : "fill-fg-2"}`}>{number}</text>
        </g>
      )}
    </g>
  );
}

export function OriginMarker({ node }: { node: GraphNode }) {
  return <circle cx={node.x} cy={node.y} r={11} className="fill-lime stroke-canvas" strokeWidth={4} aria-label="Başlanğıc nöqtəsi" />;
}

/** Pill label positioned in map space. */
export function MapCallout({ x, y, children, tone = "default", anchor = "start" }: { x: number; y: number; children: string; tone?: "default" | "lime"; anchor?: "start" | "end" }) {
  const w = children.length * 6.6 + 20;
  const x0 = anchor === "end" ? x - w : x;
  return (
    <g>
      <rect x={x0} y={y - 12} width={w} height={24} rx={12} className={tone === "lime" ? "fill-lime" : "fill-overlay stroke-line"} strokeWidth={1} />
      <text x={x0 + w / 2} y={y + 4} textAnchor="middle" className={`font-sans text-[12px] font-semibold ${tone === "lime" ? "fill-midnight" : "fill-fg"}`}>{children}</text>
    </g>
  );
}
