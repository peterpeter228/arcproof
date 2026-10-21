// @vitest-environment jsdom
// Native security regression, not part of the original Studio scaffold.
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-dom/client', () => ({ createRoot: () => ({ render: vi.fn() }) }))
vi.mock('wagmi', () => ({
  WagmiProvider: 'div', createConfig: vi.fn(() => ({})), http: vi.fn(),
}))
vi.mock('wagmi/connectors', () => ({ injected: vi.fn() }))
vi.mock('@tanstack/react-query', () => ({ QueryClient: class {}, QueryClientProvider: 'div' }))
vi.mock('connectkit', () => ({ ConnectKitProvider: 'div' }))
vi.mock('sonner', () => ({ Toaster: 'div' }))
vi.mock('../App', () => ({ default: 'div' }))

const levels = ['log', 'info', 'warn', 'error', 'debug'] as const

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.resetModules()
  document.body.innerHTML = ''
})

describe('the application has no parent-frame capture bridge', () => {
  it.each([
    ['untrusted parent', 'https://untrusted.example', true, 'https://untrusted.example/embed'],
    ['opaque parent', 'null', true, ''],
    ['missing origin', '', true, ''],
    ['wildcard origin', '*', true, ''],
    ['wrong source', 'https://untrusted.example', false, 'https://untrusted.example/embed'],
    ['Studio-looking parent (not authorization)', 'https://studio.arc.io', true, 'https://studio.arc.io/'],
    ['same-origin parent', window.location.origin, true, ''],
  ])('does not install or enable capture: %s', async (_label, origin, fromParent, referrer) => {
    const postMessage = vi.fn()
    const parent = { postMessage }
    vi.spyOn(window, 'parent', 'get').mockReturnValue(parent as unknown as Window)
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(referrer)
    const fetch = vi.fn(() => Promise.resolve(new Response('{"synthetic":true}')))
    const request = vi.fn(() => Promise.resolve(['synthetic-account']))
    const provider = { request }
    vi.stubGlobal('fetch', fetch)
    vi.stubGlobal('ethereum', provider)
    const originalConsole = Object.fromEntries(levels.map(level => [level, console[level]]))
    const listener = vi.spyOn(window, 'addEventListener')
    document.body.innerHTML = '<div id="root"></div>'

    await import('../main')
    expect(globalThis.fetch).toBe(fetch)
    expect(window.ethereum).toBe(provider)
    expect(provider.request).toBe(request)
    for (const level of levels) expect(console[level]).toBe(originalConsole[level])
    expect(listener.mock.calls.filter(([type]) =>
      ['message', 'error', 'unhandledrejection', 'eip6963:announceProvider'].includes(type),
    )).toEqual([])
    expect('__studioTrace' in window).toBe(false)

    window.dispatchEvent(new MessageEvent('message', {
      source: (fromParent ? parent : window) as Window,
      origin: String(origin),
      data: { type: 'studio-trace-config', enabled: true },
    }))
    await globalThis.fetch('https://synthetic.invalid/not-a-network-request')
    await provider.request()
    for (const level of levels) console[level]('synthetic debug regression value')
    await new Promise(resolve => setTimeout(resolve, 5))
    expect(globalThis.fetch).toBe(fetch)
    expect(provider.request).toBe(request)
    expect(postMessage).not.toHaveBeenCalled()
  })
})
