// ArcProof UI review harness: screenshots + a11y/layout metrics over Chrome DevTools Protocol.
// Node 22 (global WebSocket). No dependencies. Read-only against the app: it only loads pages
// served from 127.0.0.1 and BLOCKS every other origin except Google Fonts (RPC calls would be
// blocked and logged). Chrome must already be running with --remote-debugging-port=9333.
//
// Usage:
//   node shoot.mjs --tag before                       # all screens x (375,768,1440)
//   node shoot.mjs --tag after --only landing,demo-receipt --widths 375,1440
//   node shoot.mjs --tag after --no-focus             # skip the Tab-through audit
// Env: CDP_PORT (9333) TESTNET_URL (http://127.0.0.1:4180/) MAINNET_URL (http://127.0.0.1:4181/)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i < 0 ? dflt : (args[i + 1] ?? true); };
const TAG = opt('tag', 'before');
const OUT = opt('out', join(HERE, 'shots'));
const WIDTHS = String(opt('widths', '375,768,1440')).split(',').map(Number);
const HEIGHTS = { 375: 812, 768: 1024, 1440: 900 };
const ONLY = opt('only', null)?.split(',') ?? null;
const NO_FOCUS = args.includes('--no-focus');
const PORT = Number(process.env.CDP_PORT ?? 9333);
const T = process.env.TESTNET_URL ?? 'http://127.0.0.1:4180/';
const M = process.env.MAINNET_URL ?? 'http://127.0.0.1:4181/';
// Optional 3rd server: the canned-verification HARNESS build (see harness/). Skipped when unreachable.
const H = process.env.HARNESS_URL ?? 'http://127.0.0.1:4182/';
const ALLOWED_HOSTS = new Set([new URL(T).host, new URL(M).host, new URL(H).host, 'fonts.googleapis.com', 'fonts.gstatic.com']);
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- CDP client ----------
async function openPage() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = () => bad(new Error('ws error')); });
  let id = 0; const pending = new Map(); const listeners = [];
  const blocked = []; const consoleLog = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { ok, bad } = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) bad(new Error(`${msg.error.message}`)); else ok(msg.result);
    } else if (msg.method) {
      if (msg.method === 'Fetch.requestPaused') {
        const { requestId, request } = msg.params;
        let allow = false;
        try { const u = new URL(request.url); allow = ['data:', 'blob:', 'about:'].includes(u.protocol) || ALLOWED_HOSTS.has(u.host); } catch { allow = false; }
        if (!allow) blocked.push(request.url);
        send(allow ? 'Fetch.continueRequest' : 'Fetch.failRequest', allow ? { requestId } : { requestId, errorReason: 'BlockedByClient' }).catch(() => {});
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        consoleLog.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200)}`);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        consoleLog.push(`exception: ${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description?.slice(0, 200) ?? ''}`);
      } else if (msg.method === 'Log.entryAdded') {
        consoleLog.push(`log.${msg.params.entry.level}: ${msg.params.entry.text.slice(0, 160)} ${msg.params.entry.url ?? ''}`);
      }
      for (const l of listeners.slice()) if (l.method === msg.method) l.fn(msg.params);
    }
  };
  const send = (method, params = {}) => new Promise((ok, bad) => { const i = ++id; pending.set(i, { ok, bad }); ws.send(JSON.stringify({ id: i, method, params })); });
  const once = (method, timeout = 15000) => new Promise((ok, bad) => {
    const l = { method, fn: (p) => { listeners.splice(listeners.indexOf(l), 1); clearTimeout(t); ok(p); } };
    const t = setTimeout(() => { listeners.splice(listeners.indexOf(l), 1); bad(new Error(`timeout waiting ${method}`)); }, timeout);
    listeners.push(l);
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const page = {
    send, blocked, consoleLog, targetId: target.id,
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(`eval failed: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
      return r.result.value;
    },
    async viewport(width, height) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    },
    async goto(url) {
      await send('Page.navigate', { url: 'about:blank' }); await sleep(100);
      const loaded = once('Page.loadEventFired', 20000);
      await send('Page.navigate', { url });
      await loaded;
      await page.eval(`new Promise((ok) => { const t0 = Date.now(); (function w() { if (document.querySelector('#root')?.children.length || Date.now() - t0 > 8000) ok(); else setTimeout(w, 50); })(); })`);
      await page.eval('document.fonts.ready.then(() => true)');
      await sleep(500);
    },
    async mouseClickAt(x, y) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    },
    async clickText(text, selector = 'button,a') {
      const pt = await page.eval(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => (e.textContent || '').trim().startsWith(${JSON.stringify(text)})); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      if (!pt) throw new Error(`clickText: no element starting with "${text}"`);
      await sleep(100); await page.mouseClickAt(pt.x, pt.y); await sleep(300);
    },
    async typeInto(selector, text) {
      const ok = await page.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.focus(); el.select(); return true; })()`);
      if (!ok) throw new Error(`typeInto: no element ${selector}`);
      await send('Input.insertText', { text }); await sleep(200);
    },
    async key(key, code, vk, modifiers = 0) {
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, modifiers });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, modifiers });
    },
    async shot(file, { full = true } = {}) {
      const params = { format: 'png' };
      if (full) {
        const m = await send('Page.getLayoutMetrics');
        const w = Math.ceil(m.cssContentSize.width), h = Math.min(Math.ceil(m.cssContentSize.height), 16000);
        Object.assign(params, { captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
      }
      const r = await send('Page.captureScreenshot', params);
      writeFileSync(file, Buffer.from(r.data, 'base64'));
    },
    async close() { try { ws.close(); await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`); } catch {} },
  };
  return page;
}

