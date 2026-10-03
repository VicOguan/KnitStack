const { chromium } = (() => { try { return require('playwright'); } catch { return require((process.env.NODE_PATH||'').split(':')[0] + '/playwright'); } })();
const ROOT = require('path').join(__dirname, '..');
const ORIGIN = 'https://knitstack.test';
const TYPES = {js:'application/javascript',mjs:'application/javascript',wasm:'application/wasm',html:'text/html',css:'text/css',json:'application/json',svg:'image/svg+xml',woff2:'font/woff2',woff:'font/woff'};
const results = []; const ok = (name, cond, info='') => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : info]);
const RF_SOL = [
`const price = 12.90; const qty = 2; let total = price * qty;`,
`function shippingFor(total){ return total >= 25 ? 0 : 2; }`,
`function countOver(prices, limit){ let count=0; for (const p of prices) if (p>limit) count++; return count; }`,
`function greet(name){ return 'Hi, ' + name + '!'; }`,
`function makeItem(name, price){ return {name, price, qty:1}; }`,
`class Counter { constructor(){ this.count=0; } increment(){ this.count++; } reset(){ this.count=0; } }`,
`class BankAccount { #balance=0; deposit(a){ this.#balance+=a; } get balance(){ return this.#balance; } withdraw(a){ if (a>this.#balance) throw new Error('no'); this.#balance-=a; } }`,
`class Animal { constructor(name){ this.name=name; } describe(){ return this.name+' is an animal'; } }\nclass Dog extends Animal { constructor(n,b){ super(n); this.breed=b; } bark(){ return this.name+' says woof'; } }`,
`class Shape { area(){ return 0; } }\nclass Rect extends Shape { constructor(w,h){ super(); this.w=w; this.h=h; } area(){ return this.w*this.h; } }\nclass Circle extends Shape { constructor(r){ super(); this.r=r; } area(){ return Math.PI*this.r*this.r; } }\nfunction totalArea(shapes){ return shapes.reduce((t,s)=>t+s.area(),0); }`];
const RF_WRONG = [
`let total = 0;`, `function shippingFor(t){ return 2; }`, `function countOver(p,l){ return p.length; }`, `function greet(n){ return 'Hello ' + n; }`,
`function makeItem(name, price){ return {name}; }`, `class Counter { constructor(){ this.count=0; } increment(){ this.count+=2; } reset(){} }`,
`class BankAccount { #balance=0; deposit(a){ this.#balance+=a; } get balance(){ return this.#balance; } withdraw(a){ this.#balance-=a; } }`,
`class Animal { constructor(name){ this.name=name; } describe(){ return this.name+' is an animal'; } }`,
`class Shape { area(){ return 0; } }\nclass Rect extends Shape { area(){ return 1; } }`];
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx = await b.newContext({viewport:{width:1280,height:900}});
  const RT = process.cwd() + '/rt/';
  const fs = require('fs'), path = require('path');
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin !== ORIGIN) return route.abort();
    let f = path.join(ROOT, 'dist', decodeURIComponent(u.pathname));
    if (u.pathname === '/') f = path.join(ROOT, 'dist', 'index.html');
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({status:404, body:'nf'});
    route.fulfill({contentType: TYPES[path.extname(f).slice(1)] || 'application/octet-stream', headers:{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin'}, body: fs.readFileSync(f)});
  });
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error' && !/ERR_CERT|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const url = ORIGIN + '/';
  await p.goto(url); await p.waitForTimeout(400);
  const xp = async () => +(await p.textContent('#xpVal'));
  const vis = async sel => p.isVisible(sel);

  // NAV
  for (const pg of ['home','refresher','path','learn','lab','about']) {
    await p.click(`.links a[href="#${pg}"]`); await p.waitForTimeout(150);
    ok(`nav: ${pg} page shows`, await vis(`#p-${pg}`));
    ok(`nav: ${pg} link marked current`, (await p.getAttribute(`.links a[href="#${pg}"]`,'aria-current'))==='page');
    const others = await p.$$eval('section.page', s => s.filter(x=>!x.hidden).length);
    ok(`nav: only one page visible on ${pg}`, others===1, others);
  }
  await p.goto(url+'#bogus'); await p.waitForTimeout(150); ok('unknown hash falls back to home', await vis('#p-home'));
  await p.click('a.logo'); ok('logo goes home', await vis('#p-home'));
  // HOME buttons
  for (const [txt, pg] of [['Watch an explainer','learn'],['Try a lab ticket','lab'],['See the path','path'],['Brush up on basics','refresher']]) {
    await p.goto(url+'#home'); await p.click(`#p-home .ctas a:has-text("${txt}")`); await p.waitForTimeout(100);
    ok(`home button "${txt}"`, await vis(`#p-${pg}`));
  }
  ok('home ladder has 4 levels', (await p.$$('#ladder > div')).length===4);

  // PATH
  await p.goto(url+'#path'); await p.waitForTimeout(150);
  const pids = await p.$$eval('.proj', bs => bs.map(b=>b.dataset.pid));
  ok('path lists 14 projects', pids.length===14, pids.length);
  for (const pid of pids) {
    await p.click(`.proj[data-pid="${pid}"]`);
    const open = await vis('#drawer'); const title = open ? await p.textContent('#dTitle') : '';
    ok(`path drawer opens for ${pid}`, open && title.length>0);
    await p.click('#dClose'); ok(`drawer closes for ${pid}`, !(await vis('#drawer')));
  }
  await p.click('.proj[data-pid="KS-202"]'); await p.keyboard.press('Escape'); ok('Escape closes drawer', !(await vis('#drawer')));
  await p.click('.proj[data-pid="KS-202"]'); await p.mouse.click(50,450); ok('clicking backdrop closes drawer', !(await vis('#drawer')));
  await p.click('.proj[data-pid="KS-303"]'); await p.click('#dEx'); await p.waitForTimeout(150);
  ok('drawer "Watch the explainer" opens Docker explainer', await vis('#ex-docker') && await vis('#p-learn'));
  await p.goto(url+'#path'); await p.click('.proj[data-pid="KS-301"]'); await p.click('#dGo'); await p.waitForTimeout(150);
  ok('drawer "Open in the lab" opens KS-301', await vis('#p-lab') && (await p.textContent('#bench h3')).includes('Docs search'));
  await p.goto(url+'#path'); await p.click('.rf-banner'); await p.waitForTimeout(150); ok('path refresher banner works', await vis('#p-refresher'));

  // EXPLAINERS: library
  await p.goto(url+'#learn'); await p.waitForTimeout(150);
  ok('explainers: 8 chips in the library', (await p.$$('#exList .ex-chip')).length===8, (await p.$$('#exList .ex-chip')).length);
  ok('explainers: grouped into 3 levels', (await p.$$('#exList .rf-group')).length===3);
  const QA = await p.evaluate(() => window.KS.EXPL.map(e => [e.id, e.quiz.map(q => q.a), e.kind, e.steps ? e.steps.length : 0]));
  for (const [id, ans, kind, nSteps] of QA) {
    await p.click(`.ex-chip[data-ex="${id}"]`); await p.waitForTimeout(150);
    ok(`${id}: chip pressed`, (await p.getAttribute(`.ex-chip[data-ex="${id}"]`,'aria-pressed'))==='true');
    ok(`${id}: title set`, (await p.textContent('#learnTitle')).length>3);
    ok(`${id}: takeaways, mistakes, real world shown`, (await p.$$('#exInfo .info')).length===4 && (await p.$$('#exInfo .info li')).length>=5);
    ok(`${id}: 3 quiz questions`, (await p.$$('#exQuiz .quiz')).length===3);
    if (kind==='steps') {
      ok(`${id}: starts at step 1 of ${nSteps}`, (await p.textContent('#stepNo')).includes(`STEP 1 OF ${nSteps}`), await p.textContent('#stepNo'));
      let deepN = 0;
      for (let i=0;i<nSteps;i++){ if (i) await p.click('#nextStep'); if ((await p.innerHTML('#deep')).length) deepN++; }
      ok(`${id}: walked to step ${nSteps}`, (await p.textContent('#stepNo')).includes(`STEP ${nSteps} OF ${nSteps}`));
      ok(`${id}: "Go deeper" panel on most steps`, deepN >= nSteps-2, deepN);
      const hidden = await p.evaluate(() => [...document.querySelectorAll('#exStage svg .fade')].filter(g=>g.classList.contains('off')).length);
      const total = await p.evaluate(() => document.querySelectorAll('#exStage svg .fade').length);
      ok(`${id}: final step shows the end state`, total===0 || hidden < total, `${hidden}/${total}`);
      await p.click('#nextStep'); ok(`${id}: Replay returns to step 1`, (await p.textContent('#stepNo')).includes('STEP 1'));
    }
    const x0 = await xp();
    const wrong = (ans[0]+1)%3;
    await p.click(`#exQuiz button[data-q="0-${wrong}"]`);
    ok(`${id} quiz: wrong answer marked`, (await p.getAttribute(`#exQuiz button[data-q="0-${wrong}"]`,'class')).includes('wrong'));
    for (let qi=0; qi<3; qi++) await p.click(`#exQuiz button[data-q="${qi}-${ans[qi]}"]`);
    ok(`${id} quiz: all right gives +20 XP`, await xp()===x0+20, `${x0} → ${await xp()}`);
    ok(`${id} quiz: score says All correct`, (await p.textContent('#quizScore')).includes('All correct'));
    ok(`${id}: chip dot lights up`, !!(await p.$(`.ex-chip[data-ex="${id}"] .dot.on`)));
    await p.click(`#exQuiz button[data-q="2-${ans[2]}"]`); ok(`${id} quiz: no double XP`, await xp()===x0+20);
  }
  await p.click('.ex-chip[data-ex="http"]'); ok('http quiz: shows passed earlier on revisit', (await p.textContent('#quizScore')).includes('Passed earlier'));

  // SECRETS specifics
  await p.click('.ex-chip[data-ex="secrets"]'); await p.waitForTimeout(100);
  ok('secrets: Back disabled at step 1', await p.isDisabled('#prevStep'));
  await p.click('#pips button[data-s="3"]'); ok('secrets: key chip red on leak step', (await p.getAttribute('#keyChip','fill'))==='#FF5A5A');
  ok('secrets: leak step shows console.log code', (await p.textContent('#deep')).includes('console.log(process.env)'));
  await p.click('#nextStep'); ok('secrets: key shows as from secret on step 5', (await p.textContent('#keyText')).includes('secret'));
  ok('secrets: step 5 shows secretKeyRef yaml', (await p.textContent('#deep')).includes('secretKeyRef'));
  await p.click('#nextStep'); ok('secrets: base64 warning appears on step 6', await p.evaluate(() => [...document.querySelectorAll('#exStage svg .fade')].some(g => !g.classList.contains('off') && g.textContent.includes('BASE64'))));
  await p.click('#nextStep'); ok('secrets: rotation shown on step 7', await p.evaluate(() => [...document.querySelectorAll('#exStage svg .fade')].some(g => !g.classList.contains('off') && g.textContent.includes('ROTATED'))));
  ok('secrets: base64 warning hides on step 7', !(await p.evaluate(() => [...document.querySelectorAll('#exStage svg .fade')].some(g => !g.classList.contains('off') && g.textContent.includes('BASE64 IS')))));
  await p.click('#pips button[data-s="1"]'); ok('secrets: pip jumps to step 2', (await p.textContent('#stepNo')).includes('STEP 2'));
  await p.click('#pips button[data-s="0"]');
  await p.click('#playStep'); ok('secrets: Play shows Pause', (await p.textContent('#playStep'))==='Pause');
  await p.waitForTimeout(3500); ok('secrets: Play advances by itself', (await p.textContent('#stepNo')).includes('STEP 2'));
  await p.click('#playStep'); ok('secrets: Pause stops', (await p.textContent('#playStep'))==='Play all');
  const sAfter = await p.textContent('#stepNo'); await p.waitForTimeout(3400); ok('secrets: stays paused', (await p.textContent('#stepNo'))===sAfter);
  await p.click('#playStep'); await p.click('.links a[href="#home"]'); await p.waitForTimeout(3400); await p.click('.links a[href="#learn"]');
  ok('secrets: leaving the page stops Play', (await p.textContent('#playStep'))==='Play all');
  await p.click('#playStep'); await p.click('.ex-chip[data-ex="git"]'); await p.waitForTimeout(3400);
  ok('switching explainer stops Play', (await p.textContent('#stepNo')).includes('STEP 1 OF 6'));

  // HTTP / GIT / CACHE specifics
  await p.click('.ex-chip[data-ex="git"]'); await p.click('#pips button[data-s="1"]');
  ok('git: step 2 shows git switch -c', (await p.textContent('#deep')).includes('git switch -c feature/cart'));
  await p.click('.ex-chip[data-ex="http"]'); await p.click('#pips button[data-s="3"]');
  ok('http: step 4 shows the GET request', (await p.textContent('#deep')).includes('GET /products'));
  await p.click('#pips button[data-s="5"]'); ok('http: timing bar visible on last step', await p.evaluate(() => [...document.querySelectorAll('#exStage svg .fade')].some(g => !g.classList.contains('off') && g.textContent.includes('TIMING'))));
  await p.click('.ex-chip[data-ex="cache"]'); await p.click('#pips button[data-s="4"]');
  ok('cache: hit pill on step 5', await p.evaluate(() => [...document.querySelectorAll('#exStage svg .fade')].some(g => !g.classList.contains('off') && g.textContent.includes('HIT'))));
  await p.click('#pips button[data-s="5"]'); ok('cache: stale pill on step 6', await p.evaluate(() => [...document.querySelectorAll('#exStage svg .fade')].some(g => !g.classList.contains('off') && g.textContent.includes('stale'))));
  await p.click('#pips button[data-s="6"]'); ok('cache: fix shows redis.del', (await p.textContent('#deep')).includes('redis.del'));

  // THREADS
  await p.click('.ex-chip[data-ex="threads"]'); await p.waitForTimeout(100);
  ok('threads: 4 processes and 4 threads drawn', (await p.$$('.tv-proc')).length===4 && (await p.$$('.tv-t')).length===4);
  await p.click('#tvCrash'); ok('threads: crash kills only P3 on the process side', (await p.$$('.tv-proc.red')).length===1);
  ok('threads: crash kills all 4 threads', (await p.$$('.tv-t.dead')).length===4);
  ok('threads: crash message explains', (await p.textContent('#tvMsg')).includes('only P3 died'));
  await p.click('#tvCount'); ok('threads: no lock → counter = 3 (race)', (await p.textContent('#tvOne')).includes('counter = 3') && (await p.textContent('#tvMsg')).includes('race condition'));
  await p.click('#tvLock'); ok('threads: lock → counter = 4', (await p.textContent('#tvOne')).includes('counter = 4'));
  await p.click('#tvReset'); ok('threads: reset clears counter', !(await p.textContent('#tvOne')).includes('counter ='));

  // QUEUE
  await p.click('.ex-chip[data-ex="queue"]'); await p.waitForTimeout(800);
  ok('queue: keeps up at 6/s with 3 workers', (await p.textContent('#qsState')).includes('Keeping up'), await p.textContent('#qsState'));
  ok('queue: orders get processed', +(await p.textContent('#qsDone')).replace(/,/g,'') > 0);
  await p.fill('#qsRate','12'); await p.dispatchEvent('#qsRate','input'); await p.waitForTimeout(1200);
  ok('queue: 12/s vs 6/s capacity grows', (await p.textContent('#qsState')).includes('Growing'), await p.textContent('#qsState'));
  ok('queue: jobs pile up', (await p.$$('#qsJobs i')).length >= 3, (await p.$$('#qsJobs i')).length);
  ok('queue: message explains the backlog', (await p.textContent('#qsMsg')).includes('backlog grows by 6'));
  await p.fill('#qsW','8'); await p.dispatchEvent('#qsW','input'); await p.waitForTimeout(2500);
  ok('queue: 8 workers drain it', /Draining|Keeping up/.test(await p.textContent('#qsState')), await p.textContent('#qsState'));
  ok('queue: 8 worker boxes', (await p.$$('.qs-w')).length===8);
  await p.click('#qsKill'); ok('queue: crash retries a job', (await p.textContent('#qsRetry'))==='1' && (await p.textContent('#qsMsg')).includes('idempotent'));
  await p.click('#qsSpike'); ok('queue: spike disables button and multiplies rate', await p.isDisabled('#qsSpike') && (await p.textContent('#qsRateV'))==='60');
  await p.click('#qsPause'); const d1 = await p.textContent('#qsDone'); await p.waitForTimeout(600);
  ok('queue: pause freezes the sim', (await p.textContent('#qsDone'))===d1);
  await p.click('#qsPause');

  // INDEX
  await p.click('.ex-chip[data-ex="index"]'); await p.waitForTimeout(100);
  await p.click('#ixRun'); ok('index: run disables the button', await p.isDisabled('#ixRun'));
  await p.waitForTimeout(1500);
  ok('index: scan reads 1,000,000 rows', (await p.textContent('#ixRowsL'))==='1,000,000', await p.textContent('#ixRowsL'));
  ok('index: B-tree reads 4 pages', (await p.textContent('#ixRowsR'))==='4' && (await p.$$('#ixTree div.on')).length===4);
  ok('index: result message', (await p.textContent('#ixMsg')).includes('2,000 times slower'));
  await p.click('#ixWrite'); ok('index: insert cost shown', (await p.textContent('#ixMsg')).includes('Writes pay'));
  await p.click('#ixRun'); await p.click('.ex-chip[data-ex="http"]'); await p.waitForTimeout(1200);
  ok('index: switching away mid-run causes no errors', errs.length===0, errs.join(' | '));

  // EXPLAINER: docker
  await p.click('.ex-chip[data-ex="docker"]'); await p.waitForTimeout(600);
  ok('docker: starts at ~1.9 GB', (await p.textContent('#slimSize')).includes('1.9 GB'));
  ok('docker: Dockerfile starts single stage', !(await p.textContent('#dockerfile')).includes('AS build'));
  ok('docker: .dockerignore warns it is missing', (await p.textContent('#dockerignore')).includes('missing'));
  ok('docker: pull time 19 s', (await p.textContent('#pullTime'))==='19.0 s', await p.textContent('#pullTime'));
  const size = async () => { await p.waitForTimeout(650); return (await p.textContent('#slimSize')).trim(); };
  await p.click('[data-fix="multi"]'); const s1 = await size(); ok('docker: multi-stage → ~1.3 GB', s1==='~1.3 GB', s1);
  ok('docker: Dockerfile becomes multi-stage', (await p.textContent('#dockerfile')).includes('COPY --from=build'));
  await p.click('[data-fix="alpine"]'); const s2 = await size(); ok('docker: + small base → ~305 MB', s2==='~305 MB', s2);
  ok('docker: Dockerfile uses alpine', (await p.textContent('#dockerfile')).includes('node:20-alpine'));
  const xp1 = await xp();
  await p.click('[data-fix="ignore"]'); const s3 = await size(); ok('docker: all fixes → ~275 MB', s3==='~275 MB', s3);
  ok('docker: .dockerignore lists .env', (await p.textContent('#dockerignore')).includes('.env'));
  ok('docker: pull time drops to under 3 s', /^2\.[78] s$/.test(await p.textContent('#pullTime')), await p.textContent('#pullTime'));
  ok('docker: all fixes gives +20 XP', await xp()===xp1+20, await xp());
  ok('docker: percent shown', (await p.textContent('#pct')).includes('86% smaller'), await p.textContent('#pct'));
  await p.click('[data-fix="ignore"]'); await p.click('[data-fix="ignore"]'); ok('docker: no double XP', await xp()===xp1+20);
  for (const f of ['multi','alpine','ignore']) await p.click(`[data-fix="${f}"]`);
  const s4 = await size(); ok('docker: all off → back to ~1.9 GB', s4==='~1.9 GB', s4);
  await p.click('[data-fix="alpine"]'); const s5 = await size(); ok('docker: small base alone → ~935 MB', s5==='~935 MB', s5);
  await p.click('[data-fix="alpine"]');
  await p.goto(url+'#path'); await p.click('.proj[data-pid="KS-404"]'); await p.click('#dEx'); await p.waitForTimeout(150);
  ok('drawer opens the Caching explainer for KS-404', (await p.getAttribute('.ex-chip[data-ex="cache"]','aria-pressed'))==='true' && await vis('#p-learn'));

  // LAB: cart
  await p.goto(url+'#lab'); await p.click('.task[data-i="0"]'); await p.waitForTimeout(150);
  ok('cart: opens on cart.js (core)', (await p.textContent('#bench .win-bar span')).includes('cart.js'));
  for (const f of ['index.html','products.js','ui.js','cart.test.js']) {
    await p.click(`.tree button[data-file="${f}"]`);
    ok(`cart: ${f} opens read-only`, (await p.getAttribute('#bench textarea.code','readonly'))!==null);
  }
  await p.click('.tree button[data-file="cart.js"]'); ok('cart: cart.js editable', (await p.getAttribute('#bench textarea.code','readonly'))===null);
  await p.click('[data-add="burger"]'); ok('cart preview: starter shows helpful error', (await p.textContent('#pv')).includes('addItem returned undefined'));
  await p.click('#runBtn'); ok('cart: starter fails 0 of 5', (await p.textContent('#results')).includes('0 of 5'));
  ok('cart: TODO chips marked red', (await p.$$('.td.todo')).length===3);
  await p.click('#hintBtn'); ok('cart: hint shows', (await p.textContent('#results')).includes('Hint'));
  const partial = `export function addItem(cart, product) { const f = cart.find(i => i.id === product.id); if (f) { f.qty++; return cart; } return [...cart, { ...product, qty: 1 }]; }
export function removeItem(cart, id) { return cart; }
export function cartTotal(cart) { return 0; }`;
  await p.fill('#bench textarea.code', partial); await p.click('#runBtn');
  ok('cart: partial answer shows TODO 1 done only', (await p.$$('.td.done')).length===1, (await p.$$('.td.done')).length);
  await p.fill('#bench textarea.code', 'export function addItem( {'); await p.click('#runBtn');
  ok('cart: syntax error reported', (await p.textContent('#results')).includes("didn't load"));
  await p.click('#resetCode'); ok('cart: reset restores starter', (await p.inputValue('#bench textarea.code')).includes('TODO 1'));
  const xp2 = await xp();
  await p.fill('#bench textarea.code', `export function addItem(cart, product) { const f = cart.find(i => i.id === product.id); if (f) { f.qty++; return cart; } return [...cart, { ...product, qty: 1 }]; }
export function removeItem(cart, id) { return cart.filter(i => i.id !== id); }
export function cartTotal(cart) { return cart.reduce((t, i) => t + i.price * i.qty, 0); }`);
  await p.click('#runBtn'); ok('cart: correct answer passes 5/5', (await p.textContent('#results')).includes('All 5 passing'));
  ok('cart: +50 XP', await xp()===xp2+50);
  await p.click('[data-add="burger"]'); await p.click('[data-add="fries"]'); await p.click('[data-add="burger"]');
  ok('cart preview: total $29.30', (await p.textContent('.pv-total')).includes('$29.30'), await p.textContent('.pv-total'));
  await p.click('[data-rm="burger"]'); ok('cart preview: remove leaves $3.50', (await p.textContent('.pv-total')).includes('$3.50'));
  await p.click('#runBtn'); ok('cart: rerun no double XP', await xp()===xp2+50);
  await p.click('.tree button[data-file="ui.js"]'); await p.click('.tree button[data-file="cart.js"]');
  ok('cart: draft kept when switching files', (await p.inputValue('#bench textarea.code')).includes('reduce'));
  ok('cart: task shows Shipped', (await p.textContent('.task[data-i="0"]')).includes('Shipped'));

  // LAB: search
  await p.click('.task[data-i="1"]'); await p.waitForTimeout(150);
  await p.type('#pvq','react',{delay:30}); await p.waitForTimeout(450);
  ok('search preview: starter calls API every keystroke', (await p.textContent('#pvC'))==='5', await p.textContent('#pvC'));
  await p.click('#runBtn'); ok('search: starter fails some tests', (await p.textContent('#results')).includes('of 3 passing'));
  await p.fill('#bench textarea.code','export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }');
  const xp3 = await xp(); await p.click('#runBtn');
  ok('search: correct debounce passes 3/3', (await p.textContent('#results')).includes('All 3 passing'));
  ok('search: +120 XP', await xp()===xp3+120);
  await p.type('#pvq','react',{delay:30}); await p.waitForTimeout(450);
  ok('search preview: 1 API call after typing', (await p.textContent('#pvC'))==='1', await p.textContent('#pvC'));
  ok('search preview: shows results', (await p.$$('#pvR li')).length>=2);
  await p.fill('#bench textarea.code','export function debounce(fn, ms) { let t; return (...a) => { t = setTimeout(() => fn(...a), ms); }; }');
  await p.click('#runBtn'); ok('search: debounce without clearTimeout fails', (await p.textContent('#results')).includes('of 3 passing'));

  // LAB: review
  await p.click('.task[data-i="2"]'); await p.waitForTimeout(150);
  await p.click('.dl[data-i="2"]'); await p.click('#subBtn');
  ok('review: 1 of 3 found', (await p.textContent('#results')).includes('1 of 3 found'));
  await p.click('.dl[data-i="2"]'); await p.click('.dl[data-i="5"]'); await p.click('.dl[data-i="7"]'); await p.click('.dl[data-i="8"]'); await p.click('#subBtn');
  ok('review: false alarm caught', (await p.textContent('#results')).includes('lines that are fine'));
  await p.click('.dl[data-i="0"]'); ok('review: context line not flaggable', (await p.textContent('#flagCount'))==='0 lines flagged');
  await p.click('.dl[data-i="2"]'); await p.click('.dl[data-i="2"]'); ok('review: flag toggles off', (await p.textContent('#flagCount'))==='0 lines flagged');
  const xp4 = await xp();
  await p.click('.dl[data-i="2"]'); await p.click('.dl[data-i="5"]'); await p.click('.dl[data-i="7"]'); await p.click('#subBtn');
  ok('review: clean review passes', (await p.textContent('#results')).includes('Clean review'));
  ok('review: +200 XP', await xp()===xp4+200);
  await p.click('#clrBtn'); ok('review: Clear resets', (await p.textContent('#flagCount'))==='0 lines flagged');

  // REFRESHER
  await p.goto(url+'#refresher'); await p.waitForTimeout(150);
  const frameCounts = [4,4,6,4,5,4,4,5,4];
  for (let i=0;i<9;i++){
    await p.click(`.rf-pill[data-i="${i}"]`);
    let n = 1; while (true){ const t = await p.textContent('#rfStep'); const m = t.match(/STEP (\d+) OF (\d+)/); if (+m[1]===+m[2]) break; await p.click('#rfNext'); n++; if (n>10) break; }
    ok(`refresher ${i+1}: steps through ${frameCounts[i]} frames`, n===frameCounts[i], n);
    ok(`refresher ${i+1}: memory panel shows boxes`, (await p.$$('#rfMem .mb')).length>0);
    await p.click('#rfNext'); ok(`refresher ${i+1}: Replay goes back to step 1`, (await p.textContent('#rfStep')).startsWith('STEP 1'));
    await p.click('#rfRun'); ok(`refresher ${i+1}: starter does not pass`, !(await p.textContent('#rfResults')).includes('All correct'));
    await p.fill('#rfEditor', RF_WRONG[i]); await p.click('#rfRun'); ok(`refresher ${i+1}: wrong answer does not pass`, !(await p.textContent('#rfResults')).includes('All correct'));
    const x = await xp();
    await p.fill('#rfEditor', RF_SOL[i]); await p.click('#rfRun');
    ok(`refresher ${i+1}: correct answer passes`, (await p.textContent('#rfResults')).includes('All correct'), await p.textContent('#rfResults'));
    ok(`refresher ${i+1}: +10 XP`, await xp()===x+10);
    if (i<8){ await p.click('#rfGo'); ok(`refresher ${i+1}: Next lesson button`, (await p.textContent('#rfTitle')).startsWith(`${i+2}.`)); }
  }
  ok('refresher: progress says all done', (await p.textContent('#rfProgress')).includes('All 9 done'));
  await p.click('#rfReset'); ok('refresher: Reset restores starter', (await p.inputValue('#rfEditor')).includes('TODO'));

  // TOTAL XP + persistence
  const total = await xp(); ok('total XP is 640 (180 explainers + 370 lab + 90 refresher)', total===640, total);
  await p.reload(); await p.waitForTimeout(300);
  ok('XP survives reload', await xp()===640, await xp());
  await p.goto(url+'#path'); ok('path dots lit after reload', (await p.$$('.dot.on')).length>=3, (await p.$$('.dot.on')).length);
  await p.goto(url+'#lab'); await p.click('.task[data-i="0"]'); ok('lab draft survives reload', (await p.inputValue('#bench textarea.code')).includes('reduce'));
  await p.click('#resetBtn'); await p.waitForTimeout(150); ok('Reset progress sets XP to 0', await xp()===0);
  ok('Reset progress clears lab draft', (await p.inputValue('#bench textarea.code')).includes('TODO 1'));
  await p.goto(url+'#refresher'); ok('Reset progress clears refresher drafts', (await p.inputValue('#rfEditor')).includes('TODO'), (await p.inputValue('#rfEditor')).slice(0,40));
  ok('Reset progress clears refresher dots', (await p.textContent('#rfProgress')).includes('0 of 9'), await p.textContent('#rfProgress'));

  // MOBILE overflow
  await p.setViewportSize({width:390,height:844});
  for (const pg of ['home','refresher','path','learn','lab','about']) {
    await p.goto(url+'#'+pg); await p.waitForTimeout(150);
    const w = await p.evaluate(()=>document.documentElement.scrollWidth); ok(`mobile: no sideways scroll on ${pg}`, w<=390, w);
  }
  for (const id of ['http','git','secrets','threads','docker','cache','queue','index']) {
    await p.goto(url+'#learn'); await p.click(`.ex-chip[data-ex="${id}"]`); await p.waitForTimeout(200);
    const w = await p.evaluate(()=>document.documentElement.scrollWidth); ok(`mobile: ${id} explainer no sideways scroll`, w<=390, w);
  }
  


  // ===== LANGUAGES =====
  await p.setViewportSize({width:1280,height:900});
  await p.goto(url+'#home'); await p.waitForTimeout(200);
  ok('home: 6 language cards', (await p.$$('.lang-card')).length===6);
  ok('home: no language card is disabled', (await p.$$('.lang-card[disabled]')).length===0);
  ok('nav: Java option enabled', !(await p.$eval('#langSel option[value="java"]', o=>o.disabled)));
  const TS = {
    rf:[
`const price: number = 12.90; const qty: number = 2; let total: number = price * qty;`,
`function shippingFor(total: number): number { return total >= 25 ? 0 : 2; }`,
`function countOver(prices: number[], limit: number): number { return prices.filter(p => p > limit).length; }`,
`function greet(name: string): string { return 'Hi, ' + name + '!'; }`,
`interface Item { name: string; price: number; qty: number }\nfunction makeItem(name: string, price: number): Item { return { name, price, qty: 1 }; }`,
`class Counter { count: number = 0; increment(): void { this.count++; } reset(): void { this.count = 0; } }`,
`class BankAccount { #balance: number = 0; deposit(a: number): void { this.#balance += a; } get balance(): number { return this.#balance; } withdraw(a: number): void { if (a > this.#balance) throw new Error('no'); this.#balance -= a; } }`,
`class Animal { constructor(public name: string) {} describe(): string { return this.name + ' is an animal'; } }\nclass Dog extends Animal { constructor(name: string, public breed: string) { super(name); } bark(): string { return this.name + ' says woof'; } }`,
`class Shape { area(): number { return 0; } }\nclass Rect extends Shape { constructor(private w: number, private h: number) { super(); } area(): number { return this.w * this.h; } }\nclass Circle extends Shape { constructor(private r: number) { super(); } area(): number { return Math.PI * this.r * this.r; } }\nfunction totalArea(shapes: Shape[]): number { return shapes.reduce((t, s) => t + s.area(), 0); }`],
    cart:`import type { Product } from "./products";
export interface CartItem extends Product { qty: number }
export function addItem(cart: CartItem[], product: Product): CartItem[] { const f = cart.find(i => i.id === product.id); if (f) { f.qty++; return cart; } return [...cart, { ...product, qty: 1 }]; }
export function removeItem(cart: CartItem[], id: string): CartItem[] { return cart.filter(i => i.id !== id); }
export function cartTotal(cart: CartItem[]): number { return cart.reduce((t, i) => t + i.price * i.qty, 0); }`,
    deb:`export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void { let t: ReturnType<typeof setTimeout> | undefined; return (...a: A) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }`,
    bad:[2,5,7]};
  const PY = {
    rf:[
`price = 12.90\nqty = 2\ntotal = price * qty`,
`def shipping_for(total):\n    return 0 if total >= 25 else 2`,
`def count_over(prices, limit):\n    return len([p for p in prices if p > limit])`,
`def greet(name):\n    return "Hi, " + name + "!"`,
`def make_item(name, price):\n    return {"name": name, "price": price, "qty": 1}`,
`class Counter:\n    def __init__(self):\n        self.count = 0\n    def increment(self):\n        self.count += 1\n    def reset(self):\n        self.count = 0`,
`class BankAccount:\n    def __init__(self):\n        self.__balance = 0\n    def deposit(self, amount):\n        self.__balance += amount\n    @property\n    def balance(self):\n        return self.__balance\n    def withdraw(self, amount):\n        if amount > self.__balance:\n            raise ValueError("no")\n        self.__balance -= amount`,
`class Animal:\n    def __init__(self, name):\n        self.name = name\n    def describe(self):\n        return self.name + " is an animal"\n\nclass Dog(Animal):\n    def __init__(self, name, breed):\n        super().__init__(name)\n        self.breed = breed\n    def bark(self):\n        return self.name + " says woof"`,
`import math\nclass Shape:\n    def area(self):\n        return 0\nclass Rect(Shape):\n    def __init__(self, w, h):\n        self.w, self.h = w, h\n    def area(self):\n        return self.w * self.h\nclass Circle(Shape):\n    def __init__(self, r):\n        self.r = r\n    def area(self):\n        return math.pi * self.r * self.r\ndef total_area(shapes):\n    return sum(s.area() for s in shapes)`],
    cart:`def add_item(cart, product):\n    for item in cart:\n        if item["id"] == product["id"]:\n            item["qty"] += 1\n            return cart\n    cart.append(dict(product, qty=1))\n    return cart\n\ndef remove_item(cart, item_id):\n    return [i for i in cart if i["id"] != item_id]\n\ndef cart_total(cart):\n    return sum(i["price"] * i["qty"] for i in cart)`,
    deb:`from timers import set_timeout, clear_timeout\n\nclass Debouncer:\n    def __init__(self, fn, ms):\n        self.fn = fn\n        self.ms = ms\n        self.timer = None\n\n    def __call__(self, *args):\n        if self.timer is not None:\n            clear_timeout(self.timer)\n        self.timer = set_timeout(lambda: self.fn(*args), self.ms)\n\ndef debounce(fn, ms):\n    return Debouncer(fn, ms)`,
    bad:[4,7,11]};
  const WAIT = async (sel, re, ms=15000) => { const t0 = Date.now(); while (Date.now()-t0 < ms){ const x = await p.textContent(sel); if (re.test(x)) return x; await p.waitForTimeout(100); } return await p.textContent(sel); };
  for (const [lk, D, name] of [['ts', TS, 'TypeScript'], ['py', PY, 'Python']]) {
    await p.goto(url+'#home'); await p.selectOption('#langSel', lk); await p.waitForTimeout(150);
    ok(`${lk}: picker selected`, (await p.inputValue('#langSel'))===lk);
    ok(`${lk}: home card marked selected`, (await p.getAttribute(`.lang-card[data-lang="${lk}"]`,'aria-pressed'))==='true');
    // refresher
    await p.goto(url+'#refresher'); await p.waitForTimeout(150);
    ok(`${lk}: refresher file name`, (await p.textContent('#rfFileName'))==='lesson.'+lk);
    for (let i=0;i<9;i++){
      await p.click(`.rf-pill[data-i="${i}"]`);
      const code = await p.textContent('#rfCode');
      ok(`${lk} refresher ${i+1}: lesson code is ${name}`, lk==='py' ? !/[;{]\s*$/m.test(code) && /(def |class |=)/.test(code) : /: (string|number|boolean|Item|Payment)|abstract|public/.test(code), code.slice(0,80));
      let n=1; while (n<10){ const m=(await p.textContent('#rfStep')).match(/STEP (\d+) OF (\d+)/); if (+m[1]===+m[2]) break; await p.click('#rfNext'); n++; const hiOk = (await p.$$('#rfCode .cl.on')).length>0; if(!hiOk){ ok(`${lk} refresher ${i+1}: highlighted line at step ${n}`, false); } }
      ok(`${lk} refresher ${i+1}: memory boxes render`, (await p.$$('#rfMem .mb')).length>0);
      ok(`${lk} refresher ${i+1}: starter is ${name}`, lk==='py' ? /(def |#|class |price =)/.test(await p.inputValue('#rfEditor')) : /: (number|string|void)|interface/.test(await p.inputValue('#rfEditor')));
      await p.click('#rfRun'); const r0 = await WAIT('#rfResults', /Not yet|✗|All correct/);
      ok(`${lk} refresher ${i+1}: starter does not pass`, !r0.includes('All correct'), r0.slice(0,100));
      const x = await xp();
      await p.fill('#rfEditor', D.rf[i]); await p.click('#rfRun'); const r1 = await WAIT('#rfResults', /All correct|Not yet|✗/);
      ok(`${lk} refresher ${i+1}: correct answer passes`, r1.includes('All correct'), r1.slice(0,200));
      ok(`${lk} refresher ${i+1}: +10 XP`, await xp()===x+10);
    }
    if (lk==='py'){
      await p.click('.rf-pill[data-i="0"]'); await p.fill('#rfEditor','while True:\n    pass'); await p.click('#rfRun');
      const r = await WAIT('#rfResults', /4 seconds|✗/, 9000); ok('py: infinite loop is stopped with a clear message', r.includes('4 seconds'), r);
      await p.fill('#rfEditor','def x(:\n  pass'); await p.click('#rfRun'); const r2 = await WAIT('#rfResults', /SyntaxError|✗/); ok('py: syntax error reported', /SyntaxError/.test(r2), r2);
      await p.click('.rf-pill[data-i="6"]'); await p.waitForTimeout(100); for (let k=0;k<3;k++) await p.click('#rfNext');
      ok('py: memory uses Python names (__balance)', (await p.textContent('#rfMem')).includes('__balance'));
      ok('py: output uses ValueError', (await p.textContent('#rfOut')).includes('ValueError'));
    }
    // lab cart
    await p.goto(url+'#lab'); await p.click('.task[data-i="0"]'); await p.waitForTimeout(200);
    const files = await p.$$eval('#bench .tree button', bs => bs.map(b => b.dataset.file));
    ok(`${lk} cart: files are ${name}`, files.every(f => f==='index.html' || f.endsWith('.'+lk)), files.join(','));
    ok(`${lk} cart: core file open`, (await p.textContent('#bench .win-bar span')).includes('cart.'+lk));
    for (const f of files.filter(f => !f.startsWith('cart.') || f.includes('test'))) { await p.click(`#bench .tree button[data-file="${f}"]`); ok(`${lk} cart: ${f} read-only`, (await p.getAttribute('#bench textarea.code','readonly'))!==null); }
    await p.click(`#bench .tree button[data-file="cart.${lk}"]`);
    await p.waitForTimeout(lk==='py'?1500:800);
    await p.click('[data-add="burger"]'); const pe = await WAIT('#pv', /returned|\?/);
    ok(`${lk} cart preview: starter shows helpful error`, /returned (None|undefined)/.test(pe), pe.slice(0,200));
    await p.click('#runBtn'); const c0 = await WAIT('#results', /passing|didn't load/);
    ok(`${lk} cart: starter fails`, c0.includes('0 of 5'), c0.slice(0,200));
    await p.fill('#bench textarea.code', D.cart); const x2 = await xp(); await p.click('#runBtn');
    const c1 = await WAIT('#results', /passing|didn't load/);
    ok(`${lk} cart: correct core passes 5/5`, c1.includes('All 5 passing'), c1.slice(0,300));
    ok(`${lk} cart: +50 XP`, await xp()===x2+50);
    ok(`${lk} cart: all TODO chips green`, (await p.$$('.td.done')).length===3);
    await p.waitForTimeout(300);
    await p.click('[data-add="burger"]'); await p.waitForTimeout(lk==='py'?400:150); await p.click('[data-add="fries"]'); await p.waitForTimeout(lk==='py'?400:150); await p.click('[data-add="burger"]');
    const tot = await WAIT('.pv-total', /29\.30/, 6000); ok(`${lk} cart preview: total $29.30`, tot.includes('$29.30'), tot);
    await p.click('[data-rm="burger"]'); const tot2 = await WAIT('.pv-total', /3\.50/, 6000); ok(`${lk} cart preview: remove leaves $3.50`, tot2.includes('$3.50'), tot2);
    // drawer ticket lists language files
    await p.goto(url+'#path'); await p.click('.proj[data-pid="KS-101"]'); const tk = await p.textContent('#drawer .win-body');
    ok(`${lk}: project ticket lists ${name} files`, tk.includes('Language: '+name) && tk.includes('cart.'+lk), tk); await p.click('#dClose');
    // lab search
    await p.goto(url+'#lab'); await p.click('.task[data-i="1"]'); await p.waitForTimeout(200);
    await p.click('#runBtn'); const s0 = await WAIT('#results', /passing|didn't load/); ok(`${lk} search: starter fails some tests`, /\d of 3 passing/.test(s0), s0.slice(0,200));
    await p.fill('#bench textarea.code', D.deb); const x3 = await xp(); await p.click('#runBtn');
    const s1 = await WAIT('#results', /passing|didn't load/); ok(`${lk} search: correct debounce passes 3/3`, s1.includes('All 3 passing'), s1.slice(0,300));
    ok(`${lk} search: +120 XP`, await xp()===x3+120);
    await p.waitForTimeout(300);
    if (lk==='py'){ await p.fill('#pvq','react'); await p.click('#pvReplay'); await WAIT('#pvC', /^[1-9]/); }
    else { await p.type('#pvq','react',{delay:30}); await p.waitForTimeout(500); }
    ok(`${lk} search preview: 5 keystrokes, 1 API call`, (await p.textContent('#pvK'))==='5' && (await p.textContent('#pvC'))==='1', (await p.textContent('#pvK'))+'/'+(await p.textContent('#pvC')));
    ok(`${lk} search preview: shows results`, (await p.$$('#pvR li')).length>=2);
    // review
    await p.click('.task[data-i="2"]'); await p.waitForTimeout(150);
    ok(`${lk} review: ${name} file`, (await p.textContent('#bench .win-bar span')).includes('orders.'+lk));
    await p.click(`.dl[data-i="${D.bad[0]}"]`); await p.click('#subBtn'); ok(`${lk} review: partial is 1 of 3`, (await p.textContent('#results')).includes('1 of 3 found'));
    const x4 = await xp(); for (const i of D.bad) await p.click(`.dl[data-i="${i}"]`); await p.click('#subBtn');
    ok(`${lk} review: clean review passes`, (await p.textContent('#results')).includes('Clean review'));
    ok(`${lk} review: +200 XP`, await xp()===x4+200);
    ok(`${lk}: task list says shipped in ${name}`, (await p.textContent('.task[data-i="0"]')).includes('Shipped in '+name));
  }
  ok('XP after TS + Python is 920', await xp()===920, await xp());
  // ===== JAVA, C#, GO (compiled in the browser) =====
  let xpC = await xp();
  const COMPILED_LANGS = [['java','Java'],['cs','C#'],['go','Go']].filter(([k]) => !process.env.SIM_LANGS || process.env.SIM_LANGS.split(',').includes(k));
  for (const [lk, name] of COMPILED_LANGS) {
    const T0 = Date.now();
    await p.goto(url+'#home'); await p.selectOption('#langSel', lk); await p.waitForTimeout(150);
    ok(`${lk}: picker selected`, (await p.inputValue('#langSel'))===lk);
    const P = await p.evaluate(k => { const P = window.KS.PACKS[k]; return {rf: Object.fromEntries(Object.entries(P.rf).map(([id,r]) => [id, {code:r.code, n:r.frames.length, solution:r.solution}])), labs: Object.fromEntries(Object.entries(P.labs).map(([id,l]) => [id, {core:l.core, files:(l.files||[]).map(f=>f[0]), solution:l.solution, bad:(l.diff||[]).map((d,i)=>d[2]?i:-1).filter(i=>i>=0), file:l.file}]))}; }, lk);
    // refresher
    await p.goto(url+'#refresher'); await p.waitForTimeout(150);
    ok(`${lk}: refresher file name`, (await p.textContent('#rfFileName'))==='lesson.'+lk);
    for (let i=0;i<9;i++){
      const id = 'RF-'+(i+1), R = P.rf[id];
      await p.click(`.rf-pill[data-i="${i}"]`); await p.waitForTimeout(80);
      const lines = await p.$$eval('#rfCode .cl', ls => ls.length);
      ok(`${lk} refresher ${i+1}: lesson code is the ${name} version`, lines===R.code.length, lines+' vs '+R.code.length);
      let n=1, hiMissing=0; while (n<12){ const m=(await p.textContent('#rfStep')).match(/STEP (\d+) OF (\d+)/); if (+m[1]===+m[2]) break; await p.click('#rfNext'); n++; if ((await p.$$('#rfCode .cl.on')).length===0) hiMissing++; }
      ok(`${lk} refresher ${i+1}: every step highlights a line`, hiMissing===0, hiMissing);
      ok(`${lk} refresher ${i+1}: memory boxes render`, (await p.$$('#rfMem .mb')).length>0);
      await p.click('#rfRun'); const r0 = await WAIT('#rfResults', /Not yet|✗|All correct/, 90000);
      ok(`${lk} refresher ${i+1}: starter does not pass`, !r0.includes('All correct') && !/didn't|Nothing ran/.test(r0), r0.slice(0,160));
      const x = await xp();
      await p.fill('#rfEditor', R.solution); await p.click('#rfRun'); const r1 = await WAIT('#rfResults', /All correct|Not yet|✗/, 90000);
      ok(`${lk} refresher ${i+1}: correct answer passes`, r1.includes('All correct'), r1.slice(0,200));
      ok(`${lk} refresher ${i+1}: +10 XP`, await xp()===x+10);
    }
    // lab cart
    const C = P.labs['KS-101'];
    await p.goto(url+'#lab'); await p.click('.task[data-i="0"]'); await p.waitForTimeout(200);
    const files = await p.$$eval('#bench .tree button', bs => bs.map(b => b.dataset.file));
    ok(`${lk} cart: files match the ${name} pack`, files.join(',')===C.files.join(','), files.join(','));
    ok(`${lk} cart: core file open`, (await p.textContent('#bench .win-bar span')).includes(C.core));
    await p.click('#runBtn'); const c0 = await WAIT('#results', /passing|didn't load/, 90000);
    ok(`${lk} cart: starter fails`, /\d of 5 passing/.test(c0) && !c0.includes('All 5'), c0.slice(0,200));
    await p.fill('#bench textarea.code', C.solution); const x2 = await xp(); await p.click('#runBtn');
    const c1 = await WAIT('#results', /passing|didn't load/, 90000);
    ok(`${lk} cart: correct core passes 5/5`, c1.includes('All 5 passing'), c1.slice(0,300));
    ok(`${lk} cart: +50 XP`, await xp()===x2+50);
    ok(`${lk} cart: all TODO chips green`, (await p.$$('.td.done')).length===3);
    await WAIT('#pv', /Checkout/, 60000);
    await p.click('[data-add="burger"]'); await WAIT('.pv-total', /12\.90/, 60000);
    await p.click('[data-add="fries"]'); await WAIT('.pv-total', /16\.40/, 60000);
    await p.click('[data-add="burger"]');
    const tot = await WAIT('.pv-total', /29\.30/, 60000); ok(`${lk} cart preview: total $29.30`, tot.includes('$29.30'), tot);
    await p.click('[data-rm="burger"]'); const tot2 = await WAIT('.pv-total', /3\.50/, 60000); ok(`${lk} cart preview: remove leaves $3.50`, tot2.includes('$3.50'), tot2);
    // lab search
    const D = P.labs['KS-301'];
    await p.click('.task[data-i="1"]'); await p.waitForTimeout(200);
    await p.click('#runBtn'); const s0 = await WAIT('#results', /passing|didn't load/, 90000); ok(`${lk} search: starter fails some tests`, /\d of 3 passing/.test(s0) && !s0.includes('All 3'), s0.slice(0,200));
    await p.fill('#bench textarea.code', D.solution); const x3 = await xp(); await p.click('#runBtn');
    const s1 = await WAIT('#results', /passing|didn't load/, 90000); ok(`${lk} search: correct debounce passes 3/3`, s1.includes('All 3 passing'), s1.slice(0,300));
    ok(`${lk} search: +120 XP`, await xp()===x3+120);
    await p.fill('#pvq','react'); await p.click('#pvReplay'); await WAIT('#pvC', /^[1-9]/, 60000);
    ok(`${lk} search preview: 5 keystrokes, 1 API call`, (await p.textContent('#pvK'))==='5' && (await p.textContent('#pvC'))==='1', (await p.textContent('#pvK'))+'/'+(await p.textContent('#pvC')));
    ok(`${lk} search preview: shows results`, (await p.$$('#pvR li')).length>=2);
    // review
    const V = P.labs['KS-401'];
    await p.click('.task[data-i="2"]'); await p.waitForTimeout(150);
    ok(`${lk} review: ${name} file`, (await p.textContent('#bench .win-bar span')).includes(V.file));
    ok(`${lk} review: exactly 3 bad lines`, V.bad.length===3, V.bad.join(','));
    const x4 = await xp(); for (const i of V.bad) await p.click(`.dl[data-i="${i}"]`); await p.click('#subBtn');
    ok(`${lk} review: clean review passes`, (await p.textContent('#results')).includes('Clean review'));
    ok(`${lk} review: +200 XP`, await xp()===x4+200);
    ok(`${lk}: task list says shipped in ${name}`, (await p.textContent('.task[data-i="0"]')).includes('Shipped in '+name));
    console.log(`${name} phase took ${Math.round((Date.now()-T0)/1000)} s`);
  }
  ok(`XP after ${COMPILED_LANGS.length} compiled languages is +${460*COMPILED_LANGS.length}`, await xp()===xpC+460*COMPILED_LANGS.length, (await xp())-xpC);
  await p.selectOption('#langSel','js'); await p.goto(url+'#lab'); await p.click('.task[data-i="0"]');
  ok('back to JS: JS files return', (await p.textContent('#bench .win-bar span')).includes('cart.js'));
  ok('back to JS: JS not marked shipped after reset', !(await p.textContent('.task[data-i="0"]')).includes('Shipped'));
  await p.reload(); await p.waitForTimeout(300); await p.selectOption('#langSel','py'); await p.waitForTimeout(100); await p.reload(); await p.waitForTimeout(300);
  ok('language choice survives reload', (await p.inputValue('#langSel'))==='py');
  await p.goto(url+'#refresher'); ok('python refresher progress kept after reload', (await p.textContent('#rfProgress')).includes('All 9 done in Python'), await p.textContent('#rfProgress'));
  await p.goto(url+'#path'); ok('path shows shipped from other languages', (await p.$$('.dot.on')).length>=3);
  await p.setViewportSize({width:390,height:844}); await p.goto(url+'#home'); await p.waitForTimeout(150);
  ok('mobile: home with language cards fits', await p.evaluate(()=>document.documentElement.scrollWidth)<=390, await p.evaluate(()=>document.documentElement.scrollWidth));
  await p.goto(url+'#lab'); await p.waitForTimeout(150); ok('mobile: python lab fits', await p.evaluate(()=>document.documentElement.scrollWidth)<=390);

  ok('no script errors', errs.length===0, errs.join(' | '));
  const fails = results.filter(r=>r[0]==='FAIL');
  console.log(`${results.length} checks, ${results.length-fails.length} passed, ${fails.length} failed`);
  fails.forEach(f=>console.log('FAIL', f[1], '→', f[2]));
  require('fs').writeFileSync(path.join(ROOT, 'tests', 'sim-results.txt'), results.map(r=>r.join(' | ')).join('\n'));
  await b.close();
})().catch(e=>{console.error('CRASH', e.message); require('fs').writeFileSync(require('path').join(ROOT, 'tests', 'sim-results.txt'), results.map(r=>r.join(' | ')).join('\n') + '\nCRASH | ' + e.message); process.exit(1);});
