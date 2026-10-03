import { runWithHarness } from "./compiled.js";
import { initAuth, queuePush } from "./auth.js";
import JAVA from "./langs/java.js";
import CS from "./langs/cs.js";
import GO from "./langs/go.js";


const LEVELS = [
  {id:"app", name:"Apprentice", years:"0 to 6 months", color:"var(--yellow)", neon:"yellow", blurb:"Terminal, Git, HTML, CSS and JavaScript basics. You learn to finish things.",
   projects:[
    {id:"KS-101", t:"Burger Bros checkout", d:"2 hrs", skills:["arrays","functions","unit tests"], ticket:"The checkout page is built but the cart does nothing.", ac:["Adding the same item twice makes qty 2","Removing an item takes it out","Total equals the sum of price × qty"], lab:0},
    {id:"KS-102", t:"Portfolio site", d:"6 hrs", skills:["HTML","CSS layout","responsive"], ticket:"Build a one-page portfolio that looks right on a phone and a laptop.", ac:["Works at 360px wide","Passes an accessibility check","Deployed to a public URL"], ex:"http"},
    {id:"KS-103", t:"To-do app that remembers", d:"8 hrs", skills:["DOM","events","localStorage"], ticket:"Users lose their list on refresh. Make it stick.", ac:["Add, complete, delete tasks","List survives reload","Keyboard-only use works"], ex:"git"},
    {id:"KS-104", t:"Weather dashboard", d:"8 hrs", skills:["fetch","async/await","error states"], ticket:"Show a 5 day forecast for any city from a public API.", ac:["Loading and error states","Search by city","No API key in the client code"], ex:"secrets"}
  ]},
  {id:"jr", name:"Junior", years:"6 to 18 months", color:"var(--blue)", neon:"", blurb:"Your first full-stack apps. APIs, databases, auth, and tests that protect you.",
   projects:[
    {id:"KS-201", t:"Notes API", d:"10 hrs", skills:["REST","Express","Postgres"], ticket:"Build the backend for a notes app with full CRUD.", ac:["Correct status codes","Input validation","Integration tests"], ex:"index"},
    {id:"KS-202", t:"Sign in and sessions", d:"10 hrs", skills:["auth","hashing","secrets"], ticket:"Add accounts. Each user only sees their own notes.", ac:["Passwords hashed","Session expiry","Another user's note returns 404"], ex:"secrets"},
    {id:"KS-203", t:"Test the legacy module", d:"6 hrs", skills:["testing","refactoring"], ticket:"Nobody dares touch billing.js. Cover it with tests, then clean it up.", ac:["80% coverage before changes","Behaviour unchanged","Smaller functions"]}
  ]},
  {id:"mid", name:"Mid-level", years:"1.5 to 4 years", color:"var(--cyan)", neon:"cyan", blurb:"Real-time features, performance, CI and shipping without breaking things.",
   projects:[
    {id:"KS-301", t:"Docs search is too expensive", d:"3 hrs", skills:["closures","timers","performance"], ticket:"Search hits the API on every keystroke and the bill is huge.", ac:["One call after typing stops","Calls get the latest arguments","All tests pass"], lab:1},
    {id:"KS-302", t:"Real-time chat", d:"14 hrs", skills:["WebSockets","state","presence"], ticket:"Add rooms, typing indicators and message history.", ac:["Reconnects after drop","No duplicate messages","Load tested to 200 users"], ex:"threads"},
    {id:"KS-303", t:"CI and deploy pipeline", d:"8 hrs", skills:["Docker","GitHub Actions","envs"], ticket:"Every merge should test, build and deploy itself. The image is 2 GB and deploys take 9 minutes.", ac:["Tests gate the deploy","Image under 200 MB","One command rollback"], ex:"docker"}
  ]},
  {id:"sr", name:"Senior", years:"4+ years", color:"var(--purple)", neon:"purple", blurb:"Design, review, scale and lead. You make other people's code better.",
   projects:[
    {id:"KS-401", t:"Review a junior's PR", d:"2 hrs", skills:["code review","security","mentoring"], ticket:"A teammate opened a PR for the orders endpoint. Find what will hurt in production.", ac:["Flag every real bug","No false alarms on fine code","Comments a junior can act on"], lab:2},
    {id:"KS-402", t:"Write the design doc", d:"8 hrs", skills:["architecture","trade-offs"], ticket:"Propose how notifications should work at 1M users.", ac:["Two options compared","Costs estimated","Reviewed by an AI staff engineer"], ex:"queue"},
    {id:"KS-403", t:"Incident drill", d:"4 hrs", skills:["on-call","logs","postmortem"], ticket:"Checkout error rate just hit 30%. You are on call.", ac:["Service restored","Root cause found","Blameless postmortem written"]},
    {id:"KS-404", t:"Capstone: scale it", d:"20 hrs", skills:["caching","queues","load testing"], ticket:"Take your chat app to 10k users without changing the frontend.", ac:["p95 under 200ms","Graceful degradation","Runbook written"], ex:"cache"}
  ]}
];

/* ---------- Languages ---------- */
const LANGS = [
  {k:"js", name:"JavaScript", short:"JS", c:"var(--yellow)", ok:true, note:"Runs natively in your browser."},
  {k:"ts", name:"TypeScript", short:"TS", c:"var(--blue)", ok:true, note:"JavaScript with types. Compiled in the browser."},
  {k:"py", name:"Python", short:"PY", c:"var(--cyan)", ok:true, note:"Runs in the browser with an in-page Python."},
  {k:"java", name:"Java", short:"JV", c:"var(--orange)", ok:true, note:"The real javac, compiled to WebAssembly. First run downloads it."},
  {k:"cs", name:"C#", short:"C#", c:"var(--purple)", ok:true, note:"Roslyn and .NET in WebAssembly. First run downloads them."},
  {k:"go", name:"Go", short:"GO", c:"var(--green)", ok:true, note:"The real Go compiler in WebAssembly. First run downloads it."}
];
const LANG_KEYS = ["js","ts","py","java","cs","go"];
const PACKS = {java: JAVA, cs: CS, go: GO};
const COMPILED = k => !!PACKS[k];
const EXT = {js:"js", ts:"ts", py:"py", java:"java", cs:"cs", go:"go"};
let lang = "js";
try { const l = localStorage.getItem("ks-lang"); if (LANG_KEYS.includes(l)) lang = l; } catch(e) {}
const LANG = () => LANGS.find(l => l.k === lang);
const dk = id => id + "@" + lang;
const doneAny = id => !!(state.done[id] || LANG_KEYS.some(l => state.done[id + "@" + l]));

const RUNTIMES = {
  py: ["/runtimes/skulpt/skulpt.min.js", "/runtimes/skulpt/skulpt-stdlib.js"],
  ts: ["/runtimes/typescript/typescript.js"]
};
const scriptLoads = {};
function loadScript(src){
  return scriptLoads[src] ||= new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = src;
    s.onload = res; s.onerror = () => { delete scriptLoads[src]; rej(new Error("Couldn't load the " + (src.includes("skulpt") ? "Python" : "TypeScript") + " runtime. Check your connection and try again.")); };
    document.head.appendChild(s);
  });
}
async function loadRuntime(k){ for (const src of RUNTIMES[k] || []) await loadScript(src); }

function stripModules(code){ return code.replace(/^\s*import\s.*$/gm, "").replace(/^\s*export\s+/gm, ""); }
async function toJS(code){
  if (lang !== "ts") return stripModules(code);
  await loadRuntime("ts");
  return ts.transpile(stripModules(code), {target: ts.ScriptTarget.ES2022});
}

/* Python: run code in Skulpt, capture printed output */
async function runPy(code, offset = 0){
  await loadRuntime("py");
  let out = "";
  Sk.configure({
    output: t => { out += t; },
    read: f => { if (Sk.builtinFiles && Sk.builtinFiles.files[f] !== undefined) return Sk.builtinFiles.files[f]; throw "File not found: '" + f + "'"; },
    __future__: Sk.python3, execLimit: 4000
  });
  try { await Sk.misceval.asyncToPromise(() => Sk.importMainWithBody("<stdin>", false, code, true)); return {out}; }
  catch(e){
    let msg = e.toString();
    if (/nonlocal/.test(msg)) msg = "This in-browser Python doesn't support nonlocal yet. Keep the state on self or in a dict instead.";
    msg = msg.replace(/on line (\d+)/, (_, n) => "on line " + Math.max(1, n - offset));
    if (/TimeLimitError/.test(msg)) msg = "Your code ran for more than 4 seconds. Check for a loop that never ends.";
    return {out, err: msg};
  }
}
const PY_HARNESS = `
def __t(name, fn):
    try:
        print("§PASS|" + name if fn() else "§FAIL|" + name)
    except Exception as e:
        print("§FAIL|" + name + "|" + str(e))
`;
function parsePy(out){
  // lines look like §PASS|TODO 1|name  or  §FAIL|-|name|error message
  return out.split("\n").filter(l => l.startsWith("§")).map(l => { const [s, todo, n, ...m] = l.slice(1).split("|"); return {todo, name:n, ok: s === "PASS", msg: m.length ? " (" + m.join("|") + ")" : ""}; });
}
const PY_CLOCK = `
class _Clock:
    def __init__(self):
        self.now = 0
        self.next_id = 0
        self.timers = []
_clock = _Clock()
def set_timeout(cb, ms):
    _clock.next_id += 1
    _clock.timers.append([_clock.next_id, _clock.now + ms, cb])
    return _clock.next_id
def clear_timeout(tid):
    _clock.timers = [t for t in _clock.timers if t[0] != tid]
def tick(ms):
    _clock.now += ms
    due = [t for t in _clock.timers if t[1] <= _clock.now]
    _clock.timers = [t for t in _clock.timers if t[1] > _clock.now]
    for t in due:
        t[2]()
def reset_clock():
    _clock.now = 0
    _clock.timers = []
`;
const pyStrip = code => code.replace(/^\s*(from|import)\s+(timers|api|products|cart|debounce|fake_clock)\b.*$/gm, "");

const LABS = [
  { pid:"KS-101", level:"Apprentice", lv:"app", xp:50, kind:"project", preview:"cart",
    title:"Burger Bros checkout",
    brief:{
      js:"The checkout page is built: HTML, product data, rendering and click handling are all done. What's missing is the cart logic. Write the three functions in cart.js and the app comes alive.",
      ts:"The checkout page is built and typed: HTML, product data, rendering and click handling are all done. Write the three functions in cart.ts and the app comes alive.",
      py:"The Flask checkout app is built: routes, templates and product data are all done. What's missing is the cart logic. Write the three functions in cart.py and the app comes alive."},
    v:{
      js:{core:"cart.js", files:[["index.html","f-cart-index"],["products.js","f-cart-products"],["ui.js","f-cart-ui"],["cart.js","f-cart-core",1],["cart.test.js","f-cart-test"]],
          todos:[["TODO 1","addItem"],["TODO 2","removeItem"],["TODO 3","cartTotal"]]},
      ts:{core:"cart.ts", files:[["index.html","f-cart-index"],["products.ts","f-cart-products-ts"],["ui.ts","f-cart-ui-ts"],["cart.ts","f-cart-core-ts",1],["cart.test.ts","f-cart-test-ts"]],
          todos:[["TODO 1","addItem"],["TODO 2","removeItem"],["TODO 3","cartTotal"]]},
      py:{core:"cart.py", files:[["products.py","f-cart-products-py"],["app.py","f-cart-app-py"],["cart.py","f-cart-core-py",1],["test_cart.py","f-cart-test-py"]],
          todos:[["TODO 1","add_item"],["TODO 2","remove_item"],["TODO 3","cart_total"]],
          tests:`
BURGER = {"id": "burger", "name": "Smash burger", "price": 12.9}
def _c1():
    return add_item([], dict(BURGER)) == [{"id": "burger", "name": "Smash burger", "price": 12.9, "qty": 1}]
def _c2():
    c = add_item(add_item([], dict(BURGER)), dict(BURGER))
    return len(c) == 1 and c[0]["qty"] == 2
def _c3():
    return remove_item([{"id": "burger", "name": "Smash burger", "price": 12.9, "qty": 1}], "burger") == []
def _c4():
    return abs(cart_total([{"price": 3, "qty": 1}, {"price": 4.5, "qty": 2}]) - 12) < 1e-9
def _c5():
    return cart_total([]) == 0
__t("TODO 1|add_item puts a new product in with qty 1", _c1)
__t("TODO 1|add_item bumps qty when the product is already there", _c2)
__t("TODO 2|remove_item drops the matching id", _c3)
__t("TODO 3|cart_total is price * qty, summed", _c4)
__t("TODO 3|cart_total of an empty cart is 0", _c5)
`}
    },
    load(js){ return new Function(js + "\nreturn {addItem, removeItem, cartTotal};")(); },
    tests(m){
      const burger = {id:"burger", name:"Smash burger", price:12.9};
      const eq = (a,b) => JSON.stringify(a) === JSON.stringify(b);
      return [
        ["TODO 1", "addItem puts a new product in with qty 1", () => eq(m.addItem([], {...burger}), [{...burger, qty:1}])],
        ["TODO 1", "addItem bumps qty when the product is already there", () => { const c = m.addItem(m.addItem([], {...burger}), {...burger}); return c.length === 1 && c[0].qty === 2; }],
        ["TODO 2", "removeItem drops the matching id", () => eq(m.removeItem([{...burger, qty:1}], "burger"), [])],
        ["TODO 3", "cartTotal is price × qty, summed", () => Math.abs(m.cartTotal([{price:3, qty:1},{price:4.5, qty:2}]) - 12) < 1e-9],
        ["TODO 3", "cartTotal of an empty cart is 0", () => m.cartTotal([]) === 0]
      ];
    },
    hint:{js:"Use find() to look for an item with the same id. For the total, reduce() with price * qty.", ts:"Use find() to look for an item with the same id. For the total, reduce() with price * qty.", py:"Loop over the cart to find a matching id. For the total, sum(i[\"price\"] * i[\"qty\"] for i in cart)."}
  },
  { pid:"KS-301", level:"Mid-level", lv:"mid", xp:120, kind:"project", preview:"search",
    title:"Docs search is too expensive",
    brief:{
      js:"The search page, the fake API and the wiring are done. The bill is huge because every keystroke calls the API. Write debounce in debounce.js. Type in the preview to watch the API call count drop.",
      ts:"The search page, the fake API and the wiring are done and typed. Every keystroke calls the API. Write debounce in debounce.ts. Type in the preview to watch the API call count drop.",
      py:"The search service, the fake API and the timers are done. Every keystroke calls the API. Finish the Debouncer class in debounce.py. Replay some typing in the preview to watch the API call count drop."},
    v:{
      js:{core:"debounce.js", files:[["index.html","f-search-index"],["api.js","f-search-api"],["search-ui.js","f-search-ui"],["debounce.js","f-search-core",1],["debounce.test.js","f-search-test"]],
          todos:[["TODO 1","wait, then call once"],["TODO 2","latest arguments"]]},
      ts:{core:"debounce.ts", files:[["index.html","f-search-index"],["api.ts","f-search-api-ts"],["search-ui.ts","f-search-ui-ts"],["debounce.ts","f-search-core-ts",1],["debounce.test.ts","f-search-test-ts"]],
          todos:[["TODO 1","wait, then call once"],["TODO 2","latest arguments"]]},
      py:{core:"debounce.py", files:[["api.py","f-search-api-py"],["timers.py","f-search-timers-py"],["search_service.py","f-search-ui-py"],["debounce.py","f-search-core-py",1],["test_debounce.py","f-search-test-py"]],
          todos:[["TODO 1","wait, then call once"],["TODO 2","latest arguments"]],
          tests:`
def _d1():
    reset_clock()
    calls = []
    d = debounce(lambda *a: calls.append(a), 100)
    d(); tick(50)
    return len(calls) == 0
def _d2():
    reset_clock()
    calls = []
    d = debounce(lambda *a: calls.append(a), 100)
    d(); tick(30); d(); tick(30); d(); tick(100)
    return len(calls) == 1
def _d3():
    reset_clock()
    calls = []
    d = debounce(lambda *a: calls.append(a), 100)
    d("r"); d("re"); d("rea"); tick(100)
    return calls == [("rea",)]
__t("TODO 1|no call before the wait ends", _d1)
__t("TODO 1|one call after rapid typing", _d2)
__t("TODO 2|uses the latest arguments", _d3)
`}
    },
    load(js, timers){ return new Function("setTimeout","clearTimeout", js + "\nreturn {debounce};")(timers.st, timers.ct); },
    tests(_, js){
      const mk = () => {
        let now = 0, id = 0, timers = [];
        const st = (cb, t) => { timers.push({id: ++id, at: now + t, cb}); return id; };
        const ct = (i) => { timers = timers.filter(x => x.id !== i); };
        const tick = (t) => { now += t; const due = timers.filter(x => x.at <= now); timers = timers.filter(x => x.at > now); due.forEach(x => x.cb()); };
        return {debounce: LABS[1].load(js, {st, ct}).debounce, tick};
      };
      return [
        ["TODO 1", "no call before the wait ends", () => { const {debounce,tick}=mk(); let n=0; const d=debounce(()=>n++,100); d(); tick(50); return n===0; }],
        ["TODO 1", "one call after rapid typing", () => { const {debounce,tick}=mk(); let n=0; const d=debounce(()=>n++,100); d();tick(30);d();tick(30);d();tick(100); return n===1; }],
        ["TODO 2", "uses the latest arguments", () => { const {debounce,tick}=mk(); let got; const d=debounce(q=>got=q,100); d("r");d("re");d("rea"); tick(100); return got==="rea"; }]
      ];
    },
    hint:{js:"Keep a timer id in the closure. On every call, clearTimeout(timer), then timer = setTimeout(() => fn(...args), ms).", ts:"Keep a timer id in the closure. On every call, clearTimeout(timer), then timer = setTimeout(() => fn(...args), ms).", py:"In __call__, clear_timeout(self.timer) if there is one, then self.timer = set_timeout(lambda: self.fn(*args), self.ms)."}
  },
  { pid:"KS-401", level:"Senior", lv:"sr", xp:200, kind:"review",
    title:"Review a junior's PR",
    brief:{
      js:"This PR adds GET /orders for a customer. Click every line that would cause a real problem in production, then submit your review. Three lines are bad.",
      ts:"This PR adds GET /orders for a customer. Click every line that would cause a real problem in production, then submit your review. Three lines are bad.",
      py:"This PR adds a Flask route for a customer's orders. Click every line that would cause a real problem in production, then submit your review. Three lines are bad."},
    file:{js:"routes/orders.js", ts:"routes/orders.ts", py:"routes/orders.py"},
    diffs:{
      js:[
        ["ctx","router.get('/orders', requireAuth, async (req, res) => {"],
        ["add","  const { customerId } = req.query;"],
        ["add","  const sql = `SELECT * FROM orders WHERE customer_id = ${customerId}`;", "SQL injection. Use a parameterised query."],
        ["add","  const orders = await db.query(sql);"],
        ["add","  for (const o of orders) {"],
        ["add","    o.items = await db.query('SELECT * FROM items WHERE order_id = $1', [o.id]);", "N+1 queries. Fetch all items in one query with WHERE order_id = ANY($1)."],
        ["add","  }"],
        ["add","  audit.log('orders.viewed', req.user.id);", "Missing await. If it rejects, nothing catches it, and since Node 15 an unhandled rejection crashes the process."],
        ["add","  res.json(orders);"],
        ["ctx","});"]],
      ts:[
        ["ctx","router.get('/orders', requireAuth, async (req: Request, res: Response) => {"],
        ["add","  const customerId = req.query.customerId as string;"],
        ["add","  const sql = `SELECT * FROM orders WHERE customer_id = ${customerId}`;", "SQL injection. Use a parameterised query."],
        ["add","  const orders: Order[] = await db.query(sql);"],
        ["add","  for (const o of orders) {"],
        ["add","    o.items = await db.query('SELECT * FROM items WHERE order_id = $1', [o.id]);", "N+1 queries. Fetch all items in one query with WHERE order_id = ANY($1)."],
        ["add","  }"],
        ["add","  audit.log('orders.viewed', req.user!.id);", "Missing await. If it rejects, nothing catches it, and since Node 15 an unhandled rejection crashes the process."],
        ["add","  res.json(orders);"],
        ["ctx","});"]],
      py:[
        ["ctx","@app.get(\"/orders\")"],
        ["ctx","@require_auth"],
        ["ctx","def orders():"],
        ["add","    customer_id = request.args[\"customer_id\"]"],
        ["add","    sql = f\"SELECT * FROM orders WHERE customer_id = {customer_id}\"", "SQL injection. Pass parameters separately: db.execute(sql, (customer_id,))."],
        ["add","    rows = db.execute(sql).fetchall()"],
        ["add","    for o in rows:"],
        ["add","        o[\"items\"] = db.execute(\"SELECT * FROM items WHERE order_id = %s\", (o[\"id\"],)).fetchall()", "N+1 queries. Fetch all items in one query with WHERE order_id = ANY(%s)."],
        ["add","    try:"],
        ["add","        audit.log(\"orders.viewed\", g.user.id)"],
        ["add","    except Exception:"],
        ["add","        pass", "Swallowed exception. Audit failures vanish silently. Log the error at least."],
        ["add","    return jsonify(rows)"]]
    }
  }
];

