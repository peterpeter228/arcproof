/* eslint-disable typescript/require-await -- Offline-only Promise mocks. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Address, Hex, PublicClient } from 'viem';
import { MAINNET_CONTEXT, TESTNET_CONTEXT, BUILD_NETWORK, canWriteContext, getNetworkContext, assertContextDeployment, classifyDeployment, networkStage, type NetworkContext } from '../networkPolicy';
import { ARC_MAINNET_SETTLEMENT_POLICY, ARC_TESTNET_SETTLEMENT_POLICY, isSupportedSettlementPolicy } from '../arcSettlement';
import { TESTNET_DEPLOYMENT } from '../testnet';
import { FIXTURE_MANIFEST, PRODUCTION_MANIFEST } from '../manifest';
import { createNetworkService, type PreparedAction, type Session } from '../testnetClient';
import { createWalletIntentStore, type IntentInput } from '../walletIntents';
import { createSubmissionStore } from '../submissions';
import { memoryLocks, memoryStorage } from './fixtures/safeBrowser';

const hash: Hex = `0x${'a'.repeat(64)}`;
const account: Address = `0x${'1'.repeat(40)}`;
const session: Session = { account, chainId: 5042002, connectionVersion: 1 };
const input: IntentInput = { chainId: 5042002, deploymentId: TESTNET_DEPLOYMENT.deploymentId, kind: 'pay', account, invoiceId: hash, to: TESTNET_DEPLOYMENT.contractAddress, data: '0x12345678', value: '1' };
beforeEach(() => { vi.stubGlobal('localStorage', memoryStorage()); vi.stubGlobal('navigator', { locks: memoryLocks() }); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Closed network registry, not live mainnet acceptance', () => {
  it('defaults to testnet and keeps mainnet writes off this build', () => {
    expect(BUILD_NETWORK).toBe(TESTNET_CONTEXT);
    expect(PRODUCTION_MANIFEST).toHaveLength(1);
    expect(MAINNET_CONTEXT.deployment?.contractAddress).toBe('0xd6b1C2A7F6C406E6BbB981F66847aff60D6600eE');
    expect(MAINNET_CONTEXT.deployment?.deploymentId).toBe('0x3157f8feee81d6f2447756a99f6a12c88dff63d7165ca521322e0cc7ace2c2aa');
    expect(MAINNET_CONTEXT.writesEnabled).toBe(true);
    expect(networkStage(MAINNET_CONTEXT)).toBe('W2');
    expect(canWriteContext(MAINNET_CONTEXT)).toBe(false);
    expect(classifyDeployment(PRODUCTION_MANIFEST[0])).toBe('mainnet');
    expect(MAINNET_CONTEXT.chain.id).toBe(5042);
    expect(MAINNET_CONTEXT.chain.nativeCurrency.decimals).toBe(18);
    expect(Object.isFrozen(MAINNET_CONTEXT.chain.rpcUrls.default.http)).toBe(true);
  });
  it('rejects unknown selectors and structurally forged contexts', () => {
    for (const key of ['', 'test', 'https://evil.invalid', 'mainnet ', 5042, null]) expect(() => getNetworkContext(key)).toThrow('Unsupported');
    const forged = { ...TESTNET_CONTEXT, chain: { ...TESTNET_CONTEXT.chain, id: 5042 } } as NetworkContext;
    expect(() => createNetworkService(forged)).toThrow('Untrusted');
    expect(() => createWalletIntentStore(forged)).toThrow('Untrusted');
    expect(() => createSubmissionStore(forged)).toThrow('Untrusted');
  });
  it('binds policy ID, chain, emitter, decimals and finalized-only policy', () => {
    expect(isSupportedSettlementPolicy(ARC_MAINNET_SETTLEMENT_POLICY, 5042)).toBe(true);
    expect(isSupportedSettlementPolicy(ARC_TESTNET_SETTLEMENT_POLICY, 5042)).toBe(false);
    expect(isSupportedSettlementPolicy({ ...ARC_MAINNET_SETTLEMENT_POLICY, chainId: 5042002 }, 5042)).toBe(false);
    expect(isSupportedSettlementPolicy({ ...ARC_MAINNET_SETTLEMENT_POLICY, emitter: account }, 5042)).toBe(false);
    expect(() => assertContextDeployment(MAINNET_CONTEXT, { ...TESTNET_DEPLOYMENT, chainId: 5042, settlementPolicy: ARC_MAINNET_SETTLEMENT_POLICY })).toThrow('Untrusted');
    expect(() => assertContextDeployment(TESTNET_CONTEXT, { ...TESTNET_DEPLOYMENT, settlementPolicy: ARC_MAINNET_SETTLEMENT_POLICY })).toThrow('Untrusted');
  });
  it('does not promote a chain number or a user-controlled label to trusted evidence', () => {
    expect(classifyDeployment(FIXTURE_MANIFEST[0])).toBe('fixture');
    expect(classifyDeployment(TESTNET_DEPLOYMENT)).toBe('testnet');
    expect(classifyDeployment({ ...TESTNET_DEPLOYMENT, label: 'Mainnet' })).toBe('testnet');
    expect(classifyDeployment({ ...TESTNET_DEPLOYMENT, contractAddress: account })).toBe('unknown');
    expect(classifyDeployment({ ...TESTNET_DEPLOYMENT, chainId: 5042 })).toBe('unknown');
  });
});

describe('Mainnet writes stay on the mainnet build', () => {
  it('rejects preparation, send and recovery from the testnet build before any wallet call', async () => {
    const service = createNetworkService(MAINNET_CONTEXT);
    const rpc = { getChainId: vi.fn(), getCode: vi.fn(), readContract: vi.fn(), getBlock: vi.fn(), getTransaction: vi.fn(), getTransactionReceipt: vi.fn() };
    const client = rpc as unknown as PublicClient;
    const wallet = { request: vi.fn() };
    const write = vi.spyOn(localStorage, 'setItem');
    await expect(service.prepareCreate(client, session, '0.1', 1)).rejects.toThrow('build network');
    await expect(service.preparePay(client, session, hash)).rejects.toThrow('build network');
    await expect(service.sendPreparedAction(client, wallet, {} as PreparedAction, () => session)).rejects.toThrow('build network');
    await expect(service.recoverUnknownSubmission(client, 'unused', hash)).rejects.toThrow('unresolved');
    expect(service.paymentCacheKey(hash)).toContain('5042');
    for (const fn of Object.values(rpc)) expect(fn).not.toHaveBeenCalled();
    expect(wallet.request).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
  it('preserves old unresolved testnet intent and isolates mainnet stores and leases', async () => {
    const testnet = createWalletIntentStore(TESTNET_CONTEXT);
    const mainnet = createWalletIntentStore(MAINNET_CONTEXT);
    await expect(testnet.runWalletIntent(input, async (requested) => { requested(); throw new Error('outcome uncertain'); })).rejects.toThrow('uncertain');
    const stored = Array.from({ length: localStorage.length }, (_, i) => { const key = localStorage.key(i)!; return [key, localStorage.getItem(key)]; });
    const row = testnet.getWalletIntents().find((x) => x.invoiceId === hash)!;
    expect(row.state).toBe('uncertain');
    const callback = vi.fn();
    await expect(mainnet.runWalletIntent(input, callback)).rejects.toThrow('build network');
    await expect(mainnet.recoverWalletIntent(row.operationId, hash, callback)).rejects.toThrow('unresolved');
    expect(mainnet.getWalletIntents()).toEqual([]);
    const submissions = createSubmissionStore(MAINNET_CONTEXT);
    expect(submissions.getSubmissions()).toEqual([]);
    expect(() => submissions.beginSubmission('pay', account, hash)).toThrow('build network');
    expect(callback).not.toHaveBeenCalled();
    for (const [key, value] of stored) expect(localStorage.getItem(key!)).toBe(value);
    await expect(testnet.runWalletIntent(input, callback)).rejects.toThrow('unresolved');
    await expect(testnet.recoverWalletIntent(row.operationId, hash, callback)).rejects.toThrow('hashless');
    expect(callback).not.toHaveBeenCalled();
  });
  it('does not bypass a legacy pending guard when an unrelated saved row is corrupt', () => {
    const prefix = `arcproof:5042002:${TESTNET_DEPLOYMENT.deploymentId}:submissions`;
    localStorage.setItem(prefix, JSON.stringify([{ hash, account, invoiceId: hash, kind: 'pay', state: 'submitted' }]));
    localStorage.setItem(`${prefix}:hash:unrelated-corrupt`, '{broken');
    const store = createSubmissionStore(TESTNET_CONTEXT);
    expect(() => store.beginSubmission('pay', account, hash)).toThrow('unreadable');
    expect(localStorage.getItem(`${prefix}:hash:unrelated-corrupt`)).toBe('{broken');
    expect(localStorage.getItem(prefix)).toContain(hash);
  });
  it('blocks dispatch when a legacy saved payment has lost its invoice scope', () => {
    const prefix = `arcproof:5042002:${TESTNET_DEPLOYMENT.deploymentId}:submissions`;
    const legacy = JSON.stringify([{ hash, account, kind: 'pay', state: 'submitted' }]);
    localStorage.setItem(prefix, legacy);
    const store = createSubmissionStore(TESTNET_CONTEXT);
    expect(() => store.beginSubmission('pay', account, hash)).toThrow('unreadable');
    expect(() => store.beginSubmission('create', account)).toThrow('unreadable');
    expect(localStorage.getItem(prefix)).toBe(legacy);
  });
  it('rejects wrong session context/deployment before preparation RPC', async () => {
    const service = createNetworkService(TESTNET_CONTEXT);
    expect(() => service.assertSameSession(session, { ...session, networkKey: 'mainnet' })).toThrow('context changed');
    expect(() => service.assertSameSession(session, { ...session, deploymentId: 'other' })).toThrow('context changed');
    expect(() => service.assertSameSession(session, { ...session, chainId: 5042 })).toThrow('context changed');
    const rpc = { getChainId: vi.fn(), getCode: vi.fn(), readContract: vi.fn() };
    const client = rpc as unknown as PublicClient;
    await expect(service.prepareCreate(client, { ...session, networkKey: 'mainnet' }, '0.1', 1)).rejects.toThrow('context changed');
    await expect(service.preparePay(client, { ...session, deploymentId: 'other' }, hash)).rejects.toThrow('context changed');
    for (const fn of Object.values(rpc)) expect(fn).not.toHaveBeenCalled();
  });
});
