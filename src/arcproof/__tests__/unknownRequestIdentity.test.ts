/* eslint-disable typescript/require-await -- Offline callback mocks. */
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { PublicClient } from 'viem';
import { ARC_TESTNET, TESTNET_DEPLOYMENT } from '../testnet';
import { memoryStorage, memoryLocks } from './fixtures/safeBrowser';
import type { IntentInput } from '../walletIntents';
const hash = `0x${'a'.repeat(64)}` as const;
const otherHash = `0x${'b'.repeat(64)}` as const;
const input: IntentInput = { chainId: ARC_TESTNET.id, deploymentId: TESTNET_DEPLOYMENT.deploymentId, kind: 'pay', invoiceId: hash, account: `0x${'1'.repeat(40)}`, to: TESTNET_DEPLOYMENT.contractAddress, data: '0x12345678', value: '1' };
beforeEach(() => { vi.resetModules(); vi.stubGlobal('localStorage', memoryStorage()); vi.stubGlobal('navigator', { locks: memoryLocks() }); });
afterEach(() => vi.unstubAllGlobals());
it.each(['included', 'reverted'] as const)('a matching candidate %s never identifies a hashless original payment', async outcome => {
  const m = await import('../walletIntents');
  await expect(m.runWalletIntent(input, async mark => { mark(); throw Error('transport unknown'); })).rejects.toThrow('unknown');
  const original = { ...m.getWalletIntents()[0] };
  const verify = vi.fn(async () => outcome);
  await expect(m.recoverWalletIntent(original.operationId, hash, verify)).rejects.toThrow('hashless');
  expect(verify).not.toHaveBeenCalled();
  expect(m.getWalletIntents()[0]).toEqual(original);
  const send = vi.fn(async () => hash);
  await expect(m.runWalletIntent(input, send)).rejects.toThrow('unresolved');
  expect(send).not.toHaveBeenCalled();
});
it.each(['pay', 'create'] as const)('preserves a durable requesting %s after reload', async kind => {
  const original = { ...input, kind, operationId: '11111111-1111-4111-8111-111111111111', state: 'requesting' };
  localStorage.setItem(`arcproof:${input.chainId}:${input.deploymentId}:intent:${original.operationId}`, JSON.stringify(original));
  const m = await import('../walletIntents');
  await expect(m.recoverWalletIntent(original.operationId, hash, async () => 'included')).rejects.toThrow('hashless');
  expect(m.getWalletIntents()[0]).toEqual(original);
});
it.each(['included', 'reverted'] as const)('known exact hash can still become %s', async outcome => {
  const m = await import('../walletIntents');
  await m.runWalletIntent(input, async mark => { mark(); return hash; });
  const original = m.getWalletIntents()[0];
  const verify = vi.fn(async () => outcome);
  await expect(m.recoverWalletIntent(original.operationId, otherHash, verify)).rejects.toThrow('different hash');
  expect(verify).not.toHaveBeenCalled();
  await expect(m.recoverWalletIntent(original.operationId, hash, verify)).resolves.toBe(outcome);
  expect(m.getWalletIntents()[0]).toMatchObject({ hash, state: outcome });
});
it('service never runs candidate RPC validation or releases an original hashless request', async () => {
  const m = await import('../walletIntents');
  const submissions = await import('../submissions');
  const request = submissions.beginSubmission('pay', input.account, input.invoiceId);
  request.uncertain();
  await expect(m.runWalletIntent(input, async mark => { mark(); throw Error('unknown'); })).rejects.toThrow();
  const original = { ...m.getWalletIntents()[0] };
  const client = { getChainId: vi.fn(async () => ARC_TESTNET.id) };
  const service = await import('../testnetClient');
  await expect(service.recoverUnknownSubmission(client as unknown as PublicClient, original.operationId, hash)).rejects.toThrow('hashless');
  expect(client.getChainId).not.toHaveBeenCalled();
  expect(m.getWalletIntents()[0]).toEqual(original);
  expect(submissions.getSubmissions()).toEqual([]);
  expect(() => submissions.beginSubmission('pay', input.account, input.invoiceId)).toThrow('unresolved');
});
it('independent successful invoice verification leaves the original hashless request and duplicate guard untouched (synthetic fixture)', async () => {
  const { observedPaymentFixture } = await import('./fixtures/observedPayment');
  const fixture = observedPaymentFixture();
  const m = await import('../walletIntents');
  const candidateInput: IntentInput = { ...input, invoiceId: fixture.invoiceId, account: fixture.payer, data: fixture.tx.input, value: fixture.amount.toString() };
  await expect(m.runWalletIntent(candidateInput, async mark => { mark(); throw Error('unknown'); })).rejects.toThrow();
  const original = { ...m.getWalletIntents()[0] };
  const client = {
    getChainId: () => fixture.rpc.getChainId(), getCode: () => fixture.rpc.getContractCode(fixture.contract),
    readContract: () => Promise.resolve(fixture.invoice), getTransaction: () => Promise.resolve(fixture.tx),
    getTransactionReceipt: () => Promise.resolve(fixture.receipt), getBlock: () => Promise.resolve(fixture.block),
  } as unknown as PublicClient;
  const { verifyTestnetReceipt } = await import('../testnetClient');
  const result = await verifyTestnetReceipt(client, fixture.invoiceId, fixture.txHash);
  expect(result.result.verified).toBe(true);
  expect(m.getWalletIntents()[0]).toEqual(original);
  const send = vi.fn(async () => hash);
  await expect(m.runWalletIntent(candidateInput, send)).rejects.toThrow('unresolved');
  expect(send).not.toHaveBeenCalled();
  const { getSubmissions } = await import('../submissions');
  expect(getSubmissions()).toEqual([]);
});
it('retains the actual callback hash as memory-only after post-send persistence fails, never unlocks, and loses it on reload', async () => {
  const m = await import('../walletIntents');
  const originalSet = localStorage.setItem.bind(localStorage);
  vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    const parsed: unknown = JSON.parse(value);
    if (key.includes(':intent:') && parsed && typeof parsed === 'object' && 'hash' in parsed && parsed.hash) throw Error('post-callback storage denied');
    originalSet(key, value);
  });
  const send = vi.fn(async (mark: () => void) => { mark(); return hash; });
  await expect(m.runWalletIntent(input, send)).rejects.toThrow('persistence failed');
  const retained = m.getWalletIntents()[0];
  expect(retained).toMatchObject({ hash, hashPersistence: 'memory-only', state: 'submitted' });
  const persisted: unknown = JSON.parse(localStorage.getItem(`arcproof:${input.chainId}:${input.deploymentId}:intent:${retained.operationId}`)!);
  expect(persisted).not.toHaveProperty('hash');
  expect(persisted).toMatchObject({ state: 'requesting' });
  await expect(m.runWalletIntent(input, send)).rejects.toThrow('unresolved');
  expect(send).toHaveBeenCalledTimes(1);
  await expect(m.recoverWalletIntent(retained.operationId, hash, vi.fn())).rejects.toThrow('hashless');
  vi.resetModules();
  const reloaded = await import('../walletIntents');
  expect(reloaded.getWalletIntents()[0].hash).toBeUndefined();
  await expect(reloaded.recoverWalletIntent(retained.operationId, hash, vi.fn())).rejects.toThrow('hashless');
  await expect(reloaded.runWalletIntent(input, send)).rejects.toThrow('unresolved');
  expect(send).toHaveBeenCalledTimes(1);
});
