import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { memoryLocks, memoryStorage } from '../../src/arcproof/__tests__/fixtures/safeBrowser';
import { ARC_TESTNET, TESTNET_DEPLOYMENT } from '../../src/arcproof/testnet';
import { runWalletIntent, type IntentInput } from '../../src/arcproof/walletIntents';

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('navigator', { locks: memoryLocks() });
});
afterEach(() => { vi.unstubAllGlobals(); });
const valid: IntentInput = {
  chainId: ARC_TESTNET.id, deploymentId: TESTNET_DEPLOYMENT.deploymentId,
  kind: 'create', account: '0x1111111111111111111111111111111111111111',
  to: TESTNET_DEPLOYMENT.contractAddress, data: '0x1234', value: '0',
};
it('rejecting a malformed preflight target cannot poison storage for a later valid request', async () => {
  // This callback represents sendPreparedActionOnce rejecting before wallet dispatch.
  await expect(runWalletIntent({ ...valid, to: '0x2222222222222222222222222222222222222222' }, async () => {
    throw new Error('Transaction target changed.');
  })).rejects.toThrow();
  const send = vi.fn(async () => `0x${'1'.repeat(64)}` as const);
  await expect(runWalletIntent(valid, send)).resolves.toBe(`0x${'1'.repeat(64)}`);
  expect(send).toHaveBeenCalledTimes(1);
});
