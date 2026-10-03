// Copies the in-browser language runtimes from node_modules into public/runtimes.
// They're served as static files (not bundled) because they load their own workers and wasm.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = p => join(root, "node_modules", p);
const out = p => join(root, "public", "runtimes", p);
const copy = (from, to) => { mkdirSync(dirname(out(to)), { recursive: true }); cpSync(nm(from), out(to), { recursive: true }); };

rmSync(out(""), { recursive: true, force: true });

// Python (Skulpt) and TypeScript
copy("skulpt/dist/skulpt.min.js", "skulpt/skulpt.min.js");
copy("skulpt/dist/skulpt-stdlib.js", "skulpt/skulpt-stdlib.js");
copy("skulpt/LICENSE", "skulpt/LICENSE");
copy("typescript/lib/typescript.js", "typescript/typescript.js");
copy("typescript/LICENSE.txt", "typescript/LICENSE.txt");

// Java and Go: WASM-OJ (TeaVM javac + the real Go compiler, both compiled to WebAssembly)
for (const pkg of ["browser", "core", "contracts", "toolchain-java", "toolchain-go"]) {
  copy(`@wasm-oj/${pkg}/dist`, `wasm-oj/${pkg}`);
  for (const f of ["LICENSE", "THIRD_PARTY_NOTICES.md", "licenses"]) if (existsSync(nm(`@wasm-oj/${pkg}/${f}`))) copy(`@wasm-oj/${pkg}/${f}`, `wasm-oj/${pkg}/${f}`);
}
for (const pkg of ["toolchain-java", "toolchain-go"]) {
  for (const f of readdirSync(nm(`@wasm-oj/${pkg}/assets`))) copy(`@wasm-oj/${pkg}/assets/${f}`, `toolchains/${f}`);
}
copy("es-module-lexer/dist/lexer.js", "wasm-oj/es-module-lexer.js");
copy("fflate/esm/browser.js", "wasm-oj/fflate.js");

// C#: WasmSharp (Roslyn + the .NET runtime in WebAssembly). Its package expects a bundler,
// so rewrite asset imports into URLs and add the missing .js extensions.
copy("@wasmsharp/core", "csharp");
const cs = f => join(out("csharp"), f);
let dotnet = readFileSync(cs("dotnet.js"), "utf8");
dotnet = dotnet.replace(/^import (\w+) from "(\.\/[^"]+\.(?:wasm|dat|dll|pdb))";/gm, 'const $1 = new URL("$2", import.meta.url).href;');
writeFileSync(cs("dotnet.js"), dotnet);
for (const f of readdirSync(out("csharp")).filter(f => f.endsWith(".js"))) {
  let t = readFileSync(cs(f), "utf8");
  t = t.replace(/from "(\.\/[^".]+)"/g, 'from "$1.js"').replace("https://unpkg.com/comlink/dist/esm/comlink.mjs", "../comlink.mjs");
  writeFileSync(cs(f), t);
}
copy("comlink/dist/esm/comlink.mjs", "comlink.mjs");

console.log("runtimes copied to public/runtimes");
