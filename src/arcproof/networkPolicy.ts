/** Closed application-owned network registry. Build selection is not deployment evidence. */
import { defineChain, type Chain, type Hex } from 'viem';
import { ARC_TESTNET, TESTNET_DEPLOYMENT, TESTNET_MANIFEST } from './testnet';
import { FIXTURE_MANIFEST, PRODUCTION_MANIFEST, type DeploymentRecord } from './manifest';
import { ARC_MAINNET_SETTLEMENT_POLICY, ARC_TESTNET_SETTLEMENT_POLICY, isSupportedSettlementPolicy, type ArcSettlementPolicy } from './arcSettlement';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
export const ARC_MAINNET = deepFreeze(defineChain({
  id: 5042,
  name: 'Arc Mainnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.arc.io'] } },
  blockExplorers: { default: { name: 'Arc Explorer', url: 'https://explorer.arc.io' } },
  testnet: false,
}));
export interface NetworkContext {
  readonly key: 'testnet' | 'mainnet';
  readonly chain: Chain;
  readonly label: string;
  readonly manifest: readonly DeploymentRecord[];
  readonly deployment: DeploymentRecord | null;
  readonly settlementPolicy: ArcSettlementPolicy;
  readonly writesEnabled: boolean;
}
export const TESTNET_CONTEXT: NetworkContext = deepFreeze({
  key: 'testnet', chain: ARC_TESTNET, label: 'Arc Testnet', manifest: TESTNET_MANIFEST,
  deployment: TESTNET_DEPLOYMENT, settlementPolicy: ARC_TESTNET_SETTLEMENT_POLICY, writesEnabled: true,
});
export const MAINNET_CONTEXT: NetworkContext = deepFreeze({
  key: 'mainnet', chain: ARC_MAINNET, label: 'Arc Mainnet', manifest: PRODUCTION_MANIFEST,
  deployment: null, settlementPolicy: ARC_MAINNET_SETTLEMENT_POLICY, writesEnabled: false,
});
/** No arbitrary RPC, address or imported manifest configuration is accepted. */
export function getNetworkContext(key: unknown): NetworkContext {
  if (key === 'testnet') return TESTNET_CONTEXT;
  if (key === 'mainnet') return MAINNET_CONTEXT;
  throw new Error('Unsupported ArcProof build network. Use testnet or mainnet.');
}
export const BUILD_NETWORK = getNetworkContext(import.meta.env.VITE_ARCPROOF_NETWORK ?? 'testnet');
export function assertTrustedContext(context: NetworkContext): void {
  if (context !== TESTNET_CONTEXT && context !== MAINNET_CONTEXT) throw new Error('Untrusted network context.');
}
export function requireTrustedDeployment(context: NetworkContext): DeploymentRecord {
  assertTrustedContext(context);
  if (!context.deployment) throw new Error('No trusted mainnet deployment. Mainnet reads, preparation and sends are disabled.');
  assertContextDeployment(context, context.deployment);
  return context.deployment;
}
export function assertContextDeployment(context: NetworkContext, deployment: DeploymentRecord): void {
  assertTrustedContext(context);
  const trusted = context.manifest.find((row) => row.deploymentId === deployment.deploymentId && row.chainId === deployment.chainId);
  if (!trusted || deployment.chainId !== context.chain.id || !isSupportedSettlementPolicy(deployment.settlementPolicy, context.chain.id) ||
    deployment.settlementPolicy?.id !== context.settlementPolicy.id ||
    trusted.contractAddress.toLowerCase() !== deployment.contractAddress.toLowerCase() ||
    trusted.runtimeCodeHash.toLowerCase() !== deployment.runtimeCodeHash.toLowerCase() || trusted.deployedAt !== deployment.deployedAt) {
    throw new Error('Untrusted deployment for selected network.');
  }
}
export function assertWritesEnabled(context: NetworkContext): void {
  assertWritesEnabledFor(context, BUILD_NETWORK);
}
/** Writes need both a write-enabled context and that context being this build's fixed network. */
export function assertWritesEnabledFor(context: NetworkContext, build: NetworkContext): void {
  assertTrustedContext(context);
  assertTrustedContext(build);
  if (!context.writesEnabled) throw new Error('Mainnet wallet actions are disabled: no trusted deployment or release acceptance.');
  if (context !== build) throw new Error('Wallet actions are limited to this build network.');
  requireTrustedDeployment(context);
}
export function networkExplorerTx(context: NetworkContext, hash: Hex): string {
  assertTrustedContext(context);
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error('Invalid transaction hash.');
  return `${context.chain.blockExplorers!.default.url}/tx/${hash}`;
}
/** Caller labels and chain IDs alone never promote exported evidence. */
export function classifyDeployment(deployment: DeploymentRecord): 'fixture' | 'testnet' | 'mainnet' | 'unknown' {
  const fixture = FIXTURE_MANIFEST.some((row) => row.chainId === deployment.chainId && row.deploymentId === deployment.deploymentId &&
    row.contractAddress.toLowerCase() === deployment.contractAddress.toLowerCase() && row.runtimeCodeHash.toLowerCase() === deployment.runtimeCodeHash.toLowerCase() && deployment.deployedAt === null);
  if (fixture) return 'fixture';
  for (const context of [TESTNET_CONTEXT, MAINNET_CONTEXT]) {
    try { assertContextDeployment(context, deployment); return context.key; } catch { /* Unknown stays unknown. */ }
  }
  return 'unknown';
}
