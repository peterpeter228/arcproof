import { describe, it, expect } from 'vitest';
import { encodeAbiParameters, keccak256 } from 'viem';
import artifact from '../../../evidence/g1/ArcProofInvoices.artifact.json';
import { ARC_TESTNET, TESTNET_DEPLOYMENT, TESTNET_MANIFEST, assertTestnetDeployment, isBytes32 } from '../testnet';
import { PRODUCTION_MANIFEST } from '../manifest';
import type { DeploymentRecord } from '../manifest';
import { ARCPROOF_ABI } from '../arcproofAbi';

describe('Dedicated Arc Testnet identity (offline artifact checks)', () => {
  it('keeps mainnet unconfigured', () => { expect(PRODUCTION_MANIFEST).toHaveLength(0); expect(ARC_TESTNET.id).toBe(5042002); expect(ARC_TESTNET.testnet).toBe(true); });
  it('has exactly one immutable trusted testnet record', () => { expect(TESTNET_MANIFEST).toHaveLength(1); expect(Object.isFrozen(TESTNET_DEPLOYMENT)).toBe(true); expect(Object.isFrozen(TESTNET_MANIFEST)).toBe(true); });
  it('matches the complete compiled runtime', () => { expect(keccak256(artifact.deployedBytecode.object as `0x${string}`)).toBe(TESTNET_DEPLOYMENT.runtimeCodeHash); });
  it('derives deployment identity from chain and address', () => { expect(keccak256(encodeAbiParameters([{type:'uint256'},{type:'address'}],[5042002n,TESTNET_DEPLOYMENT.contractAddress]))).toBe(TESTNET_DEPLOYMENT.deploymentId); });
  it('accepts only the trusted address/runtime tuple', () => { expect(() => assertTestnetDeployment(TESTNET_DEPLOYMENT)).not.toThrow(); });
  it.each<Partial<DeploymentRecord>>([{chainId:1},{chainId:5042},{deploymentId:'other'},{contractAddress:'0x1111111111111111111111111111111111111111' as const},{runtimeCodeHash:`0x${'f'.repeat(64)}`}])('rejects a changed deployment %j', (change) => { expect(() => assertTestnetDeployment({...TESTNET_DEPLOYMENT,...change})).toThrow(); });
  it('does not accept malformed invoice or transaction IDs', () => { for(const id of ['', '0x', `0x${'g'.repeat(64)}`, `0x${'a'.repeat(63)}`]) expect(isBytes32(id)).toBe(false); expect(isBytes32(`0x${'a'.repeat(64)}`)).toBe(true); });
  it('uses the exact paidAt uint64 output from the artifact', () => { const fn=ARCPROOF_ABI.find(x => x.type==='function' && x.name==='getInvoice'); expect(JSON.stringify(fn)).toContain('"name":"paidAt","type":"uint64"'); });
});
