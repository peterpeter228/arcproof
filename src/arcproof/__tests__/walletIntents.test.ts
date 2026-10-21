/* eslint-disable typescript/require-await -- Offline Promise-returning dispatch mocks intentionally resolve synchronously. */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage, memoryLocks } from './fixtures/safeBrowser';
import { ARC_TESTNET, TESTNET_DEPLOYMENT } from '../testnet';
import type { IntentInput } from '../walletIntents';
const hash = `0x${'a'.repeat(64)}` as const;
const input: IntentInput = { chainId: ARC_TESTNET.id, deploymentId: TESTNET_DEPLOYMENT.deploymentId, kind: 'create', account: `0x${'1'.repeat(40)}`, to: TESTNET_DEPLOYMENT.contractAddress, data: '0x12345678', value: '0' };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }
beforeEach(() => { vi.resetModules(); vi.stubGlobal('localStorage', memoryStorage()); vi.stubGlobal('navigator', { locks: memoryLocks() }); });
afterEach(() => vi.unstubAllGlobals());
describe('Durable wallet dispatch guards with offline shared-storage/shared-lock models', () => {
  it('persists exact intent before send and retains returned hash', async () => {
    const m = await import('../walletIntents');
    const result = await m.runWalletIntent(input, async (mark) => { expect(localStorage.length).toBe(1); expect(JSON.parse(localStorage.getItem(localStorage.key(0)!)!)).toMatchObject(input); mark(); return hash; });
    expect(result).toBe(hash); expect(m.getWalletIntents()[0]).toMatchObject({ hash, state: 'submitted' });
  });
  it('blocks concurrent separate module realms and never queues a later send', async () => {
    const a = await import('../walletIntents'); vi.resetModules(); const b = await import('../walletIntents');
    const gate = deferred<typeof hash>(); const sendA = vi.fn(async (mark: () => void) => { mark(); return gate.promise; });
    const pending = a.runWalletIntent(input, sendA); const sendB = vi.fn(async () => hash);
    await expect(b.runWalletIntent(input, sendB)).rejects.toThrow('Another tab'); gate.resolve(hash); await pending;
    await expect(b.runWalletIntent(input, sendB)).rejects.toThrow('unresolved'); expect(sendB).not.toHaveBeenCalled();
  });
  it('restores unknown intent after module reload, without timeout release', async () => {
    const a = await import('../walletIntents'); await expect(a.runWalletIntent(input, async (mark) => { mark(); throw new Error('RPC timeout'); })).rejects.toThrow('timeout');
    vi.resetModules(); const b = await import('../walletIntents'); expect(b.getWalletIntents()[0].state).toBe('uncertain');
    const send = vi.fn(async () => hash); await expect(b.runWalletIntent(input, send)).rejects.toThrow('unresolved'); expect(send).not.toHaveBeenCalled();
  });
  it('fails closed before send when Web Locks are unavailable', async () => { vi.stubGlobal('navigator', {}); const m = await import('../walletIntents'); const send = vi.fn(async () => hash); await expect(m.runWalletIntent(input, send)).rejects.toThrow('Web Locks'); expect(send).not.toHaveBeenCalled(); });
  it('fails closed before send when durable write fails', async () => { vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); }); const m = await import('../walletIntents'); const send = vi.fn(async () => hash); await expect(m.runWalletIntent(input, send)).rejects.toThrow('quota'); expect(send).not.toHaveBeenCalled(); });
  it('never releases a corrupt saved intent', async () => { localStorage.setItem(`arcproof:${ARC_TESTNET.id}:${TESTNET_DEPLOYMENT.deploymentId}:intent:bad`, '{}'); const m = await import('../walletIntents'); const send = vi.fn(async () => hash); await expect(m.runWalletIntent(input, send)).rejects.toThrow('unreadable'); expect(send).not.toHaveBeenCalled(); });
  it('releases explicit rejection but keeps generic ambiguous errors', async () => { const m = await import('../walletIntents'); await expect(m.runWalletIntent(input, async (mark, reject) => { mark(); reject(); throw new Error('explicit rejection'); })).rejects.toThrow(); expect(m.getWalletIntents()[0].state).toBe('cancelled'); await expect(m.runWalletIntent(input, async (mark) => { mark(); return hash; })).resolves.toBe(hash); });
  it('readonly payment recovery cannot clear mismatched or unknown status results', async () => {
    const m = await import('../walletIntents'); const payment: IntentInput = { ...input, kind: 'pay', invoiceId: hash };
    await expect(m.runWalletIntent(payment, async (mark) => { mark(); throw new Error('unknown'); })).rejects.toThrow();
    const id = m.getWalletIntents()[0].operationId;
    await expect(m.recoverWalletIntent(id, hash, async () => { throw new Error('wrong identity'); })).rejects.toThrow('wrong identity');
    expect(m.getWalletIntents()[0].state).toBe('uncertain');
    await expect(m.recoverWalletIntent(id, hash, async () => 'reverted')).rejects.toThrow('older matching');
    expect(m.getWalletIntents()[0].state).toBe('uncertain');
    await expect(m.recoverWalletIntent(id, hash, async () => 'included')).resolves.toBe('included');
  });
  it('never unlocks a hashless creation using an older identical call', async () => {
    const m = await import('../walletIntents'); await expect(m.runWalletIntent(input, async (mark) => { mark(); throw new Error('unknown'); })).rejects.toThrow();
    const verify = vi.fn(async () => 'included' as const);
    await expect(m.recoverWalletIntent(m.getWalletIntents()[0].operationId, hash, verify)).rejects.toThrow('wallet nonce');
    expect(verify).not.toHaveBeenCalled(); expect(m.getWalletIntents()[0].state).toBe('uncertain');
  });
  it('preserves durable requesting guard if storage fails after wallet returns', async () => { const m = await import('../walletIntents'); await expect(m.runWalletIntent(input, async (mark) => { mark(); vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); }); return hash; })).rejects.toThrow(hash); expect(JSON.parse(localStorage.getItem(localStorage.key(0)!)!) as unknown).toMatchObject({state:'requesting'}); expect(m.getWalletIntents()[0].hash).toBe(hash); });
});

describe('Per-hash storage and legacy migration', () => {
  it('preserves both hashes when independently loaded tabs save stale snapshots', async () => {
    const a = await import('../submissions'); vi.resetModules(); const b = await import('../submissions');
    const h2 = `0x${'b'.repeat(64)}` as const;
    a.recordSubmission({ hash, kind: 'create', account: input.account, state: 'submitted' });
    b.recordSubmission({ hash: h2, kind: 'create', account: input.account, state: 'submitted' });
    vi.resetModules(); const reload = await import('../submissions');
    expect(reload.getSubmissions().map((row) => row.hash)).toEqual(expect.arrayContaining([hash, h2]));
  });
  it('reads legacy array hashes and lets per-hash recovered status supersede them without deletion', async () => {
    const key = `arcproof:${ARC_TESTNET.id}:${TESTNET_DEPLOYMENT.deploymentId}:submissions`;
    const row = { hash, kind: 'create' as const, account: input.account, state: 'submitted' as const };
    localStorage.setItem(key, JSON.stringify([row]));
    const m = await import('../submissions'); m.updateSubmission(hash, 'reverted');
    vi.resetModules(); const reload = await import('../submissions');
    expect(reload.getSubmissions().find((item) => item.hash === hash)?.state).toBe('reverted');
    expect(localStorage.getItem(key)).toBe(JSON.stringify([row]));
  });
});
