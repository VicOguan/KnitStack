// Optional accounts. Without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY the site works the same,
// saving progress in this browser only, and the Sign in button stays hidden.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
// OAuth buttons to show, e.g. "github,google". List only providers enabled in Supabase → Authentication → Providers.
const PROVIDERS = { github: "GitHub", google: "Google" };
const providers = (import.meta.env.VITE_AUTH_PROVIDERS || "").split(",").map(p => p.trim()).filter(p => PROVIDERS[p]);

let user = null, hooks = null, pushTimer = null, applying = false;

/** hooks: { snapshot(): {state, drafts, rfDrafts, lang}, apply(remote), onChange(user) } */
export async function initAuth(h) {
  hooks = h;
  if (!supabase) return;
  const btn = document.getElementById("authBtn");
  btn.hidden = false;
  btn.onclick = () => (user ? signOut() : openDialog());
  supabase.auth.onAuthStateChange((event, session) => {
    const next = session?.user ?? null;
    const changed = (next?.id || null) !== (user?.id || null);
    user = next;
    btn.textContent = user ? "Sign out" : "Sign in";
    btn.title = user ? `Signed in as ${user.email || "you"}` : "Save your progress across devices";
    hooks.onChange(user);
    if (changed && user) setTimeout(pull, 0);
  });
}

/** Call after every local save. Pushes to the account a moment later. */
export function queuePush() {
  if (!supabase || !user || applying) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 1200);
}

async function push() {
  if (!user) return;
  const s = hooks.snapshot();
  const { error } = await supabase.from("progress").upsert({
    user_id: user.id, done: s.state.done, drafts: s.drafts, rf_drafts: s.rfDrafts, lang: s.lang, updated_at: new Date().toISOString()
  });
  if (error) console.warn("Couldn't save progress to your account:", error.message);
}

async function pull() {
  const { data, error } = await supabase.from("progress").select("done, drafts, rf_drafts, lang").eq("user_id", user.id).maybeSingle();
  if (error) { console.warn("Couldn't load your saved progress:", error.message); return; }
  const local = hooks.snapshot();
  // Merge: a lesson done anywhere counts as done. For drafts, keep this browser's version
  // when it has one, so signing in never throws away work you just did.
  const merged = {
    done: { ...(data?.done || {}), ...local.state.done },
    drafts: { ...(data?.drafts || {}), ...local.drafts },
    rfDrafts: { ...(data?.rf_drafts || {}), ...local.rfDrafts },
    lang: data?.lang || local.lang
  };
  applying = true;
  try { hooks.apply(merged); } finally { applying = false; }
  push();
}

async function signOut() {
  await supabase.auth.signOut();
}

function openDialog() {
  let d = document.getElementById("authDialog");
  if (!d) {
    d = document.createElement("dialog");
    d.id = "authDialog";
    d.className = "auth-dialog neon cyan";
    d.innerHTML = `
      <form method="dialog" class="auth-close"><button aria-label="Close">✕</button></form>
      <span class="hand c-cyan">Free account</span>
      <h3>Keep your progress everywhere</h3>
      <p class="muted">Your XP, finished lessons and drafts follow you to any device. That's all we store.</p>
      ${providers.length ? `<div class="auth-oauth">
        ${providers.map(p => `<button class="btn btn-ghost" data-provider="${p}">Continue with ${PROVIDERS[p]}</button>`).join("")}
      </div>
      <div class="auth-or"><span>or get a sign-in link by email</span></div>` : ""}
      <form class="auth-email">
        <input type="email" required placeholder="you@example.com" aria-label="Email address" autocomplete="email">
        <button class="btn btn-main" type="submit">Email me a link</button>
      </form>
      <p class="auth-msg muted" role="status"></p>`;
    document.body.appendChild(d);
    const msg = t => { d.querySelector(".auth-msg").textContent = t; };
    d.querySelectorAll("[data-provider]").forEach(b => b.onclick = async () => {
      const { error } = await supabase.auth.signInWithOAuth({ provider: b.dataset.provider, options: { redirectTo: location.origin + location.pathname } });
      if (error) msg(error.message);
    });
    d.querySelector(".auth-email").onsubmit = async e => {
      e.preventDefault();
      const email = e.target.querySelector("input").value.trim();
      const btn = e.target.querySelector("button"); btn.disabled = true;
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
      btn.disabled = false;
      msg(error ? error.message : `Check ${email} for a sign-in link. You can close this window.`);
    };
  }
  d.showModal();
}
