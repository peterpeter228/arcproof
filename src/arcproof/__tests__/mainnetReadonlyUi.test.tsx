// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({ wallet: vi.fn(), load: vi.fn(), verify: vi.fn(), send: vi.fn(), prepare: vi.fn(), saved: vi.fn() }));
vi.mock('../networkPolicy', async () => {
  const actual = await vi.importActual<typeof import('../networkPolicy')>('../networkPolicy');
  return {
    ...actual,
    BUILD_NETWORK: actual.MAINNET_CONTEXT,
    canWriteContext: (context: import('../networkPolicy').NetworkContext) => context === actual.MAINNET_CONTEXT && actual.networkStage(context) === 'W2',
  };
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
const MAINNET = '0xd6b1C2A7F6C406E6BbB981F66847aff60D6600eE';
const DEPLOYMENT = '0x3157f8feee81d6f2447756a99f6a12c88dff63d7165ca521322e0cc7ace2c2aa';
describe('mainnet build uses the verified deployment and still has no sample payment', () => {
  it.each(['#/pay/5042/unknown/0x' + 'a'.repeat(64), '#/receipt/5042002/testnet/0x' + 'b'.repeat(64)])('rejects unknown or testnet links without a wallet: %s', hash => {
    window.history.replaceState(null, '', hash); act(() => root.render(<App />));
    expect(host.textContent).toContain('Request unavailable');
    expect(host.textContent).not.toContain('Connect wallet');
    expect(host.textContent).not.toContain('0x0D54be3d3c17D73be58c1bAeDFBdBC2f79677018');
    for (const fn of Object.values(calls)) expect(fn).not.toHaveBeenCalled();
    expect(localStorage.getItem('arcproof:5042002:historical:unknown-intent')).toBe('do-not-delete-or-migrate');
  });
  it('opens create and verify for the trusted mainnet deployment', () => {
    window.history.replaceState(null, '', '#/invoices'); act(() => root.render(<App />));
    expect(host.textContent).toContain('Create a mainnet invoice');
    expect(host.textContent).toContain('Connect wallet');
    expect(host.textContent).not.toContain('0x3Dcd2bDD924BCC384Cb39e9e12038e00fde0FA30');
    expect(calls.prepare).not.toHaveBeenCalled();
    expect(calls.send).not.toHaveBeenCalled();
    window.history.replaceState(null, '', '#/verify');
    act(() => { window.dispatchEvent(new HashChangeEvent('hashchange')); });
    expect(host.textContent).toContain('Verify a mainnet receipt');
    expect(host.textContent).toContain(MAINNET);
    expect(calls.verify).not.toHaveBeenCalled();
    expect(localStorage.getItem('arcproof:5042002:historical:unknown-intent')).toBe('do-not-delete-or-migrate');
  });
  it.each(['#/demo', '#/garbage'])('keeps offline and unknown routes from sending: %s', hash => {
    window.history.replaceState(null, '', hash); act(() => root.render(<App />));
    expect(host.textContent).toContain('accepted release');
    expect(host.textContent).not.toContain('Connect wallet');
    expect(calls.prepare).not.toHaveBeenCalled();
    expect(calls.send).not.toHaveBeenCalled();
  });
  it.each(['#', '#/'])('shows the accepted deployment without a sample payment: %s', hash => {
    window.history.replaceState(null, '', hash); act(() => root.render(<App />));
    expect(host.textContent).toContain('Arc Mainnet is enabled for this release');
    expect(host.textContent).toContain('Trusted mainnet deployment 2026-10-26');
    expect(host.textContent).toContain('no actual mainnet application payment');
    expect(host.querySelector('main a[href="#/invoices"]')).toBeNull();
    expect(host.textContent).not.toContain('Connect wallet');
    expect(host.textContent).not.toContain('Not deployed');
    expect(localStorage.getItem('arcproof:5042002:historical:unknown-intent')).toBe('do-not-delete-or-migrate');
  });
  it('reports mainnet identity without borrowing the historical testnet manifest', () => {
    window.history.replaceState(null, '', '#/evidence'); act(() => root.render(<App />));
    const identity = host.querySelector('[aria-label="Build identity"]')?.textContent;
    expect(identity).toMatch(/Arc Mainnet\s*\/\s*5042/);
    expect(identity).toContain('W2');
    expect(identity).toContain(DEPLOYMENT);
    expect(identity).toContain('0xa36ede95ccce8289224d3bbabe3a2445a888c44e763a04ac4b6f4f2f03dd344c');
    expect(identity).not.toContain('5042002');
    expect(identity).not.toContain('0x3Dcd2bDD924BCC384Cb39e9e12038e00fde0FA30');
    expect(calls.prepare).not.toHaveBeenCalled();
    expect(calls.send).not.toHaveBeenCalled();
  });
});