// ---------- in-page audit (serialised via toString; must be self-contained) ----------
function audit() {
  const vw = innerWidth, vh = innerHeight; const out = {};
  const se = document.scrollingElement;
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const sel = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; else if (typeof el.className === 'string' && el.className.trim()) s += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.'); return s; };
  const txt = (el, n = 50) => ((el.innerText || el.value || el.getAttribute('aria-label') || el.textContent || '') + '').replace(/\s+/g, ' ').trim().slice(0, n);
  const r1 = (n) => Math.round(n * 10) / 10;
  out.page = {
    title: document.title, lang: document.documentElement.lang,
    viewportMeta: document.querySelector('meta[name=viewport]')?.content ?? null,
    h1Count: document.querySelectorAll('h1').length,
    landmarks: Object.fromEntries(['header', 'nav', 'main', 'footer', 'aside'].map((t) => [t, document.querySelectorAll(t).length])),
    skipLink: !!document.querySelector('a.skip-link, a[href="#main-content"]'),
    hash: location.hash, bodyFont: getComputedStyle(document.body).fontFamily,
    fontsLoaded: ['DM Sans', 'Space Grotesk', 'JetBrains Mono'].map((f) => `${f}:${document.fonts.check(`16px "${f}"`)}`),
  };
  out.overflow = { innerWidth: vw, scrollWidth: se.scrollWidth, overflowX: se.scrollWidth > vw, pageHeight: se.scrollHeight };
  out.overflow.offenders = [...document.querySelectorAll('body *')].filter((e) => vis(e) && e.getBoundingClientRect().right > vw + 1)
    .slice(0, 8).map((e) => ({ el: sel(e), text: txt(e, 30), right: r1(e.getBoundingClientRect().right), width: r1(e.getBoundingClientRect().width) }));
  // headings
  const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')].filter(vis).map((h) => ({ level: Number(h.tagName[1]) || Number(h.getAttribute('aria-level')) || 2, text: txt(h, 70), y: Math.round(h.getBoundingClientRect().top + scrollY) }));
  out.headings = heads;
  out.headingProblems = [];
  heads.forEach((h, i) => { const prev = i ? heads[i - 1].level : 0; if (h.level > prev + 1) out.headingProblems.push(`skip h${prev}->h${h.level}: ${h.text}`); });
  // form fields
  out.fields = [...document.querySelectorAll('input,select,textarea')].filter((e) => e.type !== 'hidden' && vis(e)).map((e) => {
    let name = e.getAttribute('aria-label') || '';
    const lb = e.getAttribute('aria-labelledby'); if (!name && lb) name = lb.split(' ').map((i) => document.getElementById(i)?.textContent ?? '').join(' ');
    if (!name && e.id) name = document.querySelector(`label[for="${CSS.escape(e.id)}"]`)?.textContent ?? '';
    if (!name) name = e.closest('label')?.textContent ?? '';
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { el: sel(e), type: e.type, label: name.replace(/\s+/g, ' ').trim().slice(0, 70) || 'MISSING', describedby: e.getAttribute('aria-describedby'), autocomplete: e.getAttribute('autocomplete'), inputmode: e.inputMode || null, fontPx: parseFloat(cs.fontSize), w: Math.round(r.width), h: Math.round(r.height), disabled: e.disabled };
  });
  // tap targets
  out.targets = [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[tabindex]:not([tabindex="-1"])')].filter(vis).map((e) => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { el: sel(e), text: txt(e, 36), w: Math.round(r.width), h: Math.round(r.height), inline: cs.display === 'inline', disabled: !!e.disabled };
  });
  out.smallTargets = out.targets.filter((t) => (t.w < 44 || t.h < 44) && !t.inline);
  out.tinyTargets = out.targets.filter((t) => (t.w < 24 || t.h < 24) && !t.inline);
  // contrast + font sizes
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const effBg = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) layers.push(c); } let base = { r: 255, g: 255, b: 255, a: 1 }; for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base); return base; };
  const effOpacity = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const seen = new Set(); const rows = []; let chars = 0, charsLE12 = 0, charsLT14 = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    const t = n.textContent.replace(/\s+/g, ' ').trim(); const el = n.parentElement;
    if (!t || !el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName) || !vis(el)) continue;
    const cs = getComputedStyle(el); const px = parseFloat(cs.fontSize); chars += t.length; if (px <= 12) charsLE12 += t.length; if (px < 14) charsLT14 += t.length;
    if (seen.has(el)) continue; seen.add(el);
    const fg0 = parse(cs.color); if (!fg0) continue; const bg = effBg(el); const op = effOpacity(el);
    const fg = over({ ...fg0, a: fg0.a * op }, bg); const bold = parseInt(cs.fontWeight) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const disabled = !!el.closest('[disabled],:disabled');
    rows.push({ el: sel(el), text: t.slice(0, 44), ratio: r1(ratio(fg, bg)), need: large ? 3 : 4.5, px, disabled, fg: `rgb(${fg0.r},${fg0.g},${fg0.b})@${r1(op)}`, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` });
  }
  out.fontSizes = { chars, pctLE12px: r1((charsLE12 / chars) * 100), pctLT14px: r1((charsLT14 / chars) * 100) };
  out.contrastFails = rows.filter((r) => r.ratio < r.need).sort((a, b) => a.ratio - b.ratio).slice(0, 12);
  out.contrastLowestPassing = rows.filter((r) => r.ratio >= r.need).sort((a, b) => a.ratio - b.ratio).slice(0, 5);
  out.placeholderContrast = [...document.querySelectorAll('input[placeholder]')].filter(vis).map((e) => ({ el: sel(e), placeholder: e.placeholder, ratioVsDefault757575: r1(ratio({ r: 117, g: 117, b: 117, a: 1 }, effBg(e))) }));
  // long hashes / addresses
  const hashRe = /0x[0-9a-fA-F]{20,}/;
  out.hashes = [...document.querySelectorAll('body *')].filter((e) => vis(e) && [...e.childNodes].some((c) => c.nodeType === 3 && hashRe.test(c.textContent))).slice(0, 12).map((e) => {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); const lh = parseFloat(cs.lineHeight) || 16;
    return { el: sel(e), len: e.textContent.length, w: Math.round(r.width), clientW: e.clientWidth, scrollW: e.scrollWidth, lines: Math.round(r.height / lh), ws: cs.whiteSpace, ow: cs.overflowWrap, wb: cs.wordBreak, textOverflow: cs.textOverflow, clippedByEllipsis: cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1, pastViewport: r.right > vw + 1, fontPx: parseFloat(cs.fontSize) };
  });
  // status / alert regions
  out.liveRegions = [...document.querySelectorAll('[role=alert],[role=status],[aria-live]')].map((e) => ({ role: e.getAttribute('role') || 'aria-live', text: txt(e, 60) }));
  // above the fold
  const first = [...document.querySelectorAll('button,a')].find((e) => vis(e) && /bg-teal-700|bg-teal-600/.test(e.className));
  const rg = document.createRange(); let wordsFold = 0, wordsAll = 0;
  const w2 = document.createTreeWalker(document.querySelector('#root') ?? document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w2.nextNode());) { const t = n.textContent.trim(); if (!t || !n.parentElement || !vis(n.parentElement)) continue; const cnt = t.split(/\s+/).length; wordsAll += cnt; rg.selectNodeContents(n); const b = rg.getBoundingClientRect(); if (b.top < vh) wordsFold += cnt; }
  out.fold = { vh, wordsAboveFold: wordsFold, wordsTotal: wordsAll, primaryButton: first ? { text: txt(first, 40), top: Math.round(first.getBoundingClientRect().top), bottom: Math.round(first.getBoundingClientRect().bottom), disabled: !!first.disabled, aboveFold: first.getBoundingClientRect().bottom <= vh } : null,
    bannerText: txt(document.querySelector('body > #root > div > div:first-of-type') ?? document.body, 140), firstH2: txt(document.querySelector('h2') ?? document.body, 80), firstH2Top: Math.round(document.querySelector('h2')?.getBoundingClientRect().top ?? -1) };
  out.docTitleIsRouteSpecific = document.title;
  out.activeElement = document.activeElement ? sel(document.activeElement) + ' ' + txt(document.activeElement, 24) : null;
  return out;
}

// Describe the focused element + its focus indicator (run in-page).
function describeFocus() {
  const el = document.activeElement; if (!el || el === document.body) return null;
  const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
  const ow = parseFloat(cs.outlineWidth); const hasOutline = cs.outlineStyle !== 'none' && ow > 0 && cs.outlineColor !== 'rgba(0, 0, 0, 0)';
  const hasShadow = cs.boxShadow && cs.boxShadow !== 'none';
  return { tag: el.tagName.toLowerCase(), id: el.id || null, text: ((el.innerText || el.value || el.getAttribute('aria-label') || '') + '').replace(/\s+/g, ' ').trim().slice(0, 36), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
    outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} off ${cs.outlineOffset}`, boxShadow: hasShadow ? cs.boxShadow.slice(0, 80) : null,
    hasOutline, hasShadow, indicatorVisible: !!(hasOutline || hasShadow), focusVisible: el.matches(':focus-visible'), inViewport: r.top >= 0 && r.bottom <= innerHeight };
}

