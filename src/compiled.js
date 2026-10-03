// Java, Go and C# run fully in the browser, with no server:
//  - Java: OpenJDK's javac + TeaVM compiled to WebAssembly (via WASM-OJ)
//  - Go:   the real Go compiler compiled to WebAssembly (via WASM-OJ)
//  - C#:   Roslyn + the .NET runtime in WebAssembly (via WasmSharp)
// Java and Go need cross-origin isolation (COOP/COEP headers), set in vercel.json and vite.config.js.

const BASE = "/runtimes/";
let wojEngine = null, csModule = null;

async function woj() {
  if (wojEngine) return wojEngine;
  if (!self.crossOriginIsolated) throw new Error("Java and Go need a cross-origin isolated page. Reload the page, and if that doesn't help, try Chrome, Edge or Firefox.");
  const [{ createBrowserEngine }, J, G] = await Promise.all([
    import(/* @vite-ignore */ BASE + "wasm-oj/browser/index.js"),
    import(/* @vite-ignore */ BASE + "wasm-oj/toolchain-java/index.js"),
    import(/* @vite-ignore */ BASE + "wasm-oj/toolchain-go/index.js")
  ]);
  wojEngine = await createBrowserEngine({ toolchains: [J.browserSource(BASE + "toolchains/"), G.browserSource(BASE + "toolchains/")] });
  return wojEngine;
}

const diag = list => list.map(d => (d.file ? `${d.file}:` : "") + (d.line ? `${d.line}: ` : "") + d.message).join("\n");

// The engine runs one build at a time, so runs from the tests and the live preview wait their turn.
let wojQueue = Promise.resolve();

/** files: {name: source}. Returns {out, err} where err is a compile or runtime error message (or ""). */
export function runWoj(language, entry, files) {
  const job = wojQueue.then(() => runWojNow(language, entry, files));
  wojQueue = job.catch(() => {});
  return job;
}

async function runWojNow(language, entry, files) {
  const engine = await woj();
  // The in-browser javac crashes on @Override and @SuppressWarnings. They don't change what the code does, so drop them (same line count).
  if (language === "java") files = Object.fromEntries(Object.entries(files).map(([n, t]) => [n, t.replace(/@Override\b|@SuppressWarnings\b(\s*\([^)]*\))?/g, "")]));
  const r = await engine.execute({ language, entry, files }, { resources: { wallTimeLimitMs: 8000 } });
  if (!r.build.success) {
    const msg = diag(r.build.diagnostics) || r.build.stderr || r.build.stdout || "The build failed.";
    return { out: "", err: msg.includes("without a diagnostic") ? "Your code didn't compile. Look for an unused variable or import, a missing brace, or a typo." : msg, compile: true };
  }
  const run = r.run || { stdout: "", stderr: "" };
  const limits = { "wall-time-limit": "Your code ran for more than 8 seconds. Check for a loop that never ends.", "instruction-limit": "Your code did too much work. Check for a loop that never ends.", "memory-limit": "Your code used too much memory.", "output-limit": "Your code printed too much output." };
  const err = limits[run.termination] || (run.code && run.code !== 0 ? (run.stderr || run.trapMessage || `Exited with code ${run.code}`) : "");
  return { out: run.stdout, err: err.trim() };
}

async function cs() {
  if (csModule) return csModule;
  const { WasmSharpModule } = await import(/* @vite-ignore */ BASE + "csharp/WasmCompiler.js");
  csModule = await WasmSharpModule.initializeAsync();
  return csModule;
}

/** C#: one compilation unit. using-directives from every part are hoisted to the top. */
export function joinCs(parts) {
  const usings = new Set(), bodies = [];
  for (const p of parts) bodies.push(p.replace(/^\s*using\s+[\w.]+\s*;\s*$/gm, m => { usings.add(m.trim()); return ""; }));
  return [...usings].join("\n") + "\n" + bodies.join("\n");
}
export async function runCs(source) {
  const m = await cs();
  const c = await m.createCompilationAsync(source);
  const r = await c.run();
  if (!r.success && r.diagnostics && r.diagnostics.length) {
    const lines = source.split("\n");
    const lineOf = pos => source.slice(0, pos).split("\n").length;
    return { out: "", compile: true, err: r.diagnostics.filter(d => d.severity === "Error").map(d => `line ${lineOf(d.location.start)}: ${d.message}`).join("\n") || "The build failed." };
  }
  // An exception thrown out of Main arrives wrapped in a TargetInvocationException; show the inner one.
  const errText = r.stdErr || "", inner = [...errText.matchAll(/--->\s*([\w.]+): ([^\n]*)/g)].pop();
  const err = inner ? `${inner[1].split(".").pop()}: ${inner[2]}` : errText.split("\n")[0];
  return { out: r.stdOut || "", err: err.replace(/^System\./, "") };
}

export const runtimeLabel = { java: "Java (javac in WebAssembly)", go: "Go (go compiler in WebAssembly)", cs: "C# (Roslyn in WebAssembly)" };

/* ---- Test harnesses ----
   Every compiled language prints one line per check, the same format the Python runner uses:
     §PASS|TODO 1|name    or    §FAIL|TODO 1|name|error
   `body` is the statements that go inside main(): __t(...) calls for tests, or a preview driver. */
const HARNESS = {
  java: body => `import java.util.*;

public class Main {
    static void __t(String name, java.util.function.BooleanSupplier f) {
        try { System.out.println((f.getAsBoolean() ? "§PASS|" : "§FAIL|") + name); }
        catch (Throwable e) { System.out.println("§FAIL|" + name + "|" + e); }
    }
    public static void main(String[] args) throws Exception {
${body}
    }
}
`,
  go: body => `package main

import (
	"fmt"
	"math"
	"strings"
)

var _ = math.Abs
var _ = strings.Split

func __t(name string, f func() bool) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("§FAIL|" + name + "|" + fmt.Sprint(r))
		}
	}()
	if f() {
		fmt.Println("§PASS|" + name)
	} else {
		fmt.Println("§FAIL|" + name)
	}
}

func main() {
${body}
}
`,
  cs: body => `using System;
using System.Collections.Generic;
using System.Linq;

public class Program {
    static void __t(string name, Func<bool> f) {
        try { Console.WriteLine((f() ? "§PASS|" : "§FAIL|") + name); }
        catch (Exception e) { Console.WriteLine("§FAIL|" + name + "|" + e.Message); }
    }
    static void Main(string[] args) {
${body}
    }
}
`
};

/** files: {name: source} for the learner's file plus given code files. Returns {out, err}. */
export function runWithHarness(lang, files, body) {
  if (lang === "cs") return runCs(joinCs([...Object.values(files), HARNESS.cs(body)]));
  if (lang === "java") return runWoj("java", "Main.java", { ...files, "Main.java": HARNESS.java(body) });
  if (lang === "go") return runWoj("go", "main.go", { ...files, "main.go": HARNESS.go(body) });
  throw new Error("Unknown language " + lang);
}
