// Serves the app (public/ at /, everything else from the repo root) to Playwright on a fake
// https origin with the cross-origin isolation headers the Java/Go runtimes need.
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const ORIGIN = "https://knitstack.test";
const types = { js: "application/javascript", mjs: "application/javascript", wasm: "application/wasm", html: "text/html", css: "text/css", json: "application/json", svg: "image/svg+xml", woff2: "font/woff2" };

export async function serve(ctx, dir = "dist") {
  await ctx.route("**/*", route => {
    const u = new URL(route.request().url());
    if (u.origin !== ORIGIN) return route.abort();
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith("/")) p += "index.html";
    const candidates = [join(ROOT, dir, p), join(ROOT, "public", p), join(ROOT, p)];
    const f = candidates.find(c => existsSync(c) && statSync(c).isFile());
    if (!f) return route.fulfill({ status: 404, body: "not found " + p });
    route.fulfill({
      contentType: types[extname(f).slice(1)] || "application/octet-stream",
      headers: { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp", "Cross-Origin-Resource-Policy": "same-origin" },
      body: readFileSync(f)
    });
  });
}
