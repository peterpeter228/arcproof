// @vitest-environment jsdom
/* eslint-disable typescript/require-await -- Promise-returning offline mocks. */
import React, { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { formatUnits, type Hex } from 'viem';
import { ARC_TESTNET, TESTNET_DEPLOYMENT, ZERO_TERMS } from '../testnet';
import type { LoadedInvoice } from '../testnetClient';
import type { VerificationResult } from '../receiptVerifier';
import { exportReceiptsJson, type ReceiptExportRecord } from '../exportUtils';
import { OFFLINE_FIXTURE } from '../offlineFixture';
import { deriveInvoiceId } from '../invoiceId';
const mocks = vi.hoisted(() => ({ verify: vi.fn(), wallet: vi.fn(), send: vi.fn(), clipboard: vi.fn<(value: string) => Promise<void>>(), blobs: [] as Blob[] }));
vi.mock('../useTestnetWallet', () => ({ useNetworkWallet: mocks.wallet }));
vi.mock('connectkit', () => ({ ConnectKitButton: () => <button>Connect wallet</button> }));
vi.mock('../testnetClient', async () => { const original = await vi.importActual<typeof import('../testnetClient')>('../testnetClient'); const client = {}; return { ...original, verifyTestnetReceipt: mocks.verify, sendPreparedAction: mocks.send, testnetClient: client, getNetworkService: (context: import('../networkPolicy').NetworkContext) => ({ ...original.getNetworkService(context), client, verifyNetworkReceipt: mocks.verify, sendPreparedAction: mocks.send }) }; });
// The real Layout has its own wallet controls; route tests isolate the selected page.
vi.mock('../../components/arcproof/Layout', () => ({
  Layout: ({ children, hideWallet }: { children: React.ReactNode; hideWallet?: boolean }) => <main>{!hideWallet && <button>Connect wallet</button>}{children}</main>,
  AtomicForwardingWarning: () => null,
}));
import { TestnetReceiptScreen } from '../../components/arcproof/TestnetScreens';
import { ReceiptFacts } from '../../components/arcproof/ReceiptFacts';
import { DashboardScreen } from '../../components/arcproof/DashboardScreen';
import App from '../../App';
const id: Hex = `0x${'a'.repeat(64)}`, hash: Hex = `0x${'b'.repeat(64)}`;
const nextId: Hex = `0x${'c'.repeat(64)}`;
const invoice: LoadedInvoice = {
  invoiceId: id, merchant: '0x7777777777777777777777777777777777777777',
  amountNative: 200000000000000000n, expiresAt: 2000000000n, termsHash: ZERO_TERMS,
  paid: true, payer: '0x8888888888888888888888888888888888888888', paidAt: 1792500000n, paidBlockNumber: 12n,
};
const result: VerificationResult = {
  status: 'VERIFIED', verified: true, message: 'All chain checks passed.', paymentLogIndex: 2,
  blockHash: hash, verifiedAt: 1792500000000, blockNumber: '12', gasFeeNative: '123456789012345',
  settlementEvidence: {
    policyId: 'fixture-policy', nativeEmitter: '0x0000000000000000000000000000000000000001', decimals: 18,
    payerToContractLogIndex: 0, contractToMerchantLogIndex: 1,
    finalizedBlockNumber: '13', finalizedBlockHash: hash, controlled_demo: false,
  },
};
let host: HTMLDivElement, root: Root;
const text = () => host.textContent ?? '';
const button = (label: string) => [...host.querySelectorAll('button')].find(node => node.textContent?.includes(label))!;
async function render(node: React.ReactNode) { await act(async () => { root.render(node); }); }
async function click(label: string) { await act(async () => { button(label).click(); }); }
async function edit(selector: string, value: string) {
  await act(async () => {
    const element = host.querySelector<HTMLInputElement>(selector)!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { resolve, promise };
}
async function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : ''); reader.onerror = reject; reader.readAsText(blob);
  });
}
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetAllMocks(); mocks.blobs = [];
  mocks.verify.mockResolvedValue({ invoice, hash, result });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn((blob: Blob) => { mocks.blobs.push(blob); return 'blob:offline'; }) });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: mocks.clipboard.mockResolvedValue(undefined) } });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  window.history.replaceState(null, '', '/?untrusted=discard#');
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });

