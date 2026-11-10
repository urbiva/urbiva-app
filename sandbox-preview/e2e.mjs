// End-to-end test of the 9-step demo scenario against the sandbox preview.
// Usage: node sandbox-preview/e2e.mjs [baseUrl] [--no-ai]
import { chromium } from "/opt/npm-tools/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = process.argv[2] || "http://localhost:4321";
const noAi = process.argv.includes("--no-ai");
const shots = path.join(path.dirname(fileURLToPath(import.meta.url)), "screens");
fs.mkdirSync(shots, { recursive: true });
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  | " + detail : ""}`); };

const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !(noAi && /status of 503/.test(m.text())) && errors.push(m.text()));
page.on("dialog", (d) => d.accept());
const progress = async () => (await page.getByTestId("demo-progress").first().textContent()).trim();

await page.goto(base + "/#/");
await page.evaluate(() => localStorage.clear());
await page.goto(base + "/#/go"); await page.reload();

// 1. wheelchair user selects destination
await page.getByRole("radio", { name: /Əlil arabası/ }).click();
await page.getByRole("radio", { name: /Poliklinika/ }).click();
check("1 destination selected", (await progress()).startsWith("Addım 2"), await progress());
await page.getByTestId("show-routes").click();

// 2. accessible route calculated
const suit = await page.getByTestId("route-suitable").textContent();
const short = await page.getByTestId("route-shortest").textContent();
check("2 suitable route computed (1,1 km, avoids unsurveyed underpass)", /1,1 km/.test(suit) && /Bütün seqmentlər yoxlanılıb/.test(suit), suit);
check("2 shortest route flagged with missing data", /0,8 km/.test(short) && /məlumat yoxdur/.test(short), short);
await page.screenshot({ path: path.join(shots, "01-go-routes.png") });
await page.getByTestId("route-shortest").click();
await page.getByTestId("route-detail").click();
check("2 detail shows S-07 without data", /Məlumat yoxdur/.test(await page.getByTestId("seg-S-07").textContent()));
await page.screenshot({ path: path.join(shots, "02-go-detail.png"), fullPage: true });
await page.getByTestId("seg-S-07").getByRole("link", { name: /maneə bildir/ }).click();

// 3. staircase identified (Vision)
await page.waitForFunction(() => document.querySelector("[data-testid=segment-select]")?.value === "S-07");
check("3 Vision opened with segment S-07 preselected", true);
await page.getByTestId("use-sample").click();
await page.locator("img[alt^='Yüklənmiş']").waitFor();
await page.getByTestId("analyze").click();
if (noAi) {
  await page.getByText(/AI analizi bu quraşdırmada aktiv deyil/).waitFor();
  check("3 no API key -> honest 'not configured' state, manual classification offered", await page.getByText("Maneəni əl ilə seçin").isVisible());
  await page.getByRole("radio", { name: /Pilləkən/ }).click();
} else {
  await page.getByTestId("ai-result").waitFor();
  const ai = await page.getByTestId("ai-result").textContent();
  check("3 AI result shown as estimate (stairs)", /AI təxmini/.test(ai) && /pilləkən/.test(ai), ai.slice(0, 120));
  check("3 AI category preselected for user confirmation", (await page.getByRole("radio", { name: /Pilləkən/ }).getAttribute("aria-checked")) === "true");
}
await page.screenshot({ path: path.join(shots, noAi ? "03-vision-manual.png" : "03-vision-ai.png"), fullPage: true });

// 4. user confirms -> report created (unverified)
await page.getByTestId("confirm-report").click();
await page.getByText("Maneə bildirildi").waitFor();
check("4 report B-07 created as unverified", /B-07/.test(await page.locator("main").textContent()));
await page.screenshot({ path: path.join(shots, "04-vision-submitted.png") });

// 5. Urban dashboard shows the issue; planner verifies
await page.setViewportSize({ width: 1440, height: 900 });
await page.getByRole("link", { name: "Urban panelində bax" }).click();
await page.getByTestId("barrier-B-07").waitFor();
const statsBefore = await page.getByTestId("urban-stats").textContent();
check("5 Urban lists B-07 as pending", /Yoxlanılmayıb/.test(await page.getByTestId("barrier-B-07").textContent()));
check("5 metrics from graph: 5 records -> includes new report", /5 təsdiqlənib · |Maneə qeydləri5/.test(statsBefore) || /Maneə qeydləri\s*5/.test(statsBefore), statsBefore);
await page.getByTestId("barrier-B-07").click();
await page.getByTestId("verify").click();
check("5 planner confirms B-07", /Təsdiqlənib/.test(await page.getByTestId("barrier-B-07").textContent()));
const statsAfter = await page.getByTestId("urban-stats").textContent();
check("5 metrics recalculated after review (2 confirmed)", /2 təsdiqlənib/.test(statsAfter), statsAfter);
await page.screenshot({ path: path.join(shots, "05-urban.png") });

// 6-9. simulate ramp, recalculation, Impact
await page.getByTestId("simulate").click();
await page.getByTestId("impact-after").waitFor();
const rb = await page.getByTestId("reach-before").textContent();
const ra = await page.getByTestId("reach-after").textContent();
check("7/8 reachability recalculated: before 2/5", /2 \/ 5/.test(rb), rb);
check("8 reachability after ramp: 5/5", /5 \/ 5/.test(ra), ra);
const expl = await page.getByTestId("impact-explanation").textContent();
check("9 explanation generated from graph result", /3 yeni təyinat/.test(expl) && /Poliklinika/.test(expl), expl);
const deltas = (await page.getByTestId("delta").allTextContents()).join(" | ");
check("9 deltas computed (segments +1, route 1,1 -> 0,8 km)", /1,1 km.*0,8 km/.test(deltas), deltas);
await page.waitForFunction(() => /9 \/ 9/.test(document.querySelector("[data-testid=demo-progress]")?.textContent || ""));
check("demo guide reports 9/9", /9 \/ 9/.test(await progress()), await progress());
await page.screenshot({ path: path.join(shots, "06-impact.png"), fullPage: true });

// Consistency: Go now shows the confirmed barrier on the shortest route
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + "/#/go");
await page.getByTestId("route-shortest").waitFor();
check("Go shortest route now shows confirmed stairs", /təsdiqlənmiş maneə: pilləkən/.test(await page.getByTestId("route-shortest").textContent()));
await page.screenshot({ path: path.join(shots, "07-go-after.png") });

// Impact empty state
await page.evaluate(() => localStorage.clear());
await page.goto(base + "/#/impact"); await page.reload();
check("Impact empty state without simulation", await page.getByText("Hələ simulyasiya yoxdur").isVisible());

// Responsive: Urban on a phone
await page.goto(base + "/#/urban");
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("Urban has no horizontal overflow at 390px", overflow <= 1, `overflow ${overflow}px`);
await page.screenshot({ path: path.join(shots, "08-urban-mobile.png"), fullPage: true });

check("no runtime errors in console", errors.length === 0, errors.slice(0, 3).join(" / "));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
