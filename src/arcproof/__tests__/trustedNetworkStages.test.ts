/* eslint-disable typescript/require-await -- Offline RPC and wallet fixtures. */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicClient, Hex } from 'viem';
import { memoryStorage, memoryLocks } from './fixtures/safeBrowser';
import type { NetworkContext } from '../networkPolicy';
import type { DeploymentRecord } from '../manifest';
const id: Hex = `0x${'a'.repeat(64)}`;
const hash: Hex = `0x${'b'.repeat(64)}`;
const account: Hex = `0x${'1'.repeat(40)}`;

async function registry(writesAccepted: boolean) {
  vi.doMock('../manifest', async () => {
    const actual = await vi.importActual<typeof import('../manifest')>('../manifest');
    const { ARC_MAINNET_SETTLEMENT_POLICY } = await vi.importActual<typeof import('../arcSettlement')>('../arcSettlement');
    const base = { chainId: 5042, contractAddress: '0x3Dcd2bDD924BCC384Cb39e9e12038e00fde0FA30', runtimeCodeHash: '0xa36ede95ccce8289224d3bbabe3a2445a888c44e763a04ac4b6f4f2f03dd344c', settlementPolicy: ARC_MAINNET_SETTLEMENT_POLICY, label: 'Closed test registry, not deployment evidence', deployedAt: '2026-10-22T00:00:00Z' } as const;
    return { ...actual, PRODUCTION_MANIFEST: [{ ...base, deploymentId: 'mainnet-current' }, { ...base, deploymentId: 'mainnet-old', contractAddress: `0x${'2'.repeat(40)}` }] };
  });
  vi.doMock('../networkReleasePolicy', () => ({ MAINNET_RELEASE_POLICY: Object.freeze({ activeDeploymentId: 'mainnet-current', writesAccepted }) }));
  const policy = await import('../networkPolicy');
  const clients = await import('../testnetClient');
  return { ...policy, ...clients };
}
beforeEach(() => {
  vi.resetModules(); vi.stubEnv('VITE_ARCPROOF_NETWORK', 'mainnet');
  vi.stubGlobal('localStorage', memoryStorage()); vi.stubGlobal('navigator', { locks: memoryLocks() });
});
afterEach(() => { vi.doUnmock('../manifest'); vi.doUnmock('../networkReleasePolicy'); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('closed source-registry scenarios, never live deployment evidence', () => {
  it('U0 remains inert with the real empty production manifest', async () => {
    const m = await import('../networkPolicy');
    expect(m.networkStage(m.BUILD_NETWORK)).toBe('U0');
    expect(m.MAINNET_CONTEXT.deployment).toBeNull();
    expect(m.canWriteContext(m.MAINNET_CONTEXT)).toBe(false);
    expect(m.getDeploymentContext(m.MAINNET_CONTEXT, 5042, 'mainnet-current')).toBeNull();
  });
  it.each([false, true])('source registry creates R1/W2 with independent release acceptance=%s', async accepted => {
    const m = await registry(accepted);
    expect(m.networkStage(m.MAINNET_CONTEXT)).toBe(accepted ? 'W2' : 'R1');
    expect(m.canWriteContext(m.MAINNET_CONTEXT)).toBe(accepted);
    expect(m.networkCurrency(m.MAINNET_CONTEXT)).toBe('USDC');
    expect(m.networkCurrency(m.TESTNET_CONTEXT)).toBe('test USDC');
    expect(m.getDeploymentContext(m.MAINNET_CONTEXT, 5042, 'mainnet-current')).toBe(m.MAINNET_CONTEXT);
    const old = m.getDeploymentContext(m.MAINNET_CONTEXT, 5042, 'mainnet-old')!;
    expect(m.networkStage(old)).toBe('R1'); expect(m.canWriteContext(old)).toBe(false);
    expect(m.getDeploymentContext(m.MAINNET_CONTEXT, 5042002, 'mainnet-current')).toBeNull();
    expect(m.getDeploymentContext(m.MAINNET_CONTEXT, 5042, 'url-supplied-contract')).toBeNull();
    for (const forged of [{ ...m.MAINNET_CONTEXT }, JSON.parse(JSON.stringify(m.MAINNET_CONTEXT))]) {
      expect(() => m.assertTrustedContext(forged as NetworkContext)).toThrow('Untrusted');
      expect(() => m.createNetworkService(forged as NetworkContext)).toThrow('Untrusted');
    }
  });
  it('R1 fully verifies a synthetic mainnet receipt without a wallet while all write paths stay closed', async () => {
    const m = await registry(false);
    const { observedPaymentFixture } = await import('./fixtures/observedPayment');
    const fixture = observedPaymentFixture();
    const client = {
      getChainId: vi.fn(async () => 5042), getCode: vi.fn(async () => fixture.rpc.getContractCode(fixture.contract)),
      readContract: vi.fn(async () => fixture.invoice), getTransaction: vi.fn(async () => ({ ...fixture.tx, chainId: 5042 })),
      getTransactionReceipt: vi.fn(async () => fixture.receipt), getBlock: vi.fn(async () => fixture.block),
    } as unknown as PublicClient;
    const service = m.getNetworkService(m.MAINNET_CONTEXT);
    const verified = await service.verifyNetworkReceipt(client, fixture.invoiceId, fixture.txHash);
    expect(verified.result.status).toBe('VERIFIED');
    expect(verified.result.settlementEvidence?.policyId).toBe(m.MAINNET_CONTEXT.settlementPolicy.id);
    const session = { account, chainId: 5042, connectionVersion: 1 };
    await expect(service.prepareCreate(client, session, '0.2', 24)).rejects.toThrow('disabled');
    await expect(service.preparePay(client, session, id)).rejects.toThrow('disabled');
    const wallet = { request: vi.fn() };
    await expect(service.sendPreparedAction(client, wallet, {} as import('../testnetClient').PreparedAction, () => session)).rejects.toThrow('disabled');
    expect(() => service.submissions.beginSubmission('create', account)).toThrow('disabled');
    expect(wallet.request).not.toHaveBeenCalled(); expect(localStorage.length).toBe(0);
  });
  it('binds old and current identical invoice IDs to different contract reads, cache keys, stores and links', async () => {
    const m = await registry(true);
    const { observedPaymentFixture } = await import('./fixtures/observedPayment');
    const fixture = observedPaymentFixture();
    const oldContext = m.getDeploymentContext(m.BUILD_NETWORK, 5042, 'mainnet-old')!;
    const old = m.getNetworkService(oldContext), current = m.getNetworkService(m.MAINNET_CONTEXT), testnet = m.getNetworkService(m.TESTNET_CONTEXT);
    const reads = vi.fn(async (_request: { address: string; args: readonly Hex[] }) => fixture.invoice);
    const client = { getChainId: async () => 5042, getCode: async () => fixture.rpc.getContractCode(fixture.contract), readContract: reads } as unknown as PublicClient;
    await old.loadInvoice(client, id); await current.loadInvoice(client, id);
    expect(reads.mock.calls[0][0]).toMatchObject({ address: oldContext.deployment!.contractAddress, args: [id] });
    expect(reads.mock.calls[1][0]).toMatchObject({ address: m.MAINNET_CONTEXT.deployment!.contractAddress, args: [id] });
    expect(new Set([old.paymentCacheKey(id), current.paymentCacheKey(id), testnet.paymentCacheKey(id)]).size).toBe(3);
    old.submissions.recordSubmission({ hash, kind: 'pay', account, invoiceId: id, state: 'submitted' });
    expect(old.submissions.getSubmissions()).toHaveLength(1); expect(current.submissions.getSubmissions()).toEqual([]); expect(testnet.submissions.getSubmissions()).toEqual([]);
    expect(m.networkExplorerTx(oldContext, hash)).toBe(`https://explorer.arc.io/tx/${hash}`);
    expect(m.networkExplorerTx(m.TESTNET_CONTEXT, hash)).toBe(`https://explorer.testnet.arc.io/tx/${hash}`);
    expect(() => old.submissions.beginSubmission('pay', account, id)).toThrow('disabled');
    expect(() => testnet.submissions.beginSubmission('pay', account, id)).toThrow('build network');
    await expect(current.loadInvoice({ ...client, getChainId: async () => 5042002 }, id)).rejects.toThrow('wrong chain');
  });
  it('W2 sends exactly once through its selected chain/deployment and rejects stale or other deployment actions', async () => {
    const m = await registry(true);
    const { observedPaymentFixture } = await import('./fixtures/observedPayment');
    const fixture = observedPaymentFixture();
    const context = m.MAINNET_CONTEXT, service = m.getNetworkService(context);
    const client = {
      getChainId: async () => 5042,
      getCode: async ({ address }: { address: string }) => address.toLowerCase() === account.toLowerCase() ? '0x' : fixture.rpc.getContractCode(fixture.contract),
      getBlock: async () => ({ timestamp: 1792500000n }), call: async () => ({}), estimateGas: async () => 100n,
      getGasPrice: async () => 1n, getBalance: async () => 10n ** 18n,
    } as unknown as PublicClient;
    const session = { account, chainId: 5042, connectionVersion: 1, networkKey: 'mainnet' as const, deploymentId: 'mainnet-current' };
    const action = await service.prepareCreate(client, session, '0.2', 24);
    const wallet = { request: vi.fn(async ({ method }: { method: string }) => method === 'eth_chainId' ? '0x13b2' : method === 'eth_accounts' ? [account] : hash) };
    const old = m.getDeploymentContext(context, 5042, 'mainnet-old')!.deployment as DeploymentRecord;
    await expect(service.sendPreparedAction(client, wallet, { ...action, deployment: old }, () => session)).rejects.toThrow('Prepared deployment');
    expect(wallet.request).not.toHaveBeenCalled();
    expect(() => service.assertSameSession(session, { ...session, deploymentId: 'mainnet-old' })).toThrow('context changed');
    expect(() => service.assertSameSession(session, { ...session, connectionVersion: 2 })).toThrow('context changed');
    await expect(service.sendPreparedAction(client, wallet, action, () => session)).resolves.toBe(hash);
    const sends = wallet.request.mock.calls.filter(([args]) => args.method === 'eth_sendTransaction');
    expect(sends).toHaveLength(1);
    expect(sends[0][0]).toMatchObject({ params: [{ chainId: '0x13b2', to: context.deployment!.contractAddress, value: '0x0' }] });
    await expect(service.sendPreparedAction(client, wallet, action, () => session)).rejects.toThrow('unresolved');
    expect(wallet.request.mock.calls.filter(([args]) => args.method === 'eth_sendTransaction')).toHaveLength(1);
  });
});
