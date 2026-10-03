// Compile and run Java, Go or C# exactly like the site does, from the command line.
//   node tests/lang-run.mjs jobs.json
// Harness mode (what the site uses for tests and previews): {"lang":"go","files":{"cart.go":"..."},"body":"__t(\"-|name\", func() bool { return true })"}
// jobs.json: [{"lang":"java","entry":"Main.java","files":{"Main.java":"..."}}, {"lang":"cs","source":"..."}]
// Prints one JSON line per job: {"out": stdout, "err": error message or ""}.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require("playwright"); } catch { return require((process.env.NODE_PATH || "").split(":")[0] + "/playwright"); } })();
import { readFileSync } from "node:fs";
import { serve, ORIGIN } from "./serve.mjs";

const jobs = JSON.parse(readFileSync(process.argv[2], "utf8"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext();
await serve(ctx, "tests");
const page = await ctx.newPage();
page.on("pageerror", e => console.error("[page error]", e.message));
await page.goto(ORIGIN + "/run.html");
await page.waitForFunction("window.ready");
for (const job of jobs) {
  try { console.log(JSON.stringify(await page.evaluate(j => window.runJob(j), job))); }
  catch (e) { console.log(JSON.stringify({ out: "", err: "RUNNER CRASH: " + e.message })); }
}
await browser.close();
