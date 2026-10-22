// @vitest-environment jsdom
/* eslint-disable typescript/require-await -- Offline UI/RPC fixtures. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { NetworkContext } from '../networkPolicy';
import type { Hex } from 'viem';
import type { LoadedInvoice, NetworkService } from '../testnetClient';
const mocks = vi.hoisted(() => ({ accepted: false, wallet: vi.fn(), load: vi.fn<(context: NetworkContext, id: Hex) => Promise<LoadedInvoice>>(), verify: vi.fn<(context: NetworkContext, id: Hex, hash?: Hex, options?: { signal?: AbortSignal }) => ReturnType<NetworkService['verifyNetworkReceipt']>>(), prepare: vi.fn(), send: vi.fn() }));
vi.mock('../manifest', async () => {
  const actual = await vi.importActual<typeof import('../manifest')>('../manifest');
  const { ARC_MAINNET_SETTLEMENT_POLICY } = await vi.importActual<typeof import('../arcSettlement')>('../arcSettlement');
  const base = { chainId: 5042, runtimeCodeHash: `0x${'1'.repeat(64)}`, settlementPolicy: ARC_MAINNET_SETTLEMENT_POLICY, label: 'Synthetic closed UI registry', deployedAt: '2026-10-22T00:00:00Z' };
  return { ...actual, PRODUCTION_MANIFEST: [{ ...base, deploymentId: 'ui-current', contractAddress: `0x${'2'.repeat(40)}` }, { ...base, deploymentId: 'ui-old', contractAddress: `0x${'3'.repeat(40)}` }] };
});

vi.mock('connectkit', () => ({ ConnectKitButton: () => { mocks.wallet(); return <button>Connect wallet</button>; } }));
vi.mock('../useTestnetWallet', () => ({ useNetworkWallet: (context: NetworkContext) => { mocks.wallet(); return { session: { account: `0x${'4'.repeat(40)}`, chainId: context.chain.id, connectionVersion: 1, networkKey: context.key, deploymentId: context.deployment?.deploymentId }, sessionKey: 'synthetic-connected', getSession: () => null, getProvider: vi.fn() }; } }));
async function mockedNetworkClient() {
  const actual = await vi.importActual<typeof import('../testnetClient')>('../testnetClient');
  const services = new Map<NetworkContext, ReturnType<typeof actual.getNetworkService>>();
  return { ...actual, getNetworkService: (context: NetworkContext) => {
    let service = services.get(context);
    if (!service) {
      const base = actual.getNetworkService(context);
      service = { ...base, loadInvoice: async (_client, id) => mocks.load(context, id), verifyNetworkReceipt: async (_client, id, hash, options) => mocks.verify(context, id, hash, options), prepareCreate: mocks.prepare, preparePay: mocks.prepare, sendPreparedAction: mocks.send };
      services.set(context, service);
    }
    return service;
  } };
}
const id = `0x${'a'.repeat(64)}` as const, hash = `0x${'b'.repeat(64)}` as const;
const invoice: LoadedInvoice = { invoiceId: id, merchant: `0x${'4'.repeat(40)}`, amountNative: 200000000000000000n, expiresAt: 2000000000n, termsHash: `0x${'0'.repeat(64)}`, paid: false, payer: `0x${'0'.repeat(40)}`, paidAt: 0n, paidBlockNumber: 0n };
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetModules(); vi.stubEnv('VITE_ARCPROOF_NETWORK', 'mainnet'); vi.clearAllMocks(); mocks.accepted = false; localStorage.clear();
  mocks.load.mockResolvedValue(invoice);
  mocks.verify.mockResolvedValue({ invoice, hash, result: { status: 'PENDING', verified: false, message: 'Synthetic unverified result', verifiedAt: 0, paymentLogIndex: null, blockHash: null } });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllEnvs(); });
async function render(hashRoute: string) {
  vi.doMock('../networkReleasePolicy', () => ({ MAINNET_RELEASE_POLICY: { activeDeploymentId: 'ui-current', writesAccepted: mocks.accepted } }));
  vi.doMock('../testnetClient', mockedNetworkClient);
  const { default: App } = await import('../../App');
  await act(async () => { window.history.replaceState(null, '', hashRoute); root.render(<App />); });
}
it('R1 mainnet receipt route performs independent verification with selected deployment and never mounts wallet controls', async () => {
  await render(`#/receipt/5042/ui-old/${id}?tx=${hash}`);
  expect(mocks.verify).toHaveBeenCalledTimes(1);
  const [context, targetId, targetHash] = mocks.verify.mock.calls[0] as [NetworkContext, string, string];
  expect(context.deployment?.deploymentId).toBe('ui-old'); expect(targetId).toBe(id); expect(targetHash).toBe(hash);
  expect(host.textContent).toContain('Verify a mainnet receipt'); expect(host.textContent).toContain('USDC'); expect(host.textContent).not.toContain('test USDC');
  expect(mocks.wallet).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
});
it('R1 payment page reads but blocks all wallet/component write paths and create dashboard', async () => {
  await render(`#/pay/5042/ui-current/${id}`);
  expect(mocks.load.mock.calls[0][0].deployment?.deploymentId).toBe('ui-current');
  expect(host.textContent).toContain('Read-only deployment'); expect(host.textContent).toContain('0.20 USDC');
  const review = [...host.querySelectorAll('button')].find(button => button.textContent === 'Review payment')!;
  expect(review.disabled).toBe(true); await act(async () => { review.click(); });
  expect(mocks.wallet).not.toHaveBeenCalled(); expect(mocks.prepare).not.toHaveBeenCalled();
  await act(async () => { window.location.hash = '/invoices'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  expect(host.textContent).toContain('Creation and payment are disabled'); expect(mocks.wallet).not.toHaveBeenCalled();
});
it('W2 opens only the active deployment and never upgrades an old deployment route', async () => {
  mocks.accepted = true;
  await render(`#/pay/5042/ui-current/${id}`);
  const review = [...host.querySelectorAll('button')].find(button => button.textContent === 'Review payment')!;
  expect(review.disabled).toBe(false);
  expect(mocks.wallet).toHaveBeenCalled(); mocks.wallet.mockClear();
  await act(async () => { window.location.hash = `/pay/5042/ui-old/${id}`; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  expect([...host.querySelectorAll('button')].find(button => button.textContent === 'Review payment')?.disabled).toBe(true);
  expect(mocks.load.mock.calls[mocks.load.mock.calls.length - 1][0].deployment?.deploymentId).toBe('ui-old');
  expect(mocks.wallet).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
});
it.each([`#/pay/5042002/ui-current/${id}`, `#/receipt/5042/unknown/${id}`])('rejects mismatched and unknown route locators without RPC or wallet: %s', async route => {
  await render(route);
  expect(host.textContent).toContain('Request unavailable');
  for (const call of [mocks.load, mocks.verify, mocks.wallet, mocks.prepare, mocks.send]) expect(call).not.toHaveBeenCalled();
});
it('deployment navigation aborts stale verification and cannot publish the old result', async () => {
  let resolve!: (value: Awaited<ReturnType<NetworkService['verifyNetworkReceipt']>>) => void;
  mocks.verify.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  await render(`#/receipt/5042/ui-old/${id}?tx=${hash}`);
  const oldOptions = mocks.verify.mock.calls[0][3] as { signal: AbortSignal };
  await act(async () => { window.location.hash = `/receipt/5042/ui-current/${id}?tx=${hash}`; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  expect(oldOptions.signal.aborted).toBe(true);
  await act(async () => { resolve({ invoice: { ...invoice, merchant: `0x${'9'.repeat(40)}` }, hash, result: { status: 'PENDING', verified: false, message: 'STALE RESULT', verifiedAt: 0, paymentLogIndex: null, blockHash: null } }); });
  expect(host.textContent).not.toContain(`0x${'9'.repeat(40)}`);
  expect(host.textContent).toContain(`0x${'2'.repeat(40)}`);
});
