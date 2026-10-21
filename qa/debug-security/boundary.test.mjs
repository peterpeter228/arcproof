// Run from repository root: node --test qa/debug-security/boundary.test.mjs
// Uses only local synthetic requests, existing Vite, and Node built-ins.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { request } from 'node:http'
import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { build, createServer, preview, resolveConfig } from 'vite'

const root = path.resolve(process.env.ARCPROOF_SECURITY_ROOT || fileURLToPath(new URL('../..', import.meta.url)))
const output = path.resolve(process.env.ARCPROOF_SECURITY_OUTPUT || path.join(root, 'qa/debug-security/generated'))
const outDir = path.join(output, 'dist')
const captureModule = /(?:^|\/)src\/(?:tracing|console-capture)\.[cm]?[jt]sx?(?:\?|$)/
const captureMarkers = ['studio-trace-config', 'studio-trace-event', 'studio-console-log', '__studioTrace', '__studioPatched', '[studio-trace]', '[studio-console]']
const evidence = { root, timestampUtc: new Date().toISOString(), scope: 'local only; no deployment headers tested', modules: 0, files: [], captureModules: [], captureMarkers: [] }

function get(port, pathname = '/', headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path: pathname, headers }, res => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', value => { body += value })
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
    })
    req.on('error', reject)
    req.setTimeout(5000, () => req.destroy(new Error('Local HTTP test timed out')))
    req.end()
  })
}
async function files(dir) {
  const result = []
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, item.name)
    if (item.isDirectory()) result.push(...await files(target))
    else result.push(target)
  }
  return result
}
function connectedHmr(port, token) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/?token=${encodeURIComponent(token)}`, 'vite-hmr')
    const timer = setTimeout(() => { socket.close(); reject(new Error('Local HMR handshake timed out')) }, 5000)
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Local HMR handshake failed')) })
    socket.addEventListener('message', event => {
      clearTimeout(timer)
      socket.close()
      try { assert.equal(JSON.parse(event.data).type, 'connected'); resolve() } catch (error) { reject(error) }
    }, { once: true })
  })
}

await test('SEC-01 / DEV-01 source, real development HTTP, HMR, and production artifacts', async t => {
  await mkdir(output, { recursive: true })
  await t.test('resolved defaults are loopback-only with no extra hosts or CORS', async () => {
    const config = await resolveConfig({ root }, 'serve')
    assert.equal(config.server.host, '127.0.0.1')
    assert.deepEqual(config.server.allowedHosts, [])
    assert.equal(config.server.cors, false)
    assert.equal(config.preview.host, '127.0.0.1')
    assert.deepEqual(config.preview.allowedHosts, [])
    assert.equal(config.preview.cors, false)
  })

  // No dependency crawling is needed for HTTP/HMR boundary checks; avoid a
  // background prebundle racing shutdown. Host/CORS/HMR defaults stay intact.
  const server = await createServer({ root, optimizeDeps: { noDiscovery: true, include: [] },
    server: { port: 0, strictPort: true }, logLevel: 'error' })
  try {
    await server.listen()
    const address = server.httpServer.address()
    assert.equal(address.address, '127.0.0.1')
    const port = address.port
    await t.test('ordinary loopback document, entry module, and HMR remain available', async () => {
      assert.equal((await get(port, '/', { Host: `localhost:${port}` })).status, 200)
      const entry = await get(port, '/src/main.tsx')
      assert.equal(entry.status, 200)
      assert.ok(entry.body.includes('Built with Arc Studio'))
      assert.ok(!entry.body.includes('console-capture'))
      assert.ok(!entry.body.includes('"/src/tracing.ts"'))
      assert.equal((await get(port, '/@vite/client')).status, 200)
      await connectedHmr(port, server.config.webSocketToken)
    })
    for (const host of ['attacker.invalid', 'localhost.attacker.invalid']) {
      await t.test(`development source denies hostile Host ${host}`, async () => {
        assert.equal((await get(port, '/src/main.tsx', { Host: host })).status, 403)
      })
    }
    for (const origin of ['https://attacker.invalid', 'null', 'http://localhost:12345']) {
      await t.test(`development source has no CORS grant for Origin ${origin}`, async () => {
        const response = await get(port, '/src/main.tsx', { Origin: origin })
        assert.equal(response.status, 200)
        assert.equal(response.headers['access-control-allow-origin'], undefined)
        assert.equal(response.headers['access-control-allow-credentials'], undefined)
      })
    }
  } finally { await server.close() }

  await t.test('fresh production graph and every emitted asset exclude both capture modules', async () => {
    const moduleIds = new Set()
    await build({
      root, logLevel: 'warn', build: { outDir, emptyOutDir: true },
      plugins: [{ name: 'verify-no-debug-capture', generateBundle() {
        for (const id of this.getModuleIds()) moduleIds.add(id.replaceAll('\\', '/'))
      } }],
    })
    assert.ok([...moduleIds].some(id => id.endsWith('/src/main.tsx')))
    assert.ok([...moduleIds].some(id => id.endsWith('/src/config.ts')))
    evidence.modules = moduleIds.size
    evidence.captureModules = [...moduleIds].filter(id => captureModule.test(id))
    let builtText = ''
    for (const file of await files(outDir)) {
      const bytes = await readFile(file)
      evidence.files.push({ path: path.relative(outDir, file), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
      const text = bytes.toString('utf8')
      builtText += text
      for (const marker of captureMarkers) if (text.includes(marker)) evidence.captureMarkers.push({ file: path.relative(outDir, file), marker })
    }
    assert.ok(evidence.files.length > 0)
    assert.deepEqual({ modules: evidence.captureModules, markers: evidence.captureMarkers },
      { modules: [], markers: [] }, 'Capture module or protocol/hook remains in production graph/output')
    assert.ok(builtText.includes('Built with Arc Studio'))
    assert.ok(builtText.includes('https://studio.arc.io/'))
  })

  const previewServer = await preview({ root, build: { outDir }, preview: { port: 0, strictPort: true }, logLevel: 'error' })
  try {
    const address = previewServer.httpServer.address()
    assert.equal(address.address, '127.0.0.1')
    await t.test('local production preview serves artifact and rejects hostile Host / CORS', async () => {
      assert.equal((await get(address.port)).status, 200)
      assert.equal((await get(address.port, '/', { Host: 'attacker.invalid' })).status, 403)
      const response = await get(address.port, '/', { Origin: 'https://attacker.invalid' })
      assert.equal(response.headers['access-control-allow-origin'], undefined)
    })
  } finally { await new Promise((resolve, reject) => previewServer.httpServer.close(error => error ? reject(error) : resolve())) }
  await writeFile(path.join(output, 'artifact-scan.json'), JSON.stringify(evidence, null, 2) + '\n')
})