// ---------- screens ----------
const SCREENS = [
  { name: 'landing', net: 'testnet', url: T, note: 'default route "/" (renders Verify receipt)' },
  { name: 'invoices', net: 'testnet', url: T + '#/invoices', note: 'merchant create-invoice screen, no wallet connected' },
  { name: 'demo-initial', net: 'testnet', url: T + '#/demo', note: 'offline demo, empty form' },
  { name: 'demo-invalid-amount', net: 'testnet', url: T + '#/demo', note: 'offline demo, amount "1.5555555" typed', steps: async (p) => { await p.typeInto('#invoice-amount', '1.5555555'); } },
  { name: 'demo-created', net: 'testnet', url: T + '#/demo', note: 'offline demo after Create invoice (history row, no receipt open)', steps: async (p) => { await p.clickText('Create invoice (offline demo'); } },
  { name: 'demo-receipt', net: 'testnet', url: T + '#/demo', note: 'offline demo: created invoice -> simulated receipt open', steps: async (p) => { await p.clickText('Create invoice (offline demo'); await p.clickText('View simulated receipt'); } },
  { name: 'verify-invalid', net: 'testnet', url: T + '#/verify', note: 'Verify receipt with invalid id "0x1234" submitted (read-only, rejected before any RPC)', steps: async (p) => { await p.typeInto('#live-receipt-id', '0x1234'); await p.clickText('Verify from chain data'); await sleep(300); } },
  { name: 'receipt-link-invalid', net: 'testnet', url: T + '#/receipt/5042002/bad-deployment/0x1234', note: 'malformed receipt deep link -> Request unavailable' },
  { name: 'route-unknown', net: 'testnet', url: T + '#/nope', note: 'unknown hash route' },
  { name: 'evidence', net: 'testnet', url: T + '#/evidence', note: 'Evidence page' },
  { name: 'mainnet-landing', net: 'mainnet', url: M, note: 'mainnet build default route -> Mainnet unavailable' },
  { name: 'mainnet-demo', net: 'mainnet', url: M + '#/demo', note: 'mainnet build, offline demo' },
  { name: 'mainnet-evidence', net: 'mainnet', url: M + '#/evidence', note: 'mainnet build, evidence' },
  // HARNESS screens: real receipt UI fed by a canned verifier (no RPC). Needs the harness server on :4182.
  ...['verified', 'incomplete', 'mismatch', 'selfdemo'].map((state) => ({ name: `receipt-${state}`, net: 'harness', harness: true,
    url: `${H}?state=${state}#/receipt/5042002/0xdba9a4da8a5b2a834b451f595653dd3cb4c3e51addb2d8df8e0b18312f382d2d/0x52599e566fb42fb089c45b92b3e755a17101ca986c3f4cd947482421cf748d83?tx=0x9f2c41d7a8e03b65c1d4f7a92be8036d5a1c7e49b02f8d63a5c1e7094b3d2a68`,
    note: `REAL TestnetReceiptScreen + ReceiptFacts with a canned '${state}' verification result (harness, no RPC)` })),
];

