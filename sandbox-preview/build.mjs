// Sandbox-only build: esbuild + Tailwind v4 compiler, because Next.js cannot be installed offline here.
import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.join(here, "dist");
const NM = "/opt/npm-tools/node_modules";
fs.mkdirSync(out, { recursive: true });

const alias = { name: "alias", setup(b) {
  b.onResolve({ filter: /^@\/lib\/nav$/ }, () => ({ path: path.join(here, "nav-shim.tsx") }));
  b.onResolve({ filter: /^@\// }, async (a) => {
    const base = path.join(root, "src", a.path.slice(2));
    for (const ext of ["", ".ts", ".tsx", "/index.ts"]) if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) return { path: base + ext };
    return { errors: [{ text: "not found " + a.path }] };
  });
} };

await build({ entryPoints: [path.join(here, "main.tsx")], bundle: true, outfile: path.join(out, "app.js"), format: "esm", jsx: "automatic", plugins: [alias], nodePaths: [NM], define: { "process.env.NODE_ENV": '"production"' }, minify: false, sourcemap: false, logLevel: "warning" });
await build({ entryPoints: [path.join(root, "src/lib/vision/handler.ts")], bundle: true, platform: "node", format: "esm", outfile: path.join(out, "handler.mjs"), plugins: [alias], logLevel: "warning" });

// Tailwind v4: compile globals.css against candidates scanned from the source.
const require = createRequire(import.meta.url);
const tw = require(path.join(NM, "tailwindcss/dist/lib.js"));
const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
const compiler = await tw.compile(css, {
  base: root,
  loadStylesheet: async (id, base) => {
    const file = id === "tailwindcss" ? path.join(NM, "tailwindcss/index.css") : path.resolve(base, id);
    return { path: file, base: path.dirname(file), content: fs.readFileSync(file, "utf8") };
  },
});
const files = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(tsx?)$/.test(e.name) && files.push(path.join(d, e.name))));
walk(path.join(root, "src"));
const candidates = new Set();
for (const f of files) for (const t of fs.readFileSync(f, "utf8").split(/[\s"'`{}<>]+/)) if (t && t.length < 120) candidates.add(t.replace(/^\$\{|\}$/g, ""));
fs.writeFileSync(path.join(out, "styles.css"), compiler.build([...candidates]));
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><html lang="az"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Urbiva | sandbox preview</title><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>`);
console.log("built", fs.readdirSync(out).map((f) => `${f} ${fs.statSync(path.join(out, f)).size}`).join(", "));
