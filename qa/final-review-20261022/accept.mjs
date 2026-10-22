// Real-browser acceptance for ArcProof (sandboxed Chrome as user "ubuntu", localhost only).
// Every request to a non-localhost origin is FAILED and recorded, so no RPC/wallet traffic can leave.
// Usage: node accept.mjs <outDir> <downloadDir>   (env CDP_PORT, TESTNET_URL, MAINNET_URL)
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [OUT, DL] = process.argv.slice(2);
const PORT = Number(process.env.CDP_PORT ?? 9334);
const T = process.env.TESTNET_URL ?? 'http://127.0.0.1:4190/';
const M = process.env.MAINNET_URL ?? 'http://127.0.0.1:4191/';
const DEP = '0xdba9a4da8a5b2a834b451f595653dd3cb4c3e51addb2d8df8e0b18312f382d2d';
const ID = '0x' + 'a'.repeat(64), TX = '0x' + 'b'.repeat(64);
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function record(id, pass, detail) { results.push({ id, status: pass ? 'PASS' : 'FAIL', detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id} ${JSON.stringify(detail).slice(0, 300)}`); }

const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok) => { ws.onopen = ok; });
let seq = 0; const pending = new Map(); const external = []; const exceptions = []; const listeners = [];
const send = (method, params = {}) => new Promise((ok, bad) => { const i = ++seq; pending.set(i, { ok, bad }); ws.send(JSON.stringify({ id: i, method, params })); });
ws.onmessage = (event) => {
  const m = JSON.parse(event.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p.bad(new Error(m.error.message)); else p.ok(m.result); return; }
  if (m.method === 'Fetch.requestPaused') {
    const u = new URL(m.params.request.url); const local = u.hostname === '127.0.0.1' || ['data:', 'blob:'].includes(u.protocol);
    if (!local) external.push(m.params.request.url);
    send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId: m.params.requestId } : { requestId: m.params.requestId, errorReason: 'BlockedByClient' }).catch(() => {});
  }
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.exception?.description?.slice(0, 160) ?? m.params.exceptionDetails.text);
  for (const l of listeners.slice()) if (l.method === m.method) l.fn(m.params);
};
const once = (method, timeout = 15000) => new Promise((ok, bad) => { const l = { method, fn: (p) => { listeners.splice(listeners.indexOf(l), 1); clearTimeout(t); ok(p); } }; const t = setTimeout(() => { listeners.splice(listeners.indexOf(l), 1); bad(new Error('timeout ' + method)); }, timeout); listeners.push(l); });
const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
async function viewport(width, height, scale = 1) { await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: width < 600 }); }
async function goto(url) {
  await send('Page.navigate', { url: 'about:blank' }); await sleep(100);
  const loaded = once('Page.loadEventFired', 20000); await send('Page.navigate', { url }); await loaded;
  await evaluate(`new Promise((ok) => { const t0 = Date.now(); (function w() { if (document.querySelector('#root')?.children.length || Date.now() - t0 > 8000) ok(); else setTimeout(w, 50); })(); })`);
  await sleep(300);
}
async function key(k, code, vk) { await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk }); if (k === 'Enter') await send('Input.dispatchKeyEvent', { type: 'char', text: '\r', key: 'Enter' }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }); await sleep(120); }
const tab = () => key('Tab', 'Tab', 9);
const enter = () => key('Enter', 'Enter', 13);
async function shot(name) { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64')); }
async function clickText(text, selector = 'button,a') {
  const pt = await evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => (e.textContent || '').trim().startsWith(${JSON.stringify(text)})); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  if (!pt) throw new Error('no element ' + text);
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  await sleep(300);
}
async function typeInto(selector, text) { await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); el.select(); })()`); await send('Input.insertText', { text }); await sleep(200); }
const text = () => evaluate('document.body.innerText');
const overflow = () => evaluate('({ sw: document.scrollingElement.scrollWidth, iw: innerWidth })');

await send('Page.enable'); await send('Runtime.enable');
await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL, eventsEnabled: true });
await send('Emulation.setFocusEmulationEnabled', { enabled: true });

