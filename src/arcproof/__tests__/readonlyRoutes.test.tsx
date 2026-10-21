// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { parseHash } from '../routes';
import { TESTNET_DEPLOYMENT } from '../testnet';
const calls = vi.hoisted(() => ({ wallet: vi.fn(), load: vi.fn(), verify: vi.fn(), send: vi.fn(), prepare: vi.fn() }));
vi.mock('connectkit', () => ({ ConnectKitButton: () => <button>Connect wallet</button> }));
vi.mock('../useTestnetWallet', () => ({ useTestnetWallet: () => ({ session: null, sessionKey: 'none', getSession: () => null, getProvider: calls.wallet }) }));
vi.mock('../testnetClient', async () => ({ ...await vi.importActual<typeof import('../testnetClient')>('../testnetClient'), loadInvoice: calls.load, verifyTestnetReceipt: calls.verify, sendPreparedAction: calls.send, prepareCreate: calls.prepare, preparePay: calls.prepare }));
import App from '../../App';
let root: Root, host: HTMLDivElement;
function navigate(hash: string) {
  act(() => { window.history.replaceState(null, '', hash); window.dispatchEvent(new HashChangeEvent('hashchange')); });
}
function mount(hash: string) {
  window.history.replaceState(null, '', hash);
  act(() => root.render(<App />));
}
function assertNoActions() {
  for (const call of Object.values(calls)) expect(call).not.toHaveBeenCalled();
}
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks(); localStorage.clear();
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
describe('ENTRY-01 actual root rendering, offline DOM only', () => {
  it.each([['#/verify', 'Verify'], ['#/evidence', 'Project evidence'], ['#/demo', 'Offline demo mode']])('opens and remounts %s without wallet or business RPC', (hash, label) => {
    mount(hash); expect(host.textContent).toContain(label);
    act(() => root.unmount()); root = createRoot(host); mount(hash);
    expect(host.textContent).toContain(label); expect(host.textContent).not.toContain('Connect wallet'); assertNoActions();
  });
  it('uses URL state for navigation and hashchange traversal', () => {
    mount('#/verify');
    const evidence = [...host.querySelectorAll('nav button')].find(button => button.textContent === 'Evidence')!;
    act(() => (evidence as HTMLButtonElement).click());
    expect(window.location.hash).toBe('#/evidence'); expect(host.textContent).toContain('Project evidence');
    navigate('#/demo'); expect(host.textContent).toContain('Offline demo mode');
    navigate('#/verify'); expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('Verify receipt');
    assertNoActions();
  });
  it('starts empty routes in read-only verification rather than the wallet dashboard', () => {
    mount('#'); expect(host.textContent).not.toContain('Connect wallet'); assertNoActions();
  });
  it.each(['#/nonsense', '#/pay', '#/pay/1/unknown/0x1234', '#/receipt/5042002/unknown/0x1234', '#/pay//5042002/anything/id', '#/demo/extra'])('fails closed for %s', hash => {
    mount(hash); expect(host.textContent).toMatch(/unavailable/i); expect(host.textContent).not.toContain('Connect wallet'); assertNoActions();
  });
  it('remounts receipt identity and discards late prior-route failures', async () => {
    const first = `0x${'a'.repeat(64)}`, second = `0x${'c'.repeat(64)}`, tx = `0x${'b'.repeat(64)}`;
    let rejectOld!: (reason: Error) => void;
    calls.verify.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectOld = reject; })).mockReturnValueOnce(new Promise(() => {}));
    mount(`#/receipt/5042002/${TESTNET_DEPLOYMENT.deploymentId}/${first}?tx=${tx}`);
    await act(async () => { await Promise.resolve(); });
    expect(calls.verify).toHaveBeenCalledTimes(1);
    navigate(`#/receipt/5042002/${TESTNET_DEPLOYMENT.deploymentId}/${second}`);
    await act(async () => { await Promise.resolve(); });
    expect((host.querySelector('#live-receipt-id') as HTMLInputElement).value).toBe(second);
    expect((host.querySelector('#live-receipt-tx') as HTMLInputElement).value).toBe('');
    await act(async () => { rejectOld(new Error('OLD_ROUTE_FAILURE')); await Promise.resolve(); });
    expect(host.textContent).not.toContain('OLD_ROUTE_FAILURE');
    expect(calls.verify).toHaveBeenCalledTimes(2); expect(calls.wallet).not.toHaveBeenCalled(); expect(calls.send).not.toHaveBeenCalled();
  });
  it('rejects malformed tx for a known deployment before mounting verification', () => {
    const invoice = `0x${'a'.repeat(64)}`;
    mount(`#/receipt/5042002/${TESTNET_DEPLOYMENT.deploymentId}/${invoice}?tx=bad`);
    expect(host.textContent).toContain('Invalid transaction hash'); assertNoActions();
  });
  it('keeps demo fixture creation and receipt export isolated from live clients', () => {
    mount('#/demo');
    const click = (text: string) => act(() => ([...host.querySelectorAll('button')].find(b => b.textContent?.includes(text))!).click());
    click('Create invoice (offline'); click('View simulated receipt');
    expect(host.textContent).toContain('SIMULATED_NOT_VERIFIED'); expect(host.querySelector('a[href*="/pay/"]')).toBeNull(); assertNoActions();
  });
});
describe('route identity parsing', () => {
  const invoice = `0x${'a'.repeat(64)}`;
  const tx = `0x${'b'.repeat(64)}`;
  const base = `/5042002/${TESTNET_DEPLOYMENT.deploymentId}/${invoice}`;
  it('preserves all receipt identity and transaction fields', () => {
    expect(parseHash(`#/receipt${base}?tx=${tx}`)).toEqual({ screen: 'receipt', chainId: 5042002, deploymentId: TESTNET_DEPLOYMENT.deploymentId, invoiceId: invoice, txHash: tx });
    expect(parseHash(`#/pay${base}`).invoiceId).toBe(invoice);
  });
  it('does not normalize extra path segments into valid identities or duplicate hashes', () => {
    expect(parseHash(`#/pay${base}/extra`).invoiceId).toBeUndefined();
    expect(parseHash(`#/receipt${base}?tx=${tx}&tx=${tx}`).txHash).toBe('');
    expect(parseHash(`#/pay/9007199254740993/x/${invoice}`).chainId).toBeUndefined();
  });
});
