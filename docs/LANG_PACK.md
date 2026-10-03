# Language packs (Java, C#, Go)

KnitStack teaches the same Refresher lessons and Lab tickets in every language. JavaScript,
TypeScript and Python content lives inline in `src/app.js` (`RF` and `LABS`). Java, C# and Go
content lives in one file per language: `src/langs/java.js`, `src/langs/cs.js`, `src/langs/go.js`.

Read `src/app.js` first: the `RF` array (9 lessons), the `V/A/O/B/C` memory helpers above it,
`PY_WORDS`, and the `LABS` array (KS-101 cart, KS-301 debounce, KS-401 review), plus the hidden
`<textarea id="f-...">` starter files in `index.html` (JS/TS/Python versions of every lab file).
Your pack is the same material, written idiomatically for your language.

## Shape

```js
export default {
  key: "java",                 // "java" | "cs" | "go"
  keywords: "class|public|...",// regex alternation for the syntax highlighter
  words: { "undefined": "null", "isPro": "isPro", ... }, // memory-view label renames, like PY_WORDS
  rf: {
    "RF-1": {
      code: ["...", "..."],    // the lesson program, one string per line, same idea as the JS version
      frames: [{ l: 0, t: "..." }, { l: [2, 3], t: "..." }],
                               // EXACTLY as many frames as the JS lesson has. l = 0-based line(s) in `code`
                               // to highlight for that frame; t = the note, written for your language.
      task: "...",             // optional: exercise task text if names differ (e.g. Go's TotalArea)
      starter: "...",          // exercise file the learner edits (see "Harness" for what may go in it)
      tests: "...",            // statements placed inside main(): __t("-|what it checks", ...) calls
      solution: "..."          // a correct answer. Never shown; our automated tests use it
    },
    // ... RF-2 to RF-9
  },
  labs: {
    "KS-101": {
      brief: "...",            // like LABS[0].brief.py, adapted
      core: "Cart.java",       // the file the learner edits
      files: [["Products.java", "..."], ["Cart.java", "...starter with TODO 1-3...", 1], ["CartTest.java", "..."]],
                               // given files are read-only. Mark the core file with a third element 1.
                               // A test file is display-only (shows the same checks as `tests`, readable).
      todos: [["TODO 1", "addItem"], ["TODO 2", "removeItem"], ["TODO 3", "cartTotal"]],
      tests: "...",            // __t("TODO 1|addItem puts a new product in with qty 1", ...) etc.
                               // Same checks and names as the JS tests (5 for the cart, 3 for debounce).
      driver: "...",           // preview driver: statements for main() (see "Previews")
      solution: "...",         // full correct core file
      hint: "..."
    },
    "KS-301": { /* same fields; the debounce lab, with a fake clock in a given file */ },
    "KS-401": {
      brief: "...", file: "OrdersController.java",
      diff: [["ctx", "line"], ["add", "line"], ["add", "bad line", "Why it's bad, one sentence"], ...]
                               // Mirror LABS[2].diffs.js: same length (or close), exactly 3 bad lines,
                               // same three problems (find them in the JS diff), idiomatic for the language.
    }
  }
};
```

## Harness

`src/compiled.js` (`runWithHarness`) compiles the learner's file plus every given *code* file
(not the display-only test file) together with a generated main:

- **Java**: `Main.java` = `import java.util.*; public class Main { static void __t(String name, BooleanSupplier f) ...; public static void main(String[] args) throws Exception { BODY } }`.
  Your files are top-level, non-public classes (`class Cart { static ... }`), one file per class name.
  Tests: `__t("TODO 1|name", () -> Cart.addItem(...).size() == 1);`
- **Go**: `main.go` = `package main` + imports `fmt`, `math`, `strings` + `func __t(name string, f func() bool)` + `func main() { BODY }`.
  Your files start with `package main`. Exported or unexported names are both fine. Don't declare `main` or `__t`.
  Tests: `__t("TODO 1|name", func() bool { return len(AddItem(nil, burger)) == 1 })`
- **C#**: one compilation unit: every file's `using` lines are hoisted, then your files, then
  `public class Program { static void __t(string name, Func<bool> f) ...; static void Main(string[] args) { BODY } }`.
  `System`, `System.Collections.Generic`, `System.Linq` are already imported. Don't declare `Program` or `Main`.
  Tests: `__t("TODO 1|name", () => Cart.AddItem(new List<Item>(), burger).Count == 1);`
  **Known gap:** the C# runtime's reference assemblies are trimmed. `Enumerable.Sum` only has the int
  selector overload, and format specifiers in interpolated strings (`$"{x:F2}"`) don't compile.
  Use loops, `.Count`, `.Where`, `.Select`, `.ToList()`, `string.Format`/`ToString("F2")` only after you've tested them.

Refresher exercises use the same harness: `starter` holds top-level declarations (Java needs a
class, e.g. `class Order { static double total = 0; }`, tests read `Order.total`), and `tests` is the BODY.

## Previews

The Lab shows a live preview driven by the learner's code. Your `driver` is a BODY that prints:

- KS-101: one `§ITEM|id|name|qty|price` line per cart item, then `§TOTAL|total`. The literal
  `{{ACTIONS}}` is replaced by a double-quoted string like `"add:burger,add:fries,remove:burger"`.
  Products: burger "Smash burger" 12.9, fries "Fries" 3.5, shake "Shake" 5 (from the given products file).
  If a function throws, let it propagate: the site shows the error.
- KS-301: `{{STEPS}}` becomes a quoted string like `"r,re,rea,reac,react"`. Debounce a function that
  records calls with a 300 ms wait, call it with each step, advancing the fake clock 80 ms between
  calls, then advance 400 ms, then print `§CALLS|<number of calls>|<last query or empty>`.

## Rules

- Verify everything. Put jobs in a JSON file and run `NODE_PATH=$(npm root -g) node tests/lang-run.mjs jobs.json`
  (see the header of that file). For every RF lesson and both project labs: the starter must compile
  and fail its tests (not crash the build); the solution must pass every test; the driver must print
  the right lines for at least one action list with the solution. For Go, unused variables or imports
  in a starter are build errors, so starters must compile as given (use `_ =` or return zero values).
- Write like a patient senior developer explaining to a junior: short, plain sentences, concrete,
  no hype, no filler ("Let's dive in", "seamlessly", "robust", "leverage", "crucial", em-dashes).
  Match the length and tone of the existing JS notes.
- Be technically exact for your language (e.g. Java `private` really is enforced; C# `private`
  too; Go has unexported lowercase names instead of `private`; Go has no classes or inheritance,
  so teach RF-6..RF-9 with structs, methods, embedding and interfaces, and say so in the notes).
- Keep the same teaching story, data and numbers as the JS lessons (Vic, 12.90, Burger Bros...).