describe('Receipt UI, mocked read-only RPC (not browser acceptance)', () => {
  it('auto-verifies a valid deep link once under StrictMode without wallet hooks or sends', async () => {
    await render(<StrictMode><TestnetReceiptScreen invoiceId={id} txHash={hash} /></StrictMode>);
    expect(mocks.verify).toHaveBeenCalledTimes(1);
    expect(mocks.verify).toHaveBeenCalledWith({}, id, hash, { signal: expect.any(AbortSignal) as unknown });
    expect(text()).toContain('Verified testnet payment');
    expect(mocks.wallet).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it('auto-recovers without a hash, but an empty manual form never reads', async () => {
    await render(<TestnetReceiptScreen />); expect(mocks.verify).not.toHaveBeenCalled();
    await render(<TestnetReceiptScreen invoiceId={id} />);
    expect(mocks.verify).toHaveBeenCalledWith({}, id, undefined, { signal: expect.any(AbortSignal) as unknown });
  });
  it('uses the exported record for visible amount, parties, UTC time and precise fee', async () => {
    await render(<TestnetReceiptScreen invoiceId={id} txHash={hash} />); await click('Export testnet JSON');
    const [record] = JSON.parse(await readBlob(mocks.blobs[0])) as ReceiptExportRecord[];
    expect(host.querySelector('[data-receipt-field="amountDisplay"]')?.textContent).toBe(`${record.amountDisplay} test USDC`);
    expect(host.querySelector('[data-receipt-field="merchant"]')?.textContent).toBe(record.merchant);
    expect(host.querySelector('[data-receipt-field="payer"]')?.textContent).toBe(record.payer);
    expect(host.querySelector('[data-receipt-field="paidAt"]')?.textContent).toBe(new Date(Number(record.paidAt) * 1000).toISOString());
    expect(host.querySelector('[data-receipt-field="gasFeeNative"]')?.textContent).toBe(`${formatUnits(BigInt(record.gasFeeNative!), 18)} test USDC`);
    expect(record.gasFeeNative).toBe('123456789012345'); expect(record.amountNative).toBe('200000000000000000');
    expect(text()).toContain('payer → contract (log 0)'); expect(text()).toContain('contract → merchant (log 1)');
  });
  it('keeps controlled_demo separate even when the payment is verified', async () => {
    mocks.verify.mockResolvedValue({ invoice: { ...invoice, payer: invoice.merchant }, hash, result });
    await render(<TestnetReceiptScreen invoiceId={id} txHash={hash} />);
    expect(text()).toContain('Verified testnet payment'); expect(text()).toContain('controlled_demo');
    expect(text()).toContain('Not customer revenue'); await click('Export testnet JSON');
    expect((JSON.parse(await readBlob(mocks.blobs[0])) as ReceiptExportRecord[])[0].controlled_demo).toBe(true);
  });
  it.each(['PENDING', 'UNVERIFIED_ARC_EVIDENCE', 'UNVERIFIED_FINALITY', 'INVALID_NATIVE_TRANSFER'] as const)('does not show green success for %s', async (status) => {
    mocks.verify.mockResolvedValue({ invoice, hash, result: { ...result, status, verified: false, settlementEvidence: undefined, gasFeeNative: null } });
    await render(<TestnetReceiptScreen invoiceId={id} txHash={hash} />);
    expect(text()).not.toContain('Verified testnet payment'); expect(text()).toContain('not verified payment proof');
    expect(host.querySelector('h3')?.className).not.toContain('teal');
    expect(text()).toContain('Unknown (not available from this receipt)'); expect(text()).toContain('Finality: Not established');
  });
  it('shows unknown for missing values rather than zero, epoch time or fabricated amounts', async () => {
    const record: ReceiptExportRecord = { ...OFFLINE_FIXTURE, invoiceId: id, transactionHash: null, paymentLogIndex: null,
      amountNative: null, amountDisplay: null, payer: null, paidAt: null, paidBlockNumber: null, blockHash: null,
      verificationStatus: 'PENDING', mode: 'unknown', gasFeeNative: null };
    await render(<ReceiptFacts record={record} />);
    expect(text()).toContain('Unknown amount'); expect(text()).not.toContain('1970'); expect(text()).not.toContain('0 test USDC');
  });
  it('clears old success and copy state as soon as input changes, without automatic reads on edits', async () => {
    await render(<TestnetReceiptScreen invoiceId={id} txHash={hash} />); await click('Copy verification link');
    await edit('#live-receipt-id', nextId);
    expect(text()).not.toContain('Verified testnet payment'); expect(text()).not.toContain('Verification link copied');
    expect(mocks.verify).toHaveBeenCalledTimes(1);
    await act(async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(mocks.verify).toHaveBeenLastCalledWith({}, nextId, hash, { signal: expect.any(AbortSignal) as unknown });
  });
  it('allows new input while reading and ignores the old result and old finalizer', async () => {
    const old = deferred<unknown>(), fresh = deferred<unknown>();
    mocks.verify.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    await render(<TestnetReceiptScreen invoiceId={id} txHash={hash} />);
    await edit('#live-receipt-id', nextId); await click('Verify from chain');
    await act(async () => { old.resolve({ invoice, hash, result }); });
    expect(text()).not.toContain('Verified testnet payment'); expect(button('Verifying').disabled).toBe(true);
    await act(async () => { fresh.resolve({ invoice: { ...invoice, invoiceId: nextId }, hash, result }); });
    expect(text()).toContain(nextId); expect(text()).toContain('Verified testnet payment');
  });
  it('ignores a late old-route success after navigation', async () => {
    const old = deferred<unknown>(); mocks.verify.mockReturnValueOnce(old.promise).mockRejectedValueOnce(Error('new route unavailable'));
    await render(<TestnetReceiptScreen invoiceId={id} txHash={hash} />);
    await render(<TestnetReceiptScreen invoiceId={nextId} txHash={hash} />);
    await act(async () => { old.resolve({ invoice, hash, result }); });
    expect(text()).not.toContain('Verified testnet payment'); expect(text()).toContain('new route unavailable');
  });
  it('copies only the checked deployment locator, then a new session re-verifies it', async () => {
    await render(<TestnetReceiptScreen invoiceId={id} txHash={hash} />); await click('Copy verification link');
    const link = mocks.clipboard.mock.calls[0][0];
    expect(link).toBe(`${window.location.origin}/#/receipt/${ARC_TESTNET.id}/${TESTNET_DEPLOYMENT.deploymentId}/${id}?tx=${hash}`);
    await render(<p>Other session</p>); window.history.replaceState(null, '', link);
    await render(<App />); expect(mocks.verify).toHaveBeenCalledTimes(2); expect(text()).toContain('Verified testnet payment');
    expect(mocks.wallet).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it('exports offline fixture domain matching its derived invoice ID without proof fields', async () => {
    await render(<DashboardScreen />); await click('Create invoice'); await click('View simulated receipt'); await click('Export simulated JSON');
    const [record] = JSON.parse(await readBlob(mocks.blobs[0])) as ReceiptExportRecord[];
    expect(record.invoiceId).toBe(deriveInvoiceId(record.chainId, record.contract as Hex, OFFLINE_FIXTURE.merchant, 0n));
    expect(record.verificationStatus).toBe('SIMULATED_NOT_VERIFIED'); expect(record.mode).toBe('fixture');
    expect(record.transactionHash).toBeNull(); expect(record.payer).toBeNull(); expect(record.paidAt).toBeNull();
    expect(record.merchant).toBeNull(); expect(record.amountNative).toBeNull(); expect(record.amountDisplay).toBeNull();
    expect(record.schemaVersion).toBe('1.2'); expect(record.verificationVerified).toBe(false);
    expect(exportReceiptsJson([record])).not.toContain('"verified": true');
    expect(mocks.wallet).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
});

describe('Immediate no-wallet route rejection', () => {
  const base = `/${ARC_TESTNET.id}/${TESTNET_DEPLOYMENT.deploymentId}`;
  it.each([
    [`#/receipt/1/${TESTNET_DEPLOYMENT.deploymentId}/${id}`, 'Unsupported network'],
    [`#/receipt/5042002/unknown/${id}`, 'Unsupported deployment'],
    [`#/pay/5042002/unknown/${id}`, 'Unsupported deployment'],
    [`#/receipt${base}`, 'Missing invoice ID'],
    [`#/pay${base}`, 'Missing invoice ID'],
    [`#/pay${base}/0x123`, 'Invalid invoice ID'],
    [`#/receipt${base}/${id}?tx=bad`, 'Invalid transaction hash'],
    [`#/receipt${base}/${id}?tx=`, 'Invalid transaction hash'],
    [`#/receipt${base}/${id}?tx=${hash}&tx=${hash}`, 'Invalid transaction hash'],
  ])('rejects %s immediately', async (path, reason) => {
    window.history.replaceState(null, '', path); await render(<App />);
    expect(text()).toContain(reason); expect(text()).toContain('Nothing is being submitted or awaited');
    expect(text()).not.toContain('Connect wallet'); expect(text()).not.toContain('Switch networks'); expect(text()).not.toContain('Verifying');
    expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.wallet).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
    expect(host.querySelectorAll('a')).toHaveLength(1); expect(host.querySelector('a')?.getAttribute('href')).toBe('#');
  });
});


describe('Independent integration: complete route identity', () => {
  it('same invoice/new transaction route resets inputs and suppresses old exports', async () => {
    const nextHash: Hex = `0x${'d'.repeat(64)}`;
    window.history.replaceState(null, '', `#/receipt/${ARC_TESTNET.id}/${TESTNET_DEPLOYMENT.deploymentId}/${id}?tx=${hash}`);
    await render(<App />); expect(text()).toContain('Verified testnet payment');
    const pending = deferred<unknown>(); mocks.verify.mockReturnValueOnce(pending.promise);
    await act(async () => {
      window.history.replaceState(null, '', `#/receipt/${ARC_TESTNET.id}/${TESTNET_DEPLOYMENT.deploymentId}/${id}?tx=${nextHash}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(host.querySelector<HTMLInputElement>('#live-receipt-tx')?.value).toBe(nextHash);
    expect(text()).not.toContain('Verified testnet payment'); expect(text()).not.toContain('Export testnet JSON');
    expect(mocks.verify).toHaveBeenLastCalledWith({}, id, nextHash, { signal: expect.any(AbortSignal) as unknown });
    await act(async () => { pending.resolve({invoice,hash:nextHash,result}); });
    await click('Export testnet JSON');
    expect((JSON.parse(await readBlob(mocks.blobs[0])) as ReceiptExportRecord[])[0].transactionHash).toBe(nextHash);
    expect(mocks.wallet).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
});

it('clears receipt-copy success before a failed retry and ignores older clipboard results', async () => {
  await render(<TestnetReceiptScreen invoiceId={id} txHash={hash} />);
  await click('Copy verification link'); expect(text()).toContain('Verification link copied');
  mocks.clipboard.mockRejectedValueOnce(Error('clipboard blocked'));
  await click('Verification link copied'); expect(text()).not.toContain('Verification link copied');
  expect(text()).toContain('Clipboard access was unavailable');
  const old = deferred<void>(); mocks.clipboard.mockReturnValueOnce(old.promise);
  await click('Copy verification link'); mocks.clipboard.mockRejectedValueOnce(Error('newer copy failed'));
  await click('Copy verification link'); await act(async () => old.resolve());
  expect(text()).not.toContain('Verification link copied');
});
