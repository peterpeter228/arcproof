// Same-machine localhost timing: cold cache, no throttling. Not a Lighthouse score.
const PORT = Number(process.env.CDP_PORT ?? 9334);
const [url, runs = '5', width = '1440', height = '900'] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((ok) => { ws.onopen = ok; });
let id = 0; const pend = new Map(); const reqs = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } else if (m.method === 'Network.requestWillBeSent') reqs.push(m.params.request.url); else if (m.method === 'Network.loadingFinished') reqs.bytes = (reqs.bytes ?? 0) + m.params.encodedDataLength; };
const send = (method, params = {}) => new Promise((ok) => { const i = ++id; pend.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: Number(width), height: Number(height), deviceScaleFactor: 1, mobile: Number(width) < 600 });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__lcp=0;window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true});` });
const out = [];
for (let i = 0; i < Number(runs); i++) {
  reqs.length = 0; reqs.bytes = 0;
  await send('Page.navigate', { url: 'about:blank' }); await sleep(200);
  await send('Page.navigate', { url }); await sleep(3500);
  const r = await send('Runtime.evaluate', { returnByValue: true, expression: `(() => { const n = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: Math.round(fcp?.startTime ?? -1), lcp: Math.round(window.__lcp), cls: Number(window.__cls.toFixed(4)) }; })()` });
  out.push({ ...r.result.value, requests: reqs.length, external: reqs.filter((u) => !u.startsWith('http://127.0.0.1')).length, transferKB: Math.round((reqs.bytes ?? 0) / 1024) });
}
const med = (k) => out.map((o) => o[k]).sort((a, b) => a - b)[Math.floor(out.length / 2)];
console.log(JSON.stringify({ url, width: Number(width), runs: out.length, median: { dcl: med('dcl'), load: med('load'), fcp: med('fcp'), lcp: med('lcp'), cls: med('cls'), requests: med('requests'), external: med('external'), transferKB: med('transferKB') }, raw: out }));
ws.close(); await fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`);
