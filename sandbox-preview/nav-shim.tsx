/* Sandbox-only replacement for src/lib/nav.tsx (hash router instead of Next.js). */
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

const current = () => (window.location.hash.slice(1) || "/");
function useHash() {
  const [h, setH] = useState(current());
  useEffect(() => { const f = () => setH(current()); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  return h;
}

export function AppLink({ href, className, children, ...rest }: { href: string; className?: string; children: ReactNode; "aria-current"?: "page" | undefined }) {
  return <a href={"#" + href} className={className} {...rest} onClick={(e: MouseEvent) => { e.preventDefault(); window.location.hash = href; window.scrollTo(0, 0); }}>{children}</a>;
}
export function useNav() { return { push: (href: string) => { window.location.hash = href; window.scrollTo(0, 0); } }; }
export function usePath() { return useHash().split("?")[0]; }
export function useQueryParam(name: string): string | null { const h = useHash(); return new URLSearchParams(h.split("?")[1] ?? "").get(name); }