async function tabThrough(page, url, vp, label, max = 28) {
  await page.viewport(vp, HEIGHTS[vp]); await page.goto(url);
  const stops = []; const wanted = new Set(['invoice-amount', 'live-receipt-id', 'testnet-amount']);
  for (let i = 0; i < max; i++) {
    await page.key('Tab', 'Tab', 9); await sleep(80);
    const d = await page.eval(`(${describeFocus.toString()})()`);
    if (!d) break;
    if (stops.length > 1 && stops[0].tag === d.tag && stops[0].text === d.text && stops[0].id === d.id) break; // wrapped around
    stops.push(d);
    if (d.id && wanted.has(d.id)) await page.shot(join(OUT, `${TAG}-focus-${label}-${d.id}-${vp}.png`), { full: false });
    if (i === 1) await page.shot(join(OUT, `${TAG}-focus-${label}-nav1-${vp}.png`), { full: false });
  }
  return stops;
}

const results = { tag: TAG, when: new Date().toISOString(), screens: {}, focus: {}, blockedExternalRequests: [] };
const page = await openPage();
try {
  const harnessUp = await fetch(H).then((r) => r.ok).catch(() => false);
  for (const s of SCREENS) {
    if (ONLY && !ONLY.includes(s.name)) continue;
    if (s.harness && !harnessUp) { console.log(`skip ${s.name}: harness server ${H} not reachable`); continue; }
    for (const w of WIDTHS) {
      const h = HEIGHTS[w] ?? 900;
      await page.viewport(w, h); page.consoleLog.length = 0;
      await page.goto(s.url);
      if (s.steps) await s.steps(page);
      await sleep(300);
      const key = `${s.name}@${w}`;
      const metrics = await page.eval(`(${audit.toString()})()`);
      metrics.console = page.consoleLog.slice(0, 8);
      results.screens[key] = { note: s.note, url: s.url, ...metrics };
      const base = join(OUT, `${TAG}-${s.name.startsWith(s.net) ? '' : s.net + '-'}${s.name}-${w}`);
      await page.shot(`${base}-full.png`, { full: true });
      if (['landing', 'mainnet-landing', 'demo-initial', 'evidence', 'receipt-verified'].includes(s.name)) { await page.eval('window.scrollTo(0,0)'); await page.shot(`${base}-fold.png`, { full: false }); }
      console.log(`${key}: overflowX=${metrics.overflow.overflowX} (${metrics.overflow.scrollWidth}/${metrics.overflow.innerWidth}) small<44=${metrics.smallTargets.length} contrastFails=${metrics.contrastFails.length} headingProblems=${metrics.headingProblems.length}`);
    }
  }
  if (!NO_FOCUS && (!ONLY || ONLY.includes('focus'))) {
    for (const [label, url] of [['landing', T], ['demo', T + '#/demo'], ['invoices', T + '#/invoices'], ['mainnet', M]]) {
      for (const vp of WIDTHS.filter((v) => v === 375 || v === 1440)) {
        results.focus[`${label}@${vp}`] = await tabThrough(page, url, vp, label);
      }
    }
  }
  // Keyboard/route behaviour: does focus move or the title change on SPA navigation?
  if (!ONLY || ONLY.includes('routing')) {
    await page.viewport(1440, 900); await page.goto(T);
    const before = await page.eval('({title: document.title, active: document.activeElement?.tagName})');
    await page.clickText('Evidence', 'nav button'); await sleep(300);
    const after = await page.eval('({title: document.title, active: document.activeElement?.tagName + " " + (document.activeElement?.textContent||"").trim().slice(0,20), h2: document.querySelector("h2")?.textContent, hash: location.hash})');
    results.routing = { before, after };
  }
  results.blockedExternalRequests = [...new Set(page.blocked)];
} finally {
  const metricsFile = join(OUT, `${TAG}-metrics${ONLY ? '-' + ONLY.join('+').slice(0, 60) : ''}.json`);
  writeFileSync(metricsFile, JSON.stringify(results, null, 1));
  await page.close();
}
console.log(`done -> ${OUT}/${TAG}-metrics*.json ; blocked external requests: ${results.blockedExternalRequests.length}`);
for (const u of results.blockedExternalRequests) console.log('  BLOCKED', u);