try {
  // A1 first visit: purpose, network and main action without a wallet.
  await viewport(1440, 900); await goto(T);
  const home = await evaluate(`({ h2: document.querySelector('main h2')?.textContent, current: document.querySelector('nav [aria-current=page]')?.textContent, cta: [...document.querySelectorAll('main a')].slice(0, 2).map(a => [a.textContent.trim(), a.getAttribute('href')]), wallet: /connect wallet/i.test(document.body.innerText), banner: document.body.innerText.split('\\n')[0] })`);
  record('A1-home-first-view', home.h2?.includes('verify it from one link') && home.current === 'Overview' && home.cta[0][1] === '#/demo' && !home.wallet, home);
  await shot('A1-home-1440.png');

  // A2 keyboard: skip link, then reach and activate the primary call to action.
  await goto(T); await tab();
  const skip = await evaluate(`({ text: document.activeElement?.textContent, visible: document.activeElement?.getBoundingClientRect().top >= 0, outline: getComputedStyle(document.activeElement).outlineStyle })`);
  await enter();
  const mainFocused = await evaluate(`document.activeElement?.id`);
  let reached = null;
  for (let i = 0; i < 12 && !reached; i++) { await tab(); const a = await evaluate(`document.activeElement?.textContent?.trim()`); if (a?.startsWith('Try the demo')) reached = a; }
  const ctaOutline = await evaluate(`getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth`);
  await shot('A2-keyboard-cta-focus.png');
  await enter(); await sleep(300);
  const afterEnter = await evaluate('location.hash');
  record('A2-keyboard-skip-and-cta', skip.text === 'Skip to main content' && skip.visible && mainFocused === 'main-content' && !!reached && afterEnter === '#/demo', { skip, mainFocused, reached, ctaOutline, afterEnter });

  // A3 demo with keyboard-only creation and real downloads.
  await typeInto('#invoice-amount', '0.123456');
  const units = await evaluate(`document.querySelector('#invoice-amount-units')?.textContent`);
  const createFocused = await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.startsWith('Create invoice (offline')); b.focus(); return document.activeElement === b; })()`);
  await enter(); await sleep(300);
  const receipt = await evaluate(`(() => { const r = document.querySelector('[aria-label="Simulated receipt"]'); const ids = [...document.querySelectorAll('p.font-mono')].map(p => p.textContent).filter(t => /^0x[0-9a-f]{64}$/.test(t)); return { present: !!r, text: r?.innerText ?? '', listed: ids[0] }; })()`);
  record('A3-demo-keyboard-create', units?.includes('123456000000000000') && createFocused && receipt.present && receipt.text.includes(receipt.listed) && /SIMULATED_NOT_VERIFIED/.test(receipt.text) && /0\.123456 test USDC/.test(receipt.text), { units, createFocused, listed: receipt.listed });
  await shot('A3-demo-receipt-1440.png');
  await clickText('Export simulated JSON'); await clickText('Export simulated CSV'); await sleep(1500);
  const files = readdirSync(DL).filter((f) => f.startsWith('arcproof-SIMULATED-'));
  const jsonFile = files.find((f) => f.endsWith('.json')), csvFile = files.find((f) => f.endsWith('.csv'));
  let jsonOk = false, csvOk = false, jsonView = null, csvHead = null;
  if (jsonFile) {
    const parsed = JSON.parse(readFileSync(join(DL, jsonFile), 'utf8')); const row = Array.isArray(parsed) ? parsed[0] : (parsed.receipts?.[0] ?? parsed);
    jsonView = { verificationStatus: row.verificationStatus, mode: row.mode, payer: row.payer, transactionHash: row.transactionHash, paidAt: row.paidAt, amountNative: row.amountNative, invoiceId: row.invoiceId };
    jsonOk = row.verificationStatus === 'SIMULATED_NOT_VERIFIED' && row.mode === 'fixture' && row.payer === null && row.transactionHash === null && row.paidAt === null && row.amountNative === '123456000000000000' && row.invoiceId === receipt.listed;
  }
  if (csvFile) { const lines = readFileSync(join(DL, csvFile), 'utf8').trim().split('\n'); csvHead = lines[0].slice(0, 120); csvOk = lines.length === 2 && lines[1].includes('SIMULATED_NOT_VERIFIED') && lines[1].includes('123456000000000000') && lines[1].includes(receipt.listed); }
  record('A4-demo-downloads-reread', jsonOk && csvOk, { files, jsonView, csvHead });

  // A5 invalid demo amount keeps creation disabled and announces the error.
  await goto(T + '#/demo'); await typeInto('#invoice-amount', '1.0000001');
  const invalid = await evaluate(`({ alert: document.querySelector('#invoice-amount-error')?.getAttribute('role'), msg: document.querySelector('#invoice-amount-error')?.textContent, disabled: [...document.querySelectorAll('button')].find(b => b.textContent.startsWith('Create invoice (offline')).disabled, invalidAttr: document.querySelector('#invoice-amount').getAttribute('aria-invalid') })`);
  record('A5-demo-invalid-amount', invalid.alert === 'alert' && invalid.disabled && invalid.invalidAttr === 'true', invalid);

  // A6 verify page rejects malformed input before any chain request.
  const before = external.length;
  await goto(T + '#/verify'); await typeInto('#live-receipt-id', '0x1234'); await clickText('Verify from chain data');
  const verify = await evaluate(`({ err: document.querySelector('#receipt-error')?.textContent, invalid: document.querySelector('#live-receipt-id').getAttribute('aria-invalid') })`);
  record('A6-verify-malformed-no-request', /32 bytes/.test(verify.err ?? '') && verify.invalid === 'true' && external.length === before, { ...verify, externalDuring: external.length - before });

  // A7 non-canonical / duplicate / unknown links fail closed without wallet controls.
  for (const [name, url, expect] of [
    ['leading-zero-chain', `${T}#/pay/0005042002/${DEP}/${ID}`, 'Unsupported network'],
    ['duplicate-tx', `${T}#/receipt/5042002/${DEP}/${ID}?tx=${TX}&tx=${TX}`, 'Invalid transaction hash'],
    ['unknown-route', `${T}#/nope`, 'Unavailable route'],
    ['unknown-deployment', `${T}#/pay/5042002/unknown/${ID}`, 'Unsupported deployment'],
  ]) {
    await goto(url); const body = await text();
    record(`A7-${name}`, body.includes(expect) && !/connect wallet/i.test(body), { expect, hash: await evaluate('location.hash') });
  }

  // A8 back/forward between routes.
  await goto(T); await clickText('Try demo', 'nav button'); await clickText('Evidence', 'nav button');
  await send('Runtime.evaluate', { expression: 'history.back()' }); await sleep(400);
  const back = await evaluate(`({ hash: location.hash, current: document.querySelector('nav [aria-current=page]')?.textContent })`);
  record('A8-history-back', back.hash === '#/demo' && back.current === 'Try demo', back);

  // A9 200% zoom equivalent (1440x900 CSS px at 2x => 720x450 CSS viewport) and 375 mobile: no horizontal overflow.
  for (const [w, h, s, url, name] of [[720, 450, 2, T, 'home-200pct'], [720, 450, 2, T + '#/demo', 'demo-200pct'], [375, 812, 1, T + '#/evidence', 'evidence-375'], [320, 640, 1, T, 'home-320']]) {
    await viewport(w, h, s); await goto(url); const o = await overflow();
    record(`A9-${name}-no-overflow`, o.sw <= o.iw, o); await shot(`A9-${name}.png`);
  }
  await viewport(1440, 900);

  // A10 reduced motion removes transitions.
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await goto(T); const motion = await evaluate(`getComputedStyle(document.querySelector('nav button')).transitionDuration`);
  record('A10-reduced-motion', motion === '0s', { transitionDuration: motion });
  await send('Emulation.setEmulatedMedia', { features: [] });

  // A11 mainnet build: honest "not enabled", no wallet, known testnet links stay read-only.
  await goto(M); const mHome = await text();
  record('A11-mainnet-home', mHome.includes('not enabled on Arc Mainnet') && mHome.includes('Arc Mainnet (5042)') && !/connect wallet/i.test(mHome), { first: mHome.slice(0, 160) });
  await shot('A11-mainnet-home-1440.png');
  for (const [name, hash] of [['invoices', '#/invoices'], ['verify', '#/verify'], ['old-testnet-receipt', `#/receipt/5042002/${DEP}/${ID}?tx=${TX}`]]) {
    await goto(M + hash); const body = await text();
    record(`A11-mainnet-${name}`, body.includes('Mainnet unavailable: no trusted deployment') && !/connect wallet/i.test(body) && (name !== 'old-testnet-receipt' || body.includes('known Arc Testnet deployment')), { hash });
  }
  await goto(M + '#/evidence'); const mEvidence = await evaluate(`document.querySelector('[aria-label="Build identity"]')?.innerText`);
  record('A11-mainnet-evidence-identity', /Arc Mainnet \/ 5042/.test(mEvidence) && mEvidence.includes('None (no trusted deployment)'), { identity: mEvidence?.slice(0, 200) });
} catch (error) {
  record('harness-error', false, { message: String(error) });
}
record('A12-no-external-requests', external.length === 0, { external: external.slice(0, 10) });
record('A13-no-uncaught-exceptions', exceptions.length === 0, { exceptions: exceptions.slice(0, 5) });
writeFileSync(join(OUT, 'browser-acceptance.json'), JSON.stringify({ when: new Date().toISOString(), chrome: 'Chrome 144 headless=new, sandboxed (chrome://sandbox: adequately sandboxed), run as unprivileged user', testnetUrl: T, mainnetUrl: M, results }, null, 2));
ws.close(); await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`);
console.log(`summary: ${results.filter((r) => r.status === 'PASS').length}/${results.length} PASS`);
