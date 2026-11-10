"use client";
/**
 * Thin navigation adapter so screens do not import Next.js directly.
 * (The sandbox preview harness swaps this file for a hash-router shim.)
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function AppLink({ href, className, children, ...rest }: { href: string; className?: string; children: ReactNode; "aria-current"?: "page" | undefined }) {
  return <Link href={href} className={className} {...rest}>{children}</Link>;
}

export function useNav() {
  const router = useRouter();
  return { push: (href: string) => router.push(href) };
}

export function usePath() {
  return usePathname() ?? "/";
}

/** Reads a query parameter on the client (avoids Suspense requirements of useSearchParams). */
export function useQueryParam(name: string): string | null {
  const path = usePathname();
  const [v, setV] = useState<string | null>(null);
  useEffect(() => { setV(new URLSearchParams(window.location.search).get(name)); }, [name, path]);
  return v;
}
