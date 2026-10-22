import { BUILD_NETWORK, MAINNET_CONTEXT, assertContextDeployment } from './networkPolicy';
import { resolveDeployment } from './manifest';

/** A locator, never a saved receipt or a pre-certified result. No URL/RPC/address overrides. */
export interface MainnetSampleLocator {
  readonly chainId: 5042;
  readonly deploymentId: string;
  readonly invoiceId: `0x${string}`;
  readonly txHash: `0x${string}`;
}
/** Add only after an actual application payment and separate publication approval. */
export const MAINNET_SAMPLE: MainnetSampleLocator | null = null;
export function mainnetSampleHref(sample: MainnetSampleLocator | null = MAINNET_SAMPLE): string | null {
  if (!sample || BUILD_NETWORK.key !== 'mainnet' || sample.chainId !== 5042 ||
    Object.keys(sample).some(key => !['chainId', 'deploymentId', 'invoiceId', 'txHash'].includes(key)) ||
    !/^0x[0-9a-fA-F]{64}$/.test(sample.invoiceId) || !/^0x[0-9a-fA-F]{64}$/.test(sample.txHash)) return null;
  const deployment = resolveDeployment(MAINNET_CONTEXT.manifest, sample.chainId, sample.deploymentId);
  if (!deployment) return null;
  try { assertContextDeployment(MAINNET_CONTEXT, deployment); } catch { return null; }
  return `#/receipt/${sample.chainId}/${encodeURIComponent(sample.deploymentId)}/${sample.invoiceId}?tx=${sample.txHash}`;
}
