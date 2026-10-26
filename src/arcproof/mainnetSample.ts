import { BUILD_NETWORK, MAINNET_CONTEXT, assertContextDeployment } from './networkPolicy';
import { resolveDeployment } from './manifest';

/** A locator, never a saved receipt or a pre-certified result. No URL/RPC/address overrides. */
export interface MainnetSampleLocator {
  readonly chainId: 5042;
  readonly deploymentId: string;
  readonly invoiceId: `0x${string}`;
  readonly txHash: `0x${string}`;
}
/** Locator for the 2026-10-26 Arc mainnet 0.20 USDC payment. Not a saved receipt or a cached VERIFIED result. */
export const MAINNET_SAMPLE: MainnetSampleLocator = Object.freeze({
  chainId: 5042,
  deploymentId: '0x3157f8feee81d6f2447756a99f6a12c88dff63d7165ca521322e0cc7ace2c2aa',
  invoiceId: '0xe23fad9eb20137dc97b4b54e666fcb0a90f7447c82935a0285494b77aa80d6ae',
  txHash: '0x94c559e0816b8e741f2cbf4fe764ed8e7dcfeab447ba8ac700f6f7e7ec4b82ce',
});
export function mainnetSampleHref(sample: MainnetSampleLocator | null = MAINNET_SAMPLE): string | null {
  if (!sample || BUILD_NETWORK.key !== 'mainnet' || sample.chainId !== 5042 ||
    Object.keys(sample).some(key => !['chainId', 'deploymentId', 'invoiceId', 'txHash'].includes(key)) ||
    !/^0x[0-9a-fA-F]{64}$/.test(sample.invoiceId) || !/^0x[0-9a-fA-F]{64}$/.test(sample.txHash)) return null;
  const deployment = resolveDeployment(MAINNET_CONTEXT.manifest, sample.chainId, sample.deploymentId);
  if (!deployment) return null;
  try { assertContextDeployment(MAINNET_CONTEXT, deployment); } catch { return null; }
  return `#/receipt/${sample.chainId}/${encodeURIComponent(sample.deploymentId)}/${sample.invoiceId}?tx=${sample.txHash}`;
}
