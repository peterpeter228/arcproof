// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({ wallet: vi.fn(), load: vi.fn(), verify: vi.fn(), send: vi.fn(), prepare: vi.fn(), saved: vi.fn() }));
vi.mock('../networkPolicy', async () => {
  const actual = await vi.importActual<typeof import('../networkPolicy')>('../networkPolicy');
  return { ...actual, BUILD_NETWORK: actual.MAINNET_CONTEXT };
});
vi.mock('connectkit', () => ({ ConnectKitButton: () => { calls.wallet(); return <button>Connect wallet</button>; } }));
vi.mock('../useTestnetWallet', () => ({ useNetworkWallet: () => { calls.wallet(); return {}; } }));
vi.mock('../testnetClient', async () => { const original = await vi.importActual<typeof import('../testnetClient')>('../testnetClient'); return { ...original, getNetworkService: (context: import('../networkPolicy').NetworkContext) => ({ ...original.getNetworkService(context), loadInvoice: calls.load, verifyNetworkReceipt: calls.verify, sendPreparedAction: calls.send, prepareCreate: calls.prepare, preparePay: calls.prepare }) }; });
vi.mock('../submissions', async () => ({ ...await vi.importActual<typeof import('../submissions')>('../submissions'), useSubmissions: () => { calls.saved(); return []; }, useSubmissionRequests: () => { calls.saved(); return []; } }));
import App from '../../App';
let root: Root, host: HTMLDivElement;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks(); localStorage.clear();
  localStorage.setItem('arcproof:5042002:historical:unknown-intent', 'do-not-delete-or-migrate');
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
describe('fixed mainnet build is inert without a production deployment', () => {
  it.each(['#/verify', '#/invoices', '#/pay/5042/unknown/0x' + 'a'.repeat(64), '#/receipt/5042002/testnet/0x' + 'b'.repeat(64)])('blocks live UI and leaves old requests untouched: %s', hash => {
    window.history.replaceState(null, '', hash); act(() => root.render(<App />));
    expect(host.textContent).toContain('Mainnet unavailable: no trusted deployment');
    expect(host.textContent).toContain('Arc Mainnet (5042)');
    expect(host.textContent).not.toContain('Connect wallet');
    for (const fn of Object.values(calls)) expect(fn).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem('arcproof:5042002:historical:unknown-intent')).toBe('do-not-delete-or-migrate');
  });
  it.each(['#/demo', '#/evidence', '#/garbage'])('allows only offline/historical/unavailable surfaces: %s', hash => {
    window.history.replaceState(null, '', hash); act(() => root.render(<App />));
    expect(host.textContent).toContain('all sends disabled');
    expect(host.textContent).not.toContain('Connect wallet');
    for (const fn of Object.values(calls)) expect(fn).not.toHaveBeenCalled();
  });
  it.each(['#', '#/'])('shows the static overview on mainnet without enabling any action: %s', hash => {
    window.history.replaceState(null, '', hash); act(() => root.render(<App />));
    expect(host.textContent).toContain('Arc Mainnet has no trusted deployment in this build');
    expect(host.textContent).toContain('Not deployed. Creating, paying and verifying are disabled.');
    expect(host.querySelector('main a[href="#/invoices"]')).toBeNull();
    expect(host.textContent).not.toContain('Connect wallet');
    expect(host.textContent).not.toContain('test USDC with no monetary value');
    for (const fn of Object.values(calls)) expect(fn).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(1);
  });
  it('reports mainnet identity without borrowing the historical testnet manifest', () => {
    window.history.replaceState(null, '', '#/evidence'); act(() => root.render(<App />));
    const identity = host.querySelector('[aria-label="Build identity"]')?.textContent;
    expect(identity).toMatch(/Arc Mainnet\s*\/\s*5042/);
    expect(identity).not.toContain('5042002');
    expect(identity).toContain('None (no trusted deployment)');
    expect(identity).toContain('Unknown (no trusted deployment)');
    for (const fn of Object.values(calls)) expect(fn).not.toHaveBeenCalled();
  });
});