for (const [k, P] of Object.entries(PACKS)){
  for (const L of LABS){
    const l = P.labs[L.pid]; if (!l) continue;
    L.brief[k] = l.brief;
    if (L.kind === "review"){ L.file[k] = l.file; L.diffs[k] = l.diff; continue; }
    L.v[k] = {core: l.core, files: l.files.map(([name, text, core]) => core ? [name, {text}, 1] : [name, {text}]), todos: l.todos, tests: l.tests, driver: l.driver};
    L.hint[k] = l.hint;
  }
}

const LVL = Object.fromEntries(LEVELS.map(l => [l.id, l]));

let state = {done:{}, xp:0};
try { const s = JSON.parse(localStorage.getItem("ks-state")); if (s && s.done) state = s; } catch(e) {}
const save = () => { try { localStorage.setItem("ks-state", JSON.stringify(state)); } catch(e) {} queuePush(); };
const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function dots(lv){ const n = lv.projects.filter(p=>doneAny(p.id)).length; return `<div class="dots" style="--c:${lv.color}" aria-label="${n} of ${lv.projects.length} projects done">${lv.projects.map(p=>`<span class="dot ${doneAny(p.id)?'on':''}"></span>`).join("")}</div>`; }

function renderHome(){
  $("#ladder").innerHTML = LEVELS.map(lv => `<div class="neon ${lv.neon}" style="--c:${lv.color}"><span class="hand muted">${lv.years}</span><div class="lv">${lv.name}</div><p class="muted" style="font-size:.92rem">${lv.blurb}</p>${dots(lv)}</div>`).join("");
}

function renderPath(){
  $("#levels").innerHTML = LEVELS.map(lv => `
    <div class="level" style="--c:${lv.color}">
      <div class="side"><span class="hand muted">${lv.years}</span><h2>${lv.name}</h2><p class="muted">${lv.blurb}</p>${dots(lv)}</div>
      <div class="projects">${lv.projects.map(p => `
        <button class="proj neon ${lv.neon}" data-pid="${p.id}">
          <span class="meta"><span>${p.id}</span><span>${p.d}</span>${p.lab!==undefined?'<span class="c-yellow">● playable</span>':''}${p.ex?'<span class="c-cyan">▶ explainer</span>':''}</span>
          <h3>${p.t}</h3>
          <span class="chips">${p.skills.map(s=>`<span class="chip">${s}</span>`).join("")}</span>
          ${doneAny(p.id)?'<span class="state">✓ Shipped</span>':''}
        </button>`).join("")}
      </div>
    </div>`).join("");
}

function ticketFiles(p){
  const L = p.lab !== undefined ? LABS[p.lab] : null;
  if (!L || L.kind !== "project") return "";
  const v = L.v[lang];
  return "\nLanguage: " + LANG().name + "\nGiven: " + v.files.filter(f => !f[2]).map(f => f[0]).join(", ") + "\nYours: " + v.core;
}
function openProject(pid){
  let p, lv; LEVELS.forEach(l => l.projects.forEach(x => { if (x.id===pid){p=x;lv=l;} }));
  const d = $("#drawer");
  d.innerHTML = `
    <button class="close" id="dClose">Close</button>
    <span class="hand" style="color:${lv.color}">${p.id} · ${lv.name} · ${p.d}</span>
    <h2 id="dTitle">${p.t}</h2>
    <div class="win"><div class="win-bar"><i></i><i></i><i></i><span>ticket.md</span></div><div class="win-body" style="white-space:pre-wrap">${esc(p.ticket + ticketFiles(p))}</div></div>
    <div class="stack" style="gap:8px"><h3>Acceptance criteria</h3><ul>${p.ac.map(a=>`<li>${a}</li>`).join("")}</ul></div>
    <div class="stack" style="gap:8px"><h3>Skills</h3><span class="chips">${p.skills.map(s=>`<span class="chip">${s}</span>`).join("")}</span></div>
    <div class="stack" style="gap:8px"><h3>Steps</h3><ol><li>Watch the linked explainer</li><li>Open the starter project: boilerplate, data and tests are given</li><li>Write the core code in the files marked TODO</li><li>Pass the tests and answer the reviewer</li><li>Ship it to your portfolio</li></ol></div>
    <div class="controls">
      ${p.ex ? `<button class="btn btn-cyan" id="dEx">Watch the explainer</button>` : ""}
      ${p.lab!==undefined ? `<button class="btn btn-main" id="dGo">Open in the lab</button>` : ""}
    </div>
    ${p.lab===undefined ? `<p class="muted">This project\'s starter code is part of the full build. KS-101, KS-301 and KS-401 are playable now.</p>` : ""}`;
  d.hidden = false; $("#scrim").hidden = false; $("#dClose").focus();
  $("#dClose").onclick = closeDrawer;
  if ($("#dGo")) $("#dGo").onclick = () => { closeDrawer(); current = p.lab; location.hash = "lab"; renderLab(); };
  if ($("#dEx")) $("#dEx").onclick = () => { closeDrawer(); showEx(p.ex); location.hash = "learn"; };
}
function closeDrawer(){ $("#drawer").hidden = true; $("#scrim").hidden = true; }
$("#scrim").onclick = closeDrawer;
document.addEventListener("keydown", e => { if (e.key==="Escape") closeDrawer(); });
$("#levels").addEventListener("click", e => { const b = e.target.closest(".proj"); if (b) openProject(b.dataset.pid); });

/* ---------- Explainers ---------- */
const C = {cy:"#2CC9DB", bl:"#3CA2FF", ye:"#F6C431", pu:"#A673FF", re:"#FF5A5A", gr:"#47DB86", or:"#F27B3B", fg:"#E6E9EF", mu:"#9BA1AE", dim:"#5D6370"};
const fa = o => o && o.from !== undefined ? `class="fade" data-from="${o.from}"${o.until !== undefined ? ` data-until="${o.until}"` : ""}` : "";
const G = {
  box:(x,y,w,h,c,label,o={}) => `<g ${fa(o)}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${c}12" stroke="${c}" stroke-width="1.6" ${o.dash?'stroke-dasharray="6 6"':''}/>${label?`<text x="${x+14}" y="${y+22}" fill="${c}" font-size="13" letter-spacing="1.5">${label}</text>`:""}</g>`,
  text:(x,y,s,o={}) => `<text ${fa(o)} x="${x}" y="${y}" fill="${o.c||C.fg}" font-size="${o.size||12}" ${o.anchor?`text-anchor="${o.anchor}"`:""} class="${o.mono?"mono":o.head?"head":""}" ${o.ls?`letter-spacing="${o.ls}"`:""}>${s}</text>`,
  pill:(x,y,w,s,c,o={}) => `<g ${fa(o)}><rect x="${x}" y="${y}" width="${w}" height="24" rx="12" fill="${c}22" stroke="${c}"/><text x="${x+w/2}" y="${y+16}" text-anchor="middle" fill="${c}" font-size="11" class="mono">${s}</text></g>`,
  dot:(x,y,r,c,label,o={}) => `<g ${fa(o)}><circle cx="${x}" cy="${y}" r="${r}" fill="${c}33" stroke="${c}" stroke-width="2"/>${label?`<text x="${x}" y="${y+4}" text-anchor="middle" fill="${C.fg}" font-size="11" class="mono">${label}</text>`:""}</g>`,
  win:(x,y,w,h,title,lines,o={}) => `<g ${fa(o)}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#15171D" stroke="#3A3F4C"/><rect x="${x}" y="${y}" width="${w}" height="20" rx="8" fill="#1B1E25"/><circle cx="${x+12}" cy="${y+10}" r="4" fill="#FF5F57"/><circle cx="${x+25}" cy="${y+10}" r="4" fill="#FEBC2E"/><circle cx="${x+38}" cy="${y+10}" r="4" fill="#28C840"/><text x="${x+52}" y="${y+14}" class="mono" fill="${C.mu}" font-size="10">${title}</text>${lines.map((l,i)=>`<text x="${x+12}" y="${y+38+i*16}" class="mono" fill="${l.c||C.fg}" font-size="11">${l.t||l}</text>`).join("")}</g>`,
  flow:(d,c,from,until) => `<path class="flow" data-flow="${from}"${until!==undefined?` data-until="${until}"`:""} d="${d}" stroke="${c}" marker-end="url(#m-${c.slice(1)})"/>`,
  defs:() => `<defs>${Object.values(C).map(c=>`<marker id="m-${c.slice(1)}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join("")}</defs>`
};
const svgWrap = (h, inner, label) => `<svg viewBox="0 0 640 ${h}" role="img" aria-label="${label}">${G.defs()}${inner}<circle id="packet" r="5" fill="${C.or}" opacity="0"/></svg>`;

