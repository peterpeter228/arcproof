/* eslint-disable typescript/require-await -- Deterministic Promise-returning mocks. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryLocks, memoryStorage } from './fixtures/safeBrowser';
import { ARC_TESTNET, TESTNET_DEPLOYMENT } from '../testnet';
import type { IntentInput } from '../walletIntents';
const hash = `0x${'e'.repeat(64)}` as const;
const input: IntentInput = {chainId:ARC_TESTNET.id,deploymentId:TESTNET_DEPLOYMENT.deploymentId,kind:'create',account:`0x${'1'.repeat(40)}`,to:TESTNET_DEPLOYMENT.contractAddress,data:'0x12345678',value:'0'};
beforeEach(() => {vi.resetModules();vi.stubGlobal('localStorage',memoryStorage());vi.stubGlobal('navigator',{locks:memoryLocks()});});
afterEach(() => {vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('Independent integration: invalid new intents cannot poison durable storage', () => {
  it.each([
    ['target',{to:`0x${'2'.repeat(40)}`}], ['deployment',{deploymentId:'unknown'}], ['chain',{chainId:1}],
    ['data',{data:'0xZZ'}], ['account',{account:'invalid'}], ['value',{value:'-1'}], ['kind',{kind:'other'}],
  ])('rejects invalid %s before writing or dispatch, then permits a legitimate call', async (_name, fields) => {
    const m=await import('../walletIntents');const send=vi.fn(async (mark:()=>void)=>{mark();return hash;});
    await expect(m.runWalletIntent({...input,...fields} as unknown as IntentInput,send)).rejects.toThrow('Invalid wallet intent');
    expect(send).not.toHaveBeenCalled();expect(localStorage.length).toBe(0);
    await expect(m.runWalletIntent(input,send)).resolves.toBe(hash);expect(send).toHaveBeenCalledTimes(1);
  });
  it('still fails closed on an already corrupt persisted intent', async () => {
    localStorage.setItem(`arcproof:${ARC_TESTNET.id}:${TESTNET_DEPLOYMENT.deploymentId}:intent:bad`,'{}');
    const m=await import('../walletIntents');const send=vi.fn(async()=>hash);
    await expect(m.runWalletIntent(input,send)).rejects.toThrow('unreadable');expect(send).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(1);
  });
});
