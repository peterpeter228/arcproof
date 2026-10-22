/** Closed application-owned network registry. Build selection is not deployment evidence. */
import { defineChain, type Chain, type Hex } from 'viem';
import { ARC_TESTNET, TESTNET_DEPLOYMENT, TESTNET_MANIFEST } from './testnet';
import { FIXTURE_MANIFEST, PRODUCTION_MANIFEST, type DeploymentRecord } from './manifest';
import { MAINNET_RELEASE_POLICY } from './networkReleasePolicy';
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
/** Only this module can register contexts. Copies, JSON and caller-built objects are rejected. */
const trustedContexts = new WeakSet<NetworkContext>();
const deploymentContexts = new Map<string, NetworkContext>();
function registerNetwork(base: Omit<NetworkContext, 'deployment' | 'writesEnabled'>, activeId: string | null, writesAccepted: boolean): NetworkContext {
  const active = base.manifest.find(row => row.deploymentId === activeId) ?? base.manifest[0] ?? null;
  // An explicitly selected but absent active deployment must not silently enable another one.
  const writeId = activeId && base.manifest.some(row => row.deploymentId === activeId) ? activeId : null;
  const make = (deployment: DeploymentRecord | null): NetworkContext => {
    const context = deepFreeze({ ...base, deployment, writesEnabled: !!deployment && writesAccepted && deployment.deploymentId === writeId });
    trustedContexts.add(context);
    if (deployment) deploymentContexts.set(`${base.key}:${deployment.deploymentId}`, context);
    return context;
  };
  for (const row of base.manifest) {
    if (row.chainId !== base.chain.id || !row.deployedAt || !isSupportedSettlementPolicy(row.settlementPolicy, base.chain.id) || row.settlementPolicy?.id !== base.settlementPolicy.id ||
        !/^0x[0-9a-fA-F]{40}$/.test(row.contractAddress) || /^0x0{40}$/i.test(row.contractAddress) || !/^0x[0-9a-fA-F]{64}$/.test(row.runtimeCodeHash) ||
        deploymentContexts.has(`${base.key}:${row.deploymentId}`)) throw new Error('Invalid closed deployment registry.');
    make(row);
  }
  return active ? deploymentContexts.get(`${base.key}:${active.deploymentId}`)! : make(null);
}
export const TESTNET_CONTEXT = registerNetwork({
  key: 'testnet', chain: ARC_TESTNET, label: 'Arc Testnet', manifest: TESTNET_MANIFEST,
  settlementPolicy: ARC_TESTNET_SETTLEMENT_POLICY,
}, TESTNET_DEPLOYMENT.deploymentId, true);
export const MAINNET_CONTEXT = registerNetwork({
  key: 'mainnet', chain: ARC_MAINNET, label: 'Arc Mainnet', manifest: PRODUCTION_MANIFEST,
  settlementPolicy: ARC_MAINNET_SETTLEMENT_POLICY,
}, MAINNET_RELEASE_POLICY.activeDeploymentId, MAINNET_RELEASE_POLICY.writesAccepted);
/** Resolve locators only within the build network's closed registry. Old deployments stay read-only. */
export function getDeploymentContext(context: NetworkContext, chainId: number, deploymentId: string): NetworkContext | null {
  assertTrustedContext(context);
  if (chainId !== context.chain.id) return null;
  return deploymentContexts.get(`${context.key}:${deploymentId}`) ?? null;
}
export function networkStage(context: NetworkContext): 'U0' | 'R1' | 'W2' {
  assertTrustedContext(context);
  return !context.deployment ? 'U0' : context.writesEnabled ? 'W2' : 'R1';
}
export function networkCurrency(context: NetworkContext): string {
  assertTrustedContext(context);
  return context.key === 'testnet' ? 'test USDC' : 'USDC';
}
export function canWriteContext(context: NetworkContext): boolean {
  assertTrustedContext(context);
  return context === BUILD_NETWORK && networkStage(context) === 'W2';
}
/** No arbitrary RPC, address or imported manifest configuration is accepted. */
export function getNetworkContext(key: unknown): NetworkContext {
  if (key === 'testnet') return TESTNET_CONTEXT;
  if (key === 'mainnet') return MAINNET_CONTEXT;
  throw new Error('Unsupported ArcProof build network. Use testnet or mainnet.');
}
export const BUILD_NETWORK = getNetworkContext(import.meta.env.VITE_ARCPROOF_NETWORK ?? 'testnet');
export function assertTrustedContext(context: NetworkContext): void {
  if (!trustedContexts.has(context)) throw new Error('Untrusted network context.');
}
export function requireTrustedDeployment(context: NetworkContext): DeploymentRecord {
  assertTrustedContext(context);
  if (!context.deployment) throw new Error(`No trusted ${context.key} deployment. Network reads, preparation and sends are disabled.`);
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
  if (!context.writesEnabled) throw new Error('Wallet actions are disabled: no trusted active deployment or release acceptance.');
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
