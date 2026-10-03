# KnitStack

A free, self-paced coding academy. You learn one idea at a time, build it into a real project, and get it past a code review. Lessons and labs run in JavaScript, TypeScript, Python, Java, C# and Go, and every language runs inside the browser. There is no server that executes code.

## Run it locally

```bash
npm install
npm run dev        # copies the language runtimes into public/runtimes, then starts Vite
```

Open http://localhost:5173. The first Java, C# or Go run downloads its compiler (about 35 to 45 MB each), and the browser caches it after that.

Other scripts:

- `npm run build` builds the site into `dist/`.
- `npm test` runs the full browser simulation (`tests/sim.cjs`) against `dist/`. It needs Playwright and Chromium. `SIM_LANGS=java,cs,go` picks which compiled languages to check.

## Why the special headers

The Java and Go compilers use `SharedArrayBuffer`, which browsers only allow on cross-origin isolated pages. The site must be served with:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

`vite.config.js` sets these for development and `vercel.json` sets them in production. Everything the page loads (fonts included) is self-hosted, so these headers don't block anything.

## Accounts (optional)

Without Supabase settings the site works fully, and progress saves in the browser only. To turn on sign-in and progress sync:

1. Create a free project at https://supabase.com.
2. In the SQL editor, run `supabase/schema.sql`. It creates the `progress` table with row level security, so each user can only read and write their own row.
3. Under Authentication → Providers, email is on by default. To add GitHub or Google, enable the provider and paste the client ID and secret from a GitHub OAuth app or Google Cloud OAuth client. Use the callback URL Supabase shows you. Then set `VITE_AUTH_PROVIDERS` (for example `github,google`) so the site shows those buttons; without it, only email sign-in is offered.
4. Under Authentication → URL Configuration, set the Site URL to your deployed address and add `http://localhost:5173` to the redirect URLs.
5. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Project Settings → API. The anon key is meant to be public; the RLS policies are what protect the data.

## Deploy to Vercel

1. Import this repository at https://vercel.com/new. The settings come from `vercel.json` (`npm run build`, output `dist`).
2. Add the two `VITE_SUPABASE_*` variables (and `VITE_AUTH_PROVIDERS` if you enabled GitHub or Google) under Project Settings → Environment Variables if you use accounts.
3. Deploy. Vercel builds from Git, so the compiler files (one is 29 MB) are fine there. Cloudflare Pages won't work because of its 25 MiB per-file limit.

## Adding a language

Lessons and labs for Java, C# and Go live in `src/langs/*.js`. The format is in `docs/LANG_PACK.md`.

## Licenses

| Part | Project | License |
| --- | --- | --- |
| Java compiler | OpenJDK javac, TeaVM, packaged by WASM-OJ | GPL-2.0 with Classpath Exception, Apache-2.0, MIT |
| Go compiler | The Go toolchain, packaged by WASM-OJ, run with Wasmer | BSD-3-Clause, MIT |
| C# compiler | Roslyn and .NET, packaged by WasmSharp | MIT, Apache-2.0 |
| Python | Skulpt | MIT / PSF |
| TypeScript | TypeScript compiler | Apache-2.0 |
| Accounts | Supabase client | Apache-2.0 |
| Fonts | Fredoka, Nunito, Architects Daughter, JetBrains Mono (Fontsource) | SIL Open Font License |

Each runtime's license files are copied next to it in `public/runtimes/` at build time.
