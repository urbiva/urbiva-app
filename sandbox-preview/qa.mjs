// Responsive QA sweep: widths x pages. Checks horizontal overflow, CTA reachability
// (not covered by the sticky bottom nav), clipped single-line text, and screenshots.
import { chromium } from "/opt/npm-tools/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = process.argv[2] || "http://localhost:4321";
const shots = path.join(path.dirname(fileURLToPath(import.meta.url)), "screens", "qa");
fs.mkdirSync(shots, { recursive: true });
const WIDTHS = [[375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768], [1440, 900]];
// Completed-demo state (B-07 reported, confirmed, simulated) so every panel is populated.
const STATE = { profile: "wheelchair", destinationId: "N11", scenario: { reports: [{ id: "B-07", edgeId: "S-07", type: "stairs", verification: "unverified", source: "user_report", note: "QA", at: 0.25, reportedAt: "2026-11-10T08:00:00Z" }], reviews: { "B-07": "confirmed" } }, demo: { routeViewed: true, stairsDetected: true, urbanViewed: true, simulatedBarrierId: "B-07", impactViewed: true } };
const results = []; const check = (n, ok, d = "") => { results.push(ok); if (!ok) console.log(`FAIL ${n} ${d}`); };

const b = await chromium.launch();
for (const [w, h] of WIDTHS) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto(base + "/#/"); await p.getByTestId("demo-progress").first().waitFor(); await p.waitForTimeout(200); await p.evaluate((s) => localStorage.setItem("urbiva-demo-v1", JSON.stringify(s)), STATE);
  const pages = [["home", "/"], ["go", "/go"], ["urban", "/urban"], ["impact", "/impact?barrier=B-07"], ["vision", "/vision?segment=S-07"]];
  for (const [name, route] of pages) {
    await p.goto(base + "/#" + route); await p.reload(); await p.waitForTimeout(250);
    if (name === "vision") { await p.getByTestId("use-sample").click(); await p.locator("img[alt^='Yüklənmiş']").waitFor(); await p.getByTestId("analyze").click(); await p.getByTestId("confirm-report").waitFor(); await p.getByRole("radio", { name: /Pilləkən/ }).click(); }
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`${w} ${name} no horizontal overflow`, ov <= 1, `${ov}px`);
    const clipped = await p.evaluate(() => [...document.querySelectorAll("h1,h2,h3,button,a,span,p,li")].filter((e) => {
      const cs = getComputedStyle(e); if (e.getBoundingClientRect().width <= 2 || cs.textOverflow === "ellipsis" || cs.overflowX === "auto") return false;
      return e.scrollWidth > e.clientWidth + 2 && (cs.overflow === "hidden" || cs.overflowX === "hidden") && e.textContent.trim();
    }).map((e) => e.textContent.trim().slice(0, 40)));
    check(`${w} ${name} no clipped text`, clipped.length === 0, clipped.join(" | "));
    const ctaId = { go: "route-detail", urban: "simulate", vision: "confirm-report" }[name];
    if (ctaId) {
      const cta = p.getByTestId(ctaId);
      await cta.scrollIntoViewIfNeeded();
      const hit = await cta.evaluate((el) => { const r = el.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el === t || el.contains(t); });
      check(`${w} ${name} CTA reachable, not covered`, hit);
      if (name === "urban") { check(`${w} urban simulate enabled for confirmed B-07`, await cta.isEnabled()); check(`${w} urban selects newest report B-07 after reload`, /B-07/.test(await p.getByTestId("barrier-detail").innerText())); }
      if (name === "vision") check(`${w} vision confirm enabled after category`, await cta.isEnabled());
    }
    if (name === "impact") {
      const spill = await p.evaluate(() => [...document.querySelectorAll("[data-testid=delta]")].some((t) => { const r = t.getBoundingClientRect(); return [...t.querySelectorAll("span")].some((c) => c.getBoundingClientRect().right > r.right + 1); }));
      check(`${w} impact delta values stay inside tiles`, !spill);
    }
    await p.screenshot({ path: path.join(shots, `${w}-${name}.png`), fullPage: false });
  }
  await ctx.close();
}
// Azerbaijani glyph rendering: every letter must come from a real font (no tofu)
const ctx = await b.newContext(); const p = await ctx.newPage(); await p.goto(base + "/#/");
const az = await p.evaluate(async () => { await document.fonts.ready; const s = "ƏəĞğIıİiÖöŞşÇçÜü"; return ["Manrope", "Inter", "IBM Plex Mono"].map((f) => [f, document.fonts.check(`16px "${f}"`, s)]); });
check("Azerbaijani glyph check", az.every(([, ok]) => ok), JSON.stringify(az));
console.log("glyphs", JSON.stringify(az));
await b.close();
console.log(`${results.filter(Boolean).length}/${results.length} QA checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