const EXPL = [
 /* ---------------- HTTP ---------------- */
 { id:"http", refs:[["MDN: An overview of HTTP", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview"], ["MDN: How browsers work", "https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work"], ["MDN: HTTP response status codes", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status"]], level:"app", kind:"steps", tab:"How a web request works",
   title:'What happens when you <span class="c-cyan">press Enter</span>', sub:"Follow one request from the address bar to a rendered page, in a few hundred milliseconds.",
   svg: () => svgWrap(400,
     G.win(24,150,170,110,"browser",[{t:"shop.example.com",c:C.cy}]) +
     G.text(109,285,"✓ PAGE RENDERED",{anchor:"middle",c:C.gr,size:11,ls:1.5,from:5}) +
     G.box(236,24,170,64,C.pu,"DNS RESOLVER") + G.text(250,72,"who is shop.example.com?",{mono:true,size:10,c:C.mu}) +
     G.pill(236,96,170,"→ 203.0.113.10",C.pu,{from:1}) +
     G.box(430,120,190,262,C.dim,"SHOP.EXAMPLE.COM",{dash:true}) +
     G.box(450,148,150,44,C.cy,"LOAD BALANCER") + G.box(450,214,150,44,C.bl,"APP SERVER") + G.box(450,300,150,60,C.ye,"DATABASE") +
     G.text(312,176,"SYN →",{mono:true,size:10,c:C.mu,anchor:"middle",from:2,until:2}) + G.text(312,192,"← SYN-ACK",{mono:true,size:10,c:C.mu,anchor:"middle",from:2,until:2}) + G.text(312,208,"ACK →",{mono:true,size:10,c:C.mu,anchor:"middle",from:2,until:2}) +
     G.pill(232,120,160,"🔒 TLS · cert valid",C.gr,{from:2}) +
     G.text(312,224,"GET /products",{mono:true,size:11,c:C.bl,anchor:"middle",from:3,until:3}) +
     G.text(312,270,"200 OK · 14 KB",{mono:true,size:11,c:C.gr,anchor:"middle",from:5}) +
     `<g class="fade" data-from="5"><text x="24" y="320" fill="${C.mu}" font-size="11" letter-spacing="1.5">EXAMPLE TIMING · 240 MS</text>
       <rect x="24" y="330" width="32" height="18" fill="${C.pu}"/><rect x="56" y="330" width="95" height="18" fill="${C.gr}"/><rect x="151" y="330" width="190" height="18" fill="${C.bl}"/><rect x="341" y="330" width="63" height="18" fill="${C.ye}"/>
       <text x="24" y="366" class="mono" fill="${C.pu}" font-size="10">DNS 20</text><text x="70" y="366" class="mono" fill="${C.gr}" font-size="10">TCP+TLS 60</text><text x="200" y="366" class="mono" fill="${C.bl}" font-size="10">SERVER 120</text><text x="345" y="366" class="mono" fill="${C.ye}" font-size="10">DOWN 40</text></g>` +
     G.flow("M150 150 C 170 110, 200 70, 234 60", C.pu, 1, 1) +
     G.flow("M194 186 H 448", C.mu, 2, 2) +
     G.flow("M194 232 C 300 232, 380 170, 448 170", C.bl, 3, 3) +
     G.flow("M525 192 V 212", C.bl, 4, 4) + G.flow("M525 258 V 298", C.ye, 4, 4) +
     G.flow("M448 236 C 380 250, 300 256, 196 240", C.gr, 5),
     "A browser asking DNS for an address, then requesting a page from a server"),
   steps:[
    {t:"You type an address", b:"The browser needs to turn shop.example.com into a server it can actually talk to.", more:"Browsers keep their own DNS cache. If you visited recently, they may skip straight to the handshake."},
    {t:"DNS finds the server", b:"The browser asks a DNS resolver where shop.example.com lives. It answers with an IP address.", more:"DNS answers are cached for their TTL, often minutes to hours. That's why a DNS change can take a while to reach everyone.", code:"$ dig shop.example.com +short\n203.0.113.10"},
    {t:"Handshake and padlock", b:"TCP sets up a reliable connection in three messages. TLS checks the server's certificate and agrees on encryption keys.", more:"Newer HTTP/3 runs over QUIC on UDP and folds both handshakes into one. The padlock means the traffic is encrypted and the certificate matches the domain. It doesn't mean the site is honest."},
    {t:"The request", b:"The browser sends an HTTP request: a method, a path and some headers.", code:"GET /products HTTP/1.1\nHost: shop.example.com\nAccept: text/html\nCookie: session=8f3a…"},
    {t:"The server does the work", b:"The load balancer picks an app server. Your code runs and asks the database for the products.", more:"This is usually the slowest part. The Caching explainer shows how to shorten it."},
    {t:"The response comes back", b:"The server replies with a status code and a body, and the browser renders it. In this example the whole trip took about 240 ms.", more:"Pressing Enter is a navigation, so the server sends HTML. The JSON you see in the Network tab comes from fetch() calls the page makes afterwards.", code:"HTTP/1.1 200 OK\nContent-Type: text/html\nCache-Control: max-age=60\n\n<!doctype html><title>Products</title>…"}
   ],
   takeaways:["DNS turns names into IP addresses, and the answer is cached.","TCP makes the connection reliable. TLS makes it private.","Status codes tell the story: 2xx worked, 4xx is the client's fault, 5xx is the server's."],
   mistakes:["Returning 200 with an error message inside the body.","Serving the site over plain HTTP, or forgetting to redirect to HTTPS.","Sending huge uncompressed responses to phones."],
   real:"Open your browser's developer tools, go to the Network tab and click any request. The Timing view shows these same phases, measured live.",
   quiz:[
    {q:"What does DNS do?", o:["Turns a name into an IP address","Encrypts the traffic","Stores your cookies"], a:0},
    {q:"What does the padlock guarantee?", o:["The site is safe to buy from","Traffic is encrypted to the real domain","The server is fast"], a:1},
    {q:"A 404 status means…", o:["The server crashed","You're not logged in","The server couldn't find that path"], a:2}]},

 /* ---------------- GIT ---------------- */
 { id:"git", refs:[["Pro Git: Branches in a nutshell", "https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell"], ["Pro Git: Basic branching and merging", "https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging"], ["GitHub Docs: About pull requests", "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests"]], level:"app", kind:"steps", tab:"Git branches and merging",
   title:'Branch, commit, <span class="c-purple">merge</span>', sub:"How a team works on one codebase without stepping on each other.",
   svg: () => svgWrap(360,
     `<path d="M60 120 H 610" stroke="${C.bl}" stroke-width="3"/>` + G.pill(560,80,60,"main",C.bl) +
     G.dot(90,120,15,C.bl,"a1f") + G.dot(170,120,15,C.bl,"b7c") +
     G.text(90,155,"Initial commit",{anchor:"middle",size:10,c:C.mu,mono:true}) + G.text(170,155,"Add checkout",{anchor:"middle",size:10,c:C.mu,mono:true}) +
     G.flow("M170 135 C 200 220, 220 230, 260 230 H 420", C.pu, 1) + G.pill(250,262,130,"feature/cart",C.pu,{from:1}) +
     G.dot(300,230,15,C.pu,"c4d",{from:2}) + G.dot(390,230,15,C.pu,"d9e",{from:2}) +
     G.text(345,300,"Add cart total · Fix rounding",{anchor:"middle",size:10,c:C.mu,mono:true,from:2}) +
     G.dot(300,120,15,C.ye,"e2f",{from:3}) + G.text(300,95,"teammate: Add login",{anchor:"middle",size:10,c:C.ye,mono:true,from:3}) +
     G.box(440,200,180,70,C.gr,"PULL REQUEST #12",{from:4}) + G.text(454,248,"✓ 2 approvals · CI green",{mono:true,size:10,c:C.gr,from:4}) +
     G.flow("M405 230 C 440 230, 450 130, 478 124", C.gr, 5) + G.dot(490,120,17,C.gr,"M",{from:5}) +
     G.text(490,95,"merge commit",{anchor:"middle",size:10,c:C.gr,mono:true,from:5}),
     "A Git history with a feature branch merged back into main"),
   steps:[
    {t:"main holds the shared history", b:"Each circle is a commit: a saved snapshot of the code with a message and an author.", code:"$ git log --oneline\nb7c Add checkout\na1f Initial commit"},
    {t:"Make a branch", b:"A branch is a movable label that points at a commit. Your work happens there, away from main.", code:"$ git switch -c feature/cart"},
    {t:"Commit on the branch", b:"Each commit moves the feature label forward. main doesn't change at all.", code:"$ git add cart.js\n$ git commit -m \"Add cart total\""},
    {t:"main moves too", b:"A teammate merged their login work into main while you were busy. Your branch is now behind.", more:"If you both changed the same part of a file, Git stops and asks you to resolve a merge conflict by choosing what the final lines should be.", code:"$ git fetch origin\n$ git merge origin/main"},
    {t:"Open a pull request", b:"A pull request asks to merge your branch. Teammates review the diff and CI runs the tests.", more:"Small pull requests get reviewed faster and break less. Aim for one idea per PR."},
    {t:"Merge", b:"Clicking Merge on the pull request adds a merge commit that joins both histories. main now has your cart and your teammate's login.", more:"Because you already merged main into your branch, a plain git merge would just fast-forward main with no merge commit. --no-ff forces one, which is what GitHub's Merge button does.", code:"# usually: click Merge on the pull request\n$ git switch main\n$ git merge --no-ff feature/cart"}
   ],
   takeaways:["A branch is just a pointer to a commit, so branches are cheap.","Keep branches short-lived and pull main in often.","Pull requests are where review and CI happen before code reaches main."],
   mistakes:["Committing straight to main.","Long-lived branches that drift for weeks and conflict everywhere.","Commit messages like \"fix\" or \"stuff\"."],
   real:"Most teams protect main so nobody can push to it directly. Every change goes through a pull request with at least one approval and green CI.",
   quiz:[
    {q:"What is a branch?", o:["A copy of the whole repo","A movable pointer to a commit","A backup on GitHub"], a:1},
    {q:"When does a merge conflict happen?", o:["Both sides changed the same lines","Your branch has more commits","You forgot to push"], a:0},
    {q:"git pull is the same as…", o:["push, then fetch","making a new branch","fetch, then merge"], a:2}]},

 /* ---------------- SECRETS ---------------- */
 { id:"secrets", refs:[["Kubernetes: Secrets", "https://kubernetes.io/docs/concepts/configuration/secret/"], ["Kubernetes: Good practices for Secrets", "https://kubernetes.io/docs/concepts/security/secrets-good-practices/"], ["GitHub Docs: About secret scanning", "https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning"]], level:"jr", kind:"steps", tab:"Kubernetes Secrets",
   title:'Stop storing <span class="c-yellow">secrets</span> like this', sub:"Follow one payment from tap to Stripe, and see where the key leaks.",
   svg: () => document.getElementById("tpl-secrets").innerHTML,
   onStep(step){
     $("#keyChip").setAttribute("fill", step === 3 ? "#FF5A5A" : "#F6C431");
     $("#keyText").textContent = step >= 4 ? "from secret ✓" : "sk_live_51Hx90p";
   },
   steps:[
    {t:"A customer taps Pay", b:"The phone sends the order to the payment service running inside your Kubernetes cluster.", more:"The request enters through an Ingress, then a Service picks one of the payment pods."},
    {t:"Payment calls Stripe", b:"To charge the card, the payment pod needs your Stripe API key. That key can move real money.", more:"API keys are bearer credentials. Whoever holds the string can use it, with no second check."},
    {t:"The key sits in plain env vars", b:"Most tutorials paste the key straight into the pod's environment. It works, so nobody notices the problem.", more:"Plain env values end up in git, in kubectl describe output and in crash dumps.", code:"env:\n  - name: STRIPE_API_KEY\n    value: sk_live_51Hx90p   # ✗ in git, in the manifest"},
    {t:"One debug line leaks it", b:"A developer logs process.env to chase a bug. Now the live key is in your logs, your log vendor, and every screen that reads them.", more:"Logs get copied to vendors, backups and dashboards. Deleting the line in one place doesn't remove the copies.", code:"console.log(process.env)   // ✗ prints every secret"},
    {t:"Fix: store it as a Secret", b:"Put the key in a Kubernetes Secret and inject it at runtime. Use RBAC and a separate namespace so only the people and service accounts that need it can read it.", more:"Your app still sees the key in its environment, so never log env or whole config objects. Anyone who can create pods in the namespace can read its Secrets, which is why the namespace boundary matters.", code:"kubectl create secret generic stripe-key \\\n  --from-literal=STRIPE_API_KEY=sk_live_...\n\nenv:\n  - name: STRIPE_API_KEY\n    valueFrom:\n      secretKeyRef: { name: stripe-key, key: STRIPE_API_KEY }"},
    {t:"Base64 is not encryption", b:"By default a Secret is only base64-encoded. Anyone allowed to read Secrets can decode it in one command.", more:"Turn on encryption at rest with a KMS provider, and give get, list and watch on Secrets to as few people as possible.", code:"kubectl get secret stripe-key \\\n  -o jsonpath='{.data.STRIPE_API_KEY}' | base64 -d\n# sk_live_51Hx90p   ← that's it"},
    {t:"Rotate it", b:"Keys leak eventually. Rotate on a schedule and right away after any leak, so an old copy is useless.", more:"A secrets manager such as Vault or AWS Secrets Manager, synced by the External Secrets Operator, makes rotation a config change instead of a fire drill."}
   ],
   takeaways:["Never put secrets in code, images, or env files in git.","Load them from a Secret or a secrets manager, and limit who can read them with RBAC and namespaces.","Encrypt at rest, and rotate on any leak."],
   mistakes:["Committing a .env file.","Logging process.env or a whole config object.","Thinking base64 is encryption.","Using one key for every environment."],
   real:"Bots scan public GitHub commits for API keys around the clock, and leaked keys are often tried within minutes. GitHub's secret scanning and Stripe's leaked-key detection exist because this happens so often.",
   quiz:[
    {q:"Where should a live API key live?", o:["Hard-coded in app.js","In a Secret the pod mounts at runtime","In the Docker image"], a:1},
    {q:"A Kubernetes Secret is base64 by default. That means…", o:["Anyone who can read it can decode it","It's encrypted with AES","Only the pod can read it"], a:0},
    {q:"A key leaked into your logs. What do you do first?", o:["Delete the log lines","Restart the pod","Rotate the key at Stripe"], a:2}]},

 /* ---------------- THREADS ---------------- */
 { id:"threads", refs:[["Python docs: threading", "https://docs.python.org/3/library/threading.html"], ["Chromium: Process models", "https://www.chromium.org/developers/design-documents/process-models/"], ["Node.js: The event loop", "https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick"]], level:"jr", kind:"threads", tab:"Process vs Thread",
   title:'<span class="c-blue">Process</span> vs <span class="c-yellow">Thread</span>', sub:"Same 4 tasks. Walled off, or shared?",
   takeaways:["Processes each get private memory. A crash stays contained.","Threads share one process's memory. Cheap to start and share, but one crash takes them all down.","Shared memory needs locks, or two threads will overwrite each other."],
   mistakes:["Updating a shared counter from many threads without a lock.","Starting a new process per request when a thread pool would do.","Assuming threads make CPU-heavy Python faster (in standard CPython, the GIL says otherwise)."],
   real:"Chrome runs tabs from different sites in separate processes, so one crashing tab doesn't take down the browser. A web server like Node or Go handles many requests inside one process with lightweight threads or an event loop.",
   quiz:[
    {q:"Which one shares memory by default?", o:["Threads in one process","Separate processes","Neither"], a:0},
    {q:"One thread hits a segfault. What happens?", o:["Only that thread stops","The whole process and all its threads die","Nothing, threads restart"], a:1},
    {q:"Two threads add 1 to the same counter and get 1, not 2. What fixes it?", o:["More threads","A bigger counter","A lock (mutex) around the update"], a:2}]},

 /* ---------------- DOCKER ---------------- */
 { id:"docker", refs:[["Docker Docs: Multi-stage builds", "https://docs.docker.com/build/building/multi-stage/"], ["Docker Docs: Building best practices", "https://docs.docker.com/build/building/best-practices/"], ["Docker Docs: .dockerignore files", "https://docs.docker.com/build/concepts/context/#dockerignore-files"]], level:"mid", kind:"docker", tab:"Docker image size",
   title:'Docker image <span class="c-blue">size</span>', sub:'Your image is 1.9 GB. <span class="underline">Shrink it ~85%.</span>',
   takeaways:["Build in one stage, ship only the output and production deps from a second, clean stage.","Start from a small base like node:20-alpine, -slim or distroless.","A .dockerignore keeps junk and secrets out of the build."],
   mistakes:["COPY . . before installing dependencies, which breaks layer caching.","Shipping compilers and dev dependencies to production.","Leaving .env and .git inside the image."],
   real:"Every new node has to pull the image before it can start your app. At 100 MB/s, 1.9 GB takes about 19 seconds and 275 MB takes under 3. Smaller images make autoscaling react faster and cost less to store and move.",
   quiz:[
    {q:"Which fix leaves dev dependencies and build leftovers behind?", o:["Multi-stage build","A smaller base image",".dockerignore"], a:0},
    {q:"Why put .env in .dockerignore, besides size?", o:["It builds faster","It keeps secrets out of the image layers","Docker requires it"], a:1},
    {q:"In this example, which single fix saves the most?", o:[".dockerignore","Multi-stage build","Small base image"], a:2}]},

 /* ---------------- CACHING ---------------- */
 { id:"cache", refs:[["AWS: Caching patterns", "https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html"], ["Redis Docs: EXPIRE", "https://redis.io/docs/latest/commands/expire/"], ["MDN: HTTP caching", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching"]], level:"mid", kind:"steps", tab:"Caching",
   title:'Make it fast with a <span class="c-cyan">cache</span>', sub:"A slow 120 ms query, or about 1 ms from memory?",
   svg: () => svgWrap(380,
     G.box(20,150,110,70,C.mu,"USER") + G.text(34,200,"GET /product/42",{mono:true,size:10,c:C.mu}) +
     G.box(220,150,150,70,C.bl,"APP SERVER") +
     G.box(450,30,170,100,C.cy,"REDIS CACHE") + G.text(464,78,"product:42 = $12.90",{mono:true,size:11,from:3,until:5,c:C.fg}) + G.text(464,100,"TTL 60s",{mono:true,size:10,c:C.mu,from:3,until:5}) +
     G.text(464,78,"product:42 = $9.99",{mono:true,size:11,from:6,c:C.gr}) +
     G.box(450,250,170,100,C.ye,"DATABASE") + G.text(464,298,"price = $12.90",{mono:true,size:11,c:C.fg,from:0,until:4}) + G.text(464,298,"price = $9.99",{mono:true,size:11,c:C.gr,from:5}) +
     G.pill(380,140,100,"MISS ✗",C.re,{from:1,until:1}) + G.pill(380,236,100,"120 ms",C.ye,{from:2,until:2}) +
     G.pill(366,140,120,"HIT ✓ ~1 ms",C.gr,{from:4,until:4}) + G.pill(448,140,174,"stale: still $12.90",C.re,{from:5,until:5}) +
     G.pill(356,140,140,"DEL product:42",C.or,{from:6}) +
     G.flow("M130 185 H 218", C.mu, 0, 0) + G.flow("M130 185 H 218", C.mu, 4, 4) +
     G.flow("M370 168 C 410 150, 420 110, 448 92", C.cy, 1, 1) + G.flow("M370 168 C 410 150, 420 110, 448 92", C.gr, 4, 4) +
     G.flow("M370 200 C 410 220, 420 270, 448 290", C.ye, 2, 2) + G.flow("M370 176 C 410 160, 420 120, 448 104", C.cy, 3, 3) +
     G.flow("M370 205 C 410 230, 420 280, 448 300", C.or, 6) + G.flow("M370 172 C 410 156, 420 116, 448 98", C.or, 6),
     "An app server checking a cache before the database"),
   steps:[
    {t:"A request arrives", b:"Someone opens product 42. The app needs its name and price."},
    {t:"Check the cache first", b:"The app asks Redis for product:42. It isn't there yet, so this is a cache miss.", code:"let p = JSON.parse(await redis.get(\"product:42\"));   // null"},
    {t:"Fall back to the database", b:"The app reads the product from the database. This one is a heavy query, so it takes about 120 ms.", code:"if (!p) p = await db.products.find(42);"},
    {t:"Save it for next time", b:"The app stores the result in Redis with a time to live of 60 seconds.", more:"This pattern is called cache-aside: the app checks the cache, loads on a miss and fills the cache itself.", code:"await redis.set(\"product:42\", JSON.stringify(p), { EX: 60 });"},
    {t:"The next request is a hit", b:"The next visitor gets product 42 straight from memory in about 1 ms. The database isn't touched.", more:"If 95% of requests hit the cache, the database only sees 1 in 20 reads."},
    {t:"Then the price changes", b:"Someone updates the price to $9.99 in the database. The cache still says $12.90 until the TTL runs out.", more:"Stale data is the classic caching bug. Customers see one price and pay another."},
    {t:"Fix: invalidate on write", b:"When you update the database, delete the cached key. The next read misses and loads the fresh price.", code:"await db.products.update(42, { price: 9.99 });\nawait redis.del(\"product:42\");"}
   ],
   takeaways:["Check the cache, fall back to the source, then fill the cache.","Every cached value needs a TTL, a way to be invalidated, or both.","Measure your hit rate. A cache nobody hits is just extra cost."],
   mistakes:["Caching without a TTL, so wrong data lives forever.","Forgetting to invalidate on writes.","Caching per-user data under a shared key and leaking it to other users."],
   real:"Most large sites put a CDN cache in front of the app and Redis or Memcached behind it. Product pages, prices and sessions are typical cache tenants.",
   quiz:[
    {q:"A cache hit means…", o:["The data was found in the cache","The cache crashed","The database was updated"], a:0},
    {q:"Why give cached values a TTL?", o:["To make reads faster","So stale data expires eventually","To save disk space"], a:1},
    {q:"The hardest part of caching is usually…", o:["Installing Redis","Picking a key name","Knowing when cached data is out of date"], a:2}]},

 /* ---------------- QUEUES ---------------- */
 { id:"queue", refs:[["AWS: What is Amazon SQS?", "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html"], ["AWS: SQS dead-letter queues", "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html"], ["RabbitMQ: Consumer acknowledgements", "https://www.rabbitmq.com/docs/confirms"]], level:"mid", kind:"queue", tab:"Message queues",
   title:'Absorb the spike with a <span class="c-purple">queue</span>', sub:"Orders arrive faster than you can process them. Now what?",
   takeaways:["A queue lets the web app accept work instantly and hand it to workers later.","If jobs arrive faster than workers finish them, the backlog grows without limit.","Jobs can run twice after a crash, so make them idempotent."],
   mistakes:["Doing slow work (emails, PDFs, payments) inside the web request.","No dead-letter queue, so a bad job keeps retrying until it expires (or forever) and nobody sees why.","Workers that charge a card twice when a job is retried."],
   real:"Black Friday traffic can be many times normal. Shops put orders on a queue (SQS, RabbitMQ, Kafka) and scale workers up as the backlog grows, instead of letting checkout time out.",
   quiz:[
    {q:"Jobs arrive at 10/s and workers finish 8/s. What happens?", o:["The backlog grows forever","The queue drops jobs","It evens out by itself"], a:0},
    {q:"Why use a queue instead of calling the worker directly?", o:["It makes each job faster","The web app stays fast and spikes get smoothed out","It removes the need for workers"], a:1},
    {q:"A worker crashed mid-job and the job ran again. What protects you?", o:["A bigger queue","More workers","Making the job idempotent"], a:2}]},

 /* ---------------- INDEX ---------------- */
 { id:"index", refs:[["PostgreSQL: Indexes", "https://www.postgresql.org/docs/current/indexes-intro.html"], ["PostgreSQL: Using EXPLAIN", "https://www.postgresql.org/docs/current/using-explain.html"], ["PostgreSQL: Indexes on expressions", "https://www.postgresql.org/docs/current/indexes-expressional.html"]], level:"mid", kind:"index", tab:"Database indexes",
   title:'<span class="c-red">Full scan</span> vs <span class="c-green">index</span>', sub:"One query, one million rows. Read them all, or read four?",
   takeaways:["An index is a sorted structure (usually a B-tree) that jumps to matching rows.","Index the columns you filter, join and sort on.","Every index slows writes and uses disk, so don't index everything."],
   mistakes:["Filtering a big table on an unindexed column.","Wrapping the column in a function (WHERE LOWER(email) = …) so a plain index on email can't be used (unless you index LOWER(email)).","Adding an index for every column \"just in case\"."],
   real:"Run EXPLAIN (or EXPLAIN ANALYZE) on a slow query. If you see Seq Scan on a big table with a selective WHERE, an index is usually the fix.",
   quiz:[
    {q:"What does an index cost?", o:["Nothing","Slower writes and more disk","Slower reads"], a:1},
    {q:"Which query can use an index on email?", o:["WHERE email = 'a@b.com'","WHERE LOWER(email) = 'a@b.com'","WHERE email LIKE '%@b.com'"], a:0},
    {q:"Which tool shows whether a query uses an index?", o:["VACUUM","GRANT","EXPLAIN"], a:2}]}
];
const EX_LEVELS = [["app","Apprentice","var(--yellow)"],["jr","Junior","var(--blue)"],["mid","Mid-level","var(--cyan)"]];

let exCur = "secrets", step = 0, playing = null, raf = null, exTimers = [];
const exById = id => EXPL.find(e => e.id === id);
function clearExTimers(){ exTimers.forEach(t => { clearInterval(t); clearTimeout(t); }); exTimers = []; }

function renderExList(){
  $("#exList").innerHTML = EX_LEVELS.map(([k, name, c]) => `<div class="rf-group"><span class="hand" style="color:${c};width:90px">${name}</span><div class="rf-pills">${EXPL.filter(e=>e.level===k).map(e=>`<button class="ex-chip" data-ex="${e.id}" aria-pressed="${e.id===exCur}" style="--c:${c}"><span class="dot ${state.done["EXQ-"+e.id]?'on':''}" style="--c:${c}"></span>${e.tab}</button>`).join("")}</div></div>`).join("");
}

/* ---- step player ---- */
function stepStage(E){
  return `<div class="stage">
    <div class="diagram">${E.svg()}</div>
    <div class="caption neon cyan">
      <span class="stepno" id="stepNo"></span>
      <h3 id="stepTitle"></h3>
      <p class="muted" id="stepBody"></p>
      <div class="controls">
        <button class="btn btn-ghost btn-sm" id="prevStep">Back</button>
        <button class="btn btn-main btn-sm" id="nextStep">Next</button>
        <button class="btn btn-ghost btn-sm" id="playStep">Play all</button>
        <div class="pips" id="pips">${E.steps.map((_,i)=>`<button aria-label="Step ${i+1}" data-s="${i}"></button>`).join("")}</div>
      </div>
      <div class="deep" id="deep"></div>
    </div>
  </div>`;
}
function goStep(n){
  const E = exById(exCur); if (E.kind !== "steps") return;
  step = Math.max(0, Math.min(E.steps.length-1, n));
  const S = E.steps[step], svg = $("#exStage svg");
  svg.querySelectorAll(".fade").forEach(g => {
    const from = +g.dataset.from, until = g.dataset.until !== undefined ? +g.dataset.until : 99;
    g.classList.toggle("off", !(step >= from && step <= until));
  });
  svg.querySelectorAll(".flow").forEach(p => {
    const from = +p.dataset.flow, until = p.dataset.until !== undefined ? +p.dataset.until : 99;
    p.style.strokeDashoffset = step >= from && step <= until ? "0" : "1";
  });
  if (E.onStep) E.onStep(step);
  $("#stepNo").textContent = `STEP ${step+1} OF ${E.steps.length}`;
  $("#stepTitle").textContent = S.t;
  $("#stepBody").textContent = S.b;
  $("#deep").innerHTML = (S.more || S.code) ? `<span class="hand c-cyan">Go deeper</span>${S.more ? `<p>${esc(S.more)}</p>` : ""}${S.code ? `<div class="win"><div class="win-bar"><i></i><i></i><i></i><span>${/^\$|kubectl/.test(S.code) ? "terminal" : /^(GET|HTTP)/.test(S.code) ? "http" : /^env:/.test(S.code) ? "deployment.yaml" : "code"}</span></div><pre class="win-body">${esc(S.code)}</pre></div>` : ""}` : "";
  $("#prevStep").disabled = step === 0;
  $("#nextStep").textContent = step === E.steps.length-1 ? "Replay" : "Next";
  $("#pips").querySelectorAll("button").forEach((b,i) => { if (i===step) b.setAttribute("aria-current","step"); else b.removeAttribute("aria-current"); });
  runPacket();
}
function runPacket(){
  cancelAnimationFrame(raf);
  const svg = $("#exStage svg"), pk = svg && svg.querySelector("#packet");
  if (!pk) return;
  const path = svg.querySelector(`.flow[data-flow="${step}"]`);
  if (!path || matchMedia("(prefers-reduced-motion: reduce)").matches){ pk.setAttribute("opacity","0"); return; }
  const len = path.getTotalLength(); let t0 = null;
  pk.setAttribute("fill", path.getAttribute("stroke") === "#E6E9EF" || path.getAttribute("stroke") === C.mu ? "#F27B3B" : path.getAttribute("stroke"));
  const frame = ts => {
    if (t0 === null) t0 = ts + 500;
    const k = Math.max(0, (ts - t0) / 1100);
    if (k >= 1){ pk.setAttribute("opacity","0"); return; }
    const pt = path.getPointAtLength(k * len);
    pk.setAttribute("cx", pt.x); pk.setAttribute("cy", pt.y); pk.setAttribute("opacity", ts < t0 ? "0" : "1");
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}
function stopPlay(){ clearInterval(playing); playing = null; const b = $("#playStep"); if (b) b.textContent = "Play all"; }
function wireSteps(E){
  $("#exStage svg").querySelectorAll(".flow").forEach(p => { p.setAttribute("pathLength","1"); p.style.strokeDasharray = "1"; p.style.strokeDashoffset = "1"; });
  $("#pips").addEventListener("click", e => { const b = e.target.closest("button"); if (b){ stopPlay(); goStep(+b.dataset.s); } });
  $("#prevStep").onclick = () => { stopPlay(); goStep(step-1); };
  $("#nextStep").onclick = () => { stopPlay(); goStep(step === E.steps.length-1 ? 0 : step+1); };
  $("#playStep").onclick = () => {
    if (playing){ stopPlay(); return; }
    goStep(0); $("#playStep").textContent = "Pause";
    playing = setInterval(() => { if (step >= E.steps.length-1){ stopPlay(); return; } goStep(step+1); }, 3200);
  };
  step = 0; goStep(0);
}

/* ---- Docker: VS shrinker with a live Dockerfile ---- */
const FAT = [
  {k:"app", n:"app code (dist)", mb:20},
  {k:"deps", n:"node_modules (all)", mb:450},
  {k:"tools", n:"npm cache + build leftovers", mb:300},
  {k:"base", n:"node:20 base (OS + compilers)", mb:1100},
  {k:"junk", n:".git · tests · .env", mb:30}
];
const FAT_MB = FAT.reduce((a, l) => a + l.mb, 0), SLIM_MB = 275;
const FIXES = [
  {k:"multi", t:"Multi-stage", s:"Build in one stage, then copy only the built app and production deps into a clean one.", c:"var(--blue)"},
  {k:"alpine", t:"Small base", s:"Swap node:20 (a full Debian with compilers) for node:20-alpine.", c:"var(--cyan)"},
  {k:"ignore", t:".dockerignore", s:"Keep .git, tests and .env out of the build.", c:"var(--purple)"}
];
const on = {multi:false, alpine:false, ignore:false};
let shown = FAT_MB;
function dockerStage(){
  return `<div class="shrink" id="ex-docker">
    <div class="vs">
      <div class="col left"><div class="stacklabel c-red">Bloated</div><div class="bigsize c-red">~1.9 GB</div>
        <div class="layers" style="--c:var(--line-2)">${FAT.map(l => `<div class="layer ${l.k==='app'||l.k==='junk'?'':'fat'}"><span>${l.n}</span><span>${l.mb>=1000?(l.mb/1000)+' GB':l.mb+' MB'}</span></div>`).join("")}</div></div>
      <div class="vsbadge" style="align-self:center">VS</div>
      <div class="col right"><div class="stacklabel c-blue">Yours</div><div class="bigsize c-blue" id="slimSize">~1.9 GB</div><div class="layers" style="--c:var(--blue)" id="slimLayers"></div></div>
    </div>
    <div class="stack">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><span class="hand muted">How you get there · flip each fix</span><span style="font:600 .9rem var(--f-mono)" id="pct">0% smaller</span></div>
      <div class="meter"><i id="meter" style="width:0%"></i></div>
      <div class="toggles" id="toggles">${FIXES.map(f => `<button class="toggle neon" style="--c:${f.c}" data-fix="${f.k}" aria-pressed="${on[f.k]}"><span><b>${f.t}</b><small>${f.s}</small></span><span class="switch"></span></button>`).join("")}</div>
    </div>
    <div class="docker-files">
      <div class="win"><div class="win-bar"><i></i><i></i><i></i><span>Dockerfile · updates as you flip</span></div><pre class="win-body" id="dockerfile"></pre></div>
      <div class="stack" style="gap:12px">
        <div class="win"><div class="win-bar"><i></i><i></i><i></i><span>.dockerignore</span></div><pre class="win-body" id="dockerignore"></pre></div>
        <div class="dstats"><div><b id="pullTime">19.0 s</b><small>to pull at 100 MB/s</small></div><div><b id="nodesCost">$0.00</b><small>extra per 1,000 pulls*</small></div></div>
        <small class="muted">*Illustrative: $0.09 per GB is typical cloud internet egress, compared with the slim 275 MB image. Same-region registry pulls are often free, and registries send compressed layers, so real pulls are smaller.</small>
      </div>
    </div>
  </div>`;
}
function dockerfileText(){
  const base = on.alpine ? "node:20-alpine" : "node:20";
  const lines = on.multi
    ? [`FROM ${base} AS build`, "WORKDIR /app", "COPY package*.json ./", "RUN npm ci", "COPY . .", "RUN npm run build", "", `FROM ${base}`, "WORKDIR /app", "COPY package*.json ./", "RUN npm ci --omit=dev", "COPY --from=build /app/dist ./dist", 'CMD ["node", "dist/server.js"]']
    : [`FROM ${base}`, "WORKDIR /app", "COPY . .", "RUN npm install", "RUN npm run build", 'CMD ["node", "dist/server.js"]'];
  return lines.map(l => (on.alpine && l.includes("alpine")) || (on.multi && /AS build|--from=build|--omit=dev/.test(l)) ? `<span class="c-green">${esc(l)}</span>` : esc(l)).join("\n");
}
function slimLayers(){
  return [
    {n:"app code (dist)", mb:20, show:true, lean:true},
    {n: on.multi ? "prod deps only" : "node_modules (all)", mb: on.multi ? 120 : 450, show:true, lean:on.multi},
    {n:"npm cache + build leftovers", mb:300, show:!on.multi},
    {n: on.alpine ? "node:20-alpine base" : "node:20 base (OS + compilers)", mb: on.alpine ? 135 : 1100, show:true, lean:on.alpine},
    {n:".git · tests · .env", mb:30, show:!on.ignore}
  ];
}
function renderSlim(){
  if (!$("#slimLayers")) return;
  const L = slimLayers();
  const total = L.filter(l=>l.show).reduce((a,l)=>a+l.mb,0);
  $("#slimLayers").innerHTML = L.map(l => `<div class="layer ${l.show?'':'gone'} ${l.lean?'lean':'fat'}"><span>${l.n}</span><span>${l.mb} MB</span></div>`).join("");
  const pct = Math.round((1 - total/FAT_MB)*100);
  $("#pct").textContent = `${pct}% smaller`;
  $("#meter").style.width = pct + "%";
  $("#dockerfile").innerHTML = dockerfileText();
  $("#dockerignore").innerHTML = on.ignore ? `<span class="c-green">.git\nnode_modules\ntests\n.env\n*.log</span>` : `<span class="c-red"># file missing: everything gets sent to the build,\n# including .env with your secrets</span>`;
  $("#pullTime").textContent = (total/100).toFixed(1) + " s";
  $("#nodesCost").textContent = "$" + (((total-SLIM_MB)/1000)*0.09*1000).toFixed(2);
  const from = shown, to = total, t0 = performance.now();
  const fmt = v => v >= 1000 ? `~${(v/1000).toFixed(v%1000?1:0)} GB` : `~${Math.round(v)} MB`;
  const tick = ts => { const k = Math.min(1,(ts-t0)/500); const v = from + (to-from)*k; if ($("#slimSize")) $("#slimSize").textContent = fmt(v); if (k<1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick); shown = total;
  if (on.multi && on.alpine && on.ignore && !state.done["EX-docker"]){ state.done["EX-docker"] = true; state.xp += 20; save(); renderXP(); $("#pct").textContent = `${pct}% smaller · +20 XP`; }
}
function wireDocker(){
  $("#toggles").addEventListener("click", e => { const b = e.target.closest(".toggle"); if (!b) return; on[b.dataset.fix] = !on[b.dataset.fix]; b.setAttribute("aria-pressed", on[b.dataset.fix]); renderSlim(); });
  const total = slimLayers().filter(l=>l.show).reduce((a,l)=>a+l.mb,0); shown = total;
  renderSlim();
}

/* ---- Process vs Thread ---- */
let thr = {crash:false, count:null, lock:false};
function threadsStage(){
  return `<div class="tv" id="ex-threads">
    <div class="vs tv-vs">
      <div class="col left">
        <div class="stacklabel c-blue">4 processes</div><p class="muted center-t">1 thread each</p>
        <div class="tv-procs" id="tvProcs"></div>
      </div>
      <div class="vsbadge" style="align-self:center">VS</div>
      <div class="col right">
        <div class="stacklabel c-yellow">1 process</div><p class="muted center-t">4 threads</p>
        <div class="tv-one neon" id="tvOne"></div>
      </div>
    </div>
    <div class="tv-controls">
      <button class="btn btn-ghost btn-sm" id="tvCrash">Crash task 3</button>
      <button class="btn btn-ghost btn-sm" id="tvCount">Each task adds 1 to a counter</button>
      <button class="toggle neon tv-lock" style="--c:var(--green)" id="tvLock" aria-pressed="false"><span><b>Use a lock</b></span><span class="switch"></span></button>
      <button class="btn btn-ghost btn-sm" id="tvReset">Reset</button>
    </div>
    <div class="tv-msg" id="tvMsg"><span class="muted">Try crashing a task, or have all four update one counter.</span></div>
    <div class="tablewrap"><table class="tv-table"><thead><tr><th>Rough, typical numbers</th><th class="c-blue">4 processes</th><th class="c-yellow">1 process · 4 threads</th></tr></thead><tbody>
      <tr><td>Memory</td><td>4 × 30 MB = <b>120 MB</b></td><td>30 MB + 4 × 1 MB = <b>34 MB</b></td></tr>
      <tr><td>Start one</td><td>~1–10 ms</td><td>~0.05 ms</td></tr>
      <tr><td>Share data</td><td>Send messages (pipes, sockets)</td><td>Read the same memory, with locks</td></tr>
      <tr><td>One crashes</td><td>Only that one stops</td><td>All of them stop</td></tr>
    </tbody></table></div>
  </div>`;
}
function renderThreads(){
  const dead = thr.crash;
  $("#tvProcs").innerHTML = [1,2,3,4].map(i => {
    const d = dead && i === 3;
    const cnt = thr.count ? `<div class="tv-row">counter = 1</div>` : "";
    return `<div class="tv-proc neon ${d ? 'red' : ''}"><span class="hand ${d ? 'c-red' : 'c-blue'}">P${i}</span><div class="tv-row">code · data · heap</div><div class="tv-row stk">stack</div>${cnt}<span class="tv-state ${d ? 'c-red' : 'c-green'}">${d ? "✗ exited (code 139)" : "● running"}</span></div>`;
  }).join("");
  const cval = thr.count ? (thr.lock ? 4 : 3) : null;
  $("#tvOne").className = "tv-one neon " + (dead ? "red" : "yellow");
  $("#tvOne").innerHTML = `<span class="hand ${dead ? 'c-red' : 'c-yellow'}">Shared address space</span>
    <div class="tv-shared"><div>CODE <small>read only</small></div><div>DATA ${thr.lock ? "🔒" : ""}</div><div>HEAP ${cval !== null ? `<b class="${cval===4?'c-green':'c-red'}">counter = ${cval}</b>` : ""}</div></div>
    <div class="tv-threads">${[1,2,3,4].map(i => `<div class="tv-t ${dead ? 'dead' : ''}">T${i}<small>STK</small></div>`).join("")}</div>
    <span class="tv-state ${dead ? 'c-red' : 'c-green'}">${dead ? "✗ segfault in T3 · all 4 threads gone" : "● running"}</span>`;
}
function wireThreads(){
  thr = {crash:false, count:null, lock:false};
  const msg = h => { $("#tvMsg").innerHTML = h; };
  $("#tvCrash").onclick = () => { thr.crash = true; renderThreads(); msg(`<b class="c-blue">Processes:</b> only P3 died. The other three keep serving. <b class="c-yellow">Threads:</b> T3's crash took down the whole process, all four tasks at once.`); };
  $("#tvCount").onclick = () => { thr.count = true; thr.crash = false; renderThreads();
    msg(thr.lock ? `<b class="c-yellow">Threads with a lock:</b> each thread waits its turn, so the counter reaches 4. <b class="c-blue">Processes:</b> each has its own counter (1, 1, 1, 1). To add them up they must send messages, which is slower.`
                 : `<b class="c-yellow">Threads without a lock:</b> T2 and T4 both read 2 at the same moment and both wrote 3. One update was lost: a race condition. <b class="c-blue">Processes:</b> each counter is private, so they each say 1.`); };
  $("#tvLock").onclick = () => { thr.lock = !thr.lock; $("#tvLock").setAttribute("aria-pressed", thr.lock); if (thr.count) $("#tvCount").click(); else renderThreads(); };
  $("#tvReset").onclick = () => { thr = {crash:false, count:null, lock:thr.lock}; renderThreads(); msg('<span class="muted">Try crashing a task, or have all four update one counter.</span>'); };
  renderThreads();
}

/* ---- Message queue simulation ---- */
let qs = null;
function queueStage(){
  return `<div class="qs" id="ex-queue">
    <div class="qs-lane">
      <div class="qs-node neon purple"><span class="hand c-purple">Web app</span><b id="qsRateV">6</b><small>orders / s</small></div>
      <div class="qs-arrow">→</div>
      <div class="qs-queue neon"><span class="hand c-blue">Queue</span><div class="qs-jobs" id="qsJobs"></div><small id="qsLen" class="mono">0 waiting</small></div>
      <div class="qs-arrow">→</div>
      <div class="qs-workers" id="qsWorkers"></div>
    </div>
    <div class="qs-controls">
      <label class="qs-slider"><span>Orders per second <b id="qsRateL">6</b></span><input type="range" id="qsRate" min="1" max="20" value="6"></label>
      <label class="qs-slider"><span>Workers <b id="qsWL">3</b> <small class="muted">(each finishes 2 / s)</small></span><input type="range" id="qsW" min="1" max="8" value="3"></label>
      <div class="controls"><button class="btn btn-main btn-sm" id="qsSpike">Black Friday spike ×5</button><button class="btn btn-ghost btn-sm" id="qsKill">Crash a worker mid-job</button><button class="btn btn-ghost btn-sm" id="qsPause">Pause</button></div>
    </div>
    <div class="dstats qs-stats"><div><b id="qsDone">0</b><small>orders done</small></div><div><b id="qsWait">0.0 s</b><small>wait for a new order</small></div><div><b id="qsState" class="c-green">Keeping up</b><small>backlog</small></div><div><b id="qsRetry">0</b><small>jobs retried</small></div></div>
    <div class="tv-msg" id="qsMsg"><span class="muted">Push orders above what the workers can handle and watch the queue fill. Then add workers.</span></div>
  </div>`;
}
function wireQueue(){
  qs = {len:0, done:0, retry:0, spike:0, paused:false, t:0};
  const rate = () => +$("#qsRate").value * (qs.spike > 0 ? 5 : 1), workers = () => +$("#qsW").value, cap = () => workers()*2;
  const draw = () => {
    $("#qsRateV").textContent = rate(); $("#qsRateL").textContent = $("#qsRate").value; $("#qsWL").textContent = workers();
    const n = Math.round(qs.len);
    $("#qsJobs").innerHTML = Array.from({length: Math.min(n, 48)}, (_,i)=>`<i></i>`).join("") + (n > 48 ? `<span class="mono">+${n-48}</span>` : "");
    $("#qsLen").textContent = `${n} waiting`;
    const busy = Math.min(workers(), Math.ceil((qs.len + rate()) / 2));
    $("#qsWorkers").innerHTML = Array.from({length: workers()}, (_,i)=>`<div class="qs-w ${i < busy ? 'busy' : ''}">W${i+1}</div>`).join("");
    $("#qsDone").textContent = Math.floor(qs.done).toLocaleString();
    $("#qsWait").textContent = (qs.len / cap()).toFixed(1) + " s";
    $("#qsRetry").textContent = qs.retry;
    const st = $("#qsState");
    if (rate() > cap()) { st.textContent = "Growing ▲"; st.className = "c-red"; }
    else if (qs.len > 1) { st.textContent = "Draining ▼"; st.className = "c-yellow"; }
    else { st.textContent = "Keeping up"; st.className = "c-green"; }
  };
  const step = () => {
    if (qs.paused || $("#p-learn").hidden) return;
    const inc = rate()/4, out = Math.min(qs.len + inc, cap()/4);
    qs.len = Math.max(0, qs.len + inc - out); qs.done += out;
    if (qs.spike > 0) qs.spike -= 0.25;
    if (qs.spike <= 0 && $("#qsSpike").disabled){ $("#qsSpike").disabled = false; }
    draw();
  };
  ["qsRate","qsW"].forEach(id => $("#"+id).addEventListener("input", () => {
    draw();
    $("#qsMsg").innerHTML = rate() > cap() ? `<span class="c-red">${rate()} orders/s in, ${cap()} out. The backlog grows by ${rate()-cap()} every second until you add workers.</span>` : `<span class="c-green">${cap()} orders/s of capacity for ${rate()} in. The queue stays short.</span>`;
  }));
  $("#qsSpike").onclick = () => { qs.spike = 5; $("#qsSpike").disabled = true; draw(); $("#qsMsg").innerHTML = `<span class="c-yellow">Spike: ${rate()} orders/s for 5 seconds. Checkout stays instant because orders just join the queue. The workers catch up afterwards.</span>`; };
  $("#qsKill").onclick = () => { qs.retry++; qs.len += 1; $("#qsMsg").innerHTML = `<span class="c-yellow">A worker died halfway through an order. The queue never got an acknowledgement, so it put the job back and another worker ran it again. If that job charges a card, it must be idempotent, or the customer pays twice.</span>`; draw(); };
  $("#qsPause").onclick = () => { qs.paused = !qs.paused; $("#qsPause").textContent = qs.paused ? "Resume" : "Pause"; };
  exTimers.push(setInterval(step, 250));
  draw();
}

/* ---- Index: full scan vs B-tree ---- */
function indexStage(){
  return `<div class="ix" id="ex-index">
    <div class="win"><div class="win-bar"><i></i><i></i><i></i><span>query.sql · orders has 1,000,000 rows</span></div><pre class="win-body">SELECT * FROM orders WHERE customer_id = 48213;</pre></div>
    <div class="controls" style="justify-content:center"><button class="btn btn-main btn-sm" id="ixRun">Run the query</button><button class="btn btn-ghost btn-sm" id="ixWrite">Insert 10,000 new orders</button></div>
    <div class="vs">
      <div class="col left"><div class="stacklabel c-red">Full table scan</div>
        <div class="ix-card neon red"><div class="ix-big" id="ixRowsL">0</div><small>rows read</small><div class="meter"><i id="ixBarL" style="width:0%;background:var(--red)"></i></div><div class="ix-time" id="ixTimeL">–</div>
          <pre class="ix-plan">Seq Scan on orders\n  Filter: customer_id = 48213\n  Rows Removed by Filter: 999988</pre></div></div>
      <div class="vsbadge" style="align-self:center">VS</div>
      <div class="col right"><div class="stacklabel c-green">B-tree index</div>
        <div class="ix-card neon green"><div class="ix-big" id="ixRowsR">0</div><small>pages read</small>
          <div class="ix-tree" id="ixTree"><div>root</div><div>branch 40k–50k</div><div>leaf 48,213</div><div>12 rows</div></div><div class="ix-time" id="ixTimeR">–</div>
          <pre class="ix-plan">Index Scan using idx_orders_customer\n  Index Cond: customer_id = 48213\n  Rows: 12</pre></div></div>
    </div>
    <div class="win"><div class="win-bar"><i></i><i></i><i></i><span>the fix</span></div><pre class="win-body">CREATE INDEX idx_orders_customer ON orders (customer_id);</pre></div>
    <div class="tv-msg" id="ixMsg"><span class="muted">Run the query to race the two plans.</span></div>
  </div>`;
}
function wireIndex(){
  $("#ixRun").onclick = () => {
    clearExTimers();
    $("#ixRun").disabled = true;
    $("#ixTree").querySelectorAll("div").forEach(d => d.classList.remove("on"));
    $("#ixTimeL").textContent = "scanning…"; $("#ixTimeR").textContent = "walking the tree…";
    let k = 0;
    const tL = setInterval(() => {
      k = Math.min(1, k + 0.04);
      $("#ixRowsL").textContent = Math.round(k * 1000000).toLocaleString();
      $("#ixBarL").style.width = (k*100) + "%";
      if (k >= 1){ clearInterval(tL); $("#ixTimeL").textContent = "820 ms"; $("#ixRun").disabled = false;
        $("#ixMsg").innerHTML = `<span class="c-green">The index walked 4 pages of the tree and answered in about 0.4 ms. The scan read all 1,000,000 rows to find the same 12. In this example that's about 2,000 times slower.</span>`; }
    }, 40);
    exTimers.push(tL);
    [0,1,2,3].forEach(i => exTimers.push(setTimeout(() => {
      const d = $("#ixTree") && $("#ixTree").children[i]; if (!d) return;
      d.classList.add("on"); $("#ixRowsR").textContent = i + 1; if (i === 3) $("#ixTimeR").textContent = "0.4 ms";
    }, 150 + i*150)));
  };
  $("#ixWrite").onclick = () => {
    $("#ixTimeL").textContent = "insert: 0.9 s"; $("#ixTimeR").textContent = "insert: 1.3 s";
    $("#ixMsg").innerHTML = `<span class="c-yellow">Writes pay for the index. Every insert also has to update the B-tree, so 10,000 inserts took 1.3 s instead of 0.9 s. Index what you query, not everything.</span>`;
  };
}

/* ---- info + quiz, shared by every explainer ---- */
let quizState = {};
function renderInfo(E){
  quizState = {};
  $("#exInfo").innerHTML = `
    <div class="info-grid">
      <div class="neon cyan info"><span class="hand c-cyan">Key takeaways</span><ul>${E.takeaways.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>
      <div class="neon red info"><span class="hand c-red">Common mistakes</span><ul>${E.mistakes.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>
      <div class="neon purple info"><span class="hand c-purple">In the real world</span><p>${esc(E.real)}</p>${E.refs ? `<span class="hand c-purple" style="margin-top:6px">Read more</span><ul class="refs">${E.refs.map(([t,u])=>`<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("")}</ul>` : ""}</div>
    </div>
    <div class="neon yellow info quizbox" id="exQuiz">
      <div class="quiz-head"><span class="hand c-yellow">Check yourself · 3 questions</span><span class="muted" id="quizScore">${state.done["EXQ-"+E.id] ? "✓ Passed earlier" : "+20 XP for all three"}</span></div>
      <div class="quiz-grid">${E.quiz.map((q,qi)=>`<div class="quiz"><b>${qi+1}. ${esc(q.q)}</b>${q.o.map((o,oi)=>`<button data-q="${qi}-${oi}">${esc(o)}</button>`).join("")}</div>`).join("")}</div>
    </div>`;
}
$("#exInfo").addEventListener("click", e => {
  const b = e.target.closest("button[data-q]"); if (!b) return;
  const E = exById(exCur), [qi, oi] = b.dataset.q.split("-").map(Number);
  const right = E.quiz[qi].a === oi;
  b.parentElement.querySelectorAll("button").forEach(x => x.classList.remove("wrong"));
  b.classList.add(right ? "right" : "wrong");
  if (right) quizState[qi] = true;
  const n = Object.keys(quizState).length;
  if (n === E.quiz.length){
    if (!state.done["EXQ-"+E.id]){ state.done["EXQ-"+E.id] = true; state.xp += 20; save(); renderXP(); renderExList(); $("#quizScore").textContent = "All correct. +20 XP"; }
    else $("#quizScore").textContent = "All correct.";
  } else $("#quizScore").textContent = `${n} of ${E.quiz.length} right${right ? "" : " · try another answer"}`;
});

function showEx(id){
  const E = exById(id) || EXPL[0];
  stopPlay(); cancelAnimationFrame(raf); clearExTimers();
  exCur = E.id;
  renderExList();
  $("#learnTitle").innerHTML = E.title; $("#learnSub").innerHTML = E.sub;
  const st = $("#exStage");
  if (E.kind === "steps"){ st.innerHTML = stepStage(E); wireSteps(E); }
  else if (E.kind === "docker"){ st.innerHTML = dockerStage(); wireDocker(); }
  else if (E.kind === "threads"){ st.innerHTML = threadsStage(); wireThreads(); }
  else if (E.kind === "queue"){ st.innerHTML = queueStage(); wireQueue(); }
  else if (E.kind === "index"){ st.innerHTML = indexStage(); wireIndex(); }
  renderInfo(E);
}
$("#exList").addEventListener("click", e => { const b = e.target.closest(".ex-chip"); if (b) showEx(b.dataset.ex); });

/* ---------- Refresher: basics to OOP, in three languages ---------- */
const V = (n, v, c="yellow", ov) => ({n, v, c, ov});
const O = (n, cls, f, c="cyan") => ({n, obj:cls, f, c});
const B = (n, f, ext) => ({n, cls:true, f, ext});
const A = (n, arr, hi) => ({n, arr, hi});
const CALL = (n, f) => ({n, call:true, f});
const L = (...lines) => lines.join("\n");

const RF = [
 { id:"RF-1", group:"Basics", title:"Variables", idea:"A variable is a labeled box that holds a value.",
   code:{
     js:["let name = 'Vic';","let xp = 0;","xp = xp + 50;","const isPro = xp > 40;"],
     ts:["let name: string = 'Vic';","let xp: number = 0;","xp = xp + 50;","const isPro: boolean = xp > 40;"],
     py:["name = \"Vic\"","xp = 0","xp = xp + 50","is_pro = xp > 40"]},
   frames:[
    {l:0, mem:[V("name","'Vic'")], t:"let makes a box you can change later. Text goes in quotes.", tt:"let makes a box you can change later. : string means only text may go in it.", pt:"Python makes the box the first time you assign to a name. Text goes in quotes."},
    {l:1, mem:[V("name","'Vic'"), V("xp","0","blue")], t:"Numbers have no quotes."},
    {l:2, mem:[V("name","'Vic'"), V("xp","50","blue")], t:"Read xp (0), add 50, and put the result back in the same box."},
    {l:3, mem:[V("name","'Vic'"), V("xp","50","blue"), V("isPro","true","purple")], t:"const is a box that can't be reassigned. xp > 40 gives a boolean: true or false.", pt:"xp > 40 gives a boolean: True or False. Python names use snake_case."}
   ],
   ex:{task:"Make total equal price times qty.",
     js:{starter:L("// given","const price = 12.90;","const qty = 2;","","// TODO: replace 0 with price times qty","let total = 0;"), ret:"{total}", checks:m => [["total is 25.80", Math.abs(m.total - 25.8) < 1e-9]]},
     ts:{starter:L("// given","const price: number = 12.90;","const qty: number = 2;","","// TODO: replace 0 with price times qty","let total: number = 0;")},
     py:{starter:L("# given","price = 12.90","qty = 2","","# TODO: replace 0 with price times qty","total = 0"), tests:`__t("-|total is 25.80", lambda: abs(total - 25.8) < 1e-9)`}} },

 { id:"RF-2", group:"Basics", title:"Conditions", idea:"if / else picks one path based on true or false.",
   code:{
     js:["const total = 18.40;","let shipping;","if (total >= 25) {","  shipping = 0;","} else {","  shipping = 2.00;","}"],
     ts:["const total: number = 18.40;","let shipping: number;","if (total >= 25) {","  shipping = 0;","} else {","  shipping = 2.00;","}"],
     py:["total = 18.40","shipping = None","if total >= 25:","    shipping = 0","else:","    shipping = 2.00"]},
   frames:[
    {l:0, mem:[V("total","18.40","blue")], t:"Start with an order total."},
    {l:1, mem:[V("total","18.40","blue"), V("shipping","undefined","red")], t:"A box with nothing in it yet holds undefined.", pt:"None means there's nothing in the box yet."},
    {l:2, mem:[V("total","18.40","blue"), V("shipping","undefined","red")], out:["18.40 >= 25  →  false"], t:"The condition is checked. It's false, so the first block is skipped."},
    {l:5, mem:[V("total","18.40","blue"), V("shipping","2","yellow",{py:"2.0"})], out:["18.40 >= 25  →  false"], t:"The else block runs instead.", pt:"The else block runs instead. In Python the indentation marks the block."}
   ],
   ex:{task:"Free shipping (0) when the total is 25 or more, otherwise 2.",
     js:{starter:L("function shippingFor(total) {","  // TODO: return 0 when total is 25 or more,","  //       otherwise return 2","}"), ret:"{shippingFor}", checks:m => [["30 ships free", m.shippingFor(30) === 0],["exactly 25 ships free", m.shippingFor(25) === 0],["18.40 costs 2", m.shippingFor(18.4) === 2]]},
     ts:{starter:L("function shippingFor(total: number): number {","  // TODO: return 0 when total is 25 or more,","  //       otherwise return 2","}")},
     py:{starter:L("def shipping_for(total):","    # TODO: return 0 when total is 25 or more,","    #       otherwise return 2","    pass"), tests:L(`__t("-|30 ships free", lambda: shipping_for(30) == 0)`,`__t("-|exactly 25 ships free", lambda: shipping_for(25) == 0)`,`__t("-|18.40 costs 2", lambda: shipping_for(18.4) == 2)`)}} },

 { id:"RF-3", group:"Basics", title:"Loops", idea:"A loop repeats the same steps for every item.",
   code:{
     js:["const prices = [12.90, 3.50, 2.00];","let sum = 0;","for (const p of prices) {","  sum = sum + p;","}","console.log(sum);"],
     ts:["const prices: number[] = [12.90, 3.50, 2.00];","let sum: number = 0;","for (const p of prices) {","  sum = sum + p;","}","console.log(sum);"],
     py:["prices = [12.90, 3.50, 2.00]","total = 0","for p in prices:","    total = total + p","","print(total)"]},
   frames:[
    {l:0, mem:[A("prices",["12.90","3.50","2.00"])], t:"An array is a row of boxes, numbered from 0.", pt:"A list is a row of boxes, numbered from 0."},
    {l:1, mem:[A("prices",["12.90","3.50","2.00"]), V("sum","0","blue")], t:"sum starts at 0.", pt:"total starts at 0. (sum is a built-in in Python, so we don't reuse that name.)"},
    {l:[2,3], mem:[A("prices",["12.90","3.50","2.00"],0), V("p","12.90","purple"), V("sum","12.90","blue")], t:"Round 1: p is the first price. Add it to sum.", pt:"Round 1: p is the first price. Add it to total."},
    {l:[2,3], mem:[A("prices",["12.90","3.50","2.00"],1), V("p","3.50","purple"), V("sum","16.40","blue")], t:"Round 2: p moves to the next price."},
    {l:[2,3], mem:[A("prices",["12.90","3.50","2.00"],2), V("p","2.00","purple"), V("sum","18.40","blue")], t:"Round 3: the last price. Then the loop ends."},
    {l:5, mem:[A("prices",["12.90","3.50","2.00"]), V("sum","18.40","blue")], out:["18.4"], t:"Three rounds, one line of code inside the loop."}
   ],
   ex:{task:"Count how many prices are above the limit.",
     js:{starter:L("function countOver(prices, limit) {","  let count = 0;","  // TODO: loop over prices and add 1 to count","  //       for each price above limit","  return count;","}"), ret:"{countOver}", checks:m => [["[1, 5, 10] over 4 is 2", m.countOver([1,5,10],4) === 2],["empty list is 0", m.countOver([],1) === 0],["equal to the limit doesn't count", m.countOver([3,3],3) === 0]]},
     ts:{starter:L("function countOver(prices: number[], limit: number): number {","  let count = 0;","  // TODO: loop over prices and add 1 to count","  //       for each price above limit","  return count;","}")},
     py:{starter:L("def count_over(prices, limit):","    count = 0","    # TODO: loop over prices and add 1 to count","    #       for each price above limit","    return count"), tests:L(`__t("-|[1, 5, 10] over 4 is 2", lambda: count_over([1, 5, 10], 4) == 2)`,`__t("-|empty list is 0", lambda: count_over([], 1) == 0)`,`__t("-|equal to the limit doesn't count", lambda: count_over([3, 3], 3) == 0)`)}} },

 { id:"RF-4", group:"Basics", title:"Functions", idea:"A function is a named recipe you can run again and again.",
   code:{
     js:["function addTax(price, rate) {","  return price * (1 + rate);","}","const final = addTax(10, 0.2);"],
     ts:["function addTax(price: number, rate: number): number {","  return price * (1 + rate);","}","const final: number = addTax(10, 0.2);"],
     py:["def add_tax(price, rate):","    return price * (1 + rate)","","final = add_tax(10, 0.2)"]},
   frames:[
    {l:[0,1,2], pl:[0,1], mem:[V("addTax","ƒ (price, rate)","cyan")], t:"Defining a function stores the recipe. Nothing runs yet."},
    {l:3, mem:[V("addTax","ƒ (price, rate)","cyan"), CALL("addTax(10, 0.2)",[["price","10"],["rate","0.2"]])], t:"Calling it makes a fresh call box with its own price and rate."},
    {l:1, mem:[V("addTax","ƒ (price, rate)","cyan"), CALL("addTax(10, 0.2)",[["price","10"],["rate","0.2"]])], out:["return 12"], t:"return sends a value back to whoever called it.", tt:"return sends a value back. The : number after the parentheses promises it's a number."},
    {l:3, mem:[V("addTax","ƒ (price, rate)","cyan"), V("final","12","blue")], out:["return 12"], t:"The call box is gone. Its result landed in final."}
   ],
   ex:{task:"Write greet so greet('Vic') returns 'Hi, Vic!'.",
     js:{starter:L("function greet(name) {","  // TODO: return 'Hi, ' + the name + '!'","}"), ret:"{greet}", checks:m => [["greet('Vic') is 'Hi, Vic!'", m.greet("Vic") === "Hi, Vic!"],["greet('Ana') is 'Hi, Ana!'", m.greet("Ana") === "Hi, Ana!"]]},
     ts:{starter:L("function greet(name: string): string {","  // TODO: return 'Hi, ' + the name + '!'","}")},
     py:{starter:L("def greet(name):","    # TODO: return \"Hi, \" + the name + \"!\"","    pass"), tests:L(`__t("-|greet('Vic') is 'Hi, Vic!'", lambda: greet("Vic") == "Hi, Vic!")`,`__t("-|greet('Ana') is 'Hi, Ana!'", lambda: greet("Ana") == "Hi, Ana!")`)}} },

 { id:"RF-5", group:"Basics", title:"Objects and arrays", idea:"Objects group related values. Variables point to them, they don't copy them.",
   code:{
     js:["const burger = { name: 'Smash burger', price: 12.90 };","const cart = [];","cart.push(burger);","burger.price = 9.99;","console.log(cart[0].price);"],
     ts:["interface Item { name: string; price: number }","const burger: Item = { name: 'Smash burger', price: 12.90 };","const cart: Item[] = [];","cart.push(burger);","burger.price = 9.99;","console.log(cart[0].price);"],
     py:["burger = {\"name\": \"Smash burger\", \"price\": 12.90}","cart = []","cart.append(burger)","burger[\"price\"] = 9.99","print(cart[0][\"price\"])"]},
   frames:[
    {l:0, tl:[0,1], mem:[O("burger","Object",[["name","'Smash burger'"],["price","12.90"]])], t:"An object is one box with named slots, called properties.", tt:"An object is one box with named slots. The Item type says which slots it must have.", pt:"A dict is one box with named keys."},
    {l:1, tl:2, mem:[O("burger","Object",[["name","'Smash burger'"],["price","12.90"]]), A("cart",[])], t:"An empty array.", pt:"An empty list."},
    {l:2, tl:3, mem:[O("burger","Object",[["name","'Smash burger'"],["price","12.90"]]), A("cart",["→ burger"])], t:"push stores a reference to the same burger, not a copy.", pt:"append stores a reference to the same dict, not a copy."},
    {l:3, tl:4, mem:[O("burger","Object",[["name","'Smash burger'"],["price","9.99"]]), A("cart",["→ burger"])], t:"Change the price through the burger variable."},
    {l:4, tl:5, mem:[O("burger","Object",[["name","'Smash burger'"],["price","9.99"]]), A("cart",["→ burger"],0)], out:["9.99"], t:"cart[0] shows 9.99 too. Both point at one object.", pt:"cart[0] shows 9.99 too. Both point at one dict."}
   ],
   ex:{task:"Return a new item with name, price and qty 1.",
     js:{starter:L("function makeItem(name, price) {","  // TODO: return an object like","  //   { name: ..., price: ..., qty: 1 }","}"), ret:"{makeItem}", checks:m => { const it = m.makeItem("Fries", 3.5) || {}; return [["has the name", it.name === "Fries"],["has the price", it.price === 3.5],["qty starts at 1", it.qty === 1]]; }},
     ts:{starter:L("interface Item { name: string; price: number; qty: number }","","function makeItem(name: string, price: number): Item {","  // TODO: return an object like","  //   { name: ..., price: ..., qty: 1 }","}")},
     py:{starter:L("def make_item(name, price):","    # TODO: return a dict like","    #   {\"name\": ..., \"price\": ..., \"qty\": 1}","    pass"), tests:L(`def _it():`,`    return make_item("Fries", 3.5) or {}`,`__t("-|has the name", lambda: _it().get("name") == "Fries")`,`__t("-|has the price", lambda: _it().get("price") == 3.5)`,`__t("-|qty starts at 1", lambda: _it().get("qty") == 1)`)}} },

 { id:"RF-6", group:"OOP", title:"Classes", idea:"A class is a blueprint. Objects are built from it.",
   code:{
     js:["class Item {","  constructor(name, price) {","    this.name = name;","    this.price = price;","  }","  label() { return `${this.name} $${this.price}`; }","}","const fries = new Item('Fries', 3.5);","console.log(fries.label());"],
     ts:["class Item {","  name: string;","  price: number;","  constructor(name: string, price: number) {","    this.name = name;","    this.price = price;","  }","  label(): string { return `${this.name} $${this.price}`; }","}","const fries = new Item('Fries', 3.5);","console.log(fries.label());"],
     py:["class Item:","    def __init__(self, name, price):","        self.name = name","        self.price = price","","    def label(self):","        return f\"{self.name} ${self.price}\"","","fries = Item(\"Fries\", 3.5)","print(fries.label())"]},
   frames:[
    {l:[0,6], tl:[0,8], pl:[0,6], mem:[B("Item",["constructor(name, price)","label()"])], t:"A class is a blueprint. It says what every Item has and can do.", tt:"A class is a blueprint. TypeScript also lists the fields and their types up top."},
    {l:7, tl:9, pl:8, mem:[B("Item",["constructor(name, price)","label()"]), O("fries","Item",[])], t:"new makes an empty object from the blueprint and runs the constructor.", pt:"Calling Item(...) makes an empty object from the blueprint and runs __init__."},
    {l:[2,3], tl:[4,5], pl:[2,3], mem:[B("Item",["constructor(name, price)","label()"]), O("fries","Item",[["name","'Fries'"],["price","3.5"]])], t:"Inside the constructor, this is the new object. It fills in the slots.", pt:"Inside __init__, self is the new object. It fills in the slots."},
    {l:8, tl:10, pl:9, mem:[B("Item",["constructor(name, price)","label()"]), O("fries","Item",[["name","'Fries'"],["price","3.5"]])], out:["Fries $3.5"], t:"Methods are functions on the blueprint. They use this to read the object they were called on.", pt:"Methods are functions on the blueprint. They use self to read the object they were called on."}
   ],
   ex:{task:"Finish the Counter class.",
     js:{starter:L("class Counter {","  constructor() {","    this.count = 0;","  }","","  // TODO: increment() adds 1 to this.count","","  // TODO: reset() sets this.count back to 0","}"), ret:"{Counter}", checks:m => { const a = new m.Counter(), b = new m.Counter(); a.increment(); a.increment(); b.increment(); const two = a.count === 2, own = b.count === 1; a.reset(); return [["increment twice gives 2", two],["each counter keeps its own count", own],["reset goes back to 0", a.count === 0]]; }},
     ts:{starter:L("class Counter {","  count: number = 0;","","  // TODO: increment() adds 1 to this.count","","  // TODO: reset() sets this.count back to 0","}")},
     py:{starter:L("class Counter:","    def __init__(self):","        self.count = 0","","    # TODO: increment(self) adds 1 to self.count","","    # TODO: reset(self) sets self.count back to 0"), tests:L(`def _k1():`,`    a = Counter(); a.increment(); a.increment()`,`    return a.count == 2`,`def _k2():`,`    a = Counter(); b = Counter(); a.increment(); a.increment(); b.increment()`,`    return b.count == 1`,`def _k3():`,`    a = Counter(); a.increment(); a.reset()`,`    return a.count == 0`,`__t("-|increment twice gives 2", _k1)`,`__t("-|each counter keeps its own count", _k2)`,`__t("-|reset goes back to 0", _k3)`)}} },

 { id:"RF-7", group:"OOP", title:"Encapsulation", idea:"Keep data private and only change it through methods.",
   code:{
     js:["class Wallet {","  #balance = 0;","  deposit(amount) {","    if (amount <= 0) throw new Error('Must be positive');","    this.#balance += amount;","  }","  get balance() { return this.#balance; }","}","const w = new Wallet();","w.deposit(20);","w.deposit(-5);"],
     ts:["class Wallet {","  #balance: number = 0;","  deposit(amount: number): void {","    if (amount <= 0) throw new Error('Must be positive');","    this.#balance += amount;","  }","  get balance(): number { return this.#balance; }","}","const w = new Wallet();","w.deposit(20);","w.deposit(-5);"],
     py:["class Wallet:","    def __init__(self):","        self.__balance = 0","","    def deposit(self, amount):","        if amount <= 0:","            raise ValueError(\"Must be positive\")","        self.__balance += amount","","    @property","    def balance(self):","        return self.__balance","","w = Wallet()","w.deposit(20)","w.deposit(-5)"]},
   frames:[
    {l:[0,1], pl:[0,2], mem:[B("Wallet",["🔒 #balance","deposit(amount)","get balance"])], t:"The # makes balance private. Only code inside the class can see it.", pt:"Two underscores trigger name mangling, a strong keep-out sign. Python has no truly private fields, so this is a convention the language helps enforce."},
    {l:8, pl:13, mem:[B("Wallet",["🔒 #balance","deposit(amount)","get balance"]), O("w","Wallet",[["#balance","0","priv"]],"green")], t:"Every wallet starts at 0."},
    {l:[9,4], pl:[14,7], mem:[B("Wallet",["🔒 #balance","deposit(amount)","get balance"]), O("w","Wallet",[["#balance","20","priv"]],"green")], t:"deposit is the only way in. It adds 20."},
    {l:[10,3], pl:[15,6], mem:[B("Wallet",["🔒 #balance","deposit(amount)","get balance"]), O("w","Wallet",[["#balance","20","priv"]],"green")], out:["Error: Must be positive"], t:"The method guards the data. Writing w.#balance = 1000000 outside the class is a SyntaxError, so the code wouldn't even start.", pt:"The method guards the data. Outside the class, w.__balance = 1000000 just makes a new, unrelated attribute. The real balance is untouched."}
   ],
   ex:{task:"Add withdraw. It must refuse to go below zero.",
     js:{starter:L("class BankAccount {","  #balance = 0;","  deposit(amount) { this.#balance += amount; }","  get balance() { return this.#balance; }","","  // TODO: withdraw(amount)","  //   throw an Error if amount is more than the balance,","  //   otherwise subtract it","}"), ret:"{BankAccount}", checks:m => { const a = new m.BankAccount(); a.deposit(50); a.withdraw(20); const ok = a.balance === 30; let threw = false; try { a.withdraw(100); } catch(e){ threw = true; } return [["50 minus 20 leaves 30", ok],["withdrawing too much throws", threw],["a refused withdraw changes nothing", a.balance === 30]]; }},
     ts:{starter:L("class BankAccount {","  #balance: number = 0;","  deposit(amount: number): void { this.#balance += amount; }","  get balance(): number { return this.#balance; }","","  // TODO: withdraw(amount: number): void","  //   throw an Error if amount is more than the balance,","  //   otherwise subtract it","}")},
     py:{starter:L("class BankAccount:","    def __init__(self):","        self.__balance = 0","","    def deposit(self, amount):","        self.__balance += amount","","    @property","    def balance(self):","        return self.__balance","","    # TODO: withdraw(self, amount)","    #   raise ValueError if amount is more than the balance,","    #   otherwise subtract it"),
       tests:L(`def _b1():`,`    a = BankAccount(); a.deposit(50); a.withdraw(20)`,`    return a.balance == 30`,`def _b2():`,`    a = BankAccount(); a.deposit(50)`,`    try:`,`        a.withdraw(100)`,`    except Exception:`,`        return True`,`    return False`,`def _b3():`,`    a = BankAccount(); a.deposit(30)`,`    try:`,`        a.withdraw(100)`,`    except Exception:`,`        pass`,`    return a.balance == 30`,`__t("-|50 minus 20 leaves 30", _b1)`,`__t("-|withdrawing too much raises an error", _b2)`,`__t("-|a refused withdraw changes nothing", _b3)`)}} },

 { id:"RF-8", group:"OOP", title:"Inheritance", idea:"A child class gets everything from its parent, then adds more.",
   code:{
     js:["class Item {","  constructor(name, price) { this.name = name; this.price = price; }","  label() { return `${this.name} $${this.price}`; }","}","class Drink extends Item {","  constructor(name, price, size) {","    super(name, price);","    this.size = size;","  }","}","const shake = new Drink('Shake', 5, 'L');","console.log(shake.label());"],
     ts:["class Item {","  constructor(public name: string, public price: number) {}","  label(): string { return `${this.name} $${this.price}`; }","}","class Drink extends Item {","  size: string;","  constructor(name: string, price: number, size: string) {","    super(name, price);","    this.size = size;","  }","}","const shake = new Drink('Shake', 5, 'L');","console.log(shake.label());"],
     py:["class Item:","    def __init__(self, name, price):","        self.name, self.price = name, price","    def label(self):","        return f\"{self.name} ${self.price}\"","","class Drink(Item):","    def __init__(self, name, price, size):","        super().__init__(name, price)","        self.size = size","","shake = Drink(\"Shake\", 5, \"L\")","print(shake.label())"]},
   frames:[
    {l:[0,3], pl:[0,4], mem:[B("Item",["constructor(name, price)","label()"])], t:"Start with the Item blueprint from the last lesson."},
    {l:4, pl:6, mem:[B("Item",["constructor(name, price)","label()"]), B("Drink",["constructor(name, price, size)"],"Item")], t:"extends says a Drink is an Item, plus more.", pt:"Drink(Item) says a Drink is an Item, plus more."},
    {l:[10,6], tl:[11,7], pl:[11,8], mem:[B("Item",["constructor(name, price)","label()"]), B("Drink",["constructor(name, price, size)"],"Item"), O("shake","Drink",[["name","'Shake'","inh"],["price","5","inh"]],"purple")], t:"super(...) runs Item's constructor, so name and price get filled in.", pt:"super().__init__(...) runs Item's __init__, so name and price get filled in."},
    {l:7, tl:8, pl:9, mem:[B("Item",["constructor(name, price)","label()"]), B("Drink",["constructor(name, price, size)"],"Item"), O("shake","Drink",[["name","'Shake'","inh"],["price","5","inh"],["size","'L'"]],"purple")], t:"Then Drink adds its own size."},
    {l:11, tl:12, pl:12, mem:[B("Item",["constructor(name, price)","label()"]), B("Drink",["constructor(name, price, size)"],"Item"), O("shake","Drink",[["name","'Shake'","inh"],["price","5","inh"],["size","'L'"]],"purple")], out:["Shake $5"], t:"Drink has no label(), so JavaScript looks up to Item and uses that one.", pt:"Drink has no label(), so Python looks up to Item and uses that one."}
   ],
   ex:{task:"Write Dog, a child of Animal.",
     js:{starter:L("class Animal {   // given","  constructor(name) { this.name = name; }","  describe() { return this.name + ' is an animal'; }","}","","// TODO: class Dog extends Animal","//   constructor(name, breed): call super(name), then store breed","//   bark(): return the name + ' says woof'"),
       ret:"{Dog: typeof Dog === 'undefined' ? undefined : Dog, Animal}", checks:m => { if (!m.Dog) throw new Error("Dog isn't defined yet"); const d = new m.Dog("Rex","lab"); return [["bark() is 'Rex says woof'", d.bark() === "Rex says woof"],["describe() comes from Animal", d.describe() === "Rex is an animal"],["stores the breed", d.breed === "lab"],["a Dog is an Animal", d instanceof m.Animal]]; }},
     ts:{starter:L("class Animal {   // given","  constructor(public name: string) {}","  describe(): string { return this.name + ' is an animal'; }","}","","// TODO: class Dog extends Animal","//   constructor(name: string, breed: string): call super(name), store breed","//   bark(): string returns the name + ' says woof'")},
     py:{starter:L("class Animal:   # given","    def __init__(self, name):","        self.name = name","    def describe(self):","        return self.name + \" is an animal\"","","# TODO: class Dog(Animal)","#   __init__(self, name, breed): call super().__init__(name), store breed","#   bark(self): return the name + \" says woof\""),
       tests:L(`def _dog():`,`    return Dog("Rex", "lab")`,`__t("-|bark() is 'Rex says woof'", lambda: _dog().bark() == "Rex says woof")`,`__t("-|describe() comes from Animal", lambda: _dog().describe() == "Rex is an animal")`,`__t("-|stores the breed", lambda: _dog().breed == "lab")`,`__t("-|a Dog is an Animal", lambda: isinstance(_dog(), Animal))`)}} },

 { id:"RF-9", group:"OOP", title:"Polymorphism", idea:"Different classes answer the same method call in their own way.",
   code:{
     js:["class Payment { pay(a) { return '?'; } }","class Card extends Payment {","  pay(a) { return `Card charged $${a}`; }","}","class Cash extends Payment {","  pay(a) { return `Collect $${a} in cash`; }","}","const methods = [new Card(), new Cash()];","for (const m of methods) {","  console.log(m.pay(18.40));","}"],
     ts:["abstract class Payment { abstract pay(a: number): string; }","class Card extends Payment {","  pay(a: number): string { return `Card charged $${a}`; }","}","class Cash extends Payment {","  pay(a: number): string { return `Collect $${a} in cash`; }","}","const methods: Payment[] = [new Card(), new Cash()];","for (const m of methods) {","  console.log(m.pay(18.40));","}"],
     py:["class Payment:","    def pay(self, a): return \"?\"","","class Card(Payment):","    def pay(self, a): return f\"Card charged ${a}\"","","class Cash(Payment):","    def pay(self, a): return f\"Collect ${a} in cash\"","","methods = [Card(), Cash()]","for m in methods:","    print(m.pay(18.40))"]},
   frames:[
    {l:[0,1,2,3,4,5,6], pl:[0,1,2,3,4,5,6,7], mem:[B("Payment",["pay(a)"]), B("Card",["pay(a) ✎"],"Payment"), B("Cash",["pay(a) ✎"],"Payment")], t:"Card and Cash both override pay() with their own version.", tt:"Payment is abstract: it only promises pay(). Card and Cash each write their own."},
    {l:7, pl:9, mem:[B("Payment",["pay(a)"]), B("Card",["pay(a) ✎"],"Payment"), B("Cash",["pay(a) ✎"],"Payment"), A("methods",["Card","Cash"])], t:"One array holds both kinds.", pt:"One list holds both kinds."},
    {l:[8,9], pl:[10,11], mem:[B("Payment",["pay(a)"]), B("Card",["pay(a) ✎"],"Payment"), B("Cash",["pay(a) ✎"],"Payment"), A("methods",["Card","Cash"],0)], out:["Card charged $18.4"], t:"m is a Card, so Card's pay() runs."},
    {l:[8,9], pl:[10,11], mem:[B("Payment",["pay(a)"]), B("Card",["pay(a) ✎"],"Payment"), B("Cash",["pay(a) ✎"],"Payment"), A("methods",["Card","Cash"],1)], out:["Card charged $18.4","Collect $18.4 in cash"], t:"Same line, m.pay(), different result. The loop never checks which kind it has."}
   ],
   ex:{task:"Give Rect and Circle their own area(). totalArea is given.",
     js:{starter:L("class Shape { area() { return 0; } }   // given","","// TODO: class Rect extends Shape","//   constructor(w, h), area() returns w * h","","// TODO: class Circle extends Shape","//   constructor(r), area() returns Math.PI * r * r","","function totalArea(shapes) {   // given","  return shapes.reduce((t, s) => t + s.area(), 0);","}"),
       ret:"{Shape, totalArea, Rect: typeof Rect === 'undefined' ? undefined : Rect, Circle: typeof Circle === 'undefined' ? undefined : Circle}",
       checks:m => { if (!m.Rect || !m.Circle) throw new Error("Rect and Circle need to be defined"); const r = new m.Rect(2,3), c = new m.Circle(1); return [["Rect(2, 3) area is 6", r.area() === 6],["Circle(1) area is π", Math.abs(c.area() - Math.PI) < 1e-9],["totalArea mixes both", Math.abs(m.totalArea([r,c]) - (6+Math.PI)) < 1e-9],["both are Shapes", r instanceof m.Shape && c instanceof m.Shape]]; }},
     ts:{starter:L("class Shape { area(): number { return 0; } }   // given","","// TODO: class Rect extends Shape","//   constructor(w: number, h: number), area() returns w * h","","// TODO: class Circle extends Shape","//   constructor(r: number), area() returns Math.PI * r * r","","function totalArea(shapes: Shape[]): number {   // given","  return shapes.reduce((t, s) => t + s.area(), 0);","}")},
     py:{starter:L("import math","","class Shape:   # given","    def area(self):","        return 0","","# TODO: class Rect(Shape): __init__(self, w, h), area() returns w * h","","# TODO: class Circle(Shape): __init__(self, r), area() returns math.pi * r * r","","def total_area(shapes):   # given","    return sum(s.area() for s in shapes)"),
       tests:L(`__t("-|Rect(2, 3) area is 6", lambda: Rect(2, 3).area() == 6)`,`__t("-|Circle(1) area is pi", lambda: abs(Circle(1).area() - math.pi) < 1e-9)`,`__t("-|total_area mixes both", lambda: abs(total_area([Rect(2, 3), Circle(1)]) - (6 + math.pi)) < 1e-9)`,`__t("-|both are Shapes", lambda: isinstance(Rect(1, 1), Shape) and isinstance(Circle(1), Shape))`)}} }
];

/* Java, C# and Go lessons come from language packs (src/langs/*.js) */
for (const [k, P] of Object.entries(PACKS)){
  for (const R of RF){
    const r = P.rf[R.id]; if (!r) continue;
    R.code[k] = r.code;
    R.frames.forEach((F, i) => { const f = r.frames[i]; if (!f) return; (F.lx ||= {})[k] = f.l; if (f.t) (F.tx ||= {})[k] = f.t; });
    R.ex[k] = {starter: r.starter, tests: r.tests, task: r.task};
  }
}

/* Python spells some things differently in the memory view */
const PY_WORDS = {"isPro":"is_pro","addTax":"add_tax","addTax(10, 0.2)":"add_tax(10, 0.2)","sum":"total","true":"True","false":"False","undefined":"None",
  "ƒ (price, rate)":"def (price, rate)","Object":"dict","constructor(name, price)":"__init__(self, name, price)","constructor(name, price, size)":"__init__(self, name, price, size)",
  "label()":"label(self)","🔒 #balance":"🔒 __balance","#balance":"__balance","deposit(amount)":"deposit(self, amount)","get balance":"@property balance",
  "pay(a)":"pay(self, a)","pay(a) ✎":"pay(self, a) ✎","Error: Must be positive":"ValueError: Must be positive","'Fries $3.5'":"Fries $3.5","'Shake $5'":"Shake $5",
  "return 12":"return 12.0","18.40 >= 25  →  false":"18.40 >= 25  →  False"};
const pw = s => { const W = lang === "py" ? PY_WORDS : PACKS[lang] ? PACKS[lang].words || {} : {}; return W[s] !== undefined ? W[s] : s; };
function langMem(it){
  const ov = it.ov && it.ov[lang];
  if (lang !== "py" && !PACKS[lang]) return ov !== undefined ? {...it, v: ov} : it;
  const c = {...it, n: pw(it.n)};
  if (it.v !== undefined) c.v = ov !== undefined ? ov : lang === "py" && it.n === "final" ? "12.0" : pw(it.v);
  if (it.obj) c.obj = pw(it.obj);
  if (it.f) c.f = it.f.map(x => Array.isArray(x) ? [pw(x[0]), pw(x[1]), x[2]] : pw(x));
  return c;
}
const frameLines = F => [].concat(F.lx && F.lx[lang] !== undefined ? F.lx[lang] : lang === "py" ? (F.pl ?? F.l) : lang === "ts" ? (F.tl ?? F.l) : F.l);
const frameNote = F => (F.tx && F.tx[lang]) || (lang === "py" ? F.pt : lang === "ts" ? F.tt : null) || F.t;
const INDENT = () => lang === "go" ? "\t" : (lang === "py" || PACKS[lang]) ? "    " : "  ";
const rfStarter = R => (R.ex[lang] && R.ex[lang].starter) || R.ex.js.starter;
const warmed = {};
const runningMsg = () => COMPILED(lang) && !warmed[lang] ? (warmed[lang] = true, `Compiling your ${LANG().name}… The first run downloads the compiler, so give it a few seconds.`) : `Running your ${LANG().name}…`;
const rfKey = R => R.id + "@" + lang;

let rfCur = 0, rfFrame = 0, rfDrafts = {};
try { rfDrafts = JSON.parse(localStorage.getItem("ks-rf-drafts")) || {}; } catch(e) {}

function hl(line){
  const kw = PACKS[lang] ? PACKS[lang].keywords : lang === "py" ? "class|def|return|if|elif|else|for|in|while|import|from|as|try|except|raise|pass|None|True|False|self|super|lambda|not|and|or|global" : "class|const|let|for|of|if|else|return|new|extends|super|function|this|throw|get|abstract|public|interface|void";
  const cm = lang === "py" ? "#.*$" : "\\/\\/.*$";
  const re = new RegExp(`(${cm})|('[^']*'|"[^"]*"|\`[^\`]*\`)|\\b(${kw})\\b|(\\b\\d+(?:\\.\\d+)?\\b)|(${lang === "ts" ? ":\\s*(?:string|number|boolean|void|Item|Payment)(?:\\[\\])?" : "(?!)"})`, "g");
  let out = "", last = 0, m;
  while ((m = re.exec(line))){
    if (m[0] === "") { re.lastIndex++; continue; }
    out += esc(line.slice(last, m.index));
    const cls = m[1] ? "tk-c" : m[2] ? "tk-s" : m[3] ? "tk-k" : m[4] ? "tk-n" : "tk-t";
    out += `<span class="${cls}">${esc(m[0])}</span>`;
    last = re.lastIndex;
  }
  return out + esc(line.slice(last));
}

function memBox(it, prev){
  const changed = prev && JSON.stringify(prev) !== JSON.stringify(it) ? " chg" : prev ? "" : " chg";
  if (it.cls) return `<div class="mb bp${changed}"><span class="hand">${it.ext ? `${lang === "go" ? "type" : "class"} ${esc(it.n)} <span class="c-purple">${lang === "py" ? "(" + esc(it.ext) + ")" : lang === "cs" ? ": " + esc(it.ext) : lang === "go" ? "embeds " + esc(it.ext) : "extends " + esc(it.ext)}</span>` : `${lang === "go" ? "type" : "class"} ${esc(it.n)}`}</span>${it.f.map(x=>`<code>${esc(x)}</code>`).join("")}</div>`;
  if (it.call) return `<div class="mb neon purple${changed}"><span class="hand c-purple">call · ${esc(it.n)}</span>${it.f.map(([k,v])=>`<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}</div>`;
  if (it.arr) return `<div class="mb arrbox${changed}"><span class="hand c-yellow">${esc(it.n)}</span><div class="cells">${it.arr.length ? it.arr.map((v,i)=>`<div class="cell ${i===it.hi?'hi':''}"><small>${i}</small><b>${esc(v)}</b></div>`).join("") : '<span class="muted mono">[ ]</span>'}</div></div>`;
  if (it.obj) return `<div class="mb neon ${it.c}${changed}"><span class="hand" style="color:var(--${it.c})">${esc(it.n)} : ${esc(it.obj)}</span>${it.f.length ? it.f.map(([k,v,flag])=>`<div class="kv ${flag||''}"><span>${flag==='priv'?'🔒 ':''}${esc(k)}${flag==='inh'?' <i>from Item</i>':''}</span><b>${esc(v)}</b></div>`).join("") : `<span class="muted mono">${lang === "py" ? "{}" : "{ }"}</span>`}</div>`;
  return `<div class="mb neon ${it.c}${changed}"><span class="hand" style="color:var(--${it.c})">${esc(it.n)}</span><b class="val">${esc(it.v)}</b></div>`;
}

function renderRfList(){
  const groups = ["Basics","OOP"];
  $("#rfList").innerHTML = groups.map(g => `<div class="rf-group"><span class="hand ${g==='OOP'?'c-purple':'c-yellow'}">${g}</span><div class="rf-pills">${RF.map((r,i)=>r.group!==g?"":`<button class="rf-pill ${g==='OOP'?'oop':''}" aria-pressed="${i===rfCur}" data-i="${i}"><span class="dot ${state.done[rfKey(r)]?'on':''}" style="--c:${g==='OOP'?'var(--purple)':'var(--yellow)'}"></span>${i+1}. ${r.title}</button>`).join("")}</div></div>`).join("");
  const n = RF.filter(r=>state.done[rfKey(r)]).length;
  $("#rfProgress").textContent = n === RF.length ? `All 9 done in ${LANG().name}. You're ready for Apprentice.` : `${n} of ${RF.length} lessons done in ${LANG().name}`;
}

function renderRfFrame(){
  const R = RF[rfCur], F = R.frames[rfFrame], P = R.frames[rfFrame-1];
  const lines = frameLines(F);
  $("#rfCode").innerHTML = R.code[lang].map((c,i)=>`<div class="cl ${lines.includes(i)?'on':''}"><span class="ln">${i+1}</span><span>${hl(c)||" "}</span></div>`).join("");
  const mem = F.mem.map(langMem), pmem = P ? P.mem.map(langMem) : null;
  $("#rfMem").innerHTML = mem.map(it => memBox(it, pmem ? pmem.find(x => x.n === it.n) : null)).join("");
  $("#rfOut").innerHTML = (F.out||[]).map(o => { o = pw(o); return `<div>${/Error/.test(o) ? `<span class="c-red">${esc(o)}</span>` : esc(o)}</div>`; }).join("") || '<span class="muted">nothing printed yet</span>';
  $("#rfStep").textContent = `STEP ${rfFrame+1} OF ${R.frames.length}`;
  $("#rfNote").textContent = frameNote(F);
  $("#rfPrev").disabled = rfFrame === 0;
  $("#rfNext").textContent = rfFrame === R.frames.length-1 ? "Replay" : "Next";
}

function renderRf(){
  const R = RF[rfCur];
  renderRfList();
  $("#rfTitle").innerHTML = `${rfCur+1}. ${esc(R.title)}`;
  $("#rfTitle").className = R.group === "OOP" ? "c-purple" : "c-yellow";
  $("#rfIdea").textContent = R.idea;
  $("#rfTask").textContent = (R.ex[lang] && R.ex[lang].task) || R.ex.task;
  $("#rfFileName").textContent = "lesson." + EXT[lang];
  $("#rfExName").textContent = "exercise." + EXT[lang];
  const ta = $("#rfEditor");
  ta.value = rfDrafts[rfKey(R)] ?? rfStarter(R);
  const g = $("#rfGutter"); const ln = () => { g.textContent = ta.value.split("\n").map((_,i)=>i+1).join("\n"); }; ln();
  ta.oninput = () => { ln(); rfDrafts[rfKey(R)] = ta.value; try{localStorage.setItem("ks-rf-drafts", JSON.stringify(rfDrafts));}catch(e){} queuePush(); };
  ta.onscroll = () => { g.style.transform = `translateY(${-ta.scrollTop}px)`; };
  $("#rfResults").innerHTML = state.done[rfKey(R)] ? '<span class="p">✓ Done. Run it again any time.</span>' : '<span class="muted">Fill in the TODO, then check your code.</span>';
  rfFrame = 0; renderRfFrame();
}

$("#rfList").addEventListener("click", e => { const b = e.target.closest(".rf-pill"); if (b){ rfCur = +b.dataset.i; renderRf(); } });
$("#rfPrev").onclick = () => { if (rfFrame > 0){ rfFrame--; renderRfFrame(); } };
$("#rfNext").onclick = () => { const R = RF[rfCur]; rfFrame = rfFrame === R.frames.length-1 ? 0 : rfFrame+1; renderRfFrame(); };
$("#rfEditor").addEventListener("keydown", e => { const ta = e.target; if (e.key==="Tab" && !e.shiftKey){ e.preventDefault(); const s=ta.selectionStart; ta.setRangeText(INDENT(), s, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input")); } if ((e.metaKey||e.ctrlKey) && e.key==="Enter") $("#rfRun").click(); });
$("#rfReset").onclick = () => { const R = RF[rfCur]; delete rfDrafts[rfKey(R)]; try{localStorage.setItem("ks-rf-drafts", JSON.stringify(rfDrafts));}catch(e){} $("#rfEditor").value = rfStarter(R); $("#rfEditor").dispatchEvent(new Event("input")); };

async function checkRf(R, code){
  if (COMPILED(lang)){
    const {out, err} = await runWithHarness(lang, {["exercise." + EXT[lang]]: code}, R.ex[lang].tests);
    if (!out.includes("§")) throw new Error(err || "Nothing ran. Check that your code compiles.");
    return parsePy(out).map(r => [r.name + r.msg, r.ok]);
  }
  if (lang === "py"){
    const {out, err} = await runPy(code + "\n" + PY_HARNESS + "\n" + R.ex.py.tests);
    if (err && !out.includes("§")) throw new Error(err);
    return parsePy(out).map(r => [r.name + r.msg, r.ok]);
  }
  const js = await toJS(code);
  const m = new Function(js + "\nreturn " + R.ex.js.ret + ";")();
  return R.ex.js.checks(m);
}
$("#rfRun").onclick = async () => {
  const R = RF[rfCur], code = $("#rfEditor").value, myLang = lang, myLesson = rfCur;
  $("#rfRun").disabled = true;
  if (lang !== "js") $("#rfResults").innerHTML = `<span class="muted">${runningMsg()}</span>`;
  let res;
  try { res = await checkRf(R, code); }
  catch(err){ $("#rfRun").disabled = false; $("#rfResults").innerHTML = `<span class="f">✗ ${esc(err.message || err)}</span>`; return; }
  $("#rfRun").disabled = false;
  if (myLang !== lang || myLesson !== rfCur) return;
  const all = res.length > 0 && res.every(r => r[1]);
  $("#rfResults").innerHTML = res.map(([n,ok]) => `<span class="${ok?'p':'f'}">${ok?'✓':'✗'} ${esc(n)}</span>`).join("") +
    `<div class="banner ${all?'win':'miss'}" style="margin-top:6px">${all ? (state.done[rfKey(R)] ? "All correct." : "All correct. +10 XP") : "Not yet. Check the TODO again."}</div>` +
    (all && rfCur < RF.length-1 ? `<button class="btn btn-cyan btn-sm" id="rfGo" style="align-self:flex-start;margin-top:6px">Next lesson: ${esc(RF[rfCur+1].title)}</button>` : "") +
    (all && rfCur === RF.length-1 ? `<a class="btn btn-main btn-sm" href="#lab" style="align-self:flex-start;margin-top:6px">Start your first project</a>` : "");
  if (all && !state.done[rfKey(R)]){ state.done[rfKey(R)] = true; state.xp += 10; save(); renderXP(); renderRfList(); }
  if ($("#rfGo")) $("#rfGo").onclick = () => { rfCur++; renderRf(); window.scrollTo({top:$("#p-refresher").offsetTop}); };
};

/* ---------- Lab ---------- */
let current = 0;
let drafts = {};
try { drafts = JSON.parse(localStorage.getItem("ks-drafts")) || {}; } catch(e) {}
const fileText = id => typeof id === "object" ? id.text : document.getElementById(id).value;
const draftKey = (L, f) => L.pid + "/" + f;
let openFile = {};
const pick = (o) => (o && typeof o === "object" && !Array.isArray(o) && o[lang] !== undefined) ? o[lang] : o;

function renderTasks(){
  $("#tasks").innerHTML = LABS.map((l,i) => { const lv = LVL[l.lv]; return `
    <button class="task neon ${lv.neon}" style="--c:${lv.color}" aria-pressed="${i===current}" data-i="${i}">
      <span class="hand" style="color:${lv.color}">${l.pid} · ${l.level}</span><b>${l.title}</b>
      <span class="${state.done[dk(l.pid)]?'ok':'muted'}" style="font:600 .75rem var(--f-mono)">${state.done[dk(l.pid)]?'✓ Shipped in '+LANG().name:'+'+l.xp+' XP'}</span>
    </button>`; }).join("");
}
$("#tasks").addEventListener("click", e => { const b = e.target.closest(".task"); if (b){ current = +b.dataset.i; renderLab(); } });

function saveDrafts(){ try{localStorage.setItem("ks-drafts", JSON.stringify(drafts));}catch(e){} queuePush(); }

/* run the project's tests in the chosen language; returns [[todo, name, ok, msg]] */
/* compiled languages: the learner's file plus every given code file (not the display-only tests) */
function codeFiles(L, code){
  const v = L.v[lang], files = {};
  for (const [name, src, core] of v.files){
    if (core) files[name] = code;
    else if (!/test/i.test(name) && name.endsWith("." + EXT[lang])) files[name] = fileText(src);
  }
  return files;
}
async function runProjectTests(L, code){
  const v = L.v[lang];
  if (COMPILED(lang)){
    const {out, err} = await runWithHarness(lang, codeFiles(L, code), v.tests);
    if (!out.includes("§")) throw new Error(err || "Nothing ran. Check that your code compiles.");
    return parsePy(out).map(r => [r.todo, r.name, r.ok, r.msg]);
  }
  if (lang === "py"){
    const pre = L.preview === "search" ? PY_CLOCK : "";
    const {out, err} = await runPy(pre + "\n" + pyStrip(code) + "\n" + PY_HARNESS + "\n" + v.tests, pre.split("\n").length);
    if (err && !out.includes("§")) throw new Error(err);
    return parsePy(out).map(r => [r.todo, r.name, r.ok, r.msg]);
  }
  const js = await toJS(code);
  const mod = L.preview === "search" ? null : L.load(js);
  return L.tests(mod, js).map(([k, name, t]) => { let ok=false, msg=""; try { ok = !!t(); } catch(err){ msg = " ("+err.message+")"; } return [k, name, ok, msg]; });
}

function renderProject(L, B){
  const v = L.v[lang];
  const files = v.files.map(([name, src, core]) => ({name, src, core:!!core}));
  if (!openFile[L.pid] || !files.find(f => f.name === openFile[L.pid])) openFile[L.pid] = v.core;
  const cur = files.find(f => f.name === openFile[L.pid]);
  const coreSrc = files.find(f=>f.core).src;
  const getCore = () => drafts[draftKey(L, v.core)] ?? fileText(coreSrc);
  const curCode = cur.core ? getCore() : fileText(cur.src);
  B.innerHTML = `
    <div class="bench-head">
      <span class="hand c-cyan">${L.pid} · ${L.level} · +${L.xp} XP · ${LANG().name}</span>
      <h3 style="font-size:1.4rem">${L.title}</h3>
      <p class="muted">${pick(L.brief)}</p>
      <div class="legend"><span class="lg given">Given · read only</span><span class="lg yours">Yours · write the core</span></div>
    </div>
    <div class="ws">
      <div class="tree" role="tablist" aria-label="Project files">
        <span class="hand muted" style="padding:4px 14px 8px">${L.pid.toLowerCase()}/</span>
        ${files.map(f => `<button role="tab" data-file="${f.name}" aria-current="${f.name===cur.name}" class="${f.core?'yours':''}"><span>${f.core?'✎':'🔒'}</span>${f.name}</button>`).join("")}
      </div>
      <div style="min-width:0;display:flex;flex-direction:column">
        <div class="win-bar" style="border-radius:0"><i></i><i></i><i></i><span>${cur.name}</span><span style="margin-left:auto" class="${cur.core?'c-yellow':''}">${cur.core?'your code':'given · read only'}</span></div>
        <div class="editor"><div class="gutter" id="gutter"></div><textarea class="code" id="code-${L.pid}-${cur.name}" spellcheck="false" aria-label="${cur.name}" ${cur.core?'':'readonly'}>${esc(curCode)}</textarea></div>
      </div>
    </div>
    <div class="bar">
      <button class="btn btn-main btn-sm" id="runBtn">Run tests</button>
      <button class="btn btn-ghost btn-sm" id="hintBtn">Hint</button>
      <button class="btn btn-ghost btn-sm" id="resetCode">Reset ${v.core}</button>
      <div class="todos" id="todos"></div>
    </div>
    <div class="results" id="results"><span class="muted">${cur.core ? "Write the TODOs, then run the tests." : `Open <b class="c-yellow">${v.core}</b> to write the core. Everything else is done for you.`}</span></div>
    <div class="preview neon yellow">
      <div class="pv-head"><span class="hand c-yellow">Live preview · runs your ${v.core}</span><span class="muted" id="pvNote"></span></div>
      <div id="pv"></div>
    </div>`;

  const ta = B.querySelector("textarea"), g = $("#gutter");
  const lines = () => { g.textContent = ta.value.split("\n").map((_,i)=>i+1).join("\n"); };
  lines();
  ta.addEventListener("scroll", () => { g.style.transform = `translateY(${-ta.scrollTop}px)`; });
  if (cur.core){
    ta.addEventListener("input", () => { lines(); drafts[draftKey(L, v.core)] = ta.value; saveDrafts(); });
    ta.addEventListener("keydown", e => { if (e.key==="Tab" && !e.shiftKey){ e.preventDefault(); const s=ta.selectionStart; ta.setRangeText(INDENT(), s, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input")); } if ((e.metaKey||e.ctrlKey) && e.key==="Enter") $("#runBtn").click(); });
  }
  B.querySelector(".tree").addEventListener("click", e => { const b = e.target.closest("button[data-file]"); if (b){ openFile[L.pid] = b.dataset.file; renderLab(); } });
  $("#hintBtn").onclick = () => { $("#results").innerHTML = `<span class="c-yellow">Hint: ${esc(pick(L.hint))}</span>`; };
  $("#resetCode").onclick = () => { delete drafts[draftKey(L, v.core)]; saveDrafts(); renderLab(); };
  const todoStatus = (res) => { $("#todos").innerHTML = v.todos.map(([k,label]) => { const mine = res ? res.filter(r=>r[0]===k) : []; const st = !res ? "" : mine.length && mine.every(r=>r[2]) ? "done" : "todo"; return `<span class="td ${st}">${st==="done"?"✓":"○"} ${k} · ${label}</span>`; }).join(""); };
  todoStatus(null);
  $("#runBtn").onclick = async () => {
    const code = getCore(), myLang = lang;
    $("#runBtn").disabled = true;
    if (lang !== "js") $("#results").innerHTML = `<span class="muted">${runningMsg()}</span>`;
    let res;
    try { res = await runProjectTests(L, code); }
    catch(err){ $("#runBtn").disabled = false; $("#results").innerHTML = `<span class="f">✗ ${esc(v.core)} didn't load: ${esc(err.message || err)}</span>`; return; }
    $("#runBtn").disabled = false;
    if (myLang !== lang || !$("#results")) return;
    const pass = res.filter(r=>r[2]).length, all = res.length > 0 && pass === res.length;
    $("#results").innerHTML = res.map(([k,n,ok,msg]) => `<span class="${ok?'p':'f'}">${ok?'✓':'✗'} ${esc(n)}${esc(msg)}</span>`).join("") +
      `<div class="banner ${all?'win':'miss'}" style="margin-top:8px">${all ? (state.done[dk(L.pid)] ? "All passing. Already shipped." : `All ${pass} passing. Shipped! +${L.xp} XP`) : `${pass} of ${res.length} passing. Keep going.`}</div>`;
    todoStatus(res);
    mountPreview(L, code);
    if (all) complete(L);
  };
  mountPreview(L, getCore());
}

/* cart preview: replay the clicks through the learner's cart code */
const PRODUCTS = [{id:"burger",name:"Smash burger",price:12.9},{id:"fries",name:"Fries",price:3.5},{id:"shake",name:"Shake",price:5}];
async function cartReplay(L, code, actions){
  if (COMPILED(lang)){
    const body = L.v[lang].driver.replace("{{ACTIONS}}", JSON.stringify(actions.map(a => a.join(":")).join(",")));
    const {out, err} = await runWithHarness(lang, codeFiles(L, code), body);
    const items = out.split("\n").filter(l => l.startsWith("§ITEM|")).map(l => { const [, id, name, qty, price] = l.split("|"); return {id, name, qty:+qty, price:+price}; });
    const tl = out.split("\n").find(l => l.startsWith("§TOTAL|"));
    const t = tl ? parseFloat(tl.split("|")[1]) : NaN;
    return {items, total: tl && !isNaN(t) ? t : null, err: err || null};
  }
  if (lang === "py"){
    const driver = `
_P = ${JSON.stringify(PRODUCTS).replace(/"(\w+)":/g, '"$1":')}
_cart = []
for _a in ${JSON.stringify(actions)}:
    if _a[0] == "add":
        for _p in _P:
            if _p["id"] == _a[1]:
                _cart = add_item(_cart, dict(_p))
        if not isinstance(_cart, list):
            raise TypeError("add_item returned " + str(_cart) + ". It should return the cart.")
    else:
        _cart = remove_item(_cart, _a[1])
        if not isinstance(_cart, list):
            raise TypeError("remove_item returned " + str(_cart) + ". It should return the cart.")
for _i in _cart:
    print("§ITEM|" + _i["id"] + "|" + _i["name"] + "|" + str(_i["qty"]) + "|" + str(_i["price"]))
print("§TOTAL|" + str(cart_total(_cart)))
`;
    const {out, err} = await runPy(pyStrip(code) + "\n" + driver);
    const items = out.split("\n").filter(l => l.startsWith("§ITEM|")).map(l => { const [, id, name, qty, price] = l.split("|"); return {id, name, qty:+qty, price:+price}; });
    const tl = out.split("\n").find(l => l.startsWith("§TOTAL|"));
    const t = tl ? parseFloat(tl.split("|")[1]) : NaN;
    return {items, total: tl && !isNaN(t) ? t : null, err: err ? err.replace(/^\w*Error: /, "") : null};
  }
  let m; try { m = L.load(await toJS(code)); } catch(e){ return {items:[], total:null, err:"Your code has an error: " + e.message}; }
  let cart = [], err = null;
  try {
    for (const [a, id] of actions){
      const out = a === "add" ? m.addItem(cart, {...PRODUCTS.find(p=>p.id===id)}) : m.removeItem(cart, id);
      if (!Array.isArray(out)) throw new Error(`${a === "add" ? "addItem" : "removeItem"} returned ${out}. It should return the cart.`);
      cart = out;
    }
  } catch(e){ err = e.message; }
  let total = null;
  try { const t = m.cartTotal(cart); total = typeof t === "number" && !isNaN(t) ? t : null; } catch(e){ err = err || e.message; }
  return {items: cart, total, err};
}

function mountPreview(L, code){
  const pv = $("#pv"), note = $("#pvNote");
  const v = L.v[lang];
  if (L.preview === "cart"){
    let actions = [], seq = 0;
    const draw = async () => {
      const my = ++seq;
      const r = await cartReplay(L, code, actions);
      if (my !== seq || !document.body.contains(pv)) return;
      const total = r.total === null ? "?" : "$" + r.total.toFixed(2);
      const items = r.items.map(i => `<li><span>${esc(i.name)} × ${i.qty}</span><span>$${(i.price*i.qty).toFixed(2)} <button data-rm="${esc(i.id)}" aria-label="Remove ${esc(i.name)}">✕</button></span></li>`).join("");
      pv.innerHTML = `<div class="pv-app">
        <div class="pv-phone">
          <div class="pv-top"><span>9:41</span><span>▮</span></div>
          <div class="pv-title">‹ Checkout</div>
          <div class="pv-shop"><span class="pv-logo">BB</span><span><b>Burger Bros</b><small>25 to 30 min</small></span></div>
          <div class="pv-menu">${PRODUCTS.map(p=>`<button data-add="${p.id}"><span>${p.name}</span><span>+ $${p.price.toFixed(2)}</span></button>`).join("")}</div>
          <ul class="pv-cart">${items || '<li class="muted"><span>Cart is empty</span></li>'}</ul>
          <div class="pv-total"><span>Total</span><span>${total}</span></div>
          <div class="pv-pay">Pay ${total}</div>
        </div>
        ${r.err ? `<p class="pv-err">⚠ ${esc(r.err)}</p>` : ""}
      </div>`;
    };
    pv.onclick = e => {
      const a = e.target.closest("[data-add]"), rm = e.target.closest("[data-rm]");
      if (a) actions.push(["add", a.dataset.add]);
      else if (rm) actions.push(["remove", rm.dataset.rm]);
      else return;
      draw();
    };
    note.textContent = "Tap the menu to add items";
    pv.innerHTML = `<p class="muted" style="padding:14px">${lang === "js" || lang === "ts" ? "Loading…" : `Starting ${LANG().name}…`}</p>`;
    draw();
    return;
  }
  const batch = lang === "py" || COMPILED(lang);
  const DOCS = ["react","redux","remix","rust","ruby","rails","redis","regex","rest api","react native"];
  pv.innerHTML = `<div class="pv-search">
    <label for="pvq" class="hand muted">${batch ? 'Type a search like "react", then replay it at typing speed' : 'Type a search, like "react"'}</label>
    <input id="pvq" autocomplete="off" placeholder="Search docs…">
    ${batch ? '<button class="btn btn-cyan btn-sm" id="pvReplay" style="align-self:flex-start">Replay typing</button>' : ''}
    <div class="pv-stats"><div><b id="pvK">0</b><small>keystrokes</small></div><div><b id="pvC">0</b><small>API calls</small></div><div><b id="pvCost">$0.00</b><small>at $0.05 a call</small></div></div>
    <ul id="pvR" class="pv-res"></ul></div>`;
  const show = (keys, calls, last) => {
    $("#pvK").textContent = keys; $("#pvC").textContent = calls; $("#pvCost").textContent = "$" + (calls*0.05).toFixed(2);
    const r = last ? DOCS.filter(d => d.startsWith(last.toLowerCase())) : [];
    $("#pvR").innerHTML = r.map(x=>`<li>${esc(x)}</li>`).join("");
  };
  if (COMPILED(lang)){
    note.textContent = "Each letter arrives 80 ms after the last";
    $("#pvReplay").onclick = async () => {
      const text = ($("#pvq").value || "react").toLowerCase().replace(/[^a-z0-9 ]/g, "") || "react";
      const steps = [...text].map((_, i) => text.slice(0, i+1));
      $("#pvReplay").disabled = true;
      const {out, err} = await runWithHarness(lang, codeFiles(L, code), v.driver.replace("{{STEPS}}", JSON.stringify(steps.join(","))));
      if (!$("#pvReplay")) return;
      $("#pvReplay").disabled = false;
      const line = out.split("\n").find(l => l.startsWith("§CALLS|"));
      if (err || !line){ $("#pvR").innerHTML = `<li class="f" style="border-color:var(--red);color:var(--red)">${esc(err || "No result")}</li>`; return; }
      const [, n, last] = line.split("|");
      show(steps.length, +n, last);
    };
    return;
  }
  if (lang === "py"){
    note.textContent = "Each letter arrives 80 ms after the last";
    $("#pvReplay").onclick = async () => {
      const text = $("#pvq").value || "react";
      const steps = [...text].map((_, i) => text.slice(0, i+1));
      const driver = `
_calls = []
_d = debounce(lambda q: _calls.append(q), 300)
for _q in ${JSON.stringify(steps)}:
    _d(_q)
    tick(80)
tick(400)
print("§CALLS|" + str(len(_calls)) + "|" + (_calls[-1] if _calls else ""))
`;
      $("#pvReplay").disabled = true;
      const {out, err} = await runPy(PY_CLOCK + "\n" + pyStrip(code) + "\n" + driver, PY_CLOCK.split("\n").length);
      if (!$("#pvReplay")) return;
      $("#pvReplay").disabled = false;
      const line = out.split("\n").find(l => l.startsWith("§CALLS|"));
      if (err || !line){ $("#pvR").innerHTML = `<li class="f" style="border-color:var(--red);color:var(--red)">${esc(err || "No result")}</li>`; return; }
      const [, n, last] = line.split("|");
      show(steps.length, +n, last);
    };
    return;
  }
  let keys = 0, calls = 0, run = null;
  note.textContent = "Fewer API calls means a working debounce";
  toJS(code).then(js => {
    const m = L.load(js, {st:(cb,t)=>setTimeout(cb,t), ct:(i)=>clearTimeout(i)});
    run = m.debounce(q => { calls++; show(keys, calls, q); }, 300);
  }).catch(e => { if ($("#pvR")) $("#pvR").innerHTML = `<li style="border-color:var(--red);color:var(--red)">${esc(e.message)}</li>`; });
  $("#pvq").addEventListener("input", e => { keys++; $("#pvK").textContent = keys; try { run && run(e.target.value); } catch(err){} });
}

function renderLab(){
  renderTasks();
  const L = LABS[current], B = $("#bench");
  if (L.kind === "project") return renderProject(L, B);
  const diff = L.diffs[lang];
  const head = `<div class="bench-head"><span class="hand c-cyan">${L.pid} · ${L.level} · +${L.xp} XP · ${LANG().name}</span><h3 style="font-size:1.4rem">${L.title}</h3><p class="muted">${pick(L.brief)}</p></div>`;
  let flags = new Set();
  B.innerHTML = head + `<div class="win-bar" style="border-radius:0"><i></i><i></i><i></i><span>${L.file[lang]} · PR #482</span></div><div class="diff" id="diff">${diff.map((d,i)=>`<button class="dl ${d[0]==='add'?'add':'ctx'}" data-i="${i}" ${d[0]==='ctx'?'tabindex="-1"':''} aria-pressed="false"><span class="n">${i+12}</span><span>${d[0]==='add'?'+':' '}</span><span>${esc(d[1])}</span></button>`).join("")}</div>
    <div class="bar"><button class="btn btn-main btn-sm" id="subBtn">Submit review</button><span class="muted" id="flagCount" style="font:500 .85rem var(--f-mono)">0 lines flagged</span><button class="btn btn-ghost btn-sm" id="clrBtn">Clear</button></div>
    <div class="results" id="results"><span class="muted">Click a line to flag it.</span></div>`;
  const lines = [...B.querySelectorAll(".dl")];
  $("#diff").addEventListener("click", e => {
    const b = e.target.closest(".dl"); if (!b || b.classList.contains("ctx")) return;
    const i = +b.dataset.i; flags.has(i) ? flags.delete(i) : flags.add(i);
    lines.forEach(l => l.classList.remove("hit","miss"));
    b.classList.toggle("flag", flags.has(i)); b.setAttribute("aria-pressed", flags.has(i));
    $("#flagCount").textContent = `${flags.size} line${flags.size===1?'':'s'} flagged`;
  });
  $("#clrBtn").onclick = () => renderLab();
  $("#subBtn").onclick = () => {
    const bad = diff.map((d,i)=>d[2]?i:-1).filter(i=>i>=0);
    let found = 0, falseAlarms = 0, out = [];
    lines.forEach((l,i) => { l.classList.remove("flag","hit","miss");
      if (bad.includes(i) && flags.has(i)){ l.classList.add("hit"); found++; }
      else if (bad.includes(i)) l.classList.add("miss");
      else if (flags.has(i)){ falseAlarms++; }
    });
    bad.forEach(i => { const ok = flags.has(i); out.push(`<span class="${ok?'p':'f'}">${ok?'✓ Caught':'✗ Missed'} line ${i+12}: ${esc(diff[i][2])}</span>`); });
    if (falseAlarms) out.push(`<span class="f">✗ ${falseAlarms} flag${falseAlarms>1?'s':''} on lines that are fine</span>`);
    const all = found === bad.length && !falseAlarms;
    out.push(`<div class="banner ${all?'win':'miss'}" style="margin-top:8px">${all ? (state.done[dk(L.pid)] ? "Clean review. Already shipped." : `Clean review. Shipped! +${L.xp} XP`) : `${found} of ${bad.length} found. Try again.`}</div>`);
    $("#results").innerHTML = out.join("");
    flags = new Set();
    $("#flagCount").textContent = "0 lines flagged";
    if (all) complete(L);
  };
}

function complete(L){
  if (state.done[dk(L.pid)]) return;
  state.done[dk(L.pid)] = true; state.xp += L.xp; save(); renderXP(); renderTasks(); renderHome(); renderPath();
}
function renderXP(){ $("#xpVal").textContent = state.xp; }
$("#resetBtn").onclick = () => { state = {done:{}, xp:0}; drafts = {}; rfDrafts = {}; save(); try{localStorage.removeItem("ks-drafts"); localStorage.removeItem("ks-rf-drafts");}catch(e){} renderAll(); };

const PAGES = ["home","refresher","path","learn","lab","about"];
function route(){
  const h = (location.hash || "#home").slice(1);
  const page = PAGES.includes(h) ? h : "home";
  PAGES.forEach(p => { $("#p-"+p).hidden = p !== page; });
  document.querySelectorAll(".links a").forEach(a => { if (a.getAttribute("href")==="#"+page) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
  if (page !== "learn") stopPlay();
  closeDrawer();
  window.scrollTo(0,0);
}
window.addEventListener("hashchange", route);
function renderLangs(){
  $("#langSel").value = lang;
  $("#langGrid").innerHTML = LANGS.map(l => `<button class="lang-card neon" style="--c:${l.c}" data-lang="${l.k}" ${l.ok ? "" : "disabled"} aria-pressed="${l.k===lang}"><span class="lang-badge">${l.short}</span><b>${l.name}</b><small>${l.note}</small>${l.ok ? (l.k===lang ? '<span class="lang-state">✓ Selected</span>' : '<span class="lang-state muted">Choose</span>') : '<span class="lang-state muted">Coming soon</span>'}</button>`).join("");
}
function setLang(k){
  if (!LANG_KEYS.includes(k) || k === lang) { renderLangs(); return; }
  lang = k; try { localStorage.setItem("ks-lang", k); } catch(e) {}
  renderLangs(); renderLab(); renderRf();
  if (RUNTIMES[k]) loadRuntime(k).catch(() => {});
  queuePush();
}
$("#langSel").addEventListener("change", e => setLang(e.target.value));
$("#langGrid").addEventListener("click", e => { const b = e.target.closest(".lang-card"); if (b && !b.disabled) setLang(b.dataset.lang); });
function renderAll(){ renderXP(); renderLangs(); renderHome(); renderPath(); renderLab(); renderSlim(); renderRf(); if ($("#exInfo").innerHTML){ renderExList(); renderInfo(exById(exCur)); } }
/* XP is derived from what's done, so merging progress from two devices can't double count */
function xpFor(k){
  if (/^EXQ?-/.test(k)) return 20;
  if (/^RF-/.test(k)) return 10;
  const L = LABS.find(l => k.startsWith(l.pid + "@"));
  return L ? L.xp : 0;
}
const recomputeXP = () => { state.xp = Object.keys(state.done).filter(k => state.done[k]).reduce((t, k) => t + xpFor(k), 0); };
initAuth({
  snapshot: () => ({state, drafts, rfDrafts, lang}),
  apply(m){
    state.done = m.done; recomputeXP(); drafts = m.drafts; rfDrafts = m.rfDrafts;
    try { localStorage.setItem("ks-state", JSON.stringify(state)); localStorage.setItem("ks-drafts", JSON.stringify(drafts)); localStorage.setItem("ks-rf-drafts", JSON.stringify(rfDrafts)); } catch(e) {}
    if (m.lang && LANG_KEYS.includes(m.lang) && m.lang !== lang){ lang = m.lang; try { localStorage.setItem("ks-lang", lang); } catch(e) {} }
    renderAll();
  },
  onChange(user){ $("#saveNote").textContent = user ? `Signed in as ${user.email || "you"}. Progress saves to your account.` : "KnitStack is free. Progress saves in this browser."; }
});
window.KS = {EXPL, RF, LABS, PACKS, get state(){ return state; }};
renderAll(); showEx("secrets"); route();
