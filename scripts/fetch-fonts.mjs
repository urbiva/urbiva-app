// Ensures the approved font files exist in src/app/fonts before `next build`.
// Local checkouts already contain them; CI/Vercel builds without the binaries
// download them from the official Google Fonts repository and verify each file
// byte for byte (SHA-256) against the files approved for Urbiva. Any mismatch fails the build.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "app", "fonts");
const BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl";
const FONTS = [
  ["Manrope-VariableFont_wght.ttf", `${BASE}/manrope/Manrope%5Bwght%5D.ttf`, "0311b1f87521e509b569db20aa9e6774d19faaf7d6ae5837dab4147d2c5891c8"],
  ["IBMPlexMono-Regular.ttf", `${BASE}/ibmplexmono/IBMPlexMono-Regular.ttf`, "ab08018ccd276b79fb2c636bb95b9c543598f9d50505fe92506fcb4dae7810cd"],
  ["IBMPlexMono-Medium.ttf", `${BASE}/ibmplexmono/IBMPlexMono-Medium.ttf`, "8ae925744d53758b67a77ea35c2fc46d7b688c7d8c04da3b579902bed0ca0e17"],
  ["IBMPlexMono-SemiBold.ttf", `${BASE}/ibmplexmono/IBMPlexMono-SemiBold.ttf`, "b1a936f96266fbe036b112f659155f7c32222af44a9a20f3bb011f51050669d5"],
];
const LICENSES = [["OFL-Manrope.txt", `${BASE}/manrope/OFL.txt`], ["OFL-IBMPlexMono.txt", `${BASE}/ibmplexmono/OFL.txt`]];
const sha = (b) => createHash("sha256").update(b).digest("hex");

fs.mkdirSync(dir, { recursive: true });
let failed = false;
for (const [name, url, expected] of FONTS) {
  const file = path.join(dir, name);
  if (fs.existsSync(file) && sha(fs.readFileSync(file)) === expected) { console.log(`fonts: ${name} present, hash ok`); continue; }
  const res = await fetch(url);
  if (!res.ok) { console.error(`fonts: download failed for ${name} (${res.status})`); failed = true; continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  const got = sha(buf);
  if (got !== expected) { console.error(`fonts: ${name} does not match the approved file (got ${got}). Add the approved file to src/app/fonts.`); failed = true; continue; }
  fs.writeFileSync(file, buf);
  console.log(`fonts: ${name} downloaded and verified`);
}
for (const [name, url] of LICENSES) {
  const file = path.join(dir, name);
  if (fs.existsSync(file)) continue;
  const res = await fetch(url);
  if (res.ok) fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}
if (failed) process.exit(1);
